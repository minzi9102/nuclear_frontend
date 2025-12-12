<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
// 🟢 引入新增和修改的 API
import { getPatientList, deletePatient, createPatient, updatePatient } from '../../api/patient'
import type { Patient } from '../../api/types'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'

// --- 数据定义 ---
const loading = ref(false)
const tableData = ref<Patient[]>([])
const total = ref(0)

// 🟢 弹窗相关状态
const dialogVisible = ref(false)
const dialogTitle = ref('新建患者')
const formLoading = ref(false)
const formRef = ref<FormInstance>()

// 🟢 表单数据模型
const formData = reactive({
  id: undefined as number | undefined, // 有 id 代表编辑，无 id 代表新建
  Name: '',
  Gender: 'male', // 默认选中男
  Birthday: ''
})

// 🟢 表单校验规则
const rules = {
  Name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  Birthday: [{ required: true, message: '请选择出生日期', trigger: 'change' }]
}

// 查询参数
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  keyword: ''
})

// --- 方法定义 ---

// 1. 获取数据 (保持你原有的逻辑)
const fetchData = async () => {
  loading.value = true
  try {
    const apiParams = {
      'pagination[page]': queryParams.page,
      'pagination[pageSize]': queryParams.pageSize,
      ...queryParams.keyword ? { 'filters[Name][$contains]': queryParams.keyword } : {},
      sort: 'createdAt:desc'
    }

    const res: any = await getPatientList(apiParams as any)

    // 数据解包逻辑
    if (res.data && res.data.data) {
        tableData.value = res.data.data
        total.value = res.data.meta?.pagination?.total || 0
    } else if (res.data) {
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
  queryParams.page = 1
  fetchData()
}

// 3. 分页
const handleCurrentChange = (val: number) => {
  queryParams.page = val
  fetchData()
}

// 4. 删除
const handleDelete = (row: Patient) => {
  ElMessageBox.confirm(
    `确定要删除患者 "${row.Name}" 吗？此操作不可恢复。`,
    '警告',
    { confirmButtonText: '确定删除', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      await deletePatient(row.id)
      ElMessage.success('删除成功')
      fetchData()
    } catch (error) {
      console.error(error)
    }
  })
}

// 🟢 5. 打开“新建”弹窗
const handleCreate = () => {
  dialogTitle.value = '新建患者'
  // 重置表单
  formData.id = undefined
  formData.Name = ''
  formData.Gender = 'male'
  formData.Birthday = ''
  dialogVisible.value = true
}

// 🟢 6. 打开“编辑”弹窗
const handleEdit = (row: Patient) => {
  dialogTitle.value = '编辑患者'
  // 填充表单
  formData.id = row.id
  formData.Name = row.Name
  formData.Gender = row.Gender
  formData.Birthday = row.Birthday
  dialogVisible.value = true
}

// 🟢 7. 提交表单 (核心逻辑)
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      formLoading.value = true
      try {
        if (formData.id) {
          // 编辑模式
          await updatePatient(formData.id, {
            Name: formData.Name,
            Gender: formData.Gender,
            Birthday: formData.Birthday
          })
          ElMessage.success('修改成功')
        } else {
          // 新建模式
          await createPatient({
            Name: formData.Name,
            Gender: formData.Gender,
            Birthday: formData.Birthday
          })
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false // 关闭弹窗
        fetchData() // 刷新列表
      } catch (error) {
        console.error(error)
        ElMessage.error('操作失败，请检查网络或权限')
      } finally {
        formLoading.value = false
      }
    }
  })
}

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
          <el-button type="primary" :icon="Plus" @click="handleCreate">新建患者</el-button>
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
            <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="formData" :rules="rules" label-width="80px">
        <el-form-item label="姓名" prop="Name">
          <el-input v-model="formData.Name" placeholder="请输入姓名" />
        </el-form-item>
        
        <el-form-item label="性别" prop="Gender">
          <el-radio-group v-model="formData.Gender">
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="生日" prop="Birthday">
          <el-date-picker
            v-model="formData.Birthday"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="formLoading" @click="handleSubmit">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
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