<template>
  <div v-if="images && images.length > 0" 
       class="image-wrapper" 
       @touchstart="onTouchStart" 
       @touchend="onTouchEnd">
    <el-carousel 
      ref="carouselRef" 
      :autoplay="false" 
      trigger="click" 
      indicator-position="outside" 
      height="250px" 
      arrow="always"
    >
      <el-carousel-item v-for="(img, index) in images" :key="img.documentId || img.url">
        <el-image 
          :src="getFullUrl(img.url)" 
          fit="scale-down" 
          class="carousel-image" 
          :preview-src-list="previewList" 
          preview-teleported 
          hide-on-click-modal 
          :initial-index="index"
        >
          <template #error>
            <div class="image-error">
              <el-icon size="24"><Picture /></el-icon>
              <span class="mt-2 text-xs">无法加载影像</span>
            </div>
          </template>
        </el-image>
      </el-carousel-item>
    </el-carousel>
    <div class="carousel-tip" v-if="images.length > 1">
      <el-icon><Pointer /></el-icon> 可左右滑动切换，点击可查看大图
    </div>
  </div>
  <el-empty v-else description="本次未上传影像" :image-size="50" class="mini-empty" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Picture, Pointer } from '@element-plus/icons-vue'

const props = defineProps<{
  images: any[]
}>()

const carouselRef = ref()

// 计算属性：生成大图预览列表
const previewList = computed(() => 
  props.images.map((i: any) => getFullUrl(i.url))
)

const getFullUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return (import.meta.env.VITE_API_URL || 'http://localhost:1337') + url
}

// --- 手势逻辑封装 ---
let touchStartX = 0
let touchStartY = 0

const onTouchStart = (e: TouchEvent) => {
  if (e.touches.length > 0) {
    touchStartX = e.touches[0]!.clientX
    touchStartY = e.touches[0]!.clientY
  }
}

const onTouchEnd = (e: TouchEvent) => {
  if (!e.changedTouches.length) return
  const diffX = touchStartX - e.changedTouches[0]!.clientX
  const diffY = touchStartY - e.changedTouches[0]!.clientY
  
  // 水平滑动距离 > 50 且 大于垂直滑动距离
  if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
    if (carouselRef.value) {
      diffX > 0 ? carouselRef.value.next() : carouselRef.value.prev()
    }
  }
}
</script>

<style scoped>
.image-wrapper { background-color: #f9fafb; border-radius: 8px; padding: 12px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.03); touch-action: pan-y; }
.carousel-image { width: 100%; height: 100%; border-radius: 4px; }
.image-error { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #d1d5db; }
.carousel-tip { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 4px; }
.mini-empty { padding: 15px 0; }
:deep(.el-carousel__arrow) { background-color: rgba(255, 255, 255, 0.8); color: #6b7280; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
:deep(.el-carousel__indicators--outside button) { background-color: #e5e7eb; }
:deep(.el-carousel__indicators--outside .is-active button) { background-color: #3b82f6; }
</style>