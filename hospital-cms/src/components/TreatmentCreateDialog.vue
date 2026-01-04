<script setup lang="ts">
import { ref, reactive, nextTick, computed, watch } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import dayjs from 'dayjs' // 建议引入 dayjs 处理日期，或用原生 Date
import { pinyin } from 'pinyin-pro'
import { User } from '@element-plus/icons-vue'

// 组件引入
import ImageUploader from '../components/ImageUploader/index.vue'

// API 引入
import { createTreatment, getLastSequenceNumber } from '../api/treatment'
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
const uploaderRefs = ref<Map<number, any>>(new Map())
const predictedNextSequence = ref(1) // [新增] 预判的下一个序号，默认为 1

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
  patient: '' as string,
  patientName: '' as string,
  sequence_number: undefined as number | undefined,
  base_duration: 48, // ✅ 基准时长
  
  // ✅ 动态数组
  lesions: [
    { key: Date.now(), part: '', notes: '', duration: undefined as number | undefined }
  ]
})

const rules = {
  patient: [{ required: true, message: '请选择关联患者', trigger: 'change' }],
  target: [{ required: true, message: '请选择治疗部位', trigger: 'change' }]
}

// --- 核心方法 ---

// ------------------------------------------------------
// [新增] 核心方法：获取并计算下一个序号
// ------------------------------------------------------
const fetchNextSequence = async (patientId: string) => {
  if (!patientId) return
  try {
    const res: any = await getLastSequenceNumber(patientId)
    const list = res.data?.data || []
    
    if (list.length > 0 && list[0].sequence_number) {
      // 如果找到了历史记录，下一个就是 最大值 + 1
      predictedNextSequence.value = list[0].sequence_number + 1
    } else {
      // 没找到记录，说明是第一次
      predictedNextSequence.value = 1
    }
    console.log('🔮 预判下一次治疗序号为:', predictedNextSequence.value)
  } catch (error) {
    console.warn('获取历史序号失败，降级为默认值 1', error)
    predictedNextSequence.value = 1
  }
}

// 1. 动态 Ref 绑定器
const setUploaderRef = (el: any, index: number) => {
  if (el) {
    uploaderRefs.value.set(index, el)
  }
}

// 2. 增删病灶
const addLesion = () => {
  formData.lesions.unshift({
    key: Date.now(), // 用时间戳做唯一 key，防止渲染错乱
    part: '', 
    notes: '',
    duration: undefined 
  })
}

const removeLesion = (index: number) => {
  formData.lesions.splice(index, 1)
  // 注意：Map 中的 Ref 不需要手动清理，Vue 更新 DOM 时会自动处理
}

/**
 * 打开弹窗的方法（供父组件调用）
 * @param patient 传入完整的患者对象 (包含 Name, Gender, Birthday)
 */
