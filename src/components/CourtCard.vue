<template>
  <n-card size="small" :bordered="true" style="margin-bottom:10px">
    <template #header>
      <div class="row between">
        <span>{{ court.closed ? '🚧' : '🏟' }} {{ court.name }}</span>
        <n-tag v-if="court.closed" type="error" size="small">已封场</n-tag>
        <n-tag v-else-if="court.surfaceLevel === 'slippery'" type="warning" size="small">雨后湿滑</n-tag>
        <n-tag v-else type="success" size="small">开放中</n-tag>
      </div>
    </template>

    <div class="muted mb8">📍 {{ court.location }}</div>

    <div class="row wrap" style="gap:6px">
      <n-tag size="small" :type="court.surfaceLevel === 'good' ? 'success' : 'warning'">地面：{{ court.surface }}</n-tag>
      <n-tag size="small" :type="court.hoopOk ? 'success' : 'error'">篮筐：{{ court.hoopStatus }}</n-tag>
      <n-tag v-if="court.noiseSensitive" size="small" type="warning">🔇 噪声敏感</n-tag>
      <n-tag size="small" type="info">🔒 更衣柜 {{ court.lockersFree }}/{{ court.lockersTotal }}</n-tag>
      <n-tag size="small" type="info">💡 照明 ¥{{ court.lightRateHalf }}/¥{{ court.lightRateFull }}·30分钟</n-tag>
    </div>

    <n-alert v-if="court.noiseSensitive && court.noiseNote" type="warning" size="small" style="margin-top:8px" :show-icon="false">
      {{ court.noiseNote }}
    </n-alert>
    <n-alert v-if="court.closed" type="error" size="small" style="margin-top:8px" :show-icon="false">
      封场原因：{{ court.closedReason }}（在册预约已全额退款并给予优先改约权）
    </n-alert>

    <div class="section-title" style="font-size:13px">今日时段</div>
    <div class="slot-grid">
      <div
        v-for="s in slots" :key="s.start"
        class="slot-cell" :class="{ taken: s.taken, night: s.night }"
        @click="!s.taken && !court.closed && $emit('book', court.id, s.start)"
      >
        {{ s.label }}
      </div>
    </div>

    <div class="row mt12" style="gap:8px">
      <n-button type="primary" block :disabled="court.closed" @click="$emit('book', court.id)">
        {{ court.closed ? '已封场' : '预约该场地' }}
      </n-button>
      <n-button block tertiary @click="$router.push(`/onsite?court=${court.id}`)">现场情况</n-button>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton, NCard, NTag } from 'naive-ui'
import type { Court } from '../types'
import { bookingsOf } from '../store'
import { fmtMin, isNightSlot, slotStarts, SLOT, todayStr } from '../time'

const props = defineProps<{ court: Court }>()
defineEmits<{ book: [courtId: string, startMin?: number] }>()

const slots = computed(() =>
  slotStarts().map(start => ({
    start,
    label: fmtMin(start),
    night: isNightSlot(start, start + SLOT),
    taken: bookingsOf(props.court.id, todayStr()).some(b => b.startMin <= start && start < b.endMin),
  })),
)
</script>
