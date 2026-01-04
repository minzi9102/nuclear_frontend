<script setup lang="ts">
import { ref, reactive, nextTick, computed, watch } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import dayjs from 'dayjs'
import { pinyin } from 'pinyin-pro'
import { User } from '@element-plus/icons-vue'

// 组件引入
import ImageUploader from '../components/ImageUploader/index.vue'

// API 引入
import { createTreatment, updateTreatment, getLastSequenceNumber } from '../api/treatment'
import { getPatientList } from '../api/patient'
import type { Patient, Treatment } from '../api/types'

// 常量引入
import { TARGET_OPTIONS } from '../constants/treatment'

// --- 环境变量 ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

const props = defineProps<{
  defaultPatient?: { documentId: string; Name: string }
}>()

const emit = defineEmits(['success'])

// --- 状态定义 ---
const visible = ref(false)
const formLoading = ref(false)
const formRef = ref<FormInstance>()

const uploaderRefs = ref<Map<number, any>>(new Map())
const predictedNextSequence = ref(1)

// 选项数据
const targetOptions = TARGET_OPTIONS
const patientLoading = ref(false)
const patientOptions = ref<Patient[]>([])

// 锁定状态
const isPatientLocked = ref(false)
const lockedPatientData = ref<Patient | null>(null)

// 🟢 新增：编辑模式状态
const isEditMode = ref(false)
const editingId = ref<string>('')

const width = ref(window.innerWidth)
const isMobile = computed(() => width.value < 768)

// 表单模型
// 🟢 修改：lesions 增加 initialPhotos 字段 (仅用于前端传递数据给 Uploader)
const formData = reactive({
  patient: '' as string,
  patientName: '' as string,
  sequence_number: undefined as number | undefined,
  base_duration: 48,
  
  lesions: [
    { 
      key: Date.now(), 
      part: '', 
      notes: '', 
      duration: undefined as number | undefined,
      initialPhotos: [] as any[] // 🟢 增加此字段用于回显
    }
  ]
})

// --- 核心方法 ---

const fetchNextSequence = async (patientId: string) => {
  if (!patientId) return
  try {
    const res: any = await getLastSequenceNumber(patientId)
    const list = res.data?.data || []
    
    if (list.length > 0 && list[0].sequence_number) {
      predictedNextSequence.value = list[0].sequence_number + 1
    } else {
      predictedNextSequence.value = 1
    }
  } catch (error) {
    console.warn('获取历史序号失败，降级为默认值 1', error)
    predictedNextSequence.value = 1
  }
}

const setUploaderRef = (el: any, index: number) => {
  if (el) {
    uploaderRefs.value.set(index, el)
  }
}

const addLesion = () => {
  formData.lesions.unshift({
    key: Date.now(),
    part: '', 
    notes: '',
    duration: undefined,
    initialPhotos: [] 
  })
}

const removeLesion = (index: number) => {
  formData.lesions.splice(index, 1);

  if (formData.lesions.length === 1) {
    const remainingLesion = formData.lesions[0];
    // 只有当 remainingLesion 真的存在时才操作
    if (remainingLesion) {
      remainingLesion.duration = undefined;
    }
  }
}

/**
 * 🟢 修改：打开弹窗的方法 (支持编辑)
 * @param patient 患者对象
 * @param treatmentToEdit (可选) 需要编辑的治疗记录对象
 */
