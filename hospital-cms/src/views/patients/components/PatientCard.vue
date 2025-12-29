<script setup lang="ts">
import { computed } from 'vue'
import { Edit, Delete, Male, Female, Calendar, FolderOpened, MoreFilled, Plus } from '@element-plus/icons-vue'
import type { Patient } from '../../../api/types'
import { PAST_TREATMENT_MAP } from '../../../constants/treatment'

// 定义 Props
const props = defineProps<{
  patient: Patient
}>()

// 定义 Emits
const emit = defineEmits(['click', 'edit', 'delete', 'create-treatment'])

// 工具函数：计算年龄 (也可以抽离到全局 utils)
const age = computed(() => {
  if (!props.patient.Birthday) return '?'
  const birthDate = new Date(props.patient.Birthday)
  const today = new Date()
  let a = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--
  return a
})

const formatPastTreatments = (treatments: string[]) => {
    if(!treatments || !treatments.length) return ''
    return treatments.map((key: string) => (PAST_TREATMENT_MAP as any)[key] || key).join('、')
}
</script>

<template>
  <el-card 
    class="patient-card cursor-pointer hover:shadow-lg transition-all mb-4" 
    shadow="hover" 
    :body-style="{ padding: '0px' }"
    @click="emit('click', patient.documentId)"
  >
    <div class="card-header p-4 flex justify-between items-center bg-gray-50 border-b relative">
      <div class="flex items-center gap-2">
        <span class="text-lg font-bold text-gray-800 truncate">{{ patient.Name }}</span>
        <el-icon :class="patient.Gender === 'male' ? 'text-blue-500' : 'text-pink-500'" class="text-lg">
          <Male v-if="patient.Gender === 'male'" />
          <Female v-else />
        </el-icon>
      </div>
      <div @click.stop>
        <el-dropdown trigger="click">
          <span class="el-dropdown-link p-2 -mr-2 text-gray-400 hover:text-gray-600">
            <el-icon class="text-lg transform rotate-90"><MoreFilled /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="Edit" @click="emit('edit', patient)">编辑档案</el-dropdown-item>
              <el-dropdown-item :icon="Delete" class="text-danger" divided @click="emit('delete', patient)">删除患者</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="card-body p-4">
      <div class="info-row text-gray-500 text-sm mb-3 flex items-center gap-2">
        <el-icon><Calendar /></el-icon>
        <span>{{ patient.Birthday }} <span class="ml-1 text-gray-400">({{ age }}岁)</span></span>
      </div>
      
      <div class="info-row text-gray-500 text-xs mb-3 flex items-start gap-2 bg-gray-50 p-2 rounded">
        <el-icon class="mt-0.5"><FolderOpened /></el-icon>
        <div class="flex-1">
          <span class="font-bold">既往治疗: </span>
          <span v-if="patient.past_treatments?.length">{{ formatPastTreatments(patient.past_treatments) }}</span>
          <span v-else class="text-gray-300">无</span>
        </div>
      </div>

      <div class="flex justify-between items-center mt-4">
        <span class="text-xs text-gray-400">治疗记录</span>
        <div v-if="patient.treatments?.length" class="flex items-center gap-1">
            <el-tag size="small" type="success" round>共 {{ patient.treatments.length }} 次</el-tag>
            <span class="text-xs text-blue-500 font-bold">查看详情 ></span>
        </div>
        <span v-else class="text-xs text-gray-300">暂无记录</span>
      </div>
    </div>

    <div class="card-footer px-4 py-3 border-t bg-white" @click.stop>
      <el-button class="w-full" type="primary" :icon="Plus" round plain @click.stop="emit('create-treatment', patient)">
        新建治疗记录
      </el-button>
    </div>
  </el-card>
</template>

<style scoped>
/* 保持原有的响应式样式 */
.app-container { padding: 16px; max-width: 1400px; margin: 0 auto; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.search-box { flex: 1; display: flex; gap: 8px; }
.search-box :deep(.el-input) { flex: 1; }
.search-box .el-button, .create-btn { flex-shrink: 0; }

/* 样式辅助类 */
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.items-center { align-items: center; }
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mt-1 { margin-top: 4px; }
.mt-4 { margin-top: 16px; }
.mt-8 { margin-top: 32px; }
.p-2 { padding: 8px; }
.p-3 { padding: 12px; }
.p-4 { padding: 16px; }
.px-4 { padding-left: 16px; padding-right: 16px; }
.py-3 { padding-top: 12px; padding-bottom: 12px; }

/* 文本与颜色 */
.text-lg { font-size: 1.125rem; }
.text-sm { font-size: 0.875rem; }
.text-xs { font-size: 0.75rem; }
.font-bold { font-weight: 700; }
.text-gray-300 { color: #d1d5db; }
.text-gray-400 { color: #9ca3af; }
.text-gray-500 { color: #6b7280; }
.text-gray-800 { color: #1f2937; }
.text-blue-500 { color: #3b82f6; }
.text-pink-500 { color: #ec4899; }

.bg-white { background-color: #ffffff; }
.bg-gray-50 { background-color: #f9fafb; }
.border-b { border-bottom: 1px solid #e5e7eb; }
.border-t { border-top: 1px solid #e5e7eb; }
.rounded-lg { border-radius: 8px; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cursor-pointer { cursor: pointer; }
.hover\:shadow-lg:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.w-full { width: 100%; }

/* 移动端特殊优化 (保持原有代码) */
@media (max-width: 768px) {
  .header-actions { flex-direction: column; align-items: stretch; gap: 10px; }
  .search-box { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
  .search-box :deep(.el-input) { order: -1; flex: none; width: 100%; }
  .search-box .el-button { flex: 1; margin: 0; }
  .create-btn { width: 100%; margin-left: 0 !important; }
  :deep(.el-drawer__body) { padding: 15px !important; }
  :deep(.el-range-editor.el-input__wrapper) { width: 100% !important; box-sizing: border-box; display: inline-flex; padding: 0 5px; }
  :deep(.el-range-input) { width: 40% !important; font-size: 12px !important; }
  :deep(.el-drawer__footer) .flex { flex-direction: column; gap: 10px; }
  :deep(.el-drawer__footer) .el-button { width: 100%; margin-left: 0 !important; }
}
:deep(.el-checkbox.is-bordered) { margin-left: 0 !important; margin-right: 8px !important; }
:deep(.el-checkbox-group) { display: flex; flex-wrap: wrap; }
:deep(.text-danger) {  color: #f56c6c !important;}
:deep(.text-danger:hover) {  background-color: #fef0f0 !important;}
</style>