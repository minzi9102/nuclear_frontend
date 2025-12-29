<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { 
  Search, Plus, Edit, Delete, 
  Male, Female, Calendar,
  Filter, Refresh, Finished,
  FolderOpened, MoreFilled
} from '@element-plus/icons-vue' 
import { getPatientList, deletePatient, createPatient, updatePatient } from '../../api/patient'
import type { Patient } from '../../api/types'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'

// 组件引用
import PatientDetailDialog from '../../components/PatientDetailDialog.vue'
import TreatmentCreateDialog from '../../components/TreatmentCreateDialog.vue'

// 常量引用
import { PAST_TREATMENT_MAP, PAST_TREATMENT_OPTIONS } from '../../constants/treatment'
import type { PastTreatment } from '../../constants/treatment'

// --- 数据定义 ---
const loading = ref(false)
const tableData = ref<Patient[]>([])
const total = ref(0)

// 组件 Ref
const patientDetailRef = ref()
const treatmentCreateRef = ref() // ✨ 新增：新建治疗弹窗引用

// 弹窗控制
const dialogVisible = ref(false)
const dialogTitle = ref('新建患者')
const formLoading = ref(false)
const formRef = ref<FormInstance>()
const drawerVisible = ref(false)

// 搜索表单
const advancedSearchForm = reactive({
  Name: '',
  Gender: '',
  birthdayRange: [] as string[],
  past_treatments: [] as string[]
})

// 新建/编辑表单
const formData = reactive({
  documentId: undefined as string | undefined,
  Name: '',
  Gender: 'male', 
  Birthday: '',
  past_treatments: ['none'] as PastTreatment[] 
})

const rules = {
  Name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  Birthday: [{ required: true, message: '请选择出生日期', trigger: 'change' }]
}

const queryParams = reactive({
  page: 1,
  pageSize: 12, 
  keyword: ''
})

const isMobile = ref(window.innerWidth <= 768)

