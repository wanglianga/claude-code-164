<template>
  <div>
    <!-- 今日概览 -->
    <n-grid :cols="4" :x-gap="8" style="margin-bottom:10px">
      <n-gi><n-statistic label="今日场次" :value="todayBookings.length" /></n-gi>
      <n-gi><n-statistic label="预约人数" :value="totalBooked" /></n-gi>
      <n-gi><n-statistic label="实际到场" :value="totalArrived" /></n-gi>
      <n-gi><n-statistic label="待处理事件" :value="openIncidents" /></n-gi>
    </n-grid>

    <n-card size="small" style="margin-bottom:10px">
      <div class="row between">
        <span>🕐 演示时钟</span>
        <span class="row">
          <n-button size="tiny" tertiary @click="advanceNow(-15)">-15分</n-button>
          <b class="mono">{{ clock }}</b>
          <n-button size="tiny" tertiary @click="advanceNow(15)">+15分</n-button>
        </span>
      </div>
    </n-card>

    <!-- 分场地时段表 -->
    <div v-for="c in store.courts" :key="c.id">
      <div class="section-title row between">
        <span>{{ c.name }}
          <n-tag v-if="c.closed" size="small" type="error">已封场</n-tag>
          <n-tag v-else-if="!c.hoopOk" size="small" type="warning">篮筐维修</n-tag>
        </span>
        <n-button v-if="!c.closed" size="tiny" tertiary type="error" @click="closeCourtDlg(c.id)">封场</n-button>
        <n-button v-else size="tiny" tertiary type="success" @click="openCourt(c.id)">解封</n-button>
      </div>
      <n-card size="small" style="margin-bottom:12px" :content-style="{ padding: '4px 8px' }">
        <div v-for="row in rowsOf(c.id)" :key="row.start" class="slot-row" :class="{ active: row.current }">
          <span class="mono" style="width:44px">{{ row.label }}</span>
          <template v-if="row.data">
            <span style="flex:1">
              {{ row.data.booking.teamName }}
              <n-tag size="tiny" :type="riskType(row.data.risk.level)">{{ row.data.risk.level }}风险</n-tag>
            </span>
            <span class="muted" style="width:74px">约{{ row.data.booked }}/到{{ row.data.arrived }}</span>
            <n-tag size="tiny" :type="payType(row.data.booking.pay)" style="width:52px;text-align:center">{{ payText(row.data.booking.pay) }}</n-tag>
            <n-button size="tiny" tertiary @click="openDetail(row.data.booking.id)">详情</n-button>
          </template>
          <span v-else class="muted" style="flex:1">空闲</span>
        </div>
      </n-card>
    </div>

    <!-- 预约详情抽屉 -->
    <n-drawer v-model:show="showDetail" :width="360" placement="right">
      <n-drawer-content v-if="detail" title="时段详情" closable>
        <n-descriptions :column="1" size="small" bordered>
          <n-descriptions-item label="队伍">{{ detail.teamName }}（队长 {{ detail.captain }}）</n-descriptions-item>
          <n-descriptions-item label="时间">{{ detail.date }} {{ fmtMin(detail.startMin) }}–{{ fmtMin(detail.endMin) }}</n-descriptions-item>
          <n-descriptions-item label="预约人数">{{ detail.headcount }} + 拼场 {{ shareCountOf(detail) }}</n-descriptions-item>
          <n-descriptions-item label="实际到场">{{ arrivedOf(detail) }}</n-descriptions-item>
          <n-descriptions-item label="支付状态">{{ payText(detail.pay) }}（押金 ¥{{ detail.deposit }}）</n-descriptions-item>
          <n-descriptions-item label="冲突风险">
            <n-tag size="small" :type="riskType(riskOf(detail).level)">{{ riskOf(detail).level }}</n-tag>
            <div v-for="(r, i) in riskOf(detail).reasons" :key="i" class="muted">· {{ r }}</div>
            <div v-if="!riskOf(detail).reasons.length" class="muted">无明显风险</div>
          </n-descriptions-item>
        </n-descriptions>
        <div class="row wrap mt12" style="gap:8px">
          <n-button size="small" @click="$router.push(`/onsite?court=${detail.courtId}`)">去现场页</n-button>
          <n-popconfirm @positive-click="adminCancel">
            <template #trigger><n-button size="small" tertiary type="error">取消该预约</n-button></template>
            取消后押金全额退还并留痕公示，确定？
          </n-popconfirm>
        </div>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NDescriptions, NDescriptionsItem, NDrawer, NDrawerContent, NGi, NGrid, NPopconfirm, NStatistic, NTag } from 'naive-ui'
import {
  advanceNow, bookingById, cancelBooking, closeCourt, conflictRisk, nowMin,
  openCourt, slotRow, store,
} from '../store'
import { fmtMin, slotStarts, todayStr } from '../time'
import { dialog, inputContent, message } from '../naive'
import type { Booking } from '../types'

const clock = computed(() => fmtMin(nowMin.value))
const todayBookings = computed(() => store.bookings.filter(b => b.date === todayStr() && b.status !== 'cancelled'))
const totalBooked = computed(() =>
  todayBookings.value.reduce((s, b) => s + b.headcount + b.shares.filter(x => x.status === 'confirmed').reduce((t, x) => t + x.count, 0), 0),
)
const totalArrived = computed(() =>
  todayBookings.value.reduce((s, b) =>
    s + b.members.filter(m => m.checkedIn).length + b.shares.filter(x => x.status === 'confirmed').reduce((t, x) => t + x.checkedIn, 0), 0),
)
const openIncidents = computed(() => store.incidents.filter(i => i.status !== 'resolved').length)

function rowsOf(courtId: string) {
  const m = nowMin.value
  return slotStarts().map(start => ({
    start,
    label: fmtMin(start),
    current: start <= m && m < start + 60,
    data: slotRow(courtId, todayStr(), start),
  }))
}

const showDetail = ref(false)
const detailId = ref('')
const detail = computed(() => (detailId.value ? bookingById(detailId.value) : undefined))

function openDetail(id: string) {
  detailId.value = id
  showDetail.value = true
}

function adminCancel() {
  if (!detail.value) return
  cancelBooking(detail.value.id, '管理员取消（场地调度），押金全额退还。')
  showDetail.value = false
  message.success('已取消并退款，记录已公示')
}

function closeCourtDlg(courtId: string) {
  const reason = { value: '' }
  dialog.warning({
    title: '封场确认',
    content: inputContent('封场原因，如：地面抢修', reason),
    positiveText: '确认封场',
    onPositiveClick: () => {
      closeCourt(courtId, reason.value || '临时封场')
      message.warning('已封场：在册预约全额退款并给予优先改约权')
    },
  })
}

const riskOf = (b: Booking) => conflictRisk(b)
const shareCountOf = (b: Booking) => b.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.count, 0)
const arrivedOf = (b: Booking) =>
  b.members.filter(m => m.checkedIn).length + b.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.checkedIn, 0)
const riskType = (l: string) => (l === '高' ? 'error' : l === '中' ? 'warning' : 'success') as 'error' | 'warning' | 'success'
const payText = (p: string) => ({ unpaid: '未支付', deposit: '已付押金', settled: '已结算', refunded: '已退款' }[p] ?? p)
const payType = (p: string) => ({ unpaid: 'error', deposit: 'warning', settled: 'success', refunded: 'info' }[p] as 'error' | 'warning' | 'success' | 'info')
</script>

<style scoped>
.slot-row {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 4px; font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}
.slot-row:last-child { border-bottom: none; }
.slot-row.active { background: #e8f7ef; border-radius: 6px; }
</style>
