<template>
  <div>
    <n-card size="small" title="预约场地">
      <n-form label-placement="top" size="medium">
        <n-form-item label="场地">
          <n-select v-model:value="form.courtId" :options="courtOptions" @update:value="onCourt" />
        </n-form-item>

        <n-alert v-if="court.closed" type="error" size="small" style="margin-bottom:8px" :show-icon="false">
          该场地已封场：{{ court.closedReason }}
        </n-alert>
        <n-alert v-else-if="!court.hoopOk" type="warning" size="small" style="margin-bottom:8px" :show-icon="false">
          {{ court.hoopStatus }}，仅可预约半场
        </n-alert>

        <n-form-item label="日期">
          <n-radio-group v-model:value="form.date">
            <n-radio-button :value="todayStr()">今天</n-radio-button>
            <n-radio-button :value="dateStr(1)">明天</n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="时段（🌙 = 夜间照明时段 18:00–22:00）">
          <div class="slot-grid" style="width:100%">
            <div v-for="s in slots" :key="s.start" class="slot-cell"
              :class="{ taken: s.taken, sel: s.sel, night: s.night }"
              @click="toggleSlot(s)">
              {{ s.label }}
            </div>
          </div>
        </n-form-item>

        <n-form-item label="半场 / 全场">
          <n-radio-group v-model:value="form.area">
            <n-radio-button value="half">半场（≤8 人）</n-radio-button>
            <n-radio-button value="full" :disabled="!court.hoopOk">全场（≤16 人）</n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="队伍名称">
          <n-input v-model:value="form.teamName" placeholder="如：闪电队" />
        </n-form-item>

        <n-form-item :label="`人数：${form.headcount} 人`">
          <n-slider v-model:value="form.headcount" :min="1" :max="form.area === 'full' ? 16 : 8" />
        </n-form-item>

        <n-form-item label="是否接受拼场（拼场成功照明费按人数分摊，更省钱）">
          <n-switch v-model:value="form.acceptShare">
            <template #checked>接受拼场</template>
            <template #unchecked>包场</template>
          </n-switch>
        </n-form-item>

        <n-form-item label="是否需要夜间照明">
          <n-switch v-model:value="form.needLighting" :disabled="!night">
            <template #checked>需要照明</template>
            <template #unchecked>不需要</template>
          </n-switch>
        </n-form-item>
      </n-form>

      <!-- 公平性提示 -->
      <n-alert v-if="goldenBlocked" type="error" size="small" style="margin-bottom:8px" title="黄金时段已达每周上限">
        本周黄金时段（18:00–22:00）已约 {{ golden }}/3 次。依据 fair-1 条款，请选择非黄金时段或接受拼场。
        <n-button text type="primary" size="tiny" @click="$router.push('/fairness')">查看规则</n-button>
      </n-alert>
      <n-alert v-else-if="night" type="info" size="small" style="margin-bottom:8px" :show-icon="false">
        本周黄金时段已约 {{ golden }}/3 次 · 夜场需缴照明押金 ¥30，结算后多退少补
      </n-alert>

      <!-- 费用预估 -->
      <n-descriptions :column="3" size="small" bordered style="margin-bottom:12px">
        <n-descriptions-item label="场地费">免费</n-descriptions-item>
        <n-descriptions-item label="照明押金">¥{{ est.deposit }}</n-descriptions-item>
        <n-descriptions-item label="预估照明费">¥{{ est.light }}</n-descriptions-item>
      </n-descriptions>

      <n-button type="primary" block class="big-btn" :disabled="!canSubmit" @click="submit">
        提交预约{{ est.deposit ? `（支付押金 ¥${est.deposit}）` : '' }}
      </n-button>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NCard, NDescriptions, NDescriptionsItem, NForm, NFormItem, NInput, NRadioButton, NRadioGroup, NSelect, NSlider, NSwitch } from 'naive-ui'
import { addBooking, courtById, goldenUsed, isSlotTaken, store } from '../store'
import { estimateFee } from '../fee'
import { dateStr, fmtMin, isNightSlot, slotStarts, SLOT, todayStr } from '../time'
import { message } from '../naive'
import type { Area } from '../types'

const route = useRoute()
const router = useRouter()

const form = reactive({
  courtId: (route.query.court as string) || 'c1',
  date: todayStr(),
  sel: [(route.query.start ? Number(route.query.start) : -1)] as number[],
  area: 'half' as Area,
  teamName: store.role === 'captain' ? '闪电队' : '我的队伍',
  headcount: 6,
  acceptShare: true,
  needLighting: true,
})

const court = computed(() => courtById(form.courtId))
const courtOptions = store.courts.map(c => ({ label: `${c.name}${c.closed ? '（已封场）' : ''}`, value: c.id, disabled: c.closed }))

const slots = computed(() =>
  slotStarts().map(start => ({
    start,
    label: fmtMin(start),
    night: isNightSlot(start, start + SLOT),
    taken: isSlotTaken(form.courtId, form.date, start, start + SLOT, form.area),
    sel: form.sel.includes(start),
  })),
)

/** 选中的连续时段 */
const range = computed(() => {
  if (!form.sel.length) return null
  const s = Math.min(...form.sel)
  const e = Math.max(...form.sel) + SLOT
  return { start: s, end: e }
})

const night = computed(() => !!range.value && isNightSlot(range.value.start, range.value.end))
const golden = computed(() => goldenUsed(form.teamName))
const goldenBlocked = computed(() => {
  if (!range.value) return false
  const r = range.value
  return isNightSlot(r.start, r.end) && golden.value >= 3 && !form.acceptShare
})

const est = computed(() => {
  if (!range.value) return { deposit: 0, light: 0 }
  const r = range.value
  return estimateFee(form.area, court.value, r.start, r.end, form.needLighting && night.value)
})

const canSubmit = computed(() =>
  !!range.value && !court.value.closed && !goldenBlocked.value && form.teamName.trim().length > 0 &&
  !(form.area === 'full' && !court.value.hoopOk),
)

function onCourt() {
  form.sel = []
  if (!court.value.hoopOk) form.area = 'half'
}

function toggleSlot(s: { start: number; taken: boolean }) {
  if (s.taken) return
  const i = form.sel.indexOf(s.start)
  if (i >= 0) {
    form.sel.splice(i, 1)
  } else {
    // 只允许连续时段：与已选相邻或清空重选
    if (!form.sel.length || form.sel.some(x => Math.abs(x - s.start) === SLOT)) form.sel.push(s.start)
    else form.sel = [s.start]
  }
}

function submit() {
  const r = range.value!
  const res = addBooking({
    courtId: form.courtId, date: form.date, startMin: r.start, endMin: r.end,
    area: form.area, teamName: form.teamName.trim(), headcount: form.headcount,
    acceptShare: form.acceptShare, needLighting: form.needLighting && night.value,
  })
  if (!res.ok) {
    message.error(res.msg)
    return
  }
  message.success(res.msg)
  router.push('/my')
}
</script>