const open = (patient?: Patient, treatmentToEdit?: Treatment) => {
  // 1. 重置表单基础状态
  formData.patient = ''
  formData.patientName = '' 
  formData.sequence_number = undefined
  formData.base_duration = 48
  formData.lesions = [] // 先清空，后面根据情况填充
  uploaderRefs.value.clear()

  patientOptions.value = []
  lockedPatientData.value = null
  predictedNextSequence.value = 1
  
  isEditMode.value = false
  editingId.value = ''

  // 2. 处理患者信息 (Locked or Not)
  if (patient) {
    isPatientLocked.value = true
    formData.patient = patient.documentId
    formData.patientName = patient.Name
    lockedPatientData.value = patient
  } else {
    isPatientLocked.value = false
  }

  // 3. 🟢 分支逻辑：编辑模式 vs 新建模式
  if (treatmentToEdit) {
    isEditMode.value = true
    editingId.value = treatmentToEdit.documentId
    
    // 回填基础信息
    formData.sequence_number = treatmentToEdit.sequence_number
    // 处理 duration: 如果后端是 0 或 null, 回退默认 48
    formData.base_duration = treatmentToEdit.duration || 48

    // 🟢 核心：映射多病灶数据
    if (treatmentToEdit.details && treatmentToEdit.details.length > 0) {
      formData.lesions = treatmentToEdit.details.map((detail, idx) => {
        // 映射图片：将 Strapi 格式转为 Uploader 需要的格式
        const photos = detail.photos || []
        const formattedPhotos = photos.map((img: any) => ({
          id: img.id,
          name: img.name,
          url: img.url.startsWith('http') ? img.url : `${API_URL}${img.url}`
        }))

        return {
          key: Date.now() + idx, // 唯一key
          part: detail.part,
          notes: detail.notes || '',
          duration: detail.duration ?? undefined, // 可能是 null
          initialPhotos: formattedPhotos // 传递给 Uploader
        }
      })
    } else {
        // 兼容旧数据或空数据：至少保留一行
        formData.lesions = [{ key: Date.now(), part: '', notes: '', duration: undefined, initialPhotos: [] }]
    }

  } else {
    // 新建模式
    isEditMode.value = false
    formData.lesions = [{ key: Date.now(), part: '', notes: '', duration: undefined, initialPhotos: [] }]
    if (patient) fetchNextSequence(patient.documentId)
  }

  // 4. 显示弹窗
  visible.value = true

  watch(() => formData.patient, (newVal) => {
    if (!isPatientLocked.value && newVal && !isEditMode.value) {
      fetchNextSequence(newVal)
    }
  })
  
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

const searchPatients = async (query: string) => {
  if (query && !isPatientLocked.value) {
    patientLoading.value = true
    try {
      const res: any = await getPatientList({
        'filters[Name][$contains]': query,
        'pagination[limit]': 10,
      } as any)
      patientOptions.value = res.data?.data || res.data || []
    } catch (error) {
      console.error(error)
    } finally {
      patientLoading.value = false
    }
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      formLoading.value = true
      try {
        let currentPatient: Patient | undefined

        if (isPatientLocked.value) {
          currentPatient = lockedPatientData.value!
        } else {
          currentPatient = patientOptions.value.find(
            p => p.documentId === formData.patient
          )
        }

        if (!currentPatient && !isEditMode.value) {
            console.warn('未找到匹配的患者信息');
        }

        // --- 生成文件名前缀 (仅新建文件使用) ---
        let baseFilePrefix = ''
        const finalCount = formData.sequence_number || predictedNextSequence.value
        
        // 即使是编辑模式，如果要上传新图，也需要生成这个前缀
        // 如果 currentPatient 丢失 (极少见), 使用默认 Unknown
        if (currentPatient) {
          const nameStr = currentPatient.Name || 'Unknown'
          const namePinyin = pinyin(nameStr, { toneType: 'none', type: 'array', v: true }).join('')
          const rawGender = currentPatient.Gender || 'unknown'
          const gender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1)
          const birthday = currentPatient.Birthday ? dayjs(currentPatient.Birthday).format('YYYYMMDD') : '00000000'
          const today = dayjs().format('YYYYMMDDHHmm')
          baseFilePrefix = `${today}_${namePinyin}_${gender}_${birthday}_seq${finalCount}`
        } else {
          baseFilePrefix = `Unknown_${dayjs().format('YYYYMMDDHHmm')}_seq${finalCount}`
        }

        // --- 收集 lesions 数据 ---
        const detailsPayload = []

        for (const [index, lesion] of formData.lesions.entries()) {
          const uploader = uploaderRefs.value.get(index)
          let imageIds: number[] = []

          if (uploader) {
            const specificSuffix = `${baseFilePrefix}_${lesion.part || 'Part'}`
            // 🟢 修改：submitAll 内部会自动处理 新上传 vs 旧ID
            imageIds = await uploader.submitAll(specificSuffix)
          }

          detailsPayload.push({
            part: lesion.part,
            duration: lesion.duration,
            photos: imageIds,
            notes: lesion.notes 
          })
        }

        const submitData = {
          patient: formData.patient,
          sequence_number: formData.sequence_number,
          duration: formData.base_duration,
          details: detailsPayload 
        }

        // 🟢 分支：创建或更新
        if (isEditMode.value) {
            await updateTreatment(editingId.value, submitData)
            ElMessage.success('治疗记录更新成功')
        } else {
            await createTreatment(submitData)
            ElMessage.success('治疗记录创建成功')
        }
        
        visible.value = false
        emit('success')
        
      } catch (error: any) {
        console.error(error)
        ElMessage.error(error.message || '操作失败')
      } finally {
        formLoading.value = false
      }
    }
  })
}

window.addEventListener('resize', () => {
  width.value = window.innerWidth
})

const dialogWidth = computed(() => {
  return isMobile.value ? '90%' : '600px'
})

defineExpose({ open })
</script>

