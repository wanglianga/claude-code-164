import { computed, reactive } from 'vue'
import type { Area, Booking, Court, Incident, IncidentType, Role } from './types'
import {
  CAPACITY_FULL, CAPACITY_HALF, DEPOSIT, GOLDEN_END, GOLDEN_START, GOLDEN_WEEK_LIMIT,
  LATE_GRACE, NOSHOW_MIN,
} from './rules'
import { CLOSE_MIN, NIGHT_END, fmtMin, initDemoNow, isNightSlot, minutesOf, overlaps, todayStr } from './time'
import { genCode, nid, seedAdjustments, seedBookings, seedCourts, seedIncidents, seedUsers } from './seed'

export interface Risk {
  level: '高' | '中' | '低'
  reasons: string[]
}

export const store = reactive({
  // ---- 演示时钟（现场页/后台可 ±15 分钟调整） ----
  now: initDemoNow(),
  // ---- 当前身份 ----
  role: 'captain' as Role,
  me: '王浩',
  // ---- 数据 ----
  courts: seedCourts() as Court[],
  bookings: seedBookings() as Booking[],
  incidents: seedIncidents() as Incident[],
  users: seedUsers(),
  adjustments: seedAdjustments(),
})

// ============ 基础工具 ============
export const nowMin = computed(() => minutesOf(store.now))
export const today = computed(() => todayStr())

export function courtById(id: string): Court {
  return store.courts.find(c => c.id === id)!
}

export function bookingById(id: string): Booking | undefined {
  return store.bookings.find(b => b.id === id)
}

export function setRole(role: Role) {
  store.role = role
  const u = store.users.find(x => x.role === role)
  store.me = u ? u.name : store.me
}

export function myUser() {
  return store.users.find(u => u.name === store.me)
}

export function advanceNow(min: number) {
  const d = new Date(store.now.getTime() + min * 60000)
  const m = minutesOf(d)
  if (m >= 6 * 60 - 30 && m <= CLOSE_MIN + 30) store.now = d
}

export function capacityOf(area: Area): number {
  return area === 'full' ? CAPACITY_FULL : CAPACITY_HALF
}

// ============ 查询 ============
export function bookingsOf(courtId: string, date: string): Booking[] {
  return store.bookings
    .filter(b => b.courtId === courtId && b.date === date && b.status !== 'cancelled')
    .sort((a, b) => a.startMin - b.startMin)
}

/** 当前时段该场地的有效预约（谁该在场） */
export function currentBooking(courtId: string): Booking | undefined {
  const m = nowMin.value
  return bookingsOf(courtId, todayStr()).find(b => b.startMin <= m && m < b.endMin)
}

export function nextBooking(courtId: string): Booking | undefined {
  const m = nowMin.value
  return bookingsOf(courtId, todayStr()).find(b => b.startMin > m)
}

export function isSlotTaken(courtId: string, date: string, startMin: number, endMin: number, _area: Area): boolean {
  // 演示简化：同一时段半场/全场互斥（真实场景两片半场可分别预约）
  return store.bookings.some(b =>
    b.courtId === courtId && b.date === date && b.status !== 'cancelled' &&
    overlaps(b.startMin, b.endMin, startMin, endMin),
  )
}

/** 本周黄金时段已约次数（按队伍） */
export function goldenUsed(teamName: string): number {
  return store.bookings.filter(b =>
    b.teamName === teamName && b.status !== 'cancelled' &&
    overlaps(b.startMin, b.endMin, GOLDEN_START, GOLDEN_END),
  ).length
}

