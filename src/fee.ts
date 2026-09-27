import type { Booking, Court } from './types'
import {
  DEPOSIT, LATE_GRACE, MIN_BILL_MIN, NOSHOW_MIN, OVERTIME_RATE,
} from './rules'
import { NIGHT_END, NIGHT_START, fmtMin } from './time'

export interface BillLine {
  label: string
  amount: number          // 正=应收，负=应退
  kind: 'charge' | 'refund' | 'penalty' | 'comp'
  note?: string
}

export interface Bill {
  lines: BillLine[]
  lightingMin: number     // 常规计费时长（分钟）
  overtimeMin: number     // 超时计费时长（分钟）
  lateMin: number         // 迟到分钟（0 = 未迟到/未开始）
  total: number           // 应收合计（不含押金抵扣展示）
  deposit: number
  refund: number          // 应退押金
  extraDue: number        // 押金不足需补交
  splitNote?: string      // 拼场分摊说明
  settled: boolean        // 是否已可结算（灯已关/已离场/已取消）
}

const ceil30 = (min: number) => Math.max(MIN_BILL_MIN, Math.ceil(min / 30) * 30)

/**
 * 计算某预约的照明账单。
 * 规则要点（见 rules.ts）：
 *  - 迟到 >15 分钟：照明自预约开始时间起计
 *  - 提前离场：按实际照明时长（最低 30 分钟）
 *  - 超时占用：超出预约时段部分 1.5 倍费率
 *  - 拼场成功：照明费按人数分摊
 *  - 拒拼：押金扣 50%
 */
