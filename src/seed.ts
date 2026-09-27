import type { Adjustment, Booking, Court, Incident, User } from './types'
import { dateStr, todayStr } from './time'
import { DEPOSIT } from './rules'

let seq = 1000
export const nid = (p: string) => `${p}${++seq}`
export const genCode = () => String(Math.floor(100000 + ((seq * 7919) % 900000)))

// ============ 场地 ============
export function seedCourts(): Court[] {
  return [
    {
      id: 'c1',
      name: '滨河公园 1 号场',
      location: '滨河公园东门内 200 米',
      surface: '塑胶地面，状况良好',
      surfaceLevel: 'good',
      hoopStatus: '双侧篮筐正常，篮网新换',
      hoopOk: true,
      noiseSensitive: true,
      noiseNote: '邻近「滨河花园」小区（噪声敏感），21:00 后请降低音量',
      lockersTotal: 20,
      lockersFree: 14,
      lightRateHalf: 6,
      lightRateFull: 10,
      closed: false,
    },
    {
      id: 'c2',
      name: '滨河公园 2 号场',
      location: '滨河公园西侧',
      surface: '地面轻微磨损，雨后局部湿滑',
      surfaceLevel: 'slippery',
      hoopStatus: '东侧篮筐维修中，仅西半场可用',
      hoopOk: false,
      noiseSensitive: false,
      lockersTotal: 12,
      lockersFree: 12,
      lightRateHalf: 6,
      lightRateFull: 10,
      closed: false,
    },
    {
      id: 'c3',
      name: '体育中心室外场',
      location: '体育中心北门',
      surface: '硅 PU 地面，状况优秀',
      surfaceLevel: 'good',
      hoopStatus: '双侧篮筐正常',
      hoopOk: true,
      noiseSensitive: true,
      noiseNote: '邻近市第二医院（噪声敏感），21:00 后请降低音量',
      lockersTotal: 30,
      lockersFree: 22,
      lightRateHalf: 8,
      lightRateFull: 12,
      closed: false,
    },
  ]
}

// ============ 用户（测试账号） ============
export function seedUsers(): User[] {
  return [
    { name: '王浩', role: 'captain', credit: 92, team: '闪电队' },
    { name: '李明', role: 'player', credit: 100 },
    { name: '张管理', role: 'admin', credit: 100 },
    { name: '刘社区', role: 'staff', credit: 100 },
  ]
}