/** 冲突风险评估 */
export function conflictRisk(b: Booking): Risk {
  const reasons: string[] = []
  const court = courtById(b.courtId)
  const people = b.headcount + b.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.count, 0)
  if (people > capacityOf(b.area)) reasons.push(`人数 ${people} 超出${b.area === 'full' ? '全场' : '半场'}承载 ${capacityOf(b.area)} 人`)
  if (!court.hoopOk && b.area === 'full') reasons.push('篮筐维修中，全场使用存在冲突')
  if (court.noiseSensitive && b.endMin > 21 * 60) reasons.push('噪声敏感区域且结束时间晚于 21:00')
  if (court.closed) reasons.push(`场地已封场：${court.closedReason ?? ''}`)
  const hasLightIssue = store.incidents.some(i => i.type === 'light' && i.courtId === b.courtId && i.status !== 'resolved')
  if (hasLightIssue && b.needLighting) reasons.push('照明故障未修复，夜场可能无法开灯')
  const rainAlert = store.incidents.some(i => i.type === 'rain' && i.status === 'open' && b.date === todayStr())
  if (rainAlert) reasons.push('今日有降雨预警，场地可能湿滑')
  const pendingShares = b.shares.some(s => s.status === 'pending')
  if (pendingShares) reasons.push('有待确认的拼场申请')
  if (b.refusedShare) reasons.push('该队曾现场拒绝拼场，存在纠纷记录')
  let level: Risk['level'] = '低'
  if (reasons.some(r => r.includes('超出') || r.includes('封场') || r.includes('照明故障'))) level = '高'
  else if (reasons.length > 0) level = '中'
  return { level, reasons }
}

/** 管理员后台：某场地某时段行数据 */
export function slotRow(courtId: string, date: string, startMin: number) {
  const b = store.bookings.find(x =>
    x.courtId === courtId && x.date === date && x.status !== 'cancelled' &&
    startMin >= x.startMin && startMin < x.endMin,
  )
  if (!b) return null
  const booked = b.headcount + b.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.count, 0)
  const arrived = b.members.filter(m => m.checkedIn).length +
    b.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.checkedIn, 0)
  return { booking: b, booked, arrived, risk: conflictRisk(b) }
}

// ============ 预约动作 ============
export interface BookPayload {
  courtId: string
  date: string
  startMin: number
  endMin: number
  area: Area
  teamName: string
  headcount: number
  acceptShare: boolean
  needLighting: boolean
}

export function addBooking(p: BookPayload): { ok: boolean; msg: string; id?: string } {
  const court = courtById(p.courtId)
  if (court.closed) return { ok: false, msg: `场地已封场：${court.closedReason ?? ''}` }
  if (!court.hoopOk && p.area === 'full') return { ok: false, msg: '篮筐维修中，仅可预约半场' }
  if (p.headcount > capacityOf(p.area)) return { ok: false, msg: `人数超过${p.area === 'full' ? '全场' : '半场'}承载上限` }
  if (isSlotTaken(p.courtId, p.date, p.startMin, p.endMin, p.area)) return { ok: false, msg: '该时段已被预约' }
  if (overlaps(p.startMin, p.endMin, GOLDEN_START, GOLDEN_END) && goldenUsed(p.teamName) >= GOLDEN_WEEK_LIMIT) {
    return { ok: false, msg: `本周黄金时段已约满 ${GOLDEN_WEEK_LIMIT} 次（fair-1 条款），请选择非黄金时段或接受拼场` }
  }
  const needLight = p.needLighting && isNightSlot(p.startMin, p.endMin)
  const b: Booking = {
    id: nid('b-'), courtId: p.courtId, date: p.date, startMin: p.startMin, endMin: p.endMin,
    area: p.area, teamName: p.teamName, captain: store.me, headcount: p.headcount,
    acceptShare: p.acceptShare, needLighting: needLight,
    status: 'upcoming', pay: needLight ? 'deposit' : 'settled',
    deposit: needLight ? DEPOSIT : 0, code: genCode(),
    members: [{ name: store.me, checkedIn: false }], shares: [],
    createdAt: `${p.date} ${fmtMin(nowMin.value)}`,
  }
  store.bookings.push(b)
  return { ok: true, msg: needLight ? `预约成功，已收照明押金 ¥${DEPOSIT}` : '预约成功（白天场次免费）', id: b.id }
}

export function cancelBooking(id: string, reason: string): void {
  const b = bookingById(id)
  if (!b) return
  b.status = 'cancelled'
  if (b.deposit > 0) b.pay = 'refunded'
  store.adjustments.unshift({
    id: nid('a-'), time: `${todayStr()} ${fmtMin(nowMin.value)}`, target: b.teamName,
    action: '取消预约', reason, ruleId: 'fair-3',
  })
}

