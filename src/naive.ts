import { createDiscreteApi, NInput } from 'naive-ui'
import { h } from 'vue'

// 全局消息/对话框（无需在组件内包 NMessageProvider）
export const { message, dialog } = createDiscreteApi(['message', 'dialog'])

/** dialog content 用的单行输入框：把输入同步到 model.value */
export function inputContent(placeholder: string, model: { value: string }) {
  return () =>
    h(NInput, {
      placeholder,
      autofocus: true,
      onUpdateValue: (v: string) => {
        model.value = v
      },
    })
}