// ============ 预约 ============
export function seedBookings(): Booking[] {
  const today = todayStr()
  const yesterday = dateStr(-1)
  const list: Booking[] = [
    // ---- 昨日已完成场次（用于账单演示） ----
    {
      // 迟到 20 分钟 + 超时 25 分钟：照明自预约开始计费，超时 1.5 倍
      id: 'b-y1', courtId: 'c1', date: yesterday, startMin: 19 * 60, endMin: 21 * 60,
      area: 'full', teamName: '闪电队', captain: '王浩', headcount: 10,
      acceptShare: false, needLighting: true, status: 'completed', pay: 'settled',
      deposit: DEPOSIT, code: '318205',
      members: [{ name: '王浩', checkedIn: true }, { name: '阿凯', checkedIn: true }],
      shares: [], checkinAt: 19 * 60 + 20, leaveAt: 21 * 60 + 25,
      lightOnAt: 19 * 60 + 20, lightOffAt: 21 * 60 + 25, createdAt: `${yesterday} 12:00`,
    },
    {
      // 提前离场：按实际照明时长计费，押金余额退回
      id: 'b-y2', courtId: 'c1', date: yesterday, startMin: 18 * 60, endMin: 20 * 60,
      area: 'half', teamName: '晨曦队', captain: '陈晨', headcount: 6,
      acceptShare: true, needLighting: true, status: 'completed', pay: 'settled',
      deposit: DEPOSIT, code: '552310',
      members: [{ name: '陈晨', checkedIn: true }],
      shares: [], checkinAt: 18 * 60 + 2, leaveAt: 19 * 60 + 10,
      lightOnAt: 18 * 60 + 5, lightOffAt: 19 * 60 + 10, createdAt: `${yesterday} 09:30`,
    },
    {
      // 现场拒绝已确认拼场：押金扣 50%，信用 -15
      id: 'b-y3', courtId: 'c3', date: yesterday, startMin: 19 * 60, endMin: 21 * 60,
      area: 'full', teamName: '野球帝队', captain: '赵野', headcount: 12,
      acceptShare: true, needLighting: true, status: 'completed', pay: 'settled',
      deposit: DEPOSIT, code: '774411',
      members: [{ name: '赵野', checkedIn: true }],
      shares: [{ id: 'sp-y3', applicant: '散客小周', count: 2, status: 'confirmed', checkedIn: 2 }],
      checkinAt: 19 * 60 + 5, leaveAt: 21 * 60, refusedShare: true,
      lightOnAt: 19 * 60 + 5, lightOffAt: 21 * 60, createdAt: `${yesterday} 10:00`,
    },
    // ---- 今日场次 ----
    {
      id: 'b-t1', courtId: 'c1', date: today, startMin: 8 * 60, endMin: 10 * 60,
      area: 'half', teamName: '朝阳晨练队', captain: '孙大爷', headcount: 8,
      acceptShare: false, needLighting: false, status: 'completed', pay: 'settled',
      deposit: 0, code: '110026',
      members: [{ name: '孙大爷', checkedIn: true }], shares: [],
      checkinAt: 8 * 60 - 5, leaveAt: 10 * 60, createdAt: `${today} 06:50`,
    },
    {
      // 今晚黄金时段全场：接受拼场 + 需照明（队长视角主场次）
      id: 'b-t2', courtId: 'c1', date: today, startMin: 19 * 60, endMin: 21 * 60,
      area: 'full', teamName: '闪电队', captain: '王浩', headcount: 10,
      acceptShare: true, needLighting: true, status: 'upcoming', pay: 'deposit',
      deposit: DEPOSIT, code: '660314',
      members: [
        { name: '王浩', checkedIn: false }, { name: '阿凯', checkedIn: false },
        { name: '大鹏', checkedIn: false }, { name: '小宇', checkedIn: false, isMinor: true },
      ],
      shares: [
        { id: 'sp-t1', applicant: '李明', count: 2, status: 'pending', checkedIn: 0 },
        { id: 'sp-t2', applicant: '路人甲', count: 1, status: 'confirmed', checkedIn: 0 },
      ],
      createdAt: `${today} 09:12`,
    },
    {
      // 2 号场今晚：篮筐维修只能半场
      id: 'b-t3', courtId: 'c2', date: today, startMin: 20 * 60, endMin: 22 * 60,
      area: 'half', teamName: '青年风暴队', captain: '周风', headcount: 6,
      acceptShare: false, needLighting: true, status: 'upcoming', pay: 'deposit',
      deposit: DEPOSIT, code: '881523',
      members: [{ name: '周风', checkedIn: false }], shares: [], createdAt: `${today} 11:40`,
    },
    {
      // 散客保障时段（开放拼场）
      id: 'b-t4', courtId: 'c1', date: today, startMin: 17 * 60, endMin: 18 * 60,
      area: 'half', teamName: '散客拼场专场', captain: '张管理', headcount: 4,
      acceptShare: true, needLighting: false, status: 'upcoming', pay: 'settled',
      deposit: 0, code: '209917',
      members: [{ name: '张管理', checkedIn: false }],
      shares: [{ id: 'sp-t4', applicant: '小吴', count: 2, status: 'confirmed', checkedIn: 0 }],
      createdAt: `${today} 08:00`,
    },
    {
      // 体育中心明晚（可约状态参考）
      id: 'b-t5', courtId: 'c3', date: dateStr(1), startMin: 19 * 60, endMin: 21 * 60,
      area: 'full', teamName: '城管联队', captain: '老郑', headcount: 12,
      acceptShare: false, needLighting: true, status: 'upcoming', pay: 'deposit',
      deposit: DEPOSIT, code: '730198',
      members: [{ name: '老郑', checkedIn: false }], shares: [], createdAt: `${today} 15:20`,
    },
  ]
  return list
}