// --- 辅助工具函数 ---
const calculateAge = (birthday: string) => {
  if (!birthday) return '?'
  const birthDate = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// --- 核心业务逻辑 ---

const fetchData = async () => {
  loading.value = true
  try {
    const filters: any = {}
    const searchName = advancedSearchForm.Name || queryParams.keyword
    
    if (searchName) {
      filters.$or = [
        { Name: { $containsi: searchName } },
      ]
    }
    if (advancedSearchForm.Gender) {
      filters.Gender = { $eq: advancedSearchForm.Gender }
    }
    if (advancedSearchForm.birthdayRange && advancedSearchForm.birthdayRange.length === 2) {
      filters.Birthday = {
        $gte: advancedSearchForm.birthdayRange[0],
        $lte: advancedSearchForm.birthdayRange[1]
      }
    }
    if (advancedSearchForm.past_treatments && advancedSearchForm.past_treatments.length > 0) {
      filters.past_treatments = {
        $contains: advancedSearchForm.past_treatments
      }
    }

    const apiParams = {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      filters: filters,
      populate: {
        treatments: {
            fields: ['treatmentNo', 'createdAt'] 
        }
      }
    }

    const res: any = await getPatientList(apiParams as any)

    if (res.data && res.data.data) {
        tableData.value = res.data.data
        total.value = res.data.meta?.pagination?.total || 0
    } else if (res.data) {
        tableData.value = res.data
        total.value = res.meta?.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索与重置
const onAdvancedSearch = () => { queryParams.page = 1; drawerVisible.value = false; fetchData() }
const onResetSearch = () => { advancedSearchForm.Name = ''; advancedSearchForm.Gender = ''; advancedSearchForm.birthdayRange = []; advancedSearchForm.past_treatments = []; onAdvancedSearch() }
const handleSearch = () => { queryParams.page = 1; fetchData() }
const handleCurrentChange = (val: number) => { queryParams.page = val; fetchData() }

// 删除患者
const handleDelete = (row: Patient) => {
  if (!row.documentId) return
  ElMessageBox.confirm(`确定删除患者 "${row.Name}" 吗？`, '警告',{ confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }).then(async () => {
    try {
      await deletePatient(row.documentId!); ElMessage.success('删除成功'); fetchData()
    } catch (error) { ElMessage.error('删除失败') }
  })
}

// 新建/编辑患者
const handleCreate = () => { dialogTitle.value = '新建患者'; formData.documentId = undefined; formData.Name = ''; formData.Gender = 'male'; formData.Birthday = ''; formData.past_treatments = ['none']; dialogVisible.value = true }
const handleEdit = (row: Patient) => {
    dialogTitle.value = '编辑患者'; formData.documentId = row.documentId; formData.Name = row.Name; formData.Gender = row.Gender as string; formData.Birthday = row.Birthday; formData.past_treatments = Array.isArray(row.past_treatments) ? row.past_treatments : []; dialogVisible.value = true
}
const handleSubmit = async () => { if (!formRef.value) return; await formRef.value.validate(async (valid) => { if (valid) { formLoading.value = true; try { if (formData.documentId) { await updatePatient(formData.documentId, { ...formData }); ElMessage.success('修改成功') } else { await createPatient({ ...formData }); ElMessage.success('创建成功') } dialogVisible.value = false; fetchData() } catch (error) { ElMessage.error('操作失败') } finally { formLoading.value = false } } }) }

// 监听既往史互斥逻辑
watch(() => formData.past_treatments, (newVal, oldVal) => { if (newVal.length > 1) { if (newVal.includes('none') && oldVal.includes('none')) { formData.past_treatments = newVal.filter(item => item !== 'none') } else if (newVal.includes('none') && !oldVal.includes('none')) { formData.past_treatments = ['none'] } } if (newVal.length === 0) { formData.past_treatments = ['none'] } }, { deep: true })

// 点击卡片进入详情
const handleCardClick = (documentId: string) => {
  if (!documentId) return
  patientDetailRef.value?.open(documentId)
}

// ✨ Step 2 核心：点击卡片上的“新建治疗”按钮
const handleCreateTreatment = (row: any) => {
  // 调用子组件的 open 方法，并传入锁定参数
  treatmentCreateRef.value.open({
    documentId: row.documentId,
    Name: row.Name
  })
}

// ✨ Step 2 核心：创建成功后的回调
const onTreatmentCreated = () => {
  // 刷新列表，更新卡片上的“治疗次数”等信息
  fetchData() 
}

onMounted(() => { fetchData() })
</script>

<template>
  <div class="app-container">
    
    <div class="header-actions mb-6">
      <div class="search-box">
        <el-button size="large" :icon="Filter" @click="drawerVisible = true">高级搜索</el-button>
        <el-input v-model="queryParams.keyword" placeholder="输入患者姓名进行搜索..." size="large" clearable @clear="handleSearch" @keyup.enter="handleSearch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" :icon="Search" size="large" @click="handleSearch">搜索</el-button>
      </div>
      <el-button type="success" :icon="Plus" size="large" @click="handleCreate" class="create-btn">新建患者</el-button>
    </div>

    <el-drawer v-model="drawerVisible" title="🔍 高级搜索" :size="isMobile ? '100%' : '380px'" destroy-on-close>
       <el-form :model="advancedSearchForm" label-position="top" class="p-2">
         <el-form-item label="患者姓名"><el-input v-model="advancedSearchForm.Name" placeholder="模糊搜索" size="large" clearable /></el-form-item>
         <el-form-item label="性别"><el-radio-group v-model="advancedSearchForm.Gender" class="w-full"><el-radio-button label="">全部</el-radio-button><el-radio-button label="male">男</el-radio-button><el-radio-button label="female">女</el-radio-button></el-radio-group></el-form-item>
         <el-form-item label="出生日期"><el-date-picker v-model="advancedSearchForm.birthdayRange" type="daterange" value-format="YYYY-MM-DD" class="w-full" /></el-form-item>
         <el-form-item label="既往治疗"><el-select v-model="advancedSearchForm.past_treatments" multiple collapse-tags class="w-full"><el-option v-for="opt in PAST_TREATMENT_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" /></el-select></el-form-item>
       </el-form>
       <template #footer><div class="flex gap-2"><el-button class="flex-1" :icon="Refresh" @click="onResetSearch">重置</el-button><el-button class="flex-1" type="primary" :icon="Finished" @click="onAdvancedSearch">搜索</el-button></div></template>
    </el-drawer>

    <div v-loading="loading" class="card-grid-container">
      <el-empty v-if="!loading && tableData.length === 0" description="暂无患者数据" />

      <el-row :gutter="20">
        <el-col 
          v-for="patient in tableData" 
          :key="patient.documentId" 
          :xs="24" :sm="12" :md="8" :lg="6"
          class="mb-4"
        >
          <el-card 
            class="patient-card cursor-pointer hover:shadow-lg transition-all" 
            shadow="hover" 
            :body-style="{ padding: '0px' }"
            @click="handleCardClick(patient.documentId!)"
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
                      <el-dropdown-item :icon="Edit" @click="handleEdit(patient)">
                        编辑档案
                      </el-dropdown-item>
                      <el-dropdown-item :icon="Delete" class="text-danger" divided @click="handleDelete(patient)">
                        删除患者
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>

            <div class="card-body p-4">
              <div class="info-row text-gray-500 text-sm mb-3 flex items-center gap-2">
                <el-icon><Calendar /></el-icon>
                <span>
                  {{ patient.Birthday }} 
                  <span class="ml-1 text-gray-400">({{ calculateAge(patient.Birthday) }}岁)</span>
                </span>
              </div>

              <div class="info-row text-gray-500 text-xs mb-3 flex items-start gap-2 bg-gray-50 p-2 rounded">
                <el-icon class="mt-0.5"><FolderOpened /></el-icon>
                <div class="flex-1">
                  <span class="font-bold">既往治疗: </span>
                  <span v-if="patient.past_treatments?.length">
                    {{ patient.past_treatments.map((key: string) => (PAST_TREATMENT_MAP as any)[key] || key).join('、') }}
                  </span>
                  <span v-else class="text-gray-300">无</span>
                </div>
              </div>

              <div class="flex justify-between items-center mt-4">
                <span class="text-xs text-gray-400">治疗记录</span>
                <div v-if="patient.treatments?.length" class="flex items-center gap-1">
                    <el-tag size="small" type="success" round>共 {{ patient.treatments.length }} 次</el-tag>
                    <span class="text-xs text-gray-300">|</span>
                    <span class="text-xs text-blue-500 font-bold">查看详情 ></span>
                </div>
                <span v-else class="text-xs text-gray-300">暂无记录</span>
              </div>
            </div>

            <div class="card-footer px-4 py-3 border-t bg-white" @click.stop>
              <el-button 
                class="w-full"
                type="primary" 
                :icon="Plus" 
                round 
                plain
                @click.stop="handleCreateTreatment(patient)" 
              >
                新建治疗记录
              </el-button>
            </div>

          </el-card>
        </el-col>
      </el-row>
    </div>
    
    <div class="pagination-container mt-8 flex justify-center">
      <el-pagination v-model:current-page="queryParams.page" v-model:page-size="queryParams.pageSize" :total="total" layout="prev, pager, next" background :pager-count="5" @current-change="handleCurrentChange" />
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="90%" style="max-width: 500px;" :close-on-click-modal="true" append-to-body>
        <el-form ref="formRef" :model="formData" :rules="rules" label-width="70px" label-position="top">
            <el-form-item label="姓名" prop="Name"><el-input v-model="formData.Name" size="large" /></el-form-item>
            <el-form-item label="性别" prop="Gender"><el-radio-group v-model="formData.Gender" size="large" class="w-full"><el-radio-button label="male" class="w-1/2">男</el-radio-button><el-radio-button label="female" class="w-1/2">女</el-radio-button></el-radio-group></el-form-item>
            <el-form-item label="出生日期" prop="Birthday"><el-date-picker v-model="formData.Birthday" type="date" style="width: 100%" size="large" value-format="YYYY-MM-DD" /></el-form-item>
            <el-form-item label="有无接受过其他治疗"><el-checkbox-group v-model="formData.past_treatments"><el-checkbox v-for="opt in PAST_TREATMENT_OPTIONS" :key="opt.value" :label="opt.value" border class="mb-2 mr-2 ml-0">{{ opt.label }}</el-checkbox></el-checkbox-group></el-form-item>
        </el-form>
        <template #footer><span class="dialog-footer"><el-button size="large" @click="dialogVisible = false">取消</el-button><el-button size="large" type="primary" :loading="formLoading" @click="handleSubmit">保存</el-button></span></template>
    </el-dialog>

    <PatientDetailDialog ref="patientDetailRef" />
    <TreatmentCreateDialog ref="treatmentCreateRef" @success="onTreatmentCreated" />
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