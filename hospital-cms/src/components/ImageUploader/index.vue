<script setup lang="ts">
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { Plus, RefreshRight, Delete, Camera } from '@element-plus/icons-vue'
import { ElMessage, type UploadInstance, type UploadFile, type UploadFiles } from 'element-plus'
import Compressor from 'compressorjs'
import { uploadFile } from '../../api/upload'

// --- 类型定义 ---
interface LocalFile {
  uid: number
  id?: number      // 🟢 新增：如果有 id，说明是后端已存在的图片
  raw?: File       // 🟢 修改：如果是回显图片，没有 raw
  url: string      
  name: string
}

// 🟢 新增：接收初始图片 (用于编辑回显)
const props = defineProps<{
  limit?: number // 单次限制
  initialFiles?: { id: number; url: string; name?: string }[] 
}>()

// --- 状态管理 ---
const localFileList = ref<LocalFile[]>([])
const currentIndex = ref(0) 

// ⏳ 优化方案状态
const isProcessing = ref(false)
const processingMessage = ref('')
const pendingQueue = ref<File[]>([])
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Upload 组件引用
const uploadRef = ref<UploadInstance>()

// 计算属性
const currentFile = computed(() => {
  return localFileList.value[currentIndex.value]
})

// 🟢 监听初始数据变化 (回显逻辑)
watch(() => props.initialFiles, (newVal) => {
  if (newVal && newVal.length > 0) {
    // 将后端数据转换为组件内部格式
    localFileList.value = newVal.map(img => ({
      uid: Date.now() + Math.random(),
      id: img.id, // 记下 ID，提交时不用重传
      url: img.url,
      name: img.name || 'image.jpg'
    }))
    // 如果有图，默认选中第一张
    if (localFileList.value.length > 0) currentIndex.value = 0
  } else {
    localFileList.value = []
  }
}, { immediate: true })

// --- 工具函数 (保持不变) ---
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const processRotation = (img: HTMLImageElement, angle: number, fileName: string): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const isVertical = Math.abs(angle) % 180 !== 0
    canvas.width = isVertical ? img.naturalHeight : img.naturalWidth
    canvas.height = isVertical ? img.naturalWidth : img.naturalHeight
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((angle * Math.PI) / 180)
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    canvas.toBlob((blob) => {
      if (blob) resolve(new File([blob], fileName, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.8) 
  })
}

const fileToImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

const compressImageOnly = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      checkOrientation: true, 
      mimeType: 'image/jpeg',
      success(resultBlob) {
        resolve(new File([resultBlob], file.name, { type: 'image/jpeg' }))
      },
      error: reject
    })
  })
}

// --- 业务逻辑 ---

const triggerUpload = () => {
  uploadRef.value?.$el.querySelector('input')?.click()
}

const processQueue = async () => {
  if (pendingQueue.value.length === 0) {
    isProcessing.value = false
    return
  }

  isProcessing.value = true
  
  while (pendingQueue.value.length > 0) {
    const remainingCount = pendingQueue.value.length
    processingMessage.value = `正在处理图片... (剩余 ${remainingCount} 张)`

    const rawFile = pendingQueue.value.shift()
    if (!rawFile) continue

    try {
      await sleep(50) 
      const compressedFile = await compressImageOnly(rawFile)
      const img = await fileToImage(compressedFile)
      const bakedFile = await processRotation(img, 0, rawFile.name)
      
      localFileList.value.push({
        uid: Date.now() + Math.random(),
        // 新图片没有 ID
        raw: bakedFile,
        url: URL.createObjectURL(bakedFile),
        name: rawFile.name
      })
      
      URL.revokeObjectURL(img.src)
      currentIndex.value = localFileList.value.length - 1
    } catch (err) {
      console.error('❌ 图片处理失败', err)
      ElMessage.error(`图片 ${rawFile.name} 处理失败`)
    }
  }

  isProcessing.value = false
  processingMessage.value = ''
}