// ============ 签到 / 现场 ============
/** 队长或队员通过核验码签到；返回提示 */
export function checkinByCode(code: string, name: string): { ok: boolean; msg: string } {
  const b = store.bookings.find(x => x.code === code.trim() && x.date === todayStr() && x.status !== 'cancelled')
  if (!b) return { ok: false, msg: '核验码无效或预约已取消' }
  const m = nowMin.value
  if (m < b.startMin - 30 || m > b.endMin + 30) return { ok: false, msg: `请在预约时段前后 30 分钟内签到（${fmtMin(b.startMin)}–${fmtMin(b.endMin)}）` }
  // 队长签到：记录签到时间、开灯
  if (name === b.captain && b.checkinAt == null) {
    b.checkinAt = m
    b.status = 'active'
    if (b.needLighting && b.lightOnAt == null && m >= b.startMin - 30) b.lightOnAt = Math.max(m, b.startMin)
  }
  let mem = b.members.find(x => x.name === name)
  if (!mem) {
    mem = { name, checkedIn: false }
    b.members.push(mem)
  }
  if (mem.checkedIn) return { ok: false, msg: `${name} 已签到过` }
  mem.checkedIn = true
  return { ok: true, msg: `${name} 签到成功（${b.teamName} ${fmtMin(b.startMin)}–${fmtMin(b.endMin)}）` }
}

/** 拼场方签到 */
export function checkinShare(code: string): { ok: boolean; msg: string } {
  const b = store.bookings.find(x => x.code === code.trim() && x.date === todayStr())
  if (!b) return { ok: false, msg: '核验码无效' }
  const sp = b.shares.find(s => s.applicant === store.me && s.status === 'confirmed')
  if (!sp) return { ok: false, msg: '您没有该场次的已确认拼场' }
  if (sp.checkedIn >= sp.count) return { ok: false, msg: '拼场人员已全部签到' }
  sp.checkedIn++
  return { ok: true, msg: `拼场签到成功（${sp.checkedIn}/${sp.count} 人）` }
}

/** 爽约检查：开场 30 分钟未签到 */
export function markNoShowIfNeeded(b: Booking): void {
  if (b.status === 'upcoming' && b.checkinAt == null && nowMin.value > b.startMin + NOSHOW_MIN && b.date === todayStr()) {
    b.status = 'noshow'
    b.pay = 'settled'
  }
}

/** 离场结算：关灯、计费 */
export function leaveAndSettle(id: string): void {
  const b = bookingById(id)
  if (!b) return
  const m = nowMin.value
  b.leaveAt = m
  if (b.lightOnAt != null && b.lightOffAt == null) b.lightOffAt = Math.min(m, NIGHT_END)
  b.status = 'completed'
  b.pay = 'settled'
}

export function toggleLight(id: string): void {
  const b = bookingById(id)
  if (!b || !b.needLighting) return
  const m = nowMin.value
  if (b.lightOnAt == null || b.lightOffAt != null) {
    b.lightOnAt = m
    b.lightOffAt = undefined
  } else {
    b.lightOffAt = Math.min(m, NIGHT_END)
  }
}

/** 现场拒绝拼场（队长操作，触发处罚） */
export function refuseShareOnsite(id: string): void {
  const b = bookingById(id)
  if (!b) return
  b.refusedShare = true
  const u = store.users.find(x => x.name === b.captain)
  if (u) u.credit = Math.max(0, u.credit - 15)
  store.adjustments.unshift({
    id: nid('a-'), time: `${todayStr()} ${fmtMin(nowMin.value)}`, target: b.teamName,
    action: '限制预约 7 日', reason: '现场拒绝已确认拼场，押金扣 50%，信用分 -15。', ruleId: 'share',
  })
}

