<script setup lang="ts">
import { ref, reactive, nextTick, computed } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import dayjs from 'dayjs' // 建议引入 dayjs 处理日期，或用原生 Date
import { pinyin } from 'pinyin-pro'
import { User } from '@element-plus/icons-vue'

// 组件引入
import ImageUploader from '../components/ImageUploader/index.vue'

// API 引入
import { createTreatment } from '../api/treatment'
import { getPatientList } from '../api/patient'
import type { Patient } from '../api/types'

// 常量引入
import { TARGET_OPTIONS } from '../constants/treatment'

// 定义 Props (可选，用于从父组件直接传参)
const props = defineProps<{
  defaultPatient?: { documentId: string; Name: string }
}>()

// 定义 Emits
const emit = defineEmits(['success'])

// --- 状态定义 ---
const visible = ref(false)
const formLoading = ref(false)
const formRef = ref<FormInstance>()
const uploaderRef = ref<InstanceType<typeof ImageUploader> | null>(null)

// 选项数据
const targetOptions = TARGET_OPTIONS
const patientLoading = ref(false)
const patientOptions = ref<Patient[]>([])

// 锁定状态：如果从病人详情页打开，则锁定病人选择
const isPatientLocked = ref(false)

// 临时存储传入的完整患者对象
const lockedPatientData = ref<Patient | null>(null)

// --- 响应式布局逻辑 ---
// 如果没有 @vueuse/core，我们可以简单地用 computed 判断 width
const width = ref(window.innerWidth)
const isMobile = computed(() => width.value < 768)

// 表单模型
const formData = reactive({
  patient: '' as string, // 存储 documentId
  patientName: '' as string, // 仅用于显示（当锁定病人时）
  target: '',
  sequence_number: undefined as number | undefined,
  duration: 0.5, // 默认给 0.5 小时，方便操作
})

const rules = {
  patient: [{ required: true, message: '请选择关联患者', trigger: 'change' }],
  target: [{ required: true, message: '请选择治疗部位', trigger: 'change' }]
}

// --- 核心方法 ---

/**
 * 打开弹窗的方法（供父组件调用）
 * @param patient 传入完整的患者对象 (包含 Name, Gender, Birthday)
 */
