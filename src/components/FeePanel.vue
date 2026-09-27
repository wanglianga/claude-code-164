<template>
  <div>
    <n-descriptions :column="2" size="small" bordered>
      <n-descriptions-item label="照明时长">{{ bill.lightingMin }} 分钟</n-descriptions-item>
      <n-descriptions-item label="超时占用">{{ bill.overtimeMin }} 分钟</n-descriptions-item>
      <n-descriptions-item label="押金">¥{{ bill.deposit }}</n-descriptions-item>
      <n-descriptions-item label="状态">{{ bill.settled ? '已结算' : '计费中（预估）' }}</n-descriptions-item>
    </n-descriptions>

    <n-timeline style="margin-top:12px">
      <n-timeline-item
        v-for="(l, i) in bill.lines" :key="i"
        :type="l.kind === 'penalty' ? 'error' : l.kind === 'refund' || l.kind === 'comp' ? 'success' : 'info'"
        :title="`${l.label}  ${l.amount > 0 ? '+' : ''}¥${l.amount.toFixed(2)}`"
        :content="l.note" />
    </n-timeline>

    <n-alert v-if="bill.splitNote" type="info" size="small" :show-icon="false" style="margin-bottom:8px">
      🤝 {{ bill.splitNote }}
    </n-alert>

    <n-result v-if="bill.settled" size="small" status="info"
      :title="bill.extraDue > 0 ? `需补交 ¥${bill.extraDue.toFixed(2)}` : `应退 ¥${bill.refund.toFixed(2)}`"
      :description="`应收合计 ¥${bill.total.toFixed(2)}，押金 ¥${bill.deposit} 多退少补`" />
    <n-alert v-else type="warning" size="small" :show-icon="false">
      照明仍在计费中，当前为预估值；关灯或离场后出最终账单。
    </n-alert>
  </div>
</template>

<script setup lang="ts">
import { NAlert, NDescriptions, NDescriptionsItem, NResult, NTimeline, NTimelineItem } from 'naive-ui'
import type { Bill } from '../fee'

defineProps<{ bill: Bill }>()
</script>