export function computeBill(b: Booking, court: Court, nowMin: number): Bill {
  const lines: BillLine[] = []
  const rate = b.area === 'full' ? court.lightRateFull : court.lightRateHalf
  const deposit = b.deposit
  let lightingMin = 0
  let overtimeMin = 0
  let lateMin = 0
  let splitNote: string | undefined

  // 无需照明 / 白天场次
  if (!b.needLighting) {
    if (deposit > 0) lines.push({ label: '押金退还', amount: -deposit, kind: 'refund' })
    return { lines, lightingMin, overtimeMin, lateMin, total: 0, deposit, refund: deposit, extraDue: 0, settled: true }
  }

  // 爽约：押金扣 50%
  if (b.status === 'noshow') {
    const forfeit = Math.round(deposit * 0.5)
    lines.push({ label: '爽约扣款（押金 50%）', amount: forfeit, kind: 'penalty', note: `超过 ${NOSHOW_MIN} 分钟未签到` })
    lines.push({ label: '押金余额退还', amount: -(deposit - forfeit), kind: 'refund' })
    return { lines, lightingMin, overtimeMin, lateMin, total: forfeit, deposit, refund: deposit - forfeit, extraDue: 0, settled: true }
  }

  // 已取消（天气/维修/封场等免责取消）
  if (b.status === 'cancelled') {
    lines.push({ label: '预约取消，押金全额退还', amount: -deposit, kind: 'refund' })
    return { lines, lightingMin, overtimeMin, lateMin, total: 0, deposit, refund: deposit, extraDue: 0, settled: true }
  }

  // 照明窗口：预约时段 ∩ 夜间时段
  const winStart = Math.max(b.startMin, NIGHT_START)
  const winEnd = Math.min(b.endMin, NIGHT_END)
  if (winStart >= winEnd) {
    lines.push({ label: '预约时段不在夜间照明时段，押金全额退还', amount: -deposit, kind: 'refund' })
    return { lines, lightingMin, overtimeMin, lateMin, total: 0, deposit, refund: deposit, extraDue: 0, settled: true }
  }

  // 迟到判定
  if (b.checkinAt != null) lateMin = Math.max(0, b.checkinAt - b.startMin)

  // 计费起点：迟到超 15 分钟 → 自预约开始计；否则按实际开灯时间
  const onAt = b.lightOnAt
  const billStart = lateMin > LATE_GRACE ? winStart : Math.max(onAt ?? winStart, winStart)

  // 计费终点：已关灯按关灯时间；未关灯按当前时间（不超过 22:00 强制关灯）
  const offAt = b.lightOffAt ?? Math.min(nowMin, NIGHT_END)
  const billEnd = Math.max(offAt, billStart)
  const settled = b.lightOffAt != null || b.status === 'completed'

  // 常规时长（预约时段内）与超时时长（预约时段后）
  const regularEnd = Math.min(billEnd, b.endMin)
  lightingMin = Math.max(0, regularEnd - billStart)
  overtimeMin = Math.max(0, billEnd - b.endMin)

  const billedRegular = ceil30(lightingMin)
  const regularFee = (billedRegular / 30) * rate
  lines.push({
    label: `照明费（${b.area === 'full' ? '全场' : '半场'} ¥${rate}/30分钟）`,
    amount: regularFee,
    kind: 'charge',
    note: `${fmtMin(billStart)}–${fmtMin(regularEnd)} 共 ${lightingMin} 分钟，按 ${billedRegular} 分钟计` +
      (lateMin > LATE_GRACE ? `；迟到 ${lateMin} 分钟超宽限，自预约开始计费` : ''),
  })

  if (overtimeMin > 0) {
    const billedOt = ceil30(overtimeMin)
    const otFee = (billedOt / 30) * rate * OVERTIME_RATE
    lines.push({
      label: `超时占用（${OVERTIME_RATE} 倍费率）`,
      amount: Math.round(otFee * 100) / 100,
      kind: 'penalty',
      note: `${fmtMin(b.endMin)}–${fmtMin(billEnd)} 共 ${overtimeMin} 分钟，按 ${billedOt} 分钟计`,
    })
  }

  // 拒拼处罚
  if (b.refusedShare) {
    lines.push({ label: '现场拒绝已确认拼场（押金 50%）', amount: Math.round(deposit * 0.5), kind: 'penalty', note: '另：信用分 -15，7 日内限制预约' })
  }

  // 拼场分摊：队长方按人数比例承担
  const confirmed = b.shares.filter(s => s.status === 'confirmed')
  let total = lines.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0)
  if (confirmed.length > 0 && !b.refusedShare) {
    const shareCount = confirmed.reduce((s, x) => s + x.count, 0)
    const all = b.headcount + shareCount
    const captainPart = Math.round((total * b.headcount / all) * 100) / 100
    const sharePart = Math.round((total - captainPart) * 100) / 100
    splitNote = `拼场分摊：${b.teamName} ${b.headcount} 人承担 ¥${captainPart.toFixed(2)}，拼场方 ${shareCount} 人承担 ¥${sharePart.toFixed(2)}`
    total = captainPart
  }

  // 结算：押金抵扣，多退少补
  const refund = Math.max(0, Math.round((deposit - total) * 100) / 100)
  const extraDue = Math.max(0, Math.round((total - deposit) * 100) / 100)
  if (settled) {
    if (refund > 0) lines.push({ label: '押金余额退还', amount: -refund, kind: 'refund' })
    if (extraDue > 0) lines.push({ label: '押金不足，需补交', amount: extraDue, kind: 'charge' })
  }

  return { lines, lightingMin, overtimeMin, lateMin, total, deposit, refund, extraDue, splitNote, settled }
}

/** 预约时的费用预估（押金 + 预估照明费） */
export function estimateFee(area: 'half' | 'full', court: Court, startMin: number, endMin: number, needLighting: boolean) {
  if (!needLighting) return { deposit: 0, light: 0 }
  const winStart = Math.max(startMin, NIGHT_START)
  const winEnd = Math.min(endMin, NIGHT_END)
  if (winStart >= winEnd) return { deposit: 0, light: 0 }
  const rate = area === 'full' ? court.lightRateFull : court.lightRateHalf
  const light = (ceil30(winEnd - winStart) / 30) * rate
  return { deposit: DEPOSIT, light }
}
