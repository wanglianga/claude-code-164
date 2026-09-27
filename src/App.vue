<template>
  <div class="app-shell">
    <header class="app-header">
      <span style="font-size:20px">🏀</span>
      <span class="title">公共篮球场 · {{ route.meta.title ?? '' }}</span>
      <n-button size="tiny" quaternary style="color:#fff" @click="$router.push('/fairness')">⚖️ 公平</n-button>
      <n-button v-if="store.role === 'admin'" size="tiny" quaternary style="color:#fff" @click="$router.push('/admin')">后台</n-button>
      <n-select
        :value="store.role" size="small" style="width:118px"
        :options="roleOptions" @update:value="onRole" />
    </header>

    <main class="app-body">
      <router-view />
    </main>

    <nav class="app-tabbar">
      <router-link v-for="t in tabs" :key="t.path" :to="t.path" :class="{ active: isActive(t.path) }">
        <span class="ico">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { NButton, NSelect } from 'naive-ui'
import { setRole, store } from './store'
import type { Role } from './types'

const route = useRoute()

const roleOptions = [
  { label: '👤 队长', value: 'captain' },
  { label: '🚶 散客', value: 'player' },
  { label: '🛠 管理员', value: 'admin' },
  { label: '🏘 社区', value: 'staff' },
]

function onRole(v: Role) {
  setRole(v)
}

const tabs = computed(() => {
  if (store.role === 'admin') {
    return [
      { path: '/courts', icon: '🏟', label: '场地' },
      { path: '/onsite', icon: '📍', label: '现场' },
      { path: '/admin', icon: '📊', label: '后台' },
      { path: '/incidents', icon: '⚠️', label: '事件' },
      { path: '/my', icon: '👤', label: '我的' },
    ]
  }
  if (store.role === 'staff') {
    return [
      { path: '/courts', icon: '🏟', label: '场地' },
      { path: '/onsite', icon: '📍', label: '现场' },
      { path: '/incidents', icon: '⚠️', label: '事件' },
      { path: '/fairness', icon: '⚖️', label: '公平' },
      { path: '/my', icon: '👤', label: '我的' },
    ]
  }
  return [
    { path: '/courts', icon: '🏟', label: '场地' },
    { path: '/share', icon: '🤝', label: '拼场' },
    { path: '/onsite', icon: '📍', label: '现场' },
    { path: '/incidents', icon: '⚠️', label: '事件' },
    { path: '/my', icon: '👤', label: '我的' },
  ]
})

function isActive(path: string) {
  return route.path === path || (path === '/courts' && route.path === '/book')
}
</script>
