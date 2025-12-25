<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { 
  Search, Plus, Edit, Delete, 
  Male, Female, Calendar, Timer, 
  ArrowRight, FolderOpened 
} from '@element-plus/icons-vue' 
import { getPatientList, deletePatient, createPatient, updatePatient } from '../../api/patient'
import type { Patient } from '../../api/types'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import TreatmentDetailDialog from '../../components/TreatmentDetailDialog.vue'

import { TREATMENT_TARGET_MAP } from '../../constants/treatment' // 💡 引入翻译映射

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

// 表单数据
const formData = reactive({
  documentId: undefined as string | undefined,
  Name: '',
  Gender: 'male', 
  Birthday: ''
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
    const apiParams = {
      page: queryParams.page,
      pageSize: queryParams.pageSize,
      ...(queryParams.keyword ? { filters: { Name: { $contains: queryParams.keyword } } } : {}),
      // 保持 populate 逻辑，确保能获取 treatments
    }

    const res: any = await getPatientList(apiParams as any)

    if (res.data && Array.isArray(res.data)) {
        tableData.value = res.data
        total.value = res.meta?.pagination?.total || 0
    } else if (res.data && res.data.data) {
        tableData.value = res.data.data
        total.value = res.data.meta?.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取列表失败:', error)
  } finally {
    loading.value = false
  }
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
  dialogVisible.value = true
}

const handleEdit = (row: Patient) => {
  dialogTitle.value = '编辑患者'
  formData.documentId = row.documentId 
  formData.Name = row.Name
  formData.Gender = row.Gender as string 
  formData.Birthday = row.Birthday
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
</script>

<template>
  <div class="app-container">
    
    <div class="header-actions mb-6">
      <div class="search-box">
        <el-input 
          v-model="queryParams.keyword" 
          placeholder="搜索姓名..." 
          class="w-full"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <el-button type="primary" :icon="Plus" size="large" @click="handleCreate" class="create-btn">
        新建
      </el-button>
    </div>

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
                       <el-icon class="mr-1"><FolderOpened /></el-icon> 更多历史
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

/* 顶部操作栏 */
.header-actions {
  display: flex;
  gap: 12px;
}
.search-box {
  flex: 1; 
}
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

/* 移动端特殊优化 */
@media (max-width: 640px) {
  .app-container {
    padding: 12px;
  }
  .patient-card {
    /* 增加阴影，使其在手机白色背景上更突出 */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
}
</style>