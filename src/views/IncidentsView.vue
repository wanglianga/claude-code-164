<template>
  <div>
    <n-radio-group v-model:value="filter" size="small" style="margin-bottom:10px">
      <n-radio-button value="all">全部</n-radio-button>
      <n-radio-button value="open">待处理</n-radio-button>
      <n-radio-button value="processing">处理中</n-radio-button>
      <n-radio-button value="resolved">已结案</n-radio-button>
    </n-radio-group>

    <n-empty v-if="!list.length" description="暂无事件" />
    <n-card v-for="i in list" :key="i.id" size="small" style="margin-bottom:10px" hoverable @click="open(i)">
      <div class="row between">
        <b>{{ icon(i.type) }} {{ i.title }}</b>
        <n-tag size="small" :type="i.status === 'resolved' ? 'default' : i.status === 'processing' ? 'warning' : 'error'">
          {{ statusText(i.status) }}
        </n-tag>
      </div>
      <div class="muted mt8">📍 {{ courtById(i.courtId).name }} · {{ i.createdAt }} · 上报人：{{ i.reporter }}</div>
      <div class="mt8">{{ i.detail }}</div>
      <div v-if="i.resolution" class="mt8">
        <n-tag size="small" type="success">处理结果</n-tag> {{ i.resolution }}
      </div>
      <div v-if="i.penalty" class="mt8">
        <n-tag size="small" type="error">处罚</n-tag> {{ i.penalty }}
      </div>
    </n-card>

    <!-- 事件详情：权益-核验-退款-投诉-处罚 串联 -->
    <n-modal v-model:show="show" preset="card" :title="cur ? `${icon(cur.type)} ${cur.title}` : ''" style="max-width:480px">
      <template v-if="cur">
        <n-descriptions :column="1" size="small" bordered>
          <n-descriptions-item label="场地">{{ courtById(cur.courtId).name }}</n-descriptions-item>
          <n-descriptions-item label="类型">{{ typeText(cur.type) }}</n-descriptions-item>
          <n-descriptions-item label="上报">{{ cur.createdAt }} · {{ cur.reporter }}</n-descriptions-item>
          <n-descriptions-item v-if="linked" label="关联预约权益">
            {{ linked.teamName }} {{ linked.date }} {{ fmtMin(linked.startMin) }}–{{ fmtMin(linked.endMin) }}
            （{{ payText(linked.pay) }}<span v-if="linked.deposit">，押金 ¥{{ linked.deposit }}</span>）
          </n-descriptions-item>
          <n-descriptions-item v-if="cur.refundAmount" label="退款/补偿">¥{{ cur.refundAmount }}</n-descriptions-item>
          <n-descriptions-item v-if="cur.penalty" label="后续处罚">{{ cur.penalty }}</n-descriptions-item>
        </n-descriptions>

        <div class="section-title" style="font-size:13px">投诉与处理记录</div>
        <n-timeline>
          <n-timeline-item v-for="(l, idx) in cur.log" :key="idx" :content="l" />
        </n-timeline>

        <n-alert type="info" size="small" :show-icon="false" style="margin-bottom:10px">
          处理依据：{{ ruleText }}
        </n-alert>

        <!-- 社区/管理员补充记录 -->
        <div v-if="(store.role === 'staff' || store.role === 'admin') && cur.status !== 'resolved'" class="row" style="gap:8px">
          <n-input v-model:value="logText" size="small" placeholder="补充现场核验/沟通记录" style="flex:1" />
          <n-button size="small" @click="addLog">记录</n-button>
        </div>

        <!-- 管理员结案 -->
        <template v-if="store.role === 'admin' && cur.status !== 'resolved'">
          <n-divider style="margin:12px 0" />
          <n-input v-model:value="resolution" type="textarea" size="small" placeholder="处理结果说明（含退款/补偿依据）" style="margin-bottom:8px" />
          <div class="row" style="gap:8px; margin-bottom:8px">
            <n-input-number v-model:value="refund" :min="0" size="small" placeholder="退款 ¥" style="flex:1" />
            <n-input v-model:value="penalty" size="small" placeholder="处罚（如：信用 -10，限约 7 日）" style="flex:2" />
          </div>
          <n-button type="primary" block @click="resolve">结案并执行退款/处罚</n-button>
        </template>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NAlert, NButton, NCard, NDescriptions, NDescriptionsItem, NDivider, NEmpty, NInput, NInputNumber, NModal, NRadioButton, NRadioGroup, NTag, NTimeline, NTimelineItem } from 'naive-ui'
import { appendIncidentLog, bookingById, courtById, resolveIncident, store } from '../store'
import { INCIDENT_TYPE_ICON, INCIDENT_TYPE_TEXT, RULES } from '../rules'
import { fmtMin } from '../time'
import { message } from '../naive'
import type { Incident } from '../types'

const filter = ref<'all' | 'open' | 'processing' | 'resolved'>('all')
const list = computed(() =>
  store.incidents.filter(i => filter.value === 'all' || i.status === filter.value),
)

const show = ref(false)
const cur = ref<Incident | null>(null)
const logText = ref('')
const resolution = ref('')
const refund = ref(0)
const penalty = ref('')

const linked = computed(() => (cur.value?.bookingId ? bookingById(cur.value.bookingId) : undefined))
const ruleText = computed(() => {
  if (!cur.value) return ''
  const map: Record<string, string> = {
    rain: 'rain', maintenance: 'maintain', dispute: 'dispute', noise: 'noise',
    minor: 'minor', light: 'lightfail', closure: 'closure',
  }
  const r = RULES.find(x => x.id === map[cur.value!.type])
  return r ? `${r.title}：${r.text}` : ''
})

function open(i: Incident) {
  cur.value = i
  logText.value = ''
  resolution.value = i.resolution ?? ''
  refund.value = i.refundAmount ?? 0
  penalty.value = i.penalty ?? ''
  show.value = true
}

function addLog() {
  if (!cur.value || !logText.value.trim()) return
  appendIncidentLog(cur.value.id, logText.value.trim())
  logText.value = ''
  message.success('已记录')
}

function resolve() {
  if (!cur.value || !resolution.value.trim()) {
    message.warning('请填写处理结果')
    return
  }
  resolveIncident(cur.value.id, resolution.value.trim(), refund.value, penalty.value.trim())
  show.value = false
  message.success('已结案，退款与处罚已同步到预约与信用记录')
}

const icon = (t: string) => INCIDENT_TYPE_ICON[t] ?? '⚠️'
const typeText = (t: string) => INCIDENT_TYPE_TEXT[t] ?? t
const statusText = (s: string) => (s === 'resolved' ? '已结案' : s === 'processing' ? '处理中' : '待处理')
const payText = (p: string) => ({ unpaid: '未支付', deposit: '已付押金', settled: '已结算', refunded: '已退款' }[p as 'unpaid' | 'deposit' | 'settled' | 'refunded'] ?? p)
</script>
