<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'

// 组件引入
import ImageUploader from '../../components/ImageUploader/index.vue'

// API 引入
import { getTreatmentList, deleteTreatment, createTreatment } from '../../api/treatment'
import { getPatientList } from '../../api/patient'
import type { Treatment, Patient, StrapiMedia } from '../../api/types'

// 常量引入
import { TREATMENT_TARGET_MAP, TARGET_OPTIONS } from '../../constants/treatment';

// Base URL
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

// --- 列表数据 ---
const tableData = ref<Treatment[]>([])
const loading = ref(false)
const total = ref(0)
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  treatmentNo: ''
})

// --- 弹窗与表单 ---
const dialogVisible = ref(false)
const formLoading = ref(false)
const formRef = ref<FormInstance>()

// 🔥 新增：图片上传组件的引用
const uploaderRef = ref<InstanceType<typeof ImageUploader> | null>(null)

// 选项数据
const targetOptions = TARGET_OPTIONS;
const patientLoading = ref(false)
const patientOptions = ref<Patient[]>([])

// 表单模型 (注意：移除了 images，因为现在由 uploadRef 接管)
const formData = reactive({
  patient: '' as string,
  target: '',
  sequence_number: undefined as number | undefined
})

const rules = {
  patient: [{ required: true, message: '请选择关联患者', trigger: 'change' }],
  target: [{ required: true, message: '请选择治疗部位', trigger: 'change' }]
}

// --- 工具方法 ---
const getThumbnailUrl = (img: StrapiMedia) => {
  if (!img || !img.url) return ''
  const url = img.formats?.thumbnail?.url || img.url
  return url.startsWith('http') ? url : `${BASE_URL}${url}`
}

// --- 核心逻辑 ---

// 1. 获取列表
const fetchData = async () => {
  loading.value = true
  try {
    const apiParams: any = {
      'pagination[page]': queryParams.page,
      'pagination[pageSize]': queryParams.pageSize,
      populate: ['patient', 'Images'], 
      sort: 'createdAt:desc',
    }
    if (queryParams.treatmentNo) {
      apiParams['filters[treatmentNo][$contains]'] = queryParams.treatmentNo
    }

    const res: any = await getTreatmentList(apiParams)
    if (res.data) {
      tableData.value = res.data.data || res.data || []
      total.value = res.data.meta?.pagination?.total || res.meta?.pagination?.total || 0
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 2. 搜索患者
const searchPatients = async (query: string) => {
  if (query) {
    patientLoading.value = true
    try {
      const res: any = await getPatientList({
        'filters[Name][$contains]': query,
        'pagination[limit]': 10
      } as any)
      patientOptions.value = res.data?.data || res.data || []
    } catch (error) {
      console.error(error)
    } finally {
      patientLoading.value = false
    }
  } else {
    patientOptions.value = []
  }
}

// 3. 打开弹窗
const handleCreate = () => {
  // 重置表单数据
  formData.patient = ''
  formData.target = ''
  formData.sequence_number = undefined
  patientOptions.value = []
  
  // 打开弹窗
  dialogVisible.value = true
  
  // 注意：由于弹窗设置了 destroy-on-close，
  // ImageUploader 组件会在每次打开时重新挂载，自动清空内部状态，
  // 所以不需要手动重置 uploaderRef
}

// 4. 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      formLoading.value = true
      try {
        let imageIds: number[] = []

        // A. 先处理图片上传
        if (uploaderRef.value) {
          imageIds = await uploaderRef.value.submitAll()
        }

        // B. 构建提交数据
        const submitData = {
          patient: formData.patient,
          target: formData.target,
          sequence_number: formData.sequence_number,
          Images: imageIds 
        }

        console.log('📡 提交 Payload:', submitData)

        // C. 创建记录
        // 🔴 修复点：去掉 { data: submitData }，直接传 submitData
        // 因为你的 createTreatment API 内部会自动加上 { data: ... }
        await createTreatment(submitData) 
        
        ElMessage.success('创建成功')
        dialogVisible.value = false
        fetchData() // 刷新列表
      } catch (error: any) {
        console.error(error)
        // 优化错误提示：如果有后端返回的具体信息，就显示具体的
        const errorMsg = error.response?.data?.error?.message || '创建失败，请检查网络或重试'
        ElMessage.error(errorMsg)
      } finally {
        formLoading.value = false
      }
    }
  })
}

