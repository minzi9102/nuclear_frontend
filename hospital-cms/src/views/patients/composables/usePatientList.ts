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
      const searchName = advancedSearchForm.Name || queryParams.keyword
      
      if (searchName) filters.$or = [{ Name: { $containsi: searchName } }]
      if (advancedSearchForm.Gender) filters.Gender = { $eq: advancedSearchForm.Gender }
      if (advancedSearchForm.birthdayRange?.length === 2) {
        filters.Birthday = { $gte: advancedSearchForm.birthdayRange[0], $lte: advancedSearchForm.birthdayRange[1] }
      }
      if (advancedSearchForm.past_treatments?.length > 0) {
        filters.past_treatments = { $contains: advancedSearchForm.past_treatments }
      }

      const apiParams = {
        page: queryParams.page,
        pageSize: queryParams.pageSize,
        filters,
        populate: { treatments: { fields: ['treatmentNo', 'createdAt'] } }
      }

      const res: any = await getPatientList(apiParams as any)
      // 处理 Strapi v5 数据结构差异
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

  // 删除逻辑
  const handleDelete = (row: Patient) => {
    if (!row.documentId) return
    ElMessageBox.confirm(`确定删除患者 "${row.Name}" 吗？`, '警告', {
      confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
    }).then(async () => {
      try {
        await deletePatient(row.documentId!)
        ElMessage.success('删除成功')
        fetchData()
      } catch (error) { ElMessage.error('删除失败') }
    })
  }

  return {
    loading,
    tableData,
    total,
    queryParams,
    advancedSearchForm,
    fetchData,
    handleDelete
  }
}