// ============ 事件 ============
export function seedIncidents(): Incident[] {
  const today = todayStr()
  const yesterday = dateStr(-1)
  return [
    {
      id: 'i-1', type: 'noise', courtId: 'c1', bookingId: 'b-y1',
      reporter: '滨河花园 3 栋居民', title: '夜间打球噪声投诉',
      detail: '昨晚 21:40 仍有拍球与喧哗声，家中老人无法休息。',
      createdAt: `${yesterday} 21:45`, status: 'resolved',
      resolution: '社区工作人员现场劝导，队伍配合降低音量；22:00 按时关灯。该队当月夜场记警告 1 次（依据 noise 条款）。',
      penalty: '闪电队：当月夜场警告 1 次，再犯限制夜场预约',
      log: [
        `${yesterday} 21:45 居民来电投诉，社区工作人员刘社区登记`,
        `${yesterday} 21:52 到场核实，噪声属实，现场劝导`,
        `${yesterday} 22:00 照明按时关闭，队伍离场`,
        `${today} 09:00 回访居民，表示满意，结案`,
      ],
    },
    {
      id: 'i-2', type: 'light', courtId: 'c2',
      reporter: '周风', title: '2 号场西侧照明灯不亮',
      detail: '今晚预约 20:00–22:00，到场发现西半场两盏灯不亮。',
      createdAt: `${today} 18:30`, status: 'processing',
      resolution: '维修人员已接单，预计今晚 19:30 前修复。若无法修复，当场照明费全免并补偿 8 折券（依据 lightfail 条款）。',
      log: [
        `${today} 18:30 周风现场报修`,
        `${today} 18:40 管理员张管理派单维修`,
      ],
    },
    {
      id: 'i-3', type: 'dispute', courtId: 'c2',
      reporter: '青年风暴队队员', title: '无预约人员占用半场拒绝让场',
      detail: '我方已预约 20:00–22:00 西半场，现有 4 名无预约人员占用篮筐不肯离开。',
      createdAt: `${today} 19:10`, status: 'open',
      log: [`${today} 19:10 青年风暴队队员通过现场页上报`],
    },
    {
      id: 'i-4', type: 'rain', courtId: 'c1',
      reporter: '市气象台（系统推送）', title: '天气预警：今日傍晚雷阵雨',
      detail: '预计今日 17:00–20:00 有雷阵雨，室外场地可能湿滑。受影响时段预约可免责取消（依据 rain 条款）。',
      createdAt: `${today} 12:00`, status: 'open',
      log: [`${today} 12:00 系统自动推送天气预警`],
    },
    {
      id: 'i-5', type: 'minor', courtId: 'c1',
      reporter: '刘社区', title: '未成年人 21:00 后滞留场地',
      detail: '巡查发现两名初中生 21:20 仍在场内，无成人陪同。',
      createdAt: `${yesterday} 21:20`, status: 'resolved',
      resolution: '社区工作人员登记信息后联系监护人接回，并向其所在球队队长告知 minor 条款。',
      penalty: '无处罚，已进行安全教育',
      log: [
        `${yesterday} 21:20 巡查发现，现场登记`,
        `${yesterday} 21:35 监护人到场接回`,
      ],
    },
  ]
}

// ============ 公平性：改约/限制留痕 ============
export function seedAdjustments(): Adjustment[] {
  const today = todayStr()
  const yesterday = dateStr(-1)
  return [
    {
      id: 'a-1', time: `${yesterday} 22:10`, target: '野球帝队',
      action: '限制预约 7 日',
      reason: '预约时声明接受拼场，现场拒绝已确认拼场（散客小周等 2 人），押金扣 50%，信用分 -15。',
      ruleId: 'share',
    },
    {
      id: 'a-2', time: `${today} 10:00`, target: '闪电队',
      action: '黄金时段预约提示',
      reason: '本周黄金时段（18:00–22:00）已约 3 次达上限，再次预约需选择非黄金时段或接受拼场。',
      ruleId: 'fair-1',
    },
    {
      id: 'a-3', time: `${today} 12:05`, target: '2 号场全部在册预约',
      action: '改约建议',
      reason: '东侧篮筐维修 + 照明故障报修，建议改约 1 号场或体育中心场；坚持使用的，若照明未修复当场照明费全免。',
      ruleId: 'maintain',
    },
  ]
}
