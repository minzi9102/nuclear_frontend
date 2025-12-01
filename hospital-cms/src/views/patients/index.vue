<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { getPatientList, deletePatient } from '../../api/patient'
import type { Patient } from '../../api/types'
import { ElMessage, ElMessageBox } from 'element-plus'

// --- 数据定义 ---
const loading = ref(false)
const tableData = ref<Patient[]>([])
const total = ref(0)

// 查询参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  keyword: '' // 搜索关键词
})

// --- 方法定义 ---

// 1. 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    // 构造符合 Strapi 要求的参数
    const apiParams = {
      'pagination[page]': queryParams.page,
      'pagination[pageSize]': queryParams.pageSize,
      // 只有当有关键词时才添加过滤参数
      ...queryParams.keyword ? { 'filters[Name][$contains]': queryParams.keyword } : {},
      sort: 'createdAt:desc' // 默认按创建时间倒序
    }

    const res: any = await getPatientList(apiParams as any)

    console.log('API真实返回:', res)
    
    // 注意：这里基于 Strapi v5/v4 结构，res.data 是 Axios 的 payload，res.data.data 才是 Strapi 的数据
    // 如果你在 request.ts 做了拦截器直接返回 res.data，请根据实际情况调整
    // tableData.value = res.data // 假设拦截器返回的是 res.data
    // total.value = res.meta.pagination.total
    if (res.data && res.data.data) {
        // 情况 A：如果没有拦截器，res 是 Axios 对象，数据在 res.data.data
        tableData.value = res.data.data
        total.value = res.data.meta?.pagination?.total || 0
    } else if (res.data) {
        // 情况 B：如果有拦截器剥了一层，数据可能在 res.data
        // (根据你之前的报错，情况 A 的可能性最大)
        tableData.value = res.data 
        total.value = res.meta?.pagination?.total || 0
    }

  } catch (error) {
    console.error('获取患者列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 2. 搜索
const handleSearch = () => {
  queryParams.page = 1 // 搜索时重置为第一页
  fetchData()
}

// 3. 分页变化
const handleCurrentChange = (val: number) => {
  queryParams.page = val
  fetchData()
}

// 4. 删除逻辑
const handleDelete = (row: Patient) => {
  ElMessageBox.confirm(
    `确定要删除患者 "${row.Name}" 吗？此操作不可恢复。`,
    '警告',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(async () => {
    try {
      await deletePatient(row.id)
      ElMessage.success('删除成功')
      fetchData() // 刷新列表
    } catch (error) {
      console.error(error)
    }
  })
}

// --- 生命周期 ---
onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never">
      <div class="header-actions">
        <div class="left-panel">
          <el-input 
            v-model="queryParams.keyword" 
            placeholder="搜索患者姓名..." 
            class="search-input"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button :icon="Search" @click="handleSearch" />
            </template>
          </el-input>
        </div>
        <div class="right-panel">
          <el-button type="primary" :icon="Plus">新建患者</el-button>
        </div>
      </div>

      <el-table 
        v-loading="loading" 
        :data="tableData" 
        style="width: 100%; margin-top: 20px"
        border
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="Name" label="姓名" width="180">
          <template #default="{ row }">
            <span style="font-weight: bold">{{ row.Name }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="Gender" label="性别" width="100">
          <template #default="{ row }">
            <el-tag :type="row.Gender === 'male' ? '' : 'danger'">
              {{ row.Gender === 'male' ? '男' : '女' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="Birthday" label="出生日期" />
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit">详情/编辑</el-button>
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
  </div>
</template>

<style scoped>
.app-container {
  padding: 20px;
}
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.search-input {
  width: 300px;
}
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>