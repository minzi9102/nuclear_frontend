<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { 
  Search, Plus, Edit, Delete, 
  Male, Female, Calendar, Timer, 
  ArrowRight, FolderOpened,
  Filter, Refresh, Finished // ⬅️ 新增交互图标
} from '@element-plus/icons-vue' 
import { getPatientList, deletePatient, createPatient, updatePatient } from '../../api/patient'
import type { Patient } from '../../api/types'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import TreatmentDetailDialog from '../../components/TreatmentDetailDialog.vue'

import { TREATMENT_TARGET_MAP,PAST_TREATMENT_MAP, PAST_TREATMENT_OPTIONS } from '../../constants/treatment' // 💡 引入翻译映射
import type { PastTreatment } from '../../constants/treatment' // 如果你定义了类型
// --- 数据定义 ---
const loading = ref(false)
const tableData = ref<Patient[]>([])
const total = ref(0)
const treatmentDialogRef = ref()

// 弹窗相关
const dialogVisible = ref(false)
const dialogTitle = ref('新建患者')
const formLoading = ref(false)
const formRef = ref<FormInstance>()

// 定义高级搜索状态
const drawerVisible = ref(false)

// 高级搜索表单数据对象
const advancedSearchForm = reactive({
  Name: '',
  Gender: '',
  birthdayRange: [] as string[], // [开始日期, 结束日期]
  past_treatments: [] as string[]
})
// 表单数据
const formData = reactive({
  documentId: undefined as string | undefined,
  Name: '',
  Gender: 'male', 
  Birthday: '',
  past_treatments: ['none'] as PastTreatment[] // ✨ 新增字段，初始化为["none"]
})

// 校验规则
const rules = {
  Name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  Birthday: [{ required: true, message: '请选择出生日期', trigger: 'change' }]
}

// 查询参数
const queryParams = reactive({
  page: 1,
  pageSize: 12, // 卡片布局一页显示12个比较合适 (3x4 或 4x3)
  keyword: ''
})

const isMobile = ref(window.innerWidth <= 768)

// --- 辅助工具函数 ---

// 1. 根据生日计算年龄
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

// 2. 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString()
}

// --- 核心业务逻辑 ---

