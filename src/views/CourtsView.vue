<template>
  <div>
    <!-- 突发预警横幅 -->
    <n-alert v-for="a in alerts" :key="a.id" :type="a.type === 'rain' ? 'warning' : 'error'" size="small"
      style="margin-bottom:8px" :title="a.title">
      {{ a.detail }}
    </n-alert>

    <n-card size="small" style="margin-bottom:10px" @click="$router.push('/fairness')" hoverable>
      <div class="row between">
        <span>⚖️ 公共资源公平性公示：黄金时段限约、散客保障、改约留痕</span>
        <span class="muted">查看 ›</span>
      </div>
    </n-card>

    <CourtCard v-for="c in store.courts" :key="c.id" :court="c" @book="goBook" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NAlert, NCard } from 'naive-ui'
import { store } from '../store'
import CourtCard from '../components/CourtCard.vue'

const router = useRouter()

const alerts = computed(() =>
  store.incidents.filter(i => (i.type === 'rain' || i.type === 'maintenance') && i.status === 'open'),
)

function goBook(courtId: string, startMin?: number) {
  router.push({ path: '/book', query: { court: courtId, start: startMin } })
}
</script>
