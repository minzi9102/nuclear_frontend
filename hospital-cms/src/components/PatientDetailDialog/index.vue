<template>
  <el-dialog 
    v-model="visible" 
    width="90%" 
    style="max-width: 650px;" 
    align-center
    destroy-on-close
    append-to-body
    :show-close="false" 
    class="custom-dialog fixed-header-dialog" 
  >
    <template #header="{ titleId, titleClass }">
      <div class="dialog-header">
        <span :id="titleId" :class="titleClass" class="header-title">
          {{ loading ? '数据同步中...' : '患者详细档案' }}
        </span>
        
        <div class="header-actions">
          <el-button 
            type="primary" 
            :icon="Plus"
            :disabled="loading || !patientData"
            @click="openCreateDialog"
            round
            size="default"
          >
            新建记录
          </el-button>
          
          <el-button circle :icon="Close" @click="visible = false" style="border: none; background: #f3f4f6;" />
        </div>
      </div>
    </template>

    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>正在获取完整病历...</p>
    </div>

    <div v-else-if="patientData" class="detail-container">
      <PatientInfo 
        :patient="patientData" 
        :treatment-count="patientData.treatments?.length || 0" 
      />

      <TreatmentList :treatments="patientData.treatments || []" 
      @edit="handleEditTreatment"/>
    </div>

    <TreatmentCreateDialog ref="treatmentCreateRef" @success="onTreatmentSaved" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loading, Close, Plus } from '@element-plus/icons-vue'
import { getPatientList } from '../../api/patient' // 注意路径变化
import { ElMessage } from 'element-plus'
import type { Treatment } from '../../api/types' // 🟢 引入类型
// 引入子组件
import PatientInfo from './PatientInfo.vue'
import TreatmentList from './TreatmentList.vue'
import TreatmentCreateDialog from '../TreatmentCreateDialog.vue' // 注意路径

const visible = ref(false)
const loading = ref(false)
const patientData = ref<any>(null)
const currentDocumentId = ref('')
const treatmentCreateRef = ref()

const openCreateDialog = () => {
  if (patientData.value) {
    // ✅ 正确：直接传递完整的响应式对象
    // 此时 patientData.value 包含了 Name, Gender, Birthday 等所有字段
    treatmentCreateRef.value.open(patientData.value)
  }
}

// 🟢 新增：处理编辑点击
const handleEditTreatment = (treatment: Treatment) => {
  if (patientData.value) {
    // 调用弹窗的 open 方法，传入当前病人和要编辑的治疗记录
    treatmentCreateRef.value.open(patientData.value, treatment)
  }
}

// 保存成功回调 (新建和编辑都走这里)
const onTreatmentSaved = () => { 
  if (currentDocumentId.value) open(currentDocumentId.value) 
}

const open = async (documentId: string) => {
  visible.value = true
  loading.value = true
  patientData.value = null
  currentDocumentId.value = documentId

  try {
    const res: any = await getPatientList({
      filters: { documentId: { $eq: documentId } }
    } as any)

    let data = null
    if (res.data?.data && Array.isArray(res.data.data)) {
        data = res.data.data[0]
    } else if (res.data && Array.isArray(res.data)) {
        data = res.data[0]
    }

    if (data) {
        patientData.value = data
    } else {
        throw new Error('未找到数据')
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('数据同步失败')
  } finally {
    loading.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.dialog-header { display: flex; align-items: center; justify-content: space-between; width: 100%; }
.header-title { font-size: 16px; font-weight: bold; color: #303133; }
.header-actions { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.loading-state { padding: 40px; text-align: center; color: #909399; }
</style>

<style>
/* 全局样式 (针对 Dialog 结构) - 保持不变 */
.fixed-header-dialog { margin-top: 5vh !important; max-height: 90vh; display: flex; flex-direction: column; }
.fixed-header-dialog .el-dialog__body { overflow-y: auto; padding-top: 10px !important; flex: 1; }
</style>