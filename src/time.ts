// 时间工具：统一用「自 0 点的分钟数」表示一天内时间
export const OPEN_MIN = 6 * 60        // 开放 06:00
export const CLOSE_MIN = 22 * 60      // 关闭 22:00
export const NIGHT_START = 18 * 60    // 夜间照明时段起
export const NIGHT_END = 22 * 60      // 夜间照明时段止（22:00 统一关灯）
export const SLOT = 60                // 时段粒度 60 分钟

export function fmtMin(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dateStr(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function minutesOf(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** 一天内全部可约时段的起始分钟 */
export function slotStarts(): number[] {
  const list: number[] = []
  for (let m = OPEN_MIN; m + SLOT <= CLOSE_MIN; m += SLOT) list.push(m)
  return list
}

export function overlaps(aS: number, aE: number, bS: number, bE: number): boolean {
  return aS < bE && bS < aE
}

export function isNightSlot(startMin: number, endMin: number): boolean {
  return overlaps(startMin, endMin, NIGHT_START, NIGHT_END)
}

/** 演示时钟：真实时间在开放时段内则用之，否则落在 19:05（便于演示夜场照明） */
export function initDemoNow(): Date {
  const d = new Date()
  const m = minutesOf(d)
  if (m < OPEN_MIN || m >= CLOSE_MIN) {
    d.setHours(19, 5, 0, 0)
  }
  return d
}
