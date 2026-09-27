<template>
  <div>
    <n-alert type="info" size="small" style="margin-bottom:10px" :show-icon="false">
      ⚖️ 公共场地属于全体市民：同一片场地既服务固定球队，也服务临时散客和周边居民。
      所有改约、限制均引用下列条款并留痕，可在 3 日内申诉（fair-3）。
    </n-alert>

    <!-- 黄金时段分配 -->
    <n-card size="small" title="本周黄金时段（18:00–22:00）使用分布" style="margin-bottom:10px">
      <div v-for="row in distRows" :key="row.label" style="margin-bottom:10px">
        <div class="row between mb8">
          <span>{{ row.label }}</span>
          <span class="muted">{{ row.hours.toFixed(1) }} 小时 · {{ row.pct }}%</span>
        </div>
        <n-progress type="line" :percentage="row.pct" :color="row.color" :show-indicator="false" />
      </div>
      <div class="muted">散客保障障：每片场地每日至少 2 个时段开放拼场；场地紧张时接受拼场者优先（fair-2）。</div>
    </n-card>

    <!-- 改约/限制留痕 -->
    <n-card size="small" title="改约与限制公示（为什么某一方被改约/限制）" style="margin-bottom:10px">
      <n-timeline>
        <n-timeline-item v-for="a in store.adjustments" :key="a.id"
          :type="a.action.includes('限制') ? 'error' : a.action.includes('取消') ? 'warning' : 'info'"
          :title="`${a.target} · ${a.action}`"
          :content="`${a.time}｜${a.reason}（依据 ${a.ruleId}：${ruleTitle(a.ruleId)}）`" />
      </n-timeline>
    </n-card>

    <!-- 规则公示 -->
    <n-card size="small" title="规则公示">
      <n-tabs type="line" size="small">
        <n-tab-pane v-for="cat in categories" :key="cat" :name="cat" :tab="cat">
          <n-collapse>
            <n-collapse-item v-for="r in rulesOf(cat)" :key="r.id" :title="`${r.title}（${r.id}）`" :name="r.id">
              {{ r.text }}
            </n-collapse-item>
          </n-collapse>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NCard, NCollapse, NCollapseItem, NProgress, NTabPane, NTabs, NTimeline, NTimelineItem } from 'naive-ui'
import { fairnessStats, store } from '../store'
import { RULES, ruleById } from '../rules'

const stats = computed(() => fairnessStats())
const distRows = computed(() => {
  const s = stats.value
  const total = s.team + s.share + s.resident || 1
  return [
    { label: '🏀 固定球队（预约包场）', hours: s.team, pct: Math.round((s.team / total) * 100), color: '#18a058' },
    { label: '🤝 散客拼场（含混合场次）', hours: s.share, pct: Math.round((s.share / total) * 100), color: '#2080f0' },
    { label: '🏘 周边居民（自由晨练时段）', hours: s.resident, pct: Math.round((s.resident / total) * 100), color: '#f0a020' },
  ]
})

const categories = ['照明计费', '现场秩序', '突发事件', '公平分配']
const rulesOf = (cat: string) => RULES.filter(r => r.category === cat)
const ruleTitle = (id: string) => ruleById(id)?.title ?? id
</script>
