// ============ 角色与枚举 ============
export type Role = 'captain' | 'player' | 'admin' | 'staff'
export type Area = 'half' | 'full'
export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled' | 'noshow'
export type PayStatus = 'unpaid' | 'deposit' | 'settled' | 'refunded'
export type IncidentType =
  | 'rain'        // 下雨地滑
  | 'maintenance' // 场地临时维修
  | 'dispute'     // 争抢篮筐
  | 'noise'       // 噪声投诉
  | 'minor'       // 未成年人夜间滞留
  | 'light'       // 照明故障
  | 'closure'     // 管理员封场
export type IncidentStatus = 'open' | 'processing' | 'resolved'

// ============ 场地 ============
export interface Court {
  id: string
  name: string
  location: string
  surface: string                       // 地面状况描述
  surfaceLevel: 'good' | 'worn' | 'slippery'
  hoopStatus: string                    // 篮筐状态描述
  hoopOk: boolean
  noiseSensitive: boolean               // 邻近噪声敏感小区
  noiseNote?: string
  lockersTotal: number
  lockersFree: number
  lightRateHalf: number                 // 照明费 元/30分钟（半场）
  lightRateFull: number                 // 照明费 元/30分钟（全场）
  closed: boolean
  closedReason?: string
}

// ============ 预约 ============
export interface Member {
  name: string
  checkedIn: boolean
  isMinor?: boolean
}

export interface ShareParty {
  id: string
  applicant: string      // 申请人（散客）
  count: number
  status: 'pending' | 'confirmed' | 'rejected'
  checkedIn: number
}

export interface Booking {
  id: string
  courtId: string
  date: string           // YYYY-MM-DD
  startMin: number       // 分钟（自 0 点）
  endMin: number
  area: Area
  teamName: string
  captain: string
  headcount: number
  acceptShare: boolean
  needLighting: boolean
  status: BookingStatus
  pay: PayStatus
  deposit: number        // 已收押金
  code: string           // 现场核验码
  members: Member[]
  shares: ShareParty[]
  checkinAt?: number     // 队长签到时间（分钟）
  leaveAt?: number       // 离场时间
  lightOnAt?: number     // 照明开启时间
  lightOffAt?: number    // 照明关闭时间
  refusedShare?: boolean // 现场拒绝已确认拼场
  createdAt: string
}

// ============ 事件 / 投诉 / 冲突 ============
export interface Incident {
  id: string
  type: IncidentType
  courtId: string
  bookingId?: string
  reporter: string
  title: string
  detail: string
  createdAt: string
  status: IncidentStatus
  resolution?: string    // 处理结果
  refundAmount?: number  // 退款/补偿金额
  penalty?: string       // 后续处罚
  log: string[]          // 投诉与处理记录（时间线）
}

// ============ 公平性：改约/限制留痕 ============
export interface Adjustment {
  id: string
  time: string
  target: string         // 对象（队伍/个人）
  action: string         // 动作：改约 / 限制预约 / 取消
  reason: string         // 说明
  ruleId: string         // 引用规则条款
}

export interface User {
  name: string
  role: Role
  credit: number         // 信用分
  team?: string
}