const handleFileChange = (uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  const rawFile = uploadFile.raw
  if (!rawFile) return

  // 这里的逻辑只处理“新选择”的文件
  // 清理 Element Plus 的默认列表，因为我们自己管理 localFileList
  const idx = uploadFiles.indexOf(uploadFile)
  if (idx !== -1) uploadFiles.splice(idx, 1)

  // 🟢 核心修改：移除总数限制，改为限制“单次批量操作”
  // 如果用户一次性框选了超过 9 张，我们只取前 9 张，或者提示
  // 但由于 Element Plus 的机制，我们这里更适合做队列检查
  
  // 策略：允许无限添加，但单次处理队列如果堆积太多可以提示
  // 这里我们仅做简单的队列添加，不再拦截 total > 12
  
  // 🟢 限制单次上传意图：如果用户一次选了太多，可以在这里做截断
  // 但为了体验，我们暂不设硬上限，只让队列慢慢跑
  pendingQueue.value.push(rawFile)

  if (!isProcessing.value) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      // 🟢 在开始处理前检查队列长度，给个提示
      if (pendingQueue.value.length > 9) {
        ElMessage.warning(`您一次性选择了 ${pendingQueue.value.length} 张图片，系统将分批处理，请耐心等待。`)
      }
      processQueue()
    }, 100)
  }
}

const rotateCurrent = async () => {
  const item = currentFile.value
  if (!item || isProcessing.value) return

  // 🟢 特殊处理：如果是回显的旧图 (has ID)，旋转后必须视为新图 (清除 ID)
  // 因为旋转改变了像素，必须重新上传
  
  isProcessing.value = true
  processingMessage.value = '正在旋转图片...'
  await sleep(20)

  const oldUrl = item.url
  try {
    // 兼容：如果是旧图，raw 可能为空，需要从 url 转回 File (fetch -> blob)
    let fileToRotate = item.raw
    if (!fileToRotate) {
        const response = await fetch(oldUrl);
        const blob = await response.blob();
        fileToRotate = new File([blob], item.name, { type: blob.type });
    }

    const img = await fileToImage(fileToRotate)
    const rotatedFile = await processRotation(img, 90, item.name)
    
    item.raw = rotatedFile
    item.url = URL.createObjectURL(rotatedFile)
    item.id = undefined // 🟢 关键：旋转后变成新图，移除旧 ID，触发重新上传
    
    // 只有本地生成的 URL 才需要 revoke，远端 URL 不需要
    if (oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl)
    }
    URL.revokeObjectURL(img.src) 
  } catch (e) {
    console.error(e)
    ElMessage.error('旋转失败')
  } finally {
    isProcessing.value = false
  }
}

const removeCurrent = () => {
  if (isProcessing.value) return 
  const item = currentFile.value
  if (!item) return
  
  if (item.url.startsWith('blob:')) {
    URL.revokeObjectURL(item.url)
  }
  
  localFileList.value.splice(currentIndex.value, 1)
  
  if (localFileList.value.length === 0) {
    currentIndex.value = 0
  } else if (currentIndex.value >= localFileList.value.length) {
    currentIndex.value = localFileList.value.length - 1
  }
}

const selectImage = (index: number) => {
  if (isProcessing.value) return
  currentIndex.value = index
}

// 🟢 核心修改：提交逻辑支持混合 ID
const submitAll = async (namingPrefix?: string): Promise<number[]> => {
  if (localFileList.value.length === 0) return []
  if (isProcessing.value) {
    ElMessage.warning('图片正在处理中，请稍候...')
    throw new Error('Processing')
  }

  isProcessing.value = true
  processingMessage.value = '正在上传数据...'

  try {
    // 并行处理：旧图直接返回 ID，新图上传后返回 ID
    const uploadPromises = localFileList.value.map(async (item, index) => {
      // A. 如果是旧图，且没有被修改（有 ID），直接复用
      if (item.id) {
        return item.id
      }

      // B. 如果是新图 (无 ID，有 raw)，执行上传
      if (item.raw) {
        let customName = undefined;
        if (namingPrefix) {
            const seq = (index + 1).toString().padStart(2, '0');
            customName = `${namingPrefix}_${seq}.jpg`;
        }
        const res = await uploadFile(item.raw, customName)
        return res.id
      }

      throw new Error('Invalid file state')
    })

    const results = await Promise.all(uploadPromises)
    return results
  } catch (error) {
    throw error
  } finally {
    isProcessing.value = false
  }
}

