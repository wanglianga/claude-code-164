<template>
  <div>
    <n-alert type="info" size="small" style="margin-bottom:10px" :show-icon="false">
      🤝 拼场规则：照明费按人数分摊，人越多越省钱；队长确认后凭同一核验码到场签到。
      每片场地每日至少保留 2 个散客保障时段（fair-2 条款）。
    </n-alert>

    <div class="section-title">可加入的拼场</div>
    <n-empty v-if="!openGames.length" description="暂无开放拼场的场次" />
    <n-card v-for="g in openGames" :key="g.b.id" size="small" style="margin-bottom:10px">
      <div class="row between">
        <div>
          <div><b>{{ g.b.teamName }}</b> · {{ g.b.area === 'full' ? '全场' : '半场' }}</div>
          <div class="muted">📍 {{ g.court.name }} · {{ g.b.date }} {{ fmtMin(g.b.startMin) }}–{{ fmtMin(g.b.endMin) }}</div>
          <div class="row wrap mt8" style="gap:6px">
            <n-tag size="small" type="info">已有 {{ g.people }} 人</n-tag>
            <n-tag size="small" type="success">还可加 {{ g.left }} 人</n-tag>
            <n-tag v-if="g.b.needLighting" size="small" type="warning">💡 照明费按人数分摊</n-tag>
          </div>
        </div>
      </div>
      <div class="row mt8" style="gap:8px">
        <n-input-number v-model:value="g.count" :min="1" :max="g.left" size="small" style="width:110px" />
        <n-button type="primary" size="small" :disabled="store.role === 'admin'" @click="apply(g)">申请加入</n-button>
        <span v-if="g.myStatus" class="muted">{{ g.myStatus }}</span>
      </div>
    </n-card>

    <div class="section-title">我的拼场申请</div>
    <n-empty v-if="!myApps.length" description="还没有申请，去上面挑一场吧" />
    <n-card v-for="a in myApps" :key="a.share.id" size="small" style="margin-bottom:8px">
      <div class="row between">
        <div>
          <div>{{ a.b.teamName }} · {{ a.b.date }} {{ fmtMin(a.b.startMin) }}–{{ fmtMin(a.b.endMin) }}</div>
          <div class="muted">📍 {{ courtById(a.b.courtId).name }} · 申请 {{ a.share.count }} 人</div>
        </div>
        <n-tag size="small" :type="a.share.status === 'confirmed' ? 'success' : a.share.status === 'pending' ? 'warning' : 'default'">
          {{ a.share.status === 'confirmed' ? '已确认' : a.share.status === 'pending' ? '待队长确认' : '已被拒绝' }}
        </n-tag>
      </div>
      <div v-if="a.share.status === 'confirmed'" class="row between mt8">
        <span class="muted">凭核验码到场签到</span>
        <span class="big-code" style="font-size:20px">{{ a.b.code }}</span>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NAlert, NButton, NCard, NEmpty, NInputNumber, NTag } from 'naive-ui'
import { applyShare, capacityOf, courtById, store } from '../store'
import { fmtMin, todayStr } from '../time'
import { message } from '../naive'

const openGames = computed(() =>
  store.bookings
    .filter(b => b.acceptShare && (b.status === 'upcoming' || b.status === 'active') && b.date >= todayStr())
    .map(b => {
      const confirmed = b.shares.filter(s => s.status === 'confirmed').reduce((s, x) => s + x.count, 0)
      const people = b.headcount + confirmed
      const left = capacityOf(b.area) - people
      const mine = b.shares.find(s => s.applicant === store.me)
      return {
        b, court: courtById(b.courtId), people, left,
        count: 1,
        myStatus: mine ? (mine.status === 'confirmed' ? '✓ 已确认' : mine.status === 'pending' ? '待确认' : '') : '',
      }
    })
    .filter(g => g.left > 0)
    .sort((a, b) => a.b.startMin - b.b.startMin),
)

const myApps = computed(() =>
  store.bookings.flatMap(b =>
    b.shares.filter(s => s.applicant === store.me).map(share => ({ b, share })),
  ),
)

function apply(g: { b: { id: string }; count: number }) {
  const res = applyShare(g.b.id, g.count)
  if (res.ok) message.success(res.msg)
  else message.error(res.msg)
}
</script>
