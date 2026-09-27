// ============ 计费与运营规则常量 ============
export const DEPOSIT = 30            // 夜场照明押金（元）
export const LATE_GRACE = 15         // 迟到宽限（分钟）
export const NOSHOW_MIN = 30         // 超过该时间未签到视为爽约（分钟）
export const OVERTIME_RATE = 1.5     // 超时占用费率倍数
export const MIN_BILL_MIN = 30       // 照明最低计费时长（分钟）
export const GOLDEN_START = 18 * 60  // 黄金时段起
export const GOLDEN_END = 22 * 60    // 黄金时段止
export const GOLDEN_WEEK_LIMIT = 3   // 每队每周黄金时段限约次数
export const CAPACITY_HALF = 8       // 半场承载人数
export const CAPACITY_FULL = 16      // 全场承载人数

export interface Rule {
  id: string
  category: '照明计费' | '现场秩序' | '突发事件' | '公平分配'
  title: string
  text: string
}

/** 规则公示：所有费用变化、改约、处罚均引用这些条款 */
export const RULES: Rule[] = [
  { id: 'light-1', category: '照明计费', title: '照明按实际开启时长计费', text: '夜间场次（18:00–22:00）按照明实际开启时长计费，不满 30 分钟按 30 分钟计。费率：半场 ¥6/30分钟、全场 ¥10/30分钟（体育中心场 ¥8/¥12）。22:00 统一关灯。' },
  { id: 'light-2', category: '照明计费', title: '押金多退少补', text: '预约夜场需缴纳照明押金 ¥30，散场结算后按实际费用从押金中抵扣，多退少补。' },
  { id: 'late', category: '照明计费', title: '迟到', text: '迟到 15 分钟内免责；超过 15 分钟，照明费自预约开始时间起计（不因迟到减免）；超过 30 分钟未签到视为爽约，押金扣 50%，信用分 -10。' },
  { id: 'early', category: '照明计费', title: '提前离场', text: '提前离场按实际照明时长计费（最低 30 分钟），押金余额原路退回。' },
  { id: 'overtime', category: '照明计费', title: '超时占用', text: '超出预约时段的照明按 1.5 倍费率计费；超时超过 15 分钟，管理员可强制清场，信用分 -5。' },
  { id: 'share', category: '照明计费', title: '拼场分摊与拒拼处罚', text: '预约时选择「接受拼场」且拼场成功的，照明费由各方按人数分摊；现场拒绝已确认拼场的，押金扣 50%（¥15），信用分 -15，7 日内限制预约。' },
  { id: 'rain', category: '突发事件', title: '下雨地滑免责取消', text: '因降雨导致场地湿滑的，受影响预约免责取消，费用全额退还，不扣信用分。' },
  { id: 'maintain', category: '突发事件', title: '场地临时维修', text: '场地临时维修关闭的，在册预约可优先改约同级时段，或选择全额退款并补偿 ¥5 照明券。' },
  { id: 'dispute', category: '现场秩序', title: '争抢篮筐调解', text: '场地使用权以预约核验码为准；无预约占用者应予劝离；双方均有预约的，按半场划分或到场先后调解，管理员现场记录留痕。' },
  { id: 'noise', category: '现场秩序', title: '噪声管理', text: '邻近噪声敏感小区的场地，21:00 后请降低音量，22:00 统一关灯。噪声投诉成立的队伍，当月夜场预约受限。' },
  { id: 'minor', category: '现场秩序', title: '未成年人夜间滞留', text: '21:00 后未成年人须由成人陪同方可滞留场地，否则社区工作人员将登记并联系监护人接回。' },
  { id: 'lightfail', category: '突发事件', title: '照明故障', text: '照明故障导致无法使用的，当场照明费全免，已收费用退还，并补偿下次照明 8 折券。' },
  { id: 'closure', category: '突发事件', title: '管理员封场', text: '管理员封场的，在册预约全额退款并给予优先改约权；拒不配合清场的，信用分 -10 并限制预约 7 日。' },
  { id: 'fair-1', category: '公平分配', title: '黄金时段限约', text: '每队每周黄金时段（18:00–22:00）限约 3 次，超出需选择非黄金时段或接受拼场。' },
  { id: 'fair-2', category: '公平分配', title: '散客保障', text: '每片场地每日至少保留 2 个时段开放散客拼场；场地紧张时，接受拼场的预约优先于包场预约。' },
  { id: 'fair-3', category: '公平分配', title: '改约透明可申诉', text: '任何改约、限制均引用具体规则条款并在「公平性公示」页留痕，当事人可在 3 日内申诉。' },
]

export function ruleById(id: string): Rule | undefined {
  return RULES.find(r => r.id === id)
}

export const INCIDENT_TYPE_TEXT: Record<string, string> = {
  rain: '下雨地滑',
  maintenance: '场地临时维修',
  dispute: '争抢篮筐',
  noise: '噪声投诉',
  minor: '未成年人滞留',
  light: '照明故障',
  closure: '管理员封场',
}

export const INCIDENT_TYPE_ICON: Record<string, string> = {
  rain: '🌧️',
  maintenance: '🔧',
  dispute: '🏀',
  noise: '🔊',
  minor: '🧒',
  light: '💡',
  closure: '🚧',
}
