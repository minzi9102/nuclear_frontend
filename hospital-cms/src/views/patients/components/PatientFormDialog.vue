<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { createPatient, updatePatient } from '../../../api/patient'
import { PAST_TREATMENT_OPTIONS, type PastTreatment } from '../../../constants/treatment'
import type { Patient } from '../../../api/types'

const emit = defineEmits(['success'])

const visible = ref(false)
const title = ref('新建患者')
const loading = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  documentId: undefined as string | undefined,
  Name: '',
  Gender: 'male',
  Birthday: '',
  past_treatments: ['none'] as PastTreatment[]
})

const rules = {
  Name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  Birthday: [{ required: true, message: '请选择出生日期', trigger: 'change' }]
}

// 供父组件调用
const open = (row?: Patient) => {
  visible.value = true
  if (row) {
    title.value = '编辑患者'
    formData.documentId = row.documentId
    formData.Name = row.Name
    formData.Gender = row.Gender as string
    formData.Birthday = row.Birthday
    formData.past_treatments = Array.isArray(row.past_treatments) ? row.past_treatments : []
  } else {
    title.value = '新建患者'
    formData.documentId = undefined
    formData.Name = ''
    formData.Gender = 'male'
    formData.Birthday = ''
    formData.past_treatments = ['none']
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        if (formData.documentId) {
            await updatePatient(formData.documentId, { ...formData })
            ElMessage.success('修改成功')
        } else {
            await createPatient({ ...formData })
            ElMessage.success('创建成功')
        }
        visible.value = false
        emit('success')
      } catch (error) { ElMessage.error('操作失败') }
      finally { loading.value = false }
    }
  })
}

// 监听既往史互斥逻辑
watch(() => formData.past_treatments, (newVal, oldVal) => {
    if (newVal.length > 1) {
        if (newVal.includes('none') && oldVal.includes('none')) {
            formData.past_treatments = newVal.filter(item => item !== 'none')
        } else if (newVal.includes('none') && !oldVal.includes('none')) {
            formData.past_treatments = ['none']
        }
    }
    if (newVal.length === 0) formData.past_treatments = ['none']
}, { deep: true })

defineExpose({ open })
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="90%" style="max-width: 500px;" append-to-body destroy-on-close top="5vh">
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="70px" label-position="top">
        <el-form-item label="姓名" prop="Name"><el-input v-model="formData.Name" size="large" /></el-form-item>
        <el-form-item label="性别" prop="Gender">
            <el-radio-group v-model="formData.Gender" size="large" class="w-full">
                <el-radio-button label="male" class="w-1/2">男</el-radio-button>
                <el-radio-button label="female" class="w-1/2">女</el-radio-button>
            </el-radio-group>
        </el-form-item>
        <el-form-item label="出生日期" prop="Birthday"><el-date-picker v-model="formData.Birthday" type="date" style="width: 100%" size="large" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="有无接受过其他治疗">
            <el-checkbox-group v-model="formData.past_treatments" class="flex flex-wrap">
                <el-checkbox v-for="opt in PAST_TREATMENT_OPTIONS" :key="opt.value" :label="opt.value" border class="mb-2 mr-2 ml-0">{{ opt.label }}</el-checkbox>
            </el-checkbox-group>
        </el-form-item>
    </el-form>
    <template #footer>
        <span class="dialog-footer">
            <el-button size="large" @click="visible = false">取消</el-button>
            <el-button size="large" type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
        </span>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 保持原有的响应式样式 */
.app-container { padding: 16px; max-width: 1400px; margin: 0 auto; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.search-box { flex: 1; display: flex; gap: 8px; }
.search-box :deep(.el-input) { flex: 1; }
.search-box .el-button, .create-btn { flex-shrink: 0; }

/* 样式辅助类 */
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.items-center { align-items: center; }
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.mb-6 { margin-bottom: 24px; }
.mt-1 { margin-top: 4px; }
.mt-4 { margin-top: 16px; }
.mt-8 { margin-top: 32px; }
.p-2 { padding: 8px; }
.p-3 { padding: 12px; }
.p-4 { padding: 16px; }
.px-4 { padding-left: 16px; padding-right: 16px; }
.py-3 { padding-top: 12px; padding-bottom: 12px; }

/* 文本与颜色 */
.text-lg { font-size: 1.125rem; }
.text-sm { font-size: 0.875rem; }
.text-xs { font-size: 0.75rem; }
.font-bold { font-weight: 700; }
.text-gray-300 { color: #d1d5db; }
.text-gray-400 { color: #9ca3af; }
.text-gray-500 { color: #6b7280; }
.text-gray-800 { color: #1f2937; }
.text-blue-500 { color: #3b82f6; }
.text-pink-500 { color: #ec4899; }

.bg-white { background-color: #ffffff; }
.bg-gray-50 { background-color: #f9fafb; }
.border-b { border-bottom: 1px solid #e5e7eb; }
.border-t { border-top: 1px solid #e5e7eb; }
.rounded-lg { border-radius: 8px; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cursor-pointer { cursor: pointer; }
.hover\:shadow-lg:hover { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.w-full { width: 100%; }

/* 移动端特殊优化 (保持原有代码) */
@media (max-width: 768px) {
  .header-actions { flex-direction: column; align-items: stretch; gap: 10px; }
  .search-box { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
  .search-box :deep(.el-input) { order: -1; flex: none; width: 100%; }
  .search-box .el-button { flex: 1; margin: 0; }
  .create-btn { width: 100%; margin-left: 0 !important; }
  :deep(.el-drawer__body) { padding: 15px !important; }
  :deep(.el-range-editor.el-input__wrapper) { width: 100% !important; box-sizing: border-box; display: inline-flex; padding: 0 5px; }
  :deep(.el-range-input) { width: 40% !important; font-size: 12px !important; }
  :deep(.el-drawer__footer) .flex { flex-direction: column; gap: 10px; }
  :deep(.el-drawer__footer) .el-button { width: 100%; margin-left: 0 !important; }
}
:deep(.el-checkbox.is-bordered) { margin-left: 0 !important; margin-right: 8px !important; }
:deep(.el-checkbox-group) { display: flex; flex-wrap: wrap; }
:deep(.text-danger) {  color: #f56c6c !important;}
:deep(.text-danger:hover) {  background-color: #fef0f0 !important;}
</style>