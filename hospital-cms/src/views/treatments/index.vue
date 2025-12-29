<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Refresh, Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 组件引入
import TreatmentCreateDialog from '../../components/TreatmentCreateDialog.vue'

// API 引入
import { getTreatmentList, deleteTreatment } from '../../api/treatment'
import type { Treatment, StrapiMedia } from '../../api/types'

// 常量引入
import { TREATMENT_TARGET_MAP } from '../../constants/treatment';

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

// --- 组件引用 ---
const treatmentCreateRef = ref<InstanceType<typeof TreatmentCreateDialog> | null>(null)

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

// 2. 打开新建弹窗
const handleCreate = () => {
  // 直接调用组件的 open 方法，不传参代表"非锁定模式"（可以搜索选择任意患者）
  treatmentCreateRef.value?.open()
}

// 3. 删除
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
          <el-input 
            v-model="queryParams.treatmentNo" 
            placeholder="搜索治疗编号..." 
            class="search-input" 
            clearable 
            @clear="handleSearch" 
            @keyup.enter="handleSearch"
          >
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

        <el-table-column label="时长" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.duration" type="info" effect="plain">
              {{ row.duration }} 小时
            </el-tag>
            <span v-else class="text-gray-300">-</span>
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
        <el-pagination 
          v-model:current-page="queryParams.page" 
          v-model:page-size="queryParams.pageSize" 
          :total="total" 
          layout="total, prev, pager, next" 
          @current-change="handleCurrentChange" 
        />
      </div>
    </el-card>

    <treatment-create-dialog 
      ref="treatmentCreateRef" 
      @success="fetchData" 
    />
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }
.filter-container { display: flex; justify-content: space-between; }
.search-input { width: 300px; }
.pagination-container { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>