defineExpose({
  submitAll,
  hasFiles: () => localFileList.value.length > 0
})

onBeforeUnmount(() => {
  localFileList.value.forEach(item => {
    if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url)
  })
})
</script>

<template>
  <div 
    class="custom-uploader"
    v-loading="isProcessing"
    :element-loading-text="processingMessage"
    element-loading-background="rgba(255, 255, 255, 0.8)"
  >
    <div v-if="currentFile" class="main-preview-area">
      <div class="image-stage">
        <img :src="currentFile.url" alt="preview" />
      </div>
      <div class="action-bar">
        <el-button 
          type="warning" :icon="RefreshRight" circle size="large"
          @click="rotateCurrent" :disabled="isProcessing"
        />
        <span class="counter">{{ currentIndex + 1 }} / {{ localFileList.length }}</span>
        <el-button 
          type="danger" :icon="Delete" circle size="large"
          @click="removeCurrent" :disabled="isProcessing" 
        />
      </div>
    </div>

    <div 
      v-else 
      class="empty-placeholder dashed-style" 
      @click="triggerUpload"
    >
      <el-icon :size="48" class="upload-icon"><Camera /></el-icon>
      <div class="info-group">
        <p class="title">拍摄 / 选择照片</p>
        <p class="subtitle">
          单次建议不超过 <span class="highlight">9</span> 张，可分批添加
        </p>
      </div>
    </div>

    <div class="thumbnail-strip">
      <el-upload
        ref="uploadRef"
        action="#"
        :auto-upload="false"
        :show-file-list="false" 
        multiple
        accept="image/*"
        :on-change="handleFileChange"
        class="add-btn-wrapper"
        :disabled="isProcessing"
      >
        <div class="add-btn" :class="{ disabled: isProcessing }">
          <el-icon><Plus /></el-icon>
        </div>
      </el-upload>

      <div 
        v-for="(item, index) in localFileList" 
        :key="item.uid"
        class="thumb-item"
        :class="{ active: index === currentIndex }"
        @click="selectImage(index)"
      >
        <img :src="item.url" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 样式保持不变 */
.custom-uploader {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  position: relative; 
  min-height: 200px;
}
.main-preview-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}
.image-stage {
  width: 100%;
  height: 250px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}
.image-stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: all 0.2s;
}
.action-bar {
  display: flex;
  align-items: center;
  gap: 20px;
}
.counter {
  font-size: 14px;
  color: #606266;
  font-weight: bold;
}
.dashed-style {
  background: #fff;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  min-height: 180px; 
  padding: 30px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  color: #909399;
  transition: all 0.3s;
}
.dashed-style:hover {
  border-color: #409eff;
  background-color: #f9faff;
}
.dashed-style:active {
  background: #ecf5ff;
}
.upload-icon {
  color: #a8abb2;
  margin-bottom: 5px;
}
.title {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
  margin: 0;
}
.subtitle {
  font-size: 13px;
  color: #909399;
  margin: 0;
}
.highlight {
  color: #E6A23C;
  font-weight: bold;
  font-size: 15px;
  padding: 0 4px;
}
.thumbnail-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 5px;
  scrollbar-width: none;
}
.thumbnail-strip::-webkit-scrollbar { 
  display: none; 
}
.thumb-item {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  flex-shrink: 0;
  cursor: pointer;
  background: #eee;
}
.thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb-item.active {
  border-color: #409eff;
}
.add-btn-wrapper {
  flex-shrink: 0;
}
.add-btn {
  width: 60px;
  height: 60px;
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #8c939d;
  cursor: pointer;
  transition: all 0.3s;
}
.add-btn.disabled {
  background: #f0f0f0;
  cursor: not-allowed;
  opacity: 0.6;
}
</style>