// ============ 拼场 ============
export function applyShare(bookingId: string, count: number): { ok: boolean; msg: string } {
  const b = bookingById(bookingId)
  if (!b) return { ok: false, msg: '预约不存在' }
  if (!b.acceptShare) return { ok: false, msg: '该场次不接受拼场' }
  const confirmed = b.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.count, 0)
  if (b.headcount + confirmed + count > capacityOf(b.area)) return { ok: false, msg: '剩余名额不足' }
  if (b.shares.some(s => s.applicant === store.me && s.status !== 'rejected')) return { ok: false, msg: '您已申请过该场次' }
  b.shares.push({ id: nid('sp-'), applicant: store.me, count, status: 'pending', checkedIn: 0 })
  return { ok: true, msg: '已申请，等待队长确认' }
}

export function confirmShare(bookingId: string, shareId: string, ok: boolean): void {
  const b = bookingById(bookingId)
  const sp = b?.shares.find(s => s.id === shareId)
  if (!b || !sp) return
  sp.status = ok ? 'confirmed' : 'rejected'
}

// ============ 事件 ============
export function reportIncident(type: IncidentType, courtId: string, title: string, detail: string, bookingId?: string): void {
  store.incidents.unshift({
    id: nid('i-'), type, courtId, bookingId, reporter: store.me,
    title, detail, createdAt: `${todayStr()} ${fmtMin(nowMin.value)}`,
    status: 'open', log: [`${todayStr()} ${fmtMin(nowMin.value)} ${store.me} 上报：${title}`],
  })
}

export function resolveIncident(id: string, resolution: string, refundAmount: number, penalty: string): void {
  const i = store.incidents.find(x => x.id === id)
  if (!i) return
  i.status = 'resolved'
  i.resolution = resolution
  i.refundAmount = refundAmount || undefined
  i.penalty = penalty || undefined
  i.log.push(`${todayStr()} ${fmtMin(nowMin.value)} ${store.me} 结案：${resolution}`)
  // 退款落到关联预约
  if (i.bookingId && refundAmount > 0) {
    const b = bookingById(i.bookingId)
    if (b) b.pay = 'refunded'
  }
}

export function appendIncidentLog(id: string, text: string): void {
  const i = store.incidents.find(x => x.id === id)
  if (i) i.log.push(`${todayStr()} ${fmtMin(nowMin.value)} ${store.me}：${text}`)
}

/** 管理员封场：在册预约全额退款 + 留痕 */
export function closeCourt(courtId: string, reason: string): void {
  const court = courtById(courtId)
  court.closed = true
  court.closedReason = reason
  const affected = store.bookings.filter(b =>
    b.courtId === courtId && b.date === todayStr() && (b.status === 'upcoming' || b.status === 'active'),
  )
  affected.forEach(b => {
    b.status = 'cancelled'
    if (b.deposit > 0) b.pay = 'refunded'
    store.adjustments.unshift({
      id: nid('a-'), time: `${todayStr()} ${fmtMin(nowMin.value)}`, target: b.teamName,
      action: '封场退款 + 优先改约权', reason: `管理员封场（${reason}），押金全额退还。`, ruleId: 'closure',
    })
  })
  reportIncident('closure', courtId, `封场：${reason}`, `影响在册预约 ${affected.length} 场，已全额退款并给予优先改约权。`)
}

export function openCourt(courtId: string): void {
  const court = courtById(courtId)
  court.closed = false
  court.closedReason = undefined
}

// ============ 统计 ============
/** 公平性：本周黄金时段使用分布（小时） */
export function fairnessStats() {
  const stat = { team: 0, share: 0, resident: 0 }
  store.bookings.forEach(b => {
    if (b.status === 'cancelled') return
    const overlap = Math.max(0, Math.min(b.endMin, GOLDEN_END) - Math.max(b.startMin, GOLDEN_START)) / 60
    if (overlap <= 0) return
    if (b.teamName.includes('散客')) stat.share += overlap
    else if (b.shares.some(s => s.status === 'confirmed')) stat.share += overlap / 2, stat.team += overlap / 2
    else stat.team += overlap
  })
  stat.resident = 2 // 社区居民自由晨练时段（公示数据）
  return stat
}