const open = (patient?: Patient) => {
  // 1. 重置表单
  formData.patient = ''
  formData.patientName = ''
  formData.target = '' 
  formData.sequence_number = undefined
  formData.duration = 48

  patientOptions.value = []
  lockedPatientData.value = null // 重置
  
  if (patient) {
    isPatientLocked.value = true
    formData.patient = patient.documentId
    formData.patientName = patient.Name
    lockedPatientData.value = patient // ✅ 存下完整对象，备用
  } else {
    isPatientLocked.value = false
  }

  // 3. 显示弹窗
  visible.value = true
  
  // 4. 重置校验状态 (等 DOM 更新后)
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 搜索患者 (仅在未锁定病人时使用)
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

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      formLoading.value = true
      try {
        let imageIds: number[] = []

        // ==========================================
        // 🟢 核心修复：精准获取当前选中的患者对象
        // ==========================================
        let currentPatient: Patient | undefined

        if (isPatientLocked.value) {
          // 锁定模式：直接使用 open 时存下的对象
          currentPatient = lockedPatientData.value!
        } else {
          // 搜索模式：去下拉选项数组里找对应的 ID
          currentPatient = patientOptions.value.find(
            p => p.documentId === formData.patient
          )
        }

        // ==========================================
        // 🟢 文件名组装逻辑 (Name + Gender + DOB)
        // ==========================================
        let filePrefix = ''
        
        if (currentPatient) {
          // 1. 姓名转拼音 (李四 -> LiSi)
          // 这种格式既保留了语义，又完美通过 Strapi 的安全检查，NAS 也能完美识别
          const nameStr = currentPatient.Name || 'Unknown'
          const namePinyin = pinyin(nameStr, { 
            toneType: 'none', // 去声调
            type: 'array',    //以此方便处理大小写
            v: true           // ü 转 v
          }).join('')
          
          // 2. 性别：直接使用原始值，去繁就简
          // 后端数据: 'male' / 'female' -> 文件名: 'Male' / 'Female'
          const rawGender = currentPatient.Gender || 'unknown'
          const gender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1)
          
          // 3. 处理生日 (格式化为 19900101)
          const birthday = currentPatient.Birthday 
            ? dayjs(currentPatient.Birthday).format('YYYYMMDD') 
            : '00000000'

          // 4. 处理本次治疗日期
          const today = dayjs().format('YYYYMMDD')
          
          // 5. 处理部位 (将英文 value 转为中文 label，或者直接用英文)
          // 如果你想用中文，需要引入 TARGET_OPTIONS 并查找
          // 这里为了文件系统兼容性，建议暂时用 formData.target (英文)，或者你自己转中文
          const target = formData.target || 'Target'

          // 📝 最终格式：20251230_张三_男_19900101_face
          filePrefix = `${today}_${namePinyin}_${gender}_${birthday}_${target}`
        } else {
          // 兜底：万一找不到患者对象（理论上 validate 过了不会发生）
          filePrefix = `Unknown_${dayjs().format('YYYYMMDD')}`
        }

        console.log('📄 生成的文件名前缀:', filePrefix)

        // A. 执行上传 (传入前缀)
        if (uploaderRef.value) {
          imageIds = await uploaderRef.value.submitAll(filePrefix)
        }

        // B. 构建提交数据 (保持不变)
        const submitData = {
          patient: formData.patient,
          target: formData.target,
          sequence_number: formData.sequence_number,
          duration: formData.duration,
          Images: imageIds
        }

        await createTreatment(submitData)
        ElMessage.success('治疗记录创建成功')
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

// 窗口大小监听 (简单的防抖监听)
window.addEventListener('resize', () => {
  width.value = window.innerWidth
})

// 动态计算弹窗宽度
const dialogWidth = computed(() => {
  return isMobile.value ? '90%' : '600px'
})

// 暴露 open 方法给父组件
defineExpose({ open })
</script>

<template>
  <el-dialog 
    v-model="visible" 
    title="新建治疗记录" 
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
      :rules="rules" 
      :label-width="isMobile ? 'auto' : '100px'"
      :label-position="isMobile ? 'top' : 'right'"
    >
      
      <el-form-item label="关联患者" prop="patient">
        <el-input 
          v-if="isPatientLocked" 
          :model-value="formData.patientName" 
          disabled 
          placeholder="已锁定当前患者"
        >
          <template #prefix>
            <el-icon><User /></el-icon>
          </template>
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
          <el-form-item label="治疗部位" prop="target">
            <el-select v-model="formData.target" placeholder="请选择治疗部位" style="width: 100%">
              <el-option 
                v-for="item in targetOptions" 
                :key="item.value" 
                :label="item.label" 
                :value="item.value" 
              />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :xs="24" :sm="12">
          <el-form-item label="治疗时长" prop="duration">
            <el-input-number 
              v-model="formData.duration" 
              :min="1" 
              :step="1" 
              :precision="0"
              controls-position="right"
              style="width: 100%"
            >
              <template #suffix>小时</template>
            </el-input-number>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="治疗影像">
        <image-uploader ref="uploaderRef" :limit="9" />
      </el-form-item>

      <el-form-item label="手动序号" prop="sequence_number">
        <el-input-number 
          v-model="formData.sequence_number" 
          :min="1" 
          placeholder="留空自动生成" 
          style="width: 100%" 
        />
        <div class="tips">通常无需填写，系统会自动计算是第几次治疗。</div>
      </el-form-item>

    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">确定创建</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.tips {
  font-size: 12px; 
  color: #909399; 
  margin-top: 4px; 
  line-height: 1.4;
}

/* 移动端按钮布局优化 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

@media screen and (max-width: 768px) {
  /* 手机端让底部按钮撑满，更方便点击 */
  .dialog-footer {
    justify-content: stretch;
  }
  .dialog-footer button {
    flex: 1;
  }
  
  /* 调整 el-input-number 在手机上的显示，防止文字被切断 */
  :deep(.el-input-number .el-input__inner) {
    text-align: center;
    padding-left: 10px;
    padding-right: 40px; /* 给右侧按钮留空间 */
  }
}
</style>

