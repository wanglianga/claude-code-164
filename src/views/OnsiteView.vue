<template>
  <div>
    <!-- 演示时钟 -->
    <n-card size="small" style="margin-bottom:10px">
      <div class="row between">
        <span>🕐 当前时间（演示可调）</span>
        <span class="row">
          <n-button size="tiny" tertiary @click="advanceNow(-15)">-15分</n-button>
          <b class="mono" style="font-size:18px">{{ clock }}</b>
          <n-button size="tiny" tertiary @click="advanceNow(15)">+15分</n-button>
        </span>
      </div>
    </n-card>

    <!-- 场地切换 -->
    <n-tabs type="segment" animated :value="courtId" @update:value="v => (courtId = v)">
      <n-tab v-for="c in store.courts" :key="c.id" :name="c.id">{{ c.name.replace('滨河公园 ', '').replace('室外场', '') }}</n-tab>
    </n-tabs>

    <n-alert v-if="court.closed" type="error" size="small" style="margin-bottom:10px" title="场地已封场">
      {{ court.closedReason }} · 在册预约已全额退款（closure 条款）
    </n-alert>

    <!-- 当前时段：谁该在场 / 还能打多久 -->
    <n-card size="small" :title="cur ? '当前时段' : '当前时段空闲'" style="margin-bottom:10px">
      <template v-if="cur">
        <n-result size="small" status="success"
          :title="`应由「${cur.teamName}」使用`"
          :description="`${cur.area === 'full' ? '全场' : '半场'} · ${fmtMin(cur.startMin)}–${fmtMin(cur.endMin)} · 预约 ${cur.headcount} 人`" />
        <n-progress type="line" :percentage="remainPct" :color="'#18a058'" style="margin-bottom:6px" />
        <div class="row between mb8">
          <span class="muted">还能打 <b style="color:#e8801a;font-size:18px">{{ remainMin }}</b> 分钟</span>
          <n-tag size="small" :type="cur.checkinAt != null ? 'success' : 'warning'">
            {{ cur.checkinAt != null ? `队长已核验 ${fmtMin(cur.checkinAt)}` : '队长未核验' }}
          </n-tag>
        </div>
        <div class="row wrap" style="gap:6px">
          <n-tag size="small" type="info">到场 {{ arrived }}/{{ booked }} 人</n-tag>
          <n-tag v-if="cur.needLighting" size="small" :type="lightOn ? 'warning' : 'default'">
            {{ lightOn ? `💡 照明中 · 已计费约 ${bill.lightingMin + bill.overtimeMin} 分钟 · 预估 ¥${bill.total.toFixed(2)}` : '💡 照明未开启' }}
          </n-tag>
          <n-tag v-if="cur.shares.some(s => s.status === 'confirmed')" size="small" type="success">🤝 拼场 {{ shareCount }} 人</n-tag>
        </div>

        <!-- 费用实时预览 -->
        <n-collapse v-if="cur.needLighting" style="margin-top:8px">
          <n-collapse-item title="费用实时明细（迟到/超时/分摊规则自动套用）" name="fee">
            <FeePanel :bill="bill" />
          </n-collapse-item>
        </n-collapse>
      </template>
      <n-empty v-else :description="`当前无人预约，可前往预约${next ? `；下一场 ${next.teamName} ${fmtMin(next.startMin)} 开始` : ''}`">
        <template #extra><n-button size="small" type="primary" @click="$router.push('/book')">立即预约</n-button></template>
      </n-empty>
    </n-card>

    <!-- 签到 -->
    <n-card size="small" title="现场签到（输入预约核验码）" style="margin-bottom:10px">
      <div class="row" style="gap:8px">
        <n-input v-model:value="code" placeholder="6 位核验码" maxlength="6" style="flex:1" />
        <n-input v-model:value="name" placeholder="姓名" style="flex:1" />
        <n-button type="primary" class="big-btn" style="height:40px" @click="doCheckin">签到</n-button>
      </div>
      <div class="muted mt8">队长首次签到自动开灯并起算照明费；队员/拼场人员凭同一核验码签到。</div>
      <n-button v-if="store.role === 'player'" block tertiary size="small" class="mt8" @click="doShareCheckin">拼场签到（我是散客）</n-button>
    </n-card>

    <!-- 队长操作 -->
    <n-card v-if="cur && cur.captain === store.me && cur.status === 'active'" size="small" title="队长操作" style="margin-bottom:10px">
      <div class="row wrap" style="gap:8px">
        <n-button type="primary" @click="leave">提前离场并结算</n-button>
        <n-popconfirm @positive-click="refuseShare">
          <template #trigger><n-button tertiary type="error">拒绝拼场</n-button></template>
          拒绝已确认拼场将扣押金 50%、信用 -15 并限约 7 日（share 条款），确定？
        </n-popconfirm>
      </div>
    </n-card>

    <!-- 管理员/社区操作 -->
    <n-card v-if="store.role === 'admin' || store.role === 'staff'" size="small" title="管理操作" style="margin-bottom:10px">
      <div class="row wrap" style="gap:8px">
        <n-button v-if="cur?.needLighting" size="small" @click="toggleLight(cur.id)">
          {{ lightOn ? '关灯' : '开灯' }}
        </n-button>
        <n-button v-if="cur && store.role === 'admin'" size="small" tertiary type="warning" @click="forceClear">强制清场</n-button>
        <n-button v-if="!court.closed && store.role === 'admin'" size="small" tertiary type="error" @click="closeCourtDlg">封场</n-button>
        <n-button v-if="court.closed && store.role === 'admin'" size="small" tertiary type="success" @click="openCourt(courtId); msg()">解除封场</n-button>
      </div>
    </n-card>

    <!-- 争议上报 -->
    <n-card size="small" title="发生争议/突发情况？一键上报" style="margin-bottom:10px">
      <div class="row wrap" style="gap:8px">
        <n-button v-for="t in incidentTypes" :key="t.type" size="small" tertiary @click="report(t.type, t.label)">
          {{ t.icon }} {{ t.label }}
        </n-button>
      </div>
      <n-steps size="small" style="margin-top:12px" :current="1">
        <n-step title="上报" description="现场拍照/描述" />
        <n-step title="核验" description="核对预约码与到场" />
        <n-step title="调解" description="管理员/社区到场" />
        <n-step title="结案" description="退款/补偿/处罚留痕" />
      </n-steps>
    </n-card>

    <!-- 该场地进行中的事件 -->
    <div class="section-title">该场地事件</div>
    <n-empty v-if="!courtIncidents.length" description="暂无事件" />
    <n-card v-for="i in courtIncidents" :key="i.id" size="small" style="margin-bottom:8px" @click="$router.push('/incidents')" hoverable>
      <div class="row between">
        <span>{{ icon(i.type) }} {{ i.title }}</span>
        <n-tag size="small" :type="i.status === 'resolved' ? 'default' : i.status === 'processing' ? 'warning' : 'error'">
          {{ i.status === 'resolved' ? '已结案' : i.status === 'processing' ? '处理中' : '待处理' }}
        </n-tag>
      </div>
      <div class="muted mt8">{{ i.createdAt }} · {{ i.reporter }}</div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NAlert, NButton, NCard, NCollapse, NCollapseItem, NEmpty, NInput, NPopconfirm, NProgress, NResult, NStep, NSteps, NTab, NTag, NTabs } from 'naive-ui'
