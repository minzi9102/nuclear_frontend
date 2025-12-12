<script setup lang="ts">
import { ref, watch, reactive } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import type { UploadRequestOptions, UploadUserFile, UploadFile, UploadFiles } from 'element-plus'
import { uploadFile } from '../../api/upload'
import type { StrapiMedia } from '../../api/types'

// --- Props & Emits ---
interface Props {
  modelValue?: StrapiMedia[];
  limit?: number;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  limit: 10
})

const emit = defineEmits(['update:modelValue'])

// --- 基础配置 ---
const BASE_URL = 'http://localhost:1337' 

const getFullUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${BASE_URL}${url}`
}

// --- 状态管理 ---
const fileList = ref<UploadUserFile[]>([])
const dialogImageUrl = ref('')
const dialogVisible = ref(false)

// 🔥 核心武器：uid 到 后端数据的映射表
const uploadResultMap = reactive(new Map<number, StrapiMedia>())

// --- 1. 回显逻辑 ---
watch(() => props.modelValue, (newVal) => {
  if ((!newVal || newVal.length === 0) && fileList.value.length > 0) {
    if (fileList.value.every(f => f.status === 'success')) {
       console.log('🔄 [组件回显] 父组件数据为空，清空本地列表')
       fileList.value = []
       uploadResultMap.clear()
    }
    return
  }
  
  if (!newVal) return

  const currentIds = fileList.value.map(f => (f.response as StrapiMedia)?.id).filter(Boolean)
  const newIds = newVal.map(img => img.id)
  const isSame = currentIds.length === newIds.length && currentIds.every((id, index) => id === newIds[index])
  
  if (!isSame) {
    console.log('🔄 [组件回显] 根据父组件数据重建列表', newIds)
    fileList.value = newVal.map(img => {
      // 存入 Map
      uploadResultMap.set(img.id, img)
      
      return {
        name: img.name,
        url: getFullUrl(img.url),
        response: img, 
        uid: img.id,   
        status: 'success'
      }
    })
  }
}, { immediate: true, deep: true })

// --- 2. 核心：同步给父组件 ---
const syncToParent = () => {
  const validImages: StrapiMedia[] = []

  fileList.value.forEach((file) => {
    // 修复点：使用 file.uid! 进行非空断言，或者 || 0
    const uid = file.uid || 0 
    const cachedData = uploadResultMap.get(uid)
    
    if (cachedData) {
      validImages.push(cachedData)
      if (!file.url || file.url.startsWith('blob:')) {
         file.url = getFullUrl(cachedData.url)
      }
    } else if (file.response && (file.response as StrapiMedia).id) {
      validImages.push(file.response as StrapiMedia)
    }
  })
  
  console.log('📤 [同步发射] 有效图片:', validImages.length, 'IDs:', validImages.map(img => img.id))
  
  emit('update:modelValue', validImages)
}

// --- 3. 自定义上传 ---
const customUploadRequest = async (options: UploadRequestOptions) => {
  const { file, onSuccess, onError } = options
  // 修复点：Element Plus 注入的 raw file 对象其实带有 uid，但 TS 的 File 类型不知道
  // 我们强制断言它有 uid
  const uid = (file as any).uid as number 
  
  try {
    console.log(`⬆️ [上传开始] 文件: ${file.name} (uid: ${uid})`)
    const res = await uploadFile(file as File)
    console.log(`✅ [上传API成功] Server返回 ID: ${res.id}`)
    
    // 存入 Map
    if (uid) {
      uploadResultMap.set(uid, res)
      console.log(`💾 [Map存储] 已记录 uid ${uid} -> ID ${res.id}`)
    }

    onSuccess(res)
  } catch (error: any) {
    console.error('❌ [上传失败]', error)
    onError(error)
  }
}

// --- 4. 监听变动 ---
const handleChange = (uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  // 修复点：update local list ref
  fileList.value = uploadFiles
  
  // 尝试恢复数据
  fileList.value.forEach(f => {
    // 修复点：使用 f.uid!
    if (f.uid && uploadResultMap.has(f.uid) && !f.response) {
      // console.log(`✨ [数据恢复] 恢复文件 [${f.name}]`)
      f.response = uploadResultMap.get(f.uid)
      f.status = 'success'
    }
  })

  if (uploadFile.status === 'success') {
    syncToParent()
  }
}

const handleRemove = (uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  console.log('🗑️ [删除操作]')
  // 修复点：使用 uploadFile.uid!
  if (uploadFile.uid) {
    uploadResultMap.delete(uploadFile.uid)
  }
  
  fileList.value = uploadFiles
  syncToParent()
}

// 预览
const handlePictureCardPreview = (file: UploadFile) => {
  dialogImageUrl.value = file.url!
  dialogVisible.value = true
}
</script>

<template>
  <div>
    <el-upload
      v-model:file-list="fileList"
      action="#" 
      list-type="picture-card"
      multiple
      :http-request="customUploadRequest"
      :on-change="handleChange"
      :on-remove="handleRemove"
      :on-preview="handlePictureCardPreview"
      :limit="props.limit"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>

    <el-dialog v-model="dialogVisible">
      <img w-full :src="dialogImageUrl" alt="Preview Image" style="width: 100%" />
    </el-dialog>
  </div>
</template>