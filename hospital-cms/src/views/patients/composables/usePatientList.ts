// src/views/patients/composables/usePatientList.ts
import { ref, reactive } from 'vue'
import { getPatientList, deletePatient } from '../../../api/patient'
import type { Patient } from '../../../api/types'
import { ElMessage, ElMessageBox } from 'element-plus'

export function usePatientList() {
  const loading = ref(false)
  const tableData = ref<Patient[]>([])
  const total = ref(0)

  // 查询参数
  const queryParams = reactive({
    page: 1,
    pageSize: 12,
    keyword: ''
  })

  // 高级搜索表单数据
  const advancedSearchForm = reactive({
    Name: '',
    Gender: '',
    birthdayRange: [] as string[],
    past_treatments: [] as string[]
  })

  // 核心获取数据逻辑
  const fetchData = async () => {
    loading.value = true
    try {
      const filters: any = {}
      
      // 1. 获取搜索关键词 (优先取高级搜索的 Name，如果没有则取顶部的 keyword)
      const keyword = advancedSearchForm.Name || queryParams.keyword
      
      // 🟢 核心修改开始：智能混合查询
      if (keyword) {
        // 使用 $or 操作符，满足任意一个条件即可返回
        filters.$or = [
          // 匹配姓名 (使用 $containsi 忽略大小写模糊匹配)
          { Name: { $containsi: keyword } },
          // 匹配 ID (使用 $contains 模糊匹配，这样只输ID的一部分也能搜到)
          { documentId: { $contains: keyword } }
        ]
      }
      // 🟢 核心修改结束

      // 2. 其他高级筛选条件
      if (advancedSearchForm.Gender) {
        filters.Gender = { $eq: advancedSearchForm.Gender }
      }
      if (advancedSearchForm.birthdayRange?.length === 2) {
        filters.Birthday = { 
          $gte: advancedSearchForm.birthdayRange[0], 
          $lte: advancedSearchForm.birthdayRange[1] 
        }
      }
      if (advancedSearchForm.past_treatments?.length > 0) {
        filters.past_treatments = { $contains: advancedSearchForm.past_treatments }
      }

      const apiParams = {
        page: queryParams.page,
        pageSize: queryParams.pageSize,
        filters, // 传入我们构建好的 filters 对象
        // 关键：为了性能，只 populate 需要在卡片上显示的字段
        populate: { 
          treatments: { 
            fields: ['treatmentNo', 'createdAt', 'target'], // 确保这里包含 target，如果卡片要显示部位的话
            sort: ['createdAt:desc'], // 取最新的治疗记录

          } 
        },
        sort: ['updatedAt:desc'] // 列表默认按最后更新时间排序
      }

      const res: any = await getPatientList(apiParams as any)
      
      // 处理 Strapi v5 数据结构差异 (双重解包逻辑)
      if (res.data && res.data.data) {
        tableData.value = res.data.data
        total.value = res.data.meta?.pagination?.total || 0
      } else if (res.data) {
        // 兼容某些拦截器可能已经解了一层包的情况
        tableData.value = res.data
        total.value = res.meta?.pagination?.total || 0
      } else {
        tableData.value = []
        total.value = 0
      }

    } catch (error) {
      console.error('获取列表失败:', error)
      ElMessage.error('获取数据失败，请重试')
    } finally {
      loading.value = false
    }
  }

  // 删除逻辑
  const handleDelete = (row: Patient) => {
    if (!row.documentId) return
    ElMessageBox.confirm(`确定删除患者 "${row.Name}" 吗？`, '警告', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    }).then(async () => {
      try {
        await deletePatient(row.documentId!)
        ElMessage.success('删除成功')
        // 删除后刷新列表，如果在最后一页且只有一条数据，建议页码减一 (这里暂简写直接刷新)
        fetchData()
      } catch (error) { 
        ElMessage.error('删除失败') 
      }
    })
  }

  // 🟢 新增：全局重置逻辑
  const handleReset = () => {
    // 1. 清空顶部搜索关键字
    queryParams.keyword = ''
    
    // 2. 清空所有高级筛选条件
    advancedSearchForm.Name = ''
    advancedSearchForm.Gender = ''
    advancedSearchForm.birthdayRange = []
    advancedSearchForm.past_treatments = []

    // 3. 重置回第一页
    queryParams.page = 1

    // 4. 立即刷新列表
    fetchData()
  }

  return {
    loading,
    tableData,
    total,
    queryParams,
    advancedSearchForm,
    fetchData,
    handleDelete,
    handleReset
  }
}