import {
  advanceNow, checkinByCode, checkinShare, closeCourt, courtById,
  currentBooking, leaveAndSettle, markNoShowIfNeeded, nextBooking, nowMin,
  openCourt, refuseShareOnsite, reportIncident, store, toggleLight,
} from '../store'
import { computeBill } from '../fee'
import { fmtMin } from '../time'
import { INCIDENT_TYPE_ICON } from '../rules'
import { dialog, inputContent, message } from '../naive'
import FeePanel from '../components/FeePanel.vue'
import type { IncidentType } from '../types'

const route = useRoute()
const courtId = ref((route.query.court as string) || 'c1')
const court = computed(() => courtById(courtId.value))

const clock = computed(() => fmtMin(nowMin.value))
const cur = computed(() => {
  const b = currentBooking(courtId.value)
  if (b) markNoShowIfNeeded(b)
  return b && b.status !== 'noshow' ? b : undefined
})
const next = computed(() => nextBooking(courtId.value))

const remainMin = computed(() => (cur.value ? Math.max(0, cur.value.endMin - nowMin.value) : 0))
const remainPct = computed(() => {
  if (!cur.value) return 0
  const total = cur.value.endMin - cur.value.startMin
  return Math.round((1 - remainMin.value / total) * 100)
})

const bill = computed(() => (cur.value ? computeBill(cur.value, court.value, nowMin.value) : null)!)
const lightOn = computed(() => !!cur.value && cur.value.lightOnAt != null && cur.value.lightOffAt == null)
const arrived = computed(() => {
  if (!cur.value) return 0
  return cur.value.members.filter(m => m.checkedIn).length +
    cur.value.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.checkedIn, 0)
})
const booked = computed(() => {
  if (!cur.value) return 0
  return cur.value.headcount + cur.value.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.count, 0)
})
const shareCount = computed(() =>
  cur.value ? cur.value.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.count, 0) : 0,
)

