<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { getTreatmentList, deleteTreatment } from '../../api/treatment'
import type { Treatment } from '../../api/types'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'

const tableData = ref<Treatment[]>([])
const loading = ref(false)
const total = ref(0)

// 查询参数状态
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  treatmentNo: '' // 搜索框绑定的值
})

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const apiParams: any = {
      'pagination[page]': queryParams.page,
      'pagination[pageSize]': queryParams.pageSize,
      sort: 'createdAt:desc', // 默认按创建时间倒序
    }

    // 如果有搜索内容，添加过滤条件
    if (queryParams.treatmentNo) {
      // 假设我们要搜索治疗编号 ($contains 是 Strapi 的模糊搜索语法)
      apiParams['filters[treatmentNo][$contains]'] = queryParams.treatmentNo
    }

    const res: any = await getTreatmentList(apiParams)
    
    // 数据解包 (根据 Phase 3.1 的经验)
    if (res.data) {
      tableData.value = res.data.data || []
      total.value = res.data.meta?.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取列表失败', error)
  } finally {
    loading.value = false
  }
}

// 翻页处理
const handleCurrentChange = (val: number) => {
  queryParams.page = val
  fetchData()
}

// 搜索处理
const handleSearch = () => {
  queryParams.page = 1
  fetchData()
}

// 删除处理
const handleDelete = (row: Treatment) => {
  ElMessageBox.confirm(
    `确定要删除编号为 "${row.treatmentNo}" 的记录吗?`,
    '警告',
    { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    await deleteTreatment(row.id)
    ElMessage.success('删除成功')
    fetchData() // 刷新列表
  })
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <el-card shadow="never">
    <div class="filter-container">
      <el-input
        v-model="queryParams.treatmentNo"
        placeholder="搜索治疗编号..."
        class="search-input"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch"
      >
        <template #append>
          <el-button :icon="Search" @click="handleSearch" />
        </template>
      </el-input>
      <el-button :icon="Refresh" circle @click="fetchData" />
    </div>

    <el-table 
      v-loading="loading" 
      :data="tableData" 
      style="width: 100%; margin-top: 20px" 
      border
    >
      <el-table-column prop="id" label="ID" width="80" />
      
      <el-table-column prop="treatmentNo" label="治疗编号" width="180">
        <template #default="{ row }">
          <el-tag type="info">{{ row.treatmentNo || '无编号' }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="关联患者" width="150">
        <template #default="{ row }">
          <span v-if="row.patient" style="font-weight: bold">
            {{ row.patient.Name }}
          </span>
          <el-tag v-else type="danger" size="small">未关联</el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="target" label="治疗部位" width="150">
        <template #default="{ row }">
          <el-tag effect="plain">{{ row.target }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="createdAt" label="记录时间" />

      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
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
</template>

<style scoped>
.filter-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.search-input {
  width: 300px;
}
.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>