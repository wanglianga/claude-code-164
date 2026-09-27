<template>
  <n-card size="small" style="margin-bottom:10px">
    <template #header>
      <div class="row between">
        <span>{{ b.teamName }} · {{ b.area === 'full' ? '全场' : '半场' }}</span>
        <n-tag size="small" :type="statusType">{{ statusText }}</n-tag>
      </div>
    </template>

    <div class="row between">
      <div>
        <div>📍 {{ court.name }}</div>
        <div class="muted">{{ b.date }} {{ fmtMin(b.startMin) }}–{{ fmtMin(b.endMin) }} · {{ b.headcount }} 人
          <span v-if="b.needLighting">· 💡夜场</span>
          <span v-if="b.acceptShare">· 🤝接受拼场</span>
        </div>
      </div>
      <div style="text-align:center">
        <div class="muted">核验码</div>
        <div class="big-code">{{ b.code }}</div>
      </div>
    </div>

    <!-- 队员签到情况 -->
    <div class="mt8">
      <div class="muted mb8">队员签到（{{ checkedCount }}/{{ b.members.length }}）</div>
      <div class="row wrap" style="gap:6px">
        <n-tag v-for="m in b.members" :key="m.name" size="small" :type="m.checkedIn ? 'success' : 'default'">
          {{ m.checkedIn ? '✓ ' : '' }}{{ m.name }}{{ m.isMinor ? '（未成年）' : '' }}
        </n-tag>
        <n-button size="tiny" tertiary @click="invite">＋邀请</n-button>
      </div>
    </div>

    <!-- 拼场申请（队长处理） -->
    <div v-if="b.shares.length" class="mt8">
      <div class="muted mb8">拼场申请</div>
      <div v-for="s in b.shares" :key="s.id" class="row between mb8">
        <span>🚶 {{ s.applicant }}（{{ s.count }} 人）
          <n-tag size="tiny" :type="s.status === 'confirmed' ? 'success' : s.status === 'pending' ? 'warning' : 'default'">
            {{ s.status === 'confirmed' ? `已确认·到场 ${s.checkedIn}/${s.count}` : s.status === 'pending' ? '待确认' : '已拒绝' }}
          </n-tag>
        </span>
        <span v-if="s.status === 'pending' && isMine" class="row" style="gap:4px">
          <n-button size="tiny" type="primary" @click="confirmShare(b.id, s.id, true)">同意</n-button>
          <n-button size="tiny" tertiary @click="confirmShare(b.id, s.id, false)">拒绝</n-button>
        </span>
      </div>
    </div>

    <div class="row mt8" style="gap:8px">
      <n-button size="small" tertiary @click="showFee = true">费用明细</n-button>
      <n-button v-if="b.status === 'upcoming' || b.status === 'active'" size="small" type="primary" tertiary
        @click="$router.push(`/onsite?court=${b.courtId}`)">去现场签到</n-button>
      <n-popconfirm v-if="b.status === 'upcoming'" @positive-click="cancel">
        <template #trigger><n-button size="small" tertiary type="error">取消预约</n-button></template>
        取消后押金全额退还，确定取消？
      </n-popconfirm>
    </div>

    <n-modal v-model:show="showFee" preset="card" :title="`费用明细 · ${b.teamName}`" style="max-width:480px">
      <FeePanel :bill="bill" />
      <div class="muted mt8">依据规则：light-1 照明计费 / light-2 押金 / late 迟到 / early 提前离场 / overtime 超时 / share 拼场（见「公平性」页公示）</div>
    </n-modal>
  </n-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NModal, NPopconfirm, NTag } from 'naive-ui'
import type { Booking } from '../types'
import { cancelBooking, confirmShare, courtById, nowMin, store } from '../store'
import { computeBill } from '../fee'
import { fmtMin } from '../time'
import { dialog, inputContent, message } from '../naive'
import FeePanel from './FeePanel.vue'

const props = defineProps<{ b: Booking }>()

const court = computed(() => courtById(props.b.courtId))
const bill = computed(() => computeBill(props.b, court.value, nowMin.value))
const showFee = ref(false)
const isMine = computed(() => props.b.captain === store.me)
const checkedCount = computed(() => props.b.members.filter(m => m.checkedIn).length)

const statusText = computed(() => ({
  upcoming: '待开始', active: '进行中', completed: '已完成', cancelled: '已取消', noshow: '爽约',
}[props.b.status]))
const statusType = computed(() => ({
  upcoming: 'info', active: 'success', completed: 'default', cancelled: 'default', noshow: 'error',
}[props.b.status] as 'info' | 'success' | 'default' | 'error'))

function invite() {
  const name = { value: '' }
  dialog.info({
    title: '邀请队员',
    content: inputContent('输入队员姓名', name),
    positiveText: '添加',
    onPositiveClick: () => {
      if (!name.value.trim()) return
      props.b.members.push({ name: name.value.trim(), checkedIn: false })
      message.success(`已添加队员 ${name.value}，告知其核验码 ${props.b.code} 即可现场签到`)
    },
  })
}

function cancel() {
  cancelBooking(props.b.id, '用户主动取消，押金全额退还。')
  message.success('已取消，押金将原路退回')
}
</script>
