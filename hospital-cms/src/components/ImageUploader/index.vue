<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { Plus, RefreshRight, Delete, Camera } from '@element-plus/icons-vue'
import type { UploadFile, UploadFiles } from 'element-plus'
import Compressor from 'compressorjs'
import { uploadFile } from '../../api/upload' // 你的上传API

// --- 类型定义 ---
interface LocalFile {
  uid: number
  raw: File      // 准备上传的物理文件
  url: string    // 本地预览 blob url (用于 img src)
  name: string
}

// --- 状态管理 ---
const localFileList = ref<LocalFile[]>([])
const currentIndex = ref(0) 

// 计算属性：获取当前操作的文件
const currentFile = computed(() => {
  return localFileList.value[currentIndex.value]
})

// --- 🛠️ 核心工具函数区 ---

// 1. [你提供的代码] Canvas 旋转/重绘工具函数
// 这是一个纯函数，负责把 img 元素画到 canvas 上并导出为 File
const processRotation = (img: HTMLImageElement, angle: number, fileName: string): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // 计算新画布的尺寸
    const isVertical = Math.abs(angle) % 180 !== 0
    canvas.width = isVertical ? img.naturalHeight : img.naturalWidth
    canvas.height = isVertical ? img.naturalWidth : img.naturalHeight
    
    // 清除背景
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 移动原点到中心并旋转
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((angle * Math.PI) / 180)
    
    // 绘图
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    
    // 导出文件
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], fileName, { type: 'image/jpeg' }))
      }
    }, 'image/jpeg', 0.9)
  })
}

// 2. [新增辅助] File -> HTMLImageElement
// 确保图片完全加载后再进行 Canvas 操作，防止由异步导致的空白或报错
const fileToImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      // 图片加载成功，返回 img 对象
      // 注意：这里不 revoke URL，因为后续 Canvas 还需要用，等用完再在外层清理
      resolve(img) 
    }
    img.onerror = reject
    img.src = url
  })
}

// 3. [新增辅助] 仅压缩 (Wrapper for Compressor.js)
// 负责入库时的体积压缩和元数据清洗
const compressImageOnly = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 1,
      checkOrientation: true, // 这里依然开启，利用插件做初步修正
      mimeType: 'image/jpeg',
      success(resultBlob) {
        resolve(new File([resultBlob], file.name, { type: 'image/jpeg' }))
      },
      error: reject
    })
  })
}

// --- 业务逻辑区 ---

// 1. 新增图片 (拍照/选图)
const handleFileChange = async (uploadFile: UploadFile, uploadFiles: UploadFiles) => {
  const rawFile = uploadFile.raw
  if (!rawFile) return

  // 接管 Element Plus 列表
  const idx = uploadFiles.indexOf(uploadFile)
  if (idx !== -1) uploadFiles.splice(idx, 1)

  try {
    console.log(`📸 [处理开始] 文件: ${uploadFile.name}`)

    // Step 1: 先压缩 (CompressorJS)
    // 这一步主要为了减小体积，checkOrientation: true 会尝试利用插件做一次修正
    const compressedFile = await compressImageOnly(rawFile)
    
    // Step 2: 加载压缩后的图片到 Image 对象
    // 这一步利用浏览器的渲染引擎，自动识别 EXIF 并“扶正”图片
    const img = await fileToImage(compressedFile)

    // Step 3: 🟢 核心修复：强制重绘 (Angle = 0)
    // 即使角度是 0，我们也要走一遍 Canvas。
    // Canvas drawImage 会把浏览器“扶正”后的视觉效果，原样画成真实的像素。
    // 结果：生成的 bakedFile 像素是正的，且彻底去除了 EXIF 干扰。
    const bakedFile = await processRotation(img, 0, uploadFile.name)

    console.log(`✅ [重绘完成] 最终上传文件大小: ${(bakedFile.size / 1024).toFixed(2)}KB`)
    
    // Step 4: 加入列表
    localFileList.value.push({
      uid: uploadFile.uid,
      raw: bakedFile, // 使用“固化”后的文件
      url: URL.createObjectURL(bakedFile),
      name: uploadFile.name
    })
    
    // 释放中间过程的内存
    URL.revokeObjectURL(img.src)

    currentIndex.value = localFileList.value.length - 1
  } catch (err) {
    console.error('图片预处理失败', err)
  }
}