<template>
  <el-dialog 
    v-model="visible" 
    :title="isEditMode ? '编辑治疗记录' : '新建治疗记录'" 
    :width="dialogWidth" 
    :top="isMobile ? '4vh' : '5vh'"
    class="mobile-dialog"
    :close-on-click-modal="false" 
    destroy-on-close
    append-to-body
  >
    <el-form 
      ref="formRef" 
      :model="formData" 
      :label-width="isMobile ? 'auto' : '100px'"
      :label-position="isMobile ? 'top' : 'right'"
    >
      
      <div class="section-block">
        <h4 class="section-title">基础信息</h4>
        
        <el-form-item label="关联患者" prop="patient" :rules="[{ required: true, message: '请选择患者' }]">
          <el-input 
            v-if="isPatientLocked || isEditMode" 
            :model-value="formData.patientName || (isEditMode ? '当前患者' : '')" 
            disabled 
            placeholder="已锁定"
          >
             <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
           <el-select
          v-else
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
            :key="item.documentId"
            :label="`${item.Name} (${item.Gender === 'male' ? '男' : '女'})`"
            :value="item.documentId"
          />
          </el-select>
      </el-form-item>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="默认时长" prop="base_duration" :rules="[{ required: true, message: '请填写默认时长' }]">
               <el-input-number 
                 v-model="formData.base_duration" 
                 :min="1" :step="1" :precision="0" 
                 style="width: 100%"
               >
                 <template #suffix>小时</template>
               </el-input-number>
            </el-form-item>
          </el-col>
           <el-col :xs="24" :sm="12">
             <el-form-item label="手动序号" prop="sequence_number">
                <el-input-number v-model="formData.sequence_number" placeholder="自动生成" style="width: 100%" />
             </el-form-item>
           </el-col>
        </el-row>
      </div>

      <div class="section-block">
        <div class="flex-row-between">
          <h4 class="section-title">病灶详情 ({{ formData.lesions.length }})</h4>
          <el-button type="primary" link icon="Plus" @click="addLesion">添加部位</el-button>
        </div>

        <TransitionGroup name="list" tag="div" style="position: relative;">
        <div v-for="(lesion, index) in formData.lesions" :key="lesion.key" class="lesion-card">
          <div class="lesion-header">
            <span class="index-badge">#{{ formData.lesions.length - index }}</span>
            <el-button v-if="formData.lesions.length > 1" type="danger" link icon="Delete" @click="removeLesion(index)">移除</el-button>
          </div>
          
          <el-row :gutter="20">
            <el-col :xs="24" :sm="12">
              <el-form-item 
                label="治疗部位" 
                :prop="`lesions.${index}.part`"
                :rules="[{ required: true, message: '必选', trigger: 'change' }]"
              >
                <el-select v-model="lesion.part" placeholder="选择部位" style="width: 100%">
                   <el-option v-for="op in targetOptions" :key="op.value" :label="op.label" :value="op.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12">
              <el-form-item label="特殊时长" :prop="`lesions.${index}.duration`">
                <el-input-number
                  class="duration-input"
                  :disabled="formData.lesions.length === 1"
                  :model-value="lesion.duration ?? formData.base_duration"
                  @update:model-value="(val: number | undefined) => lesion.duration = val"
                  :step="1"
                  :min="1"
                  controls-position="right"                
                  :class="{ 'is-inherited': lesion.duration === undefined }"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="备注" class="mt-2" :prop="`lesions.${index}.notes`">
              <el-input 
                  v-model="lesion.notes" 
                  placeholder="例如：能量参数、特殊说明..." 
                  type="textarea" 
                  :rows="1"
                  resize="none"
              />
          </el-form-item>

          <el-form-item label="影像记录" required>
            <image-uploader 
              :ref="(el) => setUploaderRef(el, index)" 
              :limit="9" 
              :initial-files="lesion.initialPhotos"
            />
          </el-form-item>
        </div>
      </TransitionGroup>
      </div>

    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">
           {{ isEditMode ? '保存修改' : '确定创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
/* 样式保持不变 */
.tips {
  font-size: 12px; 
  color: #909399; 
  margin-top: 4px; 
  line-height: 1.4;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
@media screen and (max-width: 768px) {
  .dialog-footer {
    justify-content: stretch;
  }
  .dialog-footer button {
    flex: 1;
  }
  :deep(.el-input-number .el-input__inner) {
    text-align: center;
    padding-left: 10px;
    padding-right: 40px; 
  }
}
.section-block { margin-bottom: 20px; }
.section-title { margin-bottom: 10px; font-weight: bold; border-left: 3px solid var(--el-color-primary); padding-left: 8px; }
.flex-row-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; margin-top: -30px;}
.lesion-card { background: #f5f7fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; position: relative; }
.lesion-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.index-badge { background: #e6e8eb; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #606266; }
.list-move, 
.list-enter-active{
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}
.list-leave-active {
  transition: all 0.3s linear;
}
.list-enter-from {
  opacity: 0;
  transform: translateY(-30px); 
}
.list-leave-to {
  opacity: 0;
  transform: translateY(30px); 
}
.list-leave-active {
  position: absolute; 
  width: 100%;       
  left: 0;           
  z-index: -1;       
}

/* 当处于继承状态时，文字颜色变淡，提示用户这是默认值 */
.duration-input.is-inherited :deep(.el-input__inner) {
  color: #9ca3af; /* text-gray-400 */
}

/* 一旦修改（变为特殊时长），ElInputNumber 默认黑色，或者你可以加粗 */
.duration-input :deep(.el-input__inner) {
  font-weight: 500;
}
</style>