const open = (patient?: Patient) => {
  // 1. 重置表单
  formData.patient = ''
  formData.patientName = '' 
  formData.sequence_number = undefined
  formData.base_duration = 48
  formData.lesions = [{ key: Date.now(), part: '', notes: '', duration: undefined }] // 恢复默认一行
  uploaderRefs.value.clear() // 清空引用

  patientOptions.value = []
  lockedPatientData.value = null // 重置
  predictedNextSequence.value = 1 // 重置
  
  if (patient) {
    isPatientLocked.value = true
    formData.patient = patient.documentId
    formData.patientName = patient.Name
    lockedPatientData.value = patient // ✅ 存下完整对象，备用
    fetchNextSequence(patient.documentId)
  } else {
    isPatientLocked.value = false
  }

  // 3. 显示弹窗
  visible.value = true

  watch(() => formData.patient, (newVal) => {
    // 只有在非锁定模式，且有值的时候查
    if (!isPatientLocked.value && newVal) {
      fetchNextSequence(newVal)
    }
  })
  
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
        // ==========================================
        // 1. 获取当前选中的患者对象
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

        // 🛡️ 防御性编程：如果没找到 currentPatient (理论不该发生)，给个默认兜底
        if (!currentPatient) {
            console.warn('未找到匹配的患者信息，将使用默认文件名规则');
        }

        // ==========================================
        // 2. 生成基础文件名前缀 (Base Prefix)
        // ==========================================
        let baseFilePrefix = ''
        //逻辑：优先用手动输入的序号 -> 其次用API查到的预判序号 -> 都没有就默认 1
        const finalCount = formData.sequence_number || predictedNextSequence.value
        if (currentPatient) {
          // 2.1 姓名转拼音
          const nameStr = currentPatient.Name || 'Unknown'
          const namePinyin = pinyin(nameStr, { 
            toneType: 'none', 
            type: 'array',    
            v: true           
          }).join('')
          
          // 2.2 性别
          const rawGender = currentPatient.Gender || 'unknown'
          const gender = rawGender.charAt(0).toUpperCase() + rawGender.slice(1)
          
          // 2.3 生日
          const birthday = currentPatient.Birthday 
            ? dayjs(currentPatient.Birthday).format('YYYYMMDD') 
            : '00000000'

          // 2.4 治疗日期
          const today = dayjs().format('YYYYMMDDHHmm')

          // 组合基础部分 (注意：这里还没加部位)
          baseFilePrefix = `${today}_${namePinyin}_${gender}_${birthday}_seq${finalCount}`
        } else {
          baseFilePrefix = `Unknown_${dayjs().format('YYYYMMDDHHmm')}_seq${finalCount}`
        }

        // ==========================================
        // 3. 循环处理每个病灶 (核心变更)
        // ==========================================
        const detailsPayload = []

        // 遍历 formData.lesions 数组
        for (const [index, lesion] of formData.lesions.entries()) {
          // A. 获取该行对应的上传组件实例
          const uploader = uploaderRefs.value.get(index)
          let imageIds: number[] = []

          // B. 如果有上传组件，执行上传
          if (uploader) {
            // 📝 最终文件名：基础前缀 + 当前部位
            // 例: 20251230_LiSi_Male_19900101_Face
            // 这里的 lesion.part 建议首字母大写，或者直接用 raw string
            const specificSuffix = `${baseFilePrefix}_${lesion.part || 'Part'}`
            
            // 执行上传并获取 ID 数组
            imageIds = await uploader.submitAll(specificSuffix)
          }

          // C. 组装 Strapi Component 数据结构
          detailsPayload.push({
            part: lesion.part,
            duration: lesion.duration, // 允许 undefined (继承父级)
            photos: imageIds,           // 关联刚刚上传的图片 ID
            notes: lesion.notes         // 备注信息
          })
        }

        // ==========================================
        // 4. 构建 Strapi v5 提交数据
        // ==========================================
        const submitData = {
          patient: formData.patient,
          sequence_number: formData.sequence_number,
          duration: formData.base_duration, // ✅ 存入基准时长
          
          // ✅ 写入 details 组件数组
          details: detailsPayload 
          
          // ❌ 移除旧字段 target 和 Images
        }

        // ==========================================
        // 5. 发送请求
        // ==========================================
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
      :label-width="isMobile ? 'auto' : '100px'"
      :label-position="isMobile ? 'top' : 'right'"
    >
      
      <div class="section-block">
        <h4 class="section-title">基础信息</h4>
        
        <el-form-item label="关联患者" prop="patient" :rules="[{ required: true, message: '请选择患者' }]">
          <el-input v-if="isPatientLocked" :model-value="formData.patientName" disabled placeholder="已锁定当前患者">
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
                   v-model="lesion.duration" 
                   :placeholder="`同上 (${formData.base_duration})`"
                   :min="0.1" :step="0.5" 
                   style="width: 100%" 
                   controls-position="right"
                   :disabled="formData.lesions.length === 1"
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
            />
          </el-form-item>
        </div>
      </TransitionGroup>
      </div>

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

/* 🟢 进入时的状态：从上方滑入 */
.list-enter-from {
  opacity: 0;
  transform: translateY(-30px); 
}

/* 3. 🟢 离开状态：向上滑出并消失 (修改了这里) */
.list-leave-to {
  opacity: 0;
  /* 核心修改：改为负值，让它向上飘走，而不是缩小 */
  transform: translateY(30px); 
}

/* 🟢 核心魔法：离开的元素必须脱离文档流 */
.list-leave-active {
  position: absolute; /* 让它悬浮，不再占据空间 */
  width: 100%;        /* 强制保持宽度，防止内容变形 */
  left: 0;            /* 确保对齐 */
  z-index: -1;        /* 让它退到后面，不要遮挡正在向上移动的元素 */
}
</style>