// 2. 旋转当前图片 (点击旋转按钮)
const rotateCurrent = async () => {
  const item = currentFile.value
  if (!item) return
  
  const oldUrl = item.url
  
  try {
    // 1. 将当前的 File 转为 Image 对象 (等待加载完成)
    const img = await fileToImage(item.raw)
    
    // 2. 调用你提供的核心 Canvas 旋转逻辑 (旋转 90 度)
    const rotatedFile = await processRotation(img, 90, item.name)
    
    // 3. 更新数据
    item.raw = rotatedFile
    item.url = URL.createObjectURL(rotatedFile)
    
    // 4. 清理旧内存
    URL.revokeObjectURL(oldUrl)
    // img 使用的临时 url 也可以清理了，因为 canvas 已经画完了
    URL.revokeObjectURL(img.src) 
    
  } catch (e) {
    console.error('旋转失败', e)
  }
}

// 3. 删除当前
const removeCurrent = () => {
  const item = currentFile.value
  if (!item) return
  URL.revokeObjectURL(item.url)
  localFileList.value.splice(currentIndex.value, 1)
  
  if (localFileList.value.length === 0) {
    currentIndex.value = 0
  } else if (currentIndex.value >= localFileList.value.length) {
    currentIndex.value = localFileList.value.length - 1
  }
}

const selectImage = (index: number) => {
  currentIndex.value = index
}

// 4. 批量上传 (暴露给父组件)
const submitAll = async (): Promise<number[]> => {
  if (localFileList.value.length === 0) return []

  console.log('🚀 [批量上传] 开始...')
  
  const uploadPromises = localFileList.value.map(async (item) => {
    try {
      // item.raw 经过了 Compressor 或 Canvas 处理，一定是一个标准的 File 对象
      const res = await uploadFile(item.raw)
      console.log(`✅ 图片 ${item.name} 上传成功 ID: ${res.id}`)
      return res.id
    } catch (error) {
      console.error(`❌ 文件 ${item.name} 上传失败`, error)
      throw error
    }
  })

  return await Promise.all(uploadPromises)
}

defineExpose({
  submitAll,
  hasFiles: () => localFileList.value.length > 0
})

onBeforeUnmount(() => {
  localFileList.value.forEach(item => URL.revokeObjectURL(item.url))
})
</script>

<template>
  <div class="custom-uploader">
    
    <div v-if="currentFile" class="main-preview-area">
      <div class="image-stage">
        <img :src="currentFile.url" alt="preview" />
      </div>
      
      <div class="action-bar">
        <el-button type="warning" :icon="RefreshRight" circle @click="rotateCurrent" size="large" />
        <span class="counter">{{ currentIndex + 1 }} / {{ localFileList.length }}</span>
        <el-button type="danger" :icon="Delete" circle @click="removeCurrent" size="large" />
      </div>
    </div>

    <div v-else class="empty-placeholder">
      <el-icon :size="40" color="#909399"><Camera /></el-icon>
      <p>点击下方按钮拍摄或选择照片</p>
    </div>

    <div class="thumbnail-strip">
      <div 
        v-for="(item, index) in localFileList" 
        :key="item.uid"
        class="thumb-item"
        :class="{ active: index === currentIndex }"
        @click="selectImage(index)"
      >
        <img :src="item.url" />
      </div>

      <el-upload
        action="#"
        :auto-upload="false"
        :show-file-list="false" 
        multiple
        accept="image/*"
        :on-change="handleFileChange"
        class="add-btn-wrapper"
      >
        <div class="add-btn">
          <el-icon><Plus /></el-icon>
        </div>
      </el-upload>
    </div>
  </div>
</template>

<style scoped>
/* 保持之前的样式不变 */
.custom-uploader {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
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
.empty-placeholder {
  height: 150px;
  background: #f5f7fa;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
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
}
</style>