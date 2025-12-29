<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 1. 引入拆分后的组件
import PatientSearch from './components/PatientSearch.vue'
import PatientCard from './components/PatientCard.vue'
import PatientFormDialog from './components/PatientFormDialog.vue'

// 2. 引入原有的业务组件
import PatientDetailDialog from '../../components/PatientDetailDialog.vue'
import TreatmentCreateDialog from '../../components/TreatmentCreateDialog.vue'

// 3. 引入抽离的逻辑 Hooks
import { usePatientList } from './composables/usePatientList'

// 初始化 Logic
const { 
  loading, tableData, total, queryParams, advancedSearchForm, 
  fetchData, handleDelete 
} = usePatientList()

// 组件引用
const formDialogRef = ref()
const patientDetailRef = ref()
const treatmentCreateRef = ref()

// 事件处理
const handleSearch = () => { queryParams.page = 1; fetchData() }
const handleReset = () => { 
  advancedSearchForm.Name = ''; advancedSearchForm.Gender = ''; 
  advancedSearchForm.birthdayRange = []; advancedSearchForm.past_treatments = []
  handleSearch()
}
const handlePageChange = (val: number) => { queryParams.page = val; fetchData() }

// 交互操作
const openCreate = () => formDialogRef.value?.open()
const openEdit = (row: any) => formDialogRef.value?.open(row)
const openDetail = (id: string) => patientDetailRef.value?.open(id)
const openCreateTreatment = (row: any) => {
  treatmentCreateRef.value?.open({ documentId: row.documentId, Name: row.Name })
}

onMounted(() => { fetchData() })
</script>

<template>
  <div class="app-container">
    <PatientSearch 
      v-model:keyword="queryParams.keyword"
      :advanced-form="advancedSearchForm"
      @search="handleSearch"
      @reset="handleReset"
      @create="openCreate"
    />

    <div v-loading="loading" class="card-grid-container">
      <el-empty v-if="!loading && tableData.length === 0" description="暂无患者数据" />
      
      <el-row :gutter="20">
        <el-col 
          v-for="patient in tableData" 
          :key="patient.documentId" 
          :xs="24" :sm="12" :md="8" :lg="6"
        >
          <PatientCard 
            :patient="patient"
            @click="openDetail"
            @edit="openEdit"
            @delete="handleDelete"
            @create-treatment="openCreateTreatment"
          />
        </el-col>
      </el-row>
    </div>

    <div class="pagination-container mt-8 flex justify-center">
      <el-pagination 
        v-model:current-page="queryParams.page" 
        v-model:page-size="queryParams.pageSize" 
        :total="total" 
        layout="prev, pager, next" 
        background 
        :pager-count="5" 
        @current-change="handlePageChange" 
      />
    </div>

    <PatientFormDialog ref="formDialogRef" @success="fetchData" />
    <PatientDetailDialog ref="patientDetailRef" />
    <TreatmentCreateDialog ref="treatmentCreateRef" @success="fetchData" />
  </div>
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