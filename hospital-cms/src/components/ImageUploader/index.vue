<script setup lang="ts">
import { ref, watch } from 'vue'
import { Plus, ZoomIn, Delete, Download } from '@element-plus/icons-vue'
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
  limit: 5
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

// --- 回显逻辑 (防止死循环) ---
watch(() => props.modelValue, (newVal) => {
  // 1. 如果父组件传 null/undefined，忽略
  if (!newVal) return

  // 2. 提取 ID 进行比对
  const currentIds = fileList.value
    .map(f => (f.response as StrapiMedia)?.id)
    .filter(Boolean)
  const newIds = newVal.map(img => img.id)
  
  // 3. 只有当 ID 列表不一致时，才更新本地 fileList
  // 这防止了：子组件 emit -> 父组件 update -> 子组件 watch -> 子组件 reset -> 再次 emit 的死循环
  const isSame = currentIds.length === newIds.length && currentIds.every((id, index) => id === newIds[index])
  
  if (!isSame) {
    console.log('🔄 组件：响应式更新 fileList (来自父组件)', newIds)
    fileList.value = newVal.map(img => ({
      name: img.name,
      url: getFullUrl(img.url),
      response: img, 
      uid: img.id, // 保持 uid 与 id 一致
      status: 'success'
    }))
  }
}, { immediate: true, deep: true })

// --- 核心逻辑：数据同步 ---
const syncToParent = () => {
  // 过滤出所有已经上传成功(有response)的文件
  const latestMediaList = fileList.value
    .filter(f => f.status === 'success' && f.response)
    .map(f => f.response as StrapiMedia)
  
  // 只有当真正有变化时才 log，避免刷屏
  console.log('📤 组件：同步数据给父组件 -> 数量:', latestMediaList.length, 'IDs:', latestMediaList.map(m => m.id))
  
  emit('update:modelValue', latestMediaList)
}

// --- 自定义上传 (核心修复点) ---
const customUploadRequest = async (options: UploadRequestOptions) => {
  const { file, onSuccess, onError } = options
  try {
    console.log('⬆️ 组件：开始上传...', file.name)
    const res = await uploadFile(file as File)
    console.log('✅ 组件：上传API成功，获得ID:', res.id)
    
    // 1. 立即更新本地 fileList 中的该文件状态
    const activeFile = fileList.value.find(f => f.uid === file.uid)
    if (activeFile) {
      activeFile.response = res // 关键：手动挂载 Strapi 返回的对象
      activeFile.url = getFullUrl(res.url) // 更新预览图
      activeFile.status = 'success' // 手动标记成功
    }

    // 2. 立即同步给父组件 (不再等待 handleSuccess)
    syncToParent()

    // 3. 告诉 Element Plus 组件完事了 (但这只是为了关闭加载动画)
    onSuccess(res)
  } catch (error: any) {
    console.error('❌ 组件：上传失败', error)
    onError(error)
  }
}

// --- 成功回调 (被阉割版) ---
const handleSuccess = (response: any, uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  // 🛑 关键修复：绝对不要在这里执行 fileList.value = uploadFiles
  // Element Plus 的 uploadFiles 状态更新可能滞后，会覆盖掉我们在 customUploadRequest 里手动设置好的完整数据
  // 这里什么都不用做，或者仅仅再次触发同步兜底
}

// --- 删除回调 ---
const handleRemove = (uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  console.log('🗑️ 组件：用户删除了图片')
  // 删除时，可以直接信任 uploadFiles，因为它确实少了一个
  fileList.value = uploadFiles
  syncToParent()
}

// --- 预览相关 ---
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
      :http-request="customUploadRequest"
      :on-success="handleSuccess"
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