const fetchData = async () => {
  loading.value = true
  try {
    const filters: any = {}

    // --- A. 多字段模糊搜索逻辑 ---
    // 输入一个关键词，同时匹配姓名（或其他你未来想加入的字段，如备注）
    const searchName = advancedSearchForm.Name || queryParams.keyword
    
    if (searchName) {
      filters.$or = [
        { Name: { $containsi: searchName } },
      ]
    }

    // --- B. 高级搜索条件组合 ---
    // 1. 性别精确匹配
    if (advancedSearchForm.Gender) {
      filters.Gender = { $eq: advancedSearchForm.Gender }
    }

    // 2. 出生日期范围搜索 ($gte: 大于等于, $lte: 小于等于)
    if (advancedSearchForm.birthdayRange && advancedSearchForm.birthdayRange.length === 2) {
      filters.Birthday = {
        $gte: advancedSearchForm.birthdayRange[0],
        $lte: advancedSearchForm.birthdayRange[1]
      }
    }

    // 3. 既往治疗经历搜索 (针对 JSON 数组字段)
    if (advancedSearchForm.past_treatments && advancedSearchForm.past_treatments.length > 0) {
      // 匹配包含数组中任意一个选项的记录
      filters.past_treatments = {
        $contains: advancedSearchForm.past_treatments
      }
    }

    const apiParams = {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      filters: filters // 将组合好的高级搜索条件传给 API
    }

    const res: any = await getPatientList(apiParams as any)

    // 数据解包逻辑 (适配 Strapi v5 响应结构)
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

// 触发搜索
const onAdvancedSearch = () => {
  queryParams.page = 1
  drawerVisible.value = false
  fetchData()
}

// 重置搜索条件
const onResetSearch = () => {
  advancedSearchForm.Name = ''
  advancedSearchForm.Gender = ''
  advancedSearchForm.birthdayRange = []
  advancedSearchForm.past_treatments = []
  onAdvancedSearch()
}
const handleSearch = () => {
  queryParams.page = 1
  fetchData()
}

const handleCurrentChange = (val: number) => {
  queryParams.page = val
  fetchData()
}

const handleDelete = (row: Patient) => {
  if (!row.documentId) return
  ElMessageBox.confirm(
    `确定删除患者 "${row.Name}" 吗？`, '警告',
    { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      await deletePatient(row.documentId!)
      ElMessage.success('删除成功')
      fetchData()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

const handleCreate = () => {
  dialogTitle.value = '新建患者'
  formData.documentId = undefined 
  formData.Name = ''
  formData.Gender = 'male'
  formData.Birthday = ''
  formData.past_treatments = ['none'] // ✨ 确保初始化为["none"]
  dialogVisible.value = true
}

const handleEdit = (row: Patient) => {
  dialogTitle.value = '编辑患者'
  formData.documentId = row.documentId 
  formData.Name = row.Name
  formData.Gender = row.Gender as string 
  formData.Birthday = row.Birthday
  formData.past_treatments = Array.isArray(row.past_treatments) ? row.past_treatments : []
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      formLoading.value = true
      try {
        if (formData.documentId) {
          await updatePatient(formData.documentId, { ...formData })
          ElMessage.success('修改成功')
        } else {
          await createPatient({ ...formData })
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        fetchData()
      } catch (error) {
        ElMessage.error('操作失败')
      } finally {
        formLoading.value = false
      }
    }
  })
}

const handleViewTreatment = (documentId: string) => {
  treatmentDialogRef.value?.open(documentId)
}

onMounted(() => {
  fetchData()
})

// 监听多选框的变化
watch(() => formData.past_treatments, (newVal, oldVal) => {
  if (newVal.length > 1) {
    // 1. 如果新勾选了其他选项，且之前有“无”，则去掉“无”
    if (newVal.includes('none') && oldVal.includes('none')) {
      formData.past_treatments = newVal.filter(item => item !== 'none')
    } 
    // 2. 如果新勾选了“无”，则去掉其他所有选项
    else if (newVal.includes('none') && !oldVal.includes('none')) {
      formData.past_treatments = ['none']
    }
  }
  // 3. 如果全部取消勾选，强制恢复为“无” (可选)
  if (newVal.length === 0) {
    formData.past_treatments = ['none']
  }
}, { deep: true })

</script>

<template>
  <div class="app-container">
    
    <div class="header-actions mb-6">
      <div class="search-box">
        <el-button size="large" :icon="Filter" @click="drawerVisible = true">高级搜索</el-button>
        <el-input 
          v-model="queryParams.keyword" 
          placeholder="输入关键词进行多字段搜索..." 
          size="large"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-button 
          type="primary" 
          :icon="Search" 
          size="large" 
          @click="handleSearch"
        >
          搜索
        </el-button>
        
      </div>

      <el-button 
        type="success" 
        :icon="Plus" 
        size="large" 
        @click="handleCreate" 
        class="create-btn"
      >
        新建患者
      </el-button>
    </div>

    <el-drawer
      v-model="drawerVisible"
      title="🔍 高级搜索"
      :size="isMobile ? '100%' : '380px'" 
      destroy-on-close
    >
      <el-form :model="advancedSearchForm" label-position="top" class="p-2">
        <el-form-item label="患者姓名">
          <el-input 
            v-model="advancedSearchForm.Name" 
            placeholder="请输入患者姓名（支持模糊搜索）" 
            size="large"
            clearable
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </el-form-item>
        <el-form-item label="性别选择">
          <el-radio-group v-model="advancedSearchForm.Gender" class="w-full">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="male">男</el-radio-button>
            <el-radio-button label="female">女</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="出生日期区间">
          <el-date-picker
            v-model="advancedSearchForm.birthdayRange"
            type="daterange"
            range-separator="至"
            start-placeholder="起始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>

        <el-form-item label="既往治疗经历 (多选)">
          <el-select
            v-model="advancedSearchForm.past_treatments"
            multiple
            collapse-tags
            placeholder="请选择治疗项目"
            class="w-full"
          >
            <el-option
              v-for="opt in PAST_TREATMENT_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex gap-2">
          <el-button class="flex-1" :icon="Refresh" @click="onResetSearch">重置条件</el-button>
          <el-button class="flex-1" type="primary" :icon="Finished" @click="onAdvancedSearch">开始搜索</el-button>
        </div>
      </template>
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
          <el-card class="patient-card" shadow="hover" :body-style="{ padding: '0px' }">
            
            <div class="card-header p-4 border-b flex justify-between items-center bg-gray-50">
              <div class="flex items-center gap-2">
                <span class="text-lg font-bold text-gray-800 truncate">{{ patient.Name }}</span>
                <el-icon 
                  :class="patient.Gender === 'male' ? 'text-blue-500' : 'text-pink-500'"
                  class="text-lg"
                >
                  <Male v-if="patient.Gender === 'male'" />
                  <Female v-else />
                </el-icon>
              </div>
              <el-tag type="info" effect="plain" round>
                {{ calculateAge(patient.Birthday) }} 岁
              </el-tag>
            </div>

            <div class="card-body p-4">
              <div class="info-row text-gray-500 text-sm mb-3 flex items-center gap-2">
                <el-icon><Calendar /></el-icon>
                <span>生日: {{ patient.Birthday }}</span>
              </div>

              <div class="info-row text-gray-500 text-xs mb-3 flex items-start gap-2">
                <el-icon class="mt-0.5"><FolderOpened /></el-icon>
                <div class="flex-1">
                  <span class="font-bold">既往治疗: </span>
                  <span v-if="patient.past_treatments?.length">
                    {{ patient.past_treatments.map(key => PAST_TREATMENT_MAP[key] || key).join('、') }}
                  </span>
                  <span v-else class="text-gray-300">暂无信息</span>
                </div>
              </div>

              <div class="treatment-section mt-4">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-xs font-bold text-gray-400 uppercase">最近治疗</span>
                  <el-tag v-if="patient.treatments?.length" size="small" type="success" round>
                    共 {{ patient.treatments.length }} 次
                  </el-tag>
                </div>

                <div 
                  v-if="patient.treatments && patient.treatments.length > 0"
                  class="latest-treatment bg-blue-50 p-3 rounded-lg cursor-pointer hover:bg-blue-100 transition border border-blue-100"
                  @click="handleViewTreatment(patient.treatments?.[0]?.documentId || '')"
                >
                  <div class="flex justify-between items-start">
                    <div>
                      <div class="font-bold text-blue-700 text-sm">
                        {{ patient.treatments?.[0]?.treatmentNo || '最新记录' }}
                      </div>
                      <div class="text-xs text-blue-500 mt-1 flex items-center gap-1">
                        <el-icon><Timer /></el-icon>
                        {{ formatDate(patient.treatments?.[0]?.createdAt || '') }}
                      </div>
                    </div>
                    <el-icon class="text-blue-400"><ArrowRight /></el-icon>
                  </div>
                  <div class="mt-2 text-xs text-gray-600 bg-white/60 px-2 py-1 rounded inline-block">
                    <!-- {{ patient.treatments?.[0]?.target }} -->
                    {{ TREATMENT_TARGET_MAP[patient.treatments?.[0]?.target as string] || patient.treatments?.[0]?.target }}
                  </div>
                </div>

                <div v-else class="no-record bg-gray-50 p-3 rounded-lg text-center text-gray-400 text-xs border border-dashed">
                  暂无治疗记录
                </div>
              </div>
            </div>

            <div class="card-footer px-4 py-3 flex justify-between items-center border-t bg-white">
              <el-popover
                  placement="top"
                  :width="220"
                  trigger="click"
                  v-if="patient.treatments && patient.treatments.length > 1"
                >
                  <template #reference>
                     <el-button link type="info" size="small">
                       <el-icon class="mr-1"><FolderOpened /></el-icon> 全部历史
                     </el-button>
                  </template>
                  <div class="history-list max-h-48 overflow-y-auto">
                    <div 
                      v-for="(t, idx) in patient.treatments" 
                      :key="t.documentId"
                      class="py-2 border-b last:border-0 cursor-pointer hover:text-blue-600 flex justify-between items-center text-xs group"
                      @click="handleViewTreatment(t.documentId)"
                    >
                      <span class="text-gray-600 group-hover:text-blue-600">{{ t.treatmentNo }}</span>
                      <span class="text-gray-400 scale-90">{{ formatDate(t.createdAt) }}</span>
                    </div>
                  </div>
                </el-popover>
                <div v-else></div> <div class="actions">
                  <el-button link type="primary" :icon="Edit" @click="handleEdit(patient)">编辑</el-button>
                  <el-button link type="danger" :icon="Delete" @click="handleDelete(patient)">删除</el-button>
                </div>
            </div>

          </el-card>
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
        @current-change="handleCurrentChange"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="90%" 
      style="max-width: 500px;" 
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="70px" label-position="top">
        <el-form-item label="姓名" prop="Name">
          <el-input v-model="formData.Name" size="large" placeholder="请输入姓名" />
        </el-form-item>
        
        <el-form-item label="性别" prop="Gender">
          <el-radio-group v-model="formData.Gender" size="large" class="w-full">
            <el-radio-button label="male" class="w-1/2">男</el-radio-button>
            <el-radio-button label="female" class="w-1/2">女</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="出生日期" prop="Birthday">
          <el-date-picker 
            v-model="formData.Birthday" 
            type="date" 
            placeholder="选择日期" 
            style="width: 100%" 
            size="large"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="有无接受过其他治疗" prop="past_treatments">
          <el-checkbox-group v-model="formData.past_treatments">
            <el-checkbox 
              v-for="opt in PAST_TREATMENT_OPTIONS" 
              :key="opt.value" 
              :label="opt.value"
              border
              class="mb-2 mr-2 ml-0"
            >
              {{ opt.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button size="large" @click="dialogVisible = false">取消</el-button>
          <el-button size="large" type="primary" :loading="formLoading" @click="handleSubmit">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <TreatmentDetailDialog ref="treatmentDialogRef" />
  </div>
</template>

<style scoped>
/* 容器适配：限制最大宽度，居中显示 */
.app-container {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 顶部操作栏容器 */
.header-actions {
  display: flex;
  gap: 12px;          /* 搜索组合与新建按钮之间的间距 */
  align-items: center;
}

/* 搜索组合容器 */
.search-box {
  flex: 1;            /* 占据剩余空间 */
  display: flex;
  gap: 8px;           /* 按钮与输入框之间的内部间距 */
}

/* 确保输入框在按钮之间自动撑开 */
.search-box :deep(.el-input) {
  flex: 1;
}

/* 确保所有按钮不会因为 Flex 布局被压缩 */
.search-box .el-button,
.create-btn {
  flex-shrink: 0;
}

/* 样式辅助类 (模拟 Tailwind) */
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mt-1 { margin-top: 4px; }
.mt-2 { margin-top: 8px; }
.mt-4 { margin-top: 16px; }
.mt-8 { margin-top: 32px; }
.p-3 { padding: 12px; }
.p-4 { padding: 16px; }
.px-2 { padding-left: 8px; padding-right: 8px; }
.py-1 { padding-top: 4px; padding-bottom: 4px; }
.px-4 { padding-left: 16px; padding-right: 16px; }
.py-2 { padding-top: 8px; padding-bottom: 8px; }
.py-3 { padding-top: 12px; padding-bottom: 12px; }

/* 文本与颜色 */
.text-lg { font-size: 1.125rem; }
.text-sm { font-size: 0.875rem; }
.text-xs { font-size: 0.75rem; }
.font-bold { font-weight: 700; }
.text-gray-400 { color: #9ca3af; }
.text-gray-500 { color: #6b7280; }
.text-gray-600 { color: #4b5563; }
.text-gray-800 { color: #1f2937; }
.text-blue-500 { color: #3b82f6; }
.text-blue-600 { color: #2563eb; }
.text-blue-700 { color: #1d4ed8; }
.text-pink-500 { color: #ec4899; }

.bg-white { background-color: #ffffff; }
.bg-blue-50 { background-color: #eff6ff; }
.bg-blue-100 { background-color: #dbeafe; }
.bg-gray-50 { background-color: #f9fafb; }

.border-b { border-bottom: 1px solid #e5e7eb; }
.border-t { border-top: 1px solid #e5e7eb; }
.border { border-width: 1px; border-style: solid; }
.border-blue-100 { border-color: #dbeafe; }
.border-dashed { border-style: dashed; }

.rounded { border-radius: 4px; }
.rounded-lg { border-radius: 8px; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cursor-pointer { cursor: pointer; }
.w-full { width: 100%; }
.scale-90 { transform: scale(0.9); }

/* 移动端特殊优化 - 针对搜索栏组件溢出的修复 */
@media (max-width: 768px) {
  .header-actions {
    flex-direction: column; /* 容器改为垂直排列 */
    align-items: stretch;   /* 子元素占满宽度 */
    gap: 10px;
  }

  .search-box {
    display: flex;
    flex-wrap: wrap;       /* 允许搜索组内部换行 */
    gap: 8px;
    width: 100%;
  }

  /* 令输入框在手机端独占第一行，按钮排在下方 */
  .search-box :deep(.el-input) {
    order: -1;             /* 强制排在最前 */
    flex: none;
    width: 100%;
  }

  /* 搜索和高级搜索按钮平分剩余行 */
  .search-box .el-button {
    flex: 1;
    margin: 0;             /* 清除可能的边距 */
  }

  /* 新建按钮在手机端独占一行，提升操作便利性 */
  .create-btn {
    width: 100%;
    margin-left: 0 !important; /* 强制覆盖 flex 的 gap 或 margin */
  }

  /* 1. 强制表单项宽度并消除可能导致溢出的 padding */
  :deep(.el-drawer__body) {
    padding: 15px !important;
  }

  /* 2. 修复日期范围选择器溢出 (最核心修改) */
  :deep(.el-range-editor.el-input__wrapper) {
    width: 100% !important;
    box-sizing: border-box;
    display: inline-flex;
    /* 缩小中间“至”字的间距 */
    padding: 0 5px; 
  }

  /* 针对日期选择器内部的输入框，缩小字体防止挤压 */
  :deep(.el-range-input) {
    width: 40% !important;
    font-size: 12px !important;
  }

  /* 3. 底部按钮适配：如果文字太长，改为上下排列 */
  :deep(.el-drawer__footer) .flex {
    flex-direction: column;
    gap: 10px;
  }

  :deep(.el-drawer__footer) .el-button {
    width: 100%;
    margin-left: 0 !important;
  }
}

/* 让多选框在弹窗中排列整齐 */
:deep(.el-checkbox.is-bordered) {
  margin-left: 0 !important;
  margin-right: 8px !important;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
}

/* 调整既往治疗文字排版 */
.info-row {
  line-height: 1.4;
}
</style>