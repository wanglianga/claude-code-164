<template>
  <div>
    <!-- 个人信息 -->
    <n-card size="small" style="margin-bottom:10px">
      <div class="row between">
        <div>
          <div style="font-size:16px;font-weight:700">{{ store.me }} <span class="muted">{{ roleText }}</span></div>
          <div class="muted mt8">信用分
            <b :style="{ color: credit >= 80 ? '#18a058' : '#e8801a', fontSize: '18px' }">{{ credit }}</b>
            <span v-if="credit < 80" style="color:#d03050"> · 黄金时段预约受限</span>
            <span v-if="credit < 60" style="color:#d03050"> · 暂停预约 7 日</span>
          </div>
        </div>
        <n-progress type="circle" :percentage="credit" :stroke-width="8" style="width:64px" :color="credit >= 80 ? '#18a058' : '#e8801a'" />
      </div>
    </n-card>

    <!-- 与我相关的改约/限制记录 -->
    <n-alert v-for="a in myAdjustments" :key="a.id" type="warning" size="small" style="margin-bottom:8px" :title="`${a.action} · ${a.time}`">
      {{ a.reason }}
      <n-button text type="primary" size="tiny" @click="$router.push('/fairness')">规则依据 ›</n-button>
    </n-alert>

    <div class="section-title">我的预约</div>
    <n-empty v-if="!myBookings.length" description="暂无预约，去场地页挑一个时段吧" />
    <BookingCard v-for="b in myBookings" :key="b.id" :b="b" />

    <div class="section-title">全部账单（含历史场次）</div>
    <n-card v-for="b in billedBookings" :key="`bill-${b.id}`" size="small" style="margin-bottom:8px" hoverable @click="openBill(b.id)">
      <div class="row between">
        <span>{{ b.date }} {{ fmtMin(b.startMin) }} · {{ courtById(b.courtId).name }} · {{ b.teamName }}</span>
        <n-tag size="small" :type="payType(b.pay)">{{ payText(b.pay) }}</n-tag>
      </div>
    </n-card>

    <n-modal v-model:show="showBill" preset="card" title="账单明细" style="max-width:480px">
      <FeePanel v-if="billOf" :bill="billOf" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NAlert, NButton, NCard, NEmpty, NModal, NProgress, NTag } from 'naive-ui'
import { courtById, myUser, nowMin, store } from '../store'
import { computeBill, type Bill } from '../fee'
import { fmtMin } from '../time'
import BookingCard from '../components/BookingCard.vue'
import FeePanel from '../components/FeePanel.vue'

const me = computed(() => myUser())
const credit = computed(() => me.value?.credit ?? 100)
const roleText = computed(() => ({ captain: '球队队长', player: '散客', admin: '管理员', staff: '社区工作人员' }[store.role]))

const myBookings = computed(() =>
  store.bookings
    .filter(b => b.captain === store.me || b.members.some(m => m.name === store.me))
    .filter(b => b.status === 'upcoming' || b.status === 'active')
    .sort((a, b) => a.startMin - b.startMin),
)

const billedBookings = computed(() =>
  store.bookings
    .filter(b => b.captain === store.me || b.members.some(m => m.name === store.me))
    .sort((a, b) => (a.date + a.startMin).localeCompare(b.date + b.startMin))
    .reverse(),
)

const myAdjustments = computed(() =>
  store.adjustments.filter(a => {
    const u = me.value
    return u?.team ? a.target.includes(u.team) || a.target.includes(store.me) : a.target.includes(store.me)
  }).slice(0, 3),
)

const showBill = ref(false)
const billOf = ref<Bill | null>(null)
function openBill(id: string) {
  const b = store.bookings.find(x => x.id === id)
  if (!b) return
  billOf.value = computeBill(b, courtById(b.courtId), nowMin.value)
  showBill.value = true
}

const payText = (p: string) => ({ unpaid: '未支付', deposit: '已付押金', settled: '已结算', refunded: '已退款' }[p] ?? p)
const payType = (p: string) => ({ unpaid: 'error', deposit: 'warning', settled: 'success', refunded: 'info' }[p] as 'error' | 'warning' | 'success' | 'info')
</script>