// 5. 删除
const handleDelete = (row: Treatment) => {
  ElMessageBox.confirm('确定删除吗?', '警告', { type: 'warning' })
    .then(async () => {
      await deleteTreatment(row.documentId)
      ElMessage.success('删除成功')
      fetchData()
    })
}

const handleSearch = () => { queryParams.page = 1; fetchData() }
const handleCurrentChange = (val: number) => { queryParams.page = val; fetchData() }

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <div class="filter-container">
        <div class="left">
          <el-input v-model="queryParams.treatmentNo" placeholder="搜索治疗编号..." class="search-input" clearable @clear="handleSearch" @keyup.enter="handleSearch">
            <template #append><el-button :icon="Search" @click="handleSearch" /></template>
          </el-input>
        </div>
        <div class="right">
          <el-button type="primary" :icon="Plus" @click="handleCreate">新建记录</el-button>
          <el-button :icon="Refresh" circle @click="fetchData" />
        </div>
      </div>

      <el-table v-loading="loading" :data="tableData" border style="margin-top: 20px">
        <el-table-column prop="treatmentNo" label="编号" width="120">
            <template #default="{ row }">
              <el-tag>{{ row.treatmentNo }}</el-tag>
            </template>
        </el-table-column>
        
        <el-table-column label="影像资料" width="120">
          <template #default="{ row }">
            <div v-if="row.Images && row.Images.length > 0" style="display: flex; align-items: center;">
              <el-image 
                style="width: 40px; height: 40px; border-radius: 4px; margin-right: 5px;"
                :src="getThumbnailUrl(row.Images[0])"
                :preview-src-list="row.Images.map((img: StrapiMedia) => getThumbnailUrl(img).replace('thumbnail_', ''))"
                preview-teleported
                fit="cover"
              />
              <span v-if="row.Images.length > 1" style="font-size: 12px; color: #909399;">+{{ row.Images.length - 1 }}</span>
            </div>
            <span v-else style="color: #dcdfe6;">-</span>
          </template>
        </el-table-column>

        <el-table-column label="关联患者" width="150">
          <template #default="{ row }">
            <span v-if="row.patient">{{ row.patient.Name }}</span>
            <el-tag v-else type="warning">无关联</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="部位">
          <template #default="{ row }">
            {{ TREATMENT_TARGET_MAP[row.target] || row.target }}
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" width="100">
          <template #default="{ row }">
            <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination v-model:current-page="queryParams.page" v-model:page-size="queryParams.pageSize" :total="total" layout="total, prev, pager, next" @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="新建治疗记录" width="600px" :close-on-click-modal="false" destroy-on-close>
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
        
        <el-form-item label="选择患者" prop="patient">
          <el-select
            v-model="formData.patient"
            filterable
            remote
            reserve-keyword
            placeholder="请输入患者姓名搜索"
            :remote-method="searchPatients"
            :loading="patientLoading"
            style="width: 100%"
          >
            <el-option
              v-for="item in patientOptions"
              :key="item.id"
              :label="`${item.Name} (${item.Gender === 'male' ? '男' : '女'})`"
              :value="item.documentId"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="治疗部位" prop="target">
          <el-select v-model="formData.target" placeholder="请选择" style="width: 100%">
            <el-option 
              v-for="item in targetOptions" 
              :key="item.value" 
              :label="item.label" 
              :value="item.value" 
            />
          </el-select>
        </el-form-item>

        <el-form-item label="治疗影像">
          <image-uploader ref="uploaderRef" :limit="10" />
        </el-form-item>

        <el-form-item label="手动序号" prop="sequence_number">
          <el-input-number v-model="formData.sequence_number" :min="1" placeholder="留空自动生成" style="width: 100%" />
          <div style="font-size: 12px; color: #999; margin-top: 5px; line-height: 1.2;">
            通常无需填写。
          </div>
        </el-form-item>

      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">确定创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-container { display: flex; justify-content: space-between; }
.search-input { width: 300px; }
.pagination-container { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>