const code = ref('')
const name = ref('')

function doCheckin() {
  if (!code.value || !name.value) {
    message.warning('请输入核验码和姓名')
    return
  }
  const res = checkinByCode(code.value, name.value.trim())
  res.ok ? message.success(res.msg) : message.error(res.msg)
  if (res.ok) name.value = ''
}

function doShareCheckin() {
  if (!code.value) {
    message.warning('请输入核验码')
    return
  }
  const res = checkinShare(code.value)
  res.ok ? message.success(res.msg) : message.error(res.msg)
}

function leave() {
  if (!cur.value) return
  leaveAndSettle(cur.value.id)
  message.success('已离场结算：按实际照明时长计费（最低 30 分钟），押金余额退回')
}

function refuseShare() {
  if (!cur.value) return
  refuseShareOnsite(cur.value.id)
  message.error('已记录拒拼：押金扣 50%，信用 -15，7 日内限制预约')
}

function forceClear() {
  if (!cur.value) return
  leaveAndSettle(cur.value.id)
  message.warning('已强制清场并结算（超时部分按 1.5 倍计费）')
}

function closeCourtDlg() {
  const reason = { value: '' }
  dialog.warning({
    title: '封场确认',
    content: inputContent('封场原因，如：地面抢修', reason),
    positiveText: '确认封场',
    onPositiveClick: () => {
      closeCourt(courtId.value, reason.value || '临时封场')
      message.warning('已封场：在册预约全额退款并给予优先改约权')
    },
  })
}

function msg() {
  message.success('已解除封场')
}

const incidentTypes: { type: IncidentType; label: string; icon: string }[] = [
  { type: 'rain', label: '下雨地滑', icon: '🌧️' },
  { type: 'maintenance', label: '场地维修', icon: '🔧' },
  { type: 'dispute', label: '争抢篮筐', icon: '🏀' },
  { type: 'noise', label: '噪声投诉', icon: '🔊' },
  { type: 'minor', label: '未成年人滞留', icon: '🧒' },
  { type: 'light', label: '照明故障', icon: '💡' },
]

function report(type: IncidentType, label: string) {
  const detail = { value: '' }
  dialog.info({
    title: `上报：${label}`,
    content: inputContent('补充说明（可选）', detail),
    positiveText: '提交',
    onPositiveClick: () => {
      reportIncident(type, courtId.value, `${label} · ${court.value.name}`, detail.value || '现场上报', cur.value?.id)
      message.success('已上报，管理员与社区工作人员将收到提醒')
    },
  })
}

const courtIncidents = computed(() =>
  store.incidents.filter(i => i.courtId === courtId.value && i.status !== 'resolved').slice(0, 5),
)

const icon = (t: string) => INCIDENT_TYPE_ICON[t] ?? '⚠️'
</script>
