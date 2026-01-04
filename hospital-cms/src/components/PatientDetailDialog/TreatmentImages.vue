<template>
  <div v-if="images && images.length > 0" class="gallery-container">
    
    <div 
      class="main-stage"
      @touchstart="onTouchStart" 
      @touchend="onTouchEnd"
    >
      <div 
        v-show="currentIndex > 0" 
        class="nav-btn left" 
        @click.stop="prevImage"
      >
        <el-icon><ArrowLeftBold /></el-icon>
      </div>

      <div 
        v-show="currentIndex < images.length - 1" 
        class="nav-btn right" 
        @click.stop="nextImage"
      >
        <el-icon><ArrowRightBold /></el-icon>
      </div>

      <Transition :name="transitionName">
        <el-image 
          v-if="currentImage"
          :key="currentIndex"
          :src="getFullUrl(currentImage.url)" 
          fit="contain" 
          class="main-image"
          :preview-src-list="previewList" 
          preview-teleported 
          hide-on-click-modal 
          :initial-index="currentIndex"
        >
          <template #error>
            <div class="image-error">
              <el-icon size="24"><Picture /></el-icon>
              <span class="mt-2 text-xs">无法加载影像</span>
            </div>
          </template>
        </el-image>
      </Transition>

      <div class="image-counter">
        {{ currentIndex + 1 }} / {{ images.length }}
      </div>
    </div>

    <div v-if="images.length > 1" class="thumbnail-strip">
      <div 
        v-for="(img, index) in images" 
        :key="img.documentId || index"
        class="thumb-item"
        :class="{ active: index === currentIndex }"
        @click="changeImage(index)"
      >
        <el-image 
          :src="getFullUrl(img.url)" 
          fit="cover" 
          class="thumb-image" 
          loading="lazy"
        />
      </div>
    </div>

  </div>
  
  <el-empty v-else description="本次未上传影像" :image-size="50" class="mini-empty" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Picture, ArrowLeftBold, ArrowRightBold } from '@element-plus/icons-vue'

const props = defineProps<{
  images: any[]
}>()

const currentIndex = ref(0)
const transitionName = ref('slide-left') // 默认向左滑

// 监听 images 变化，重置索引
watch(() => props.images, () => {
  currentIndex.value = 0
})

// 🟢 核心：监听索引变化，决定动画方向
watch(currentIndex, (newVal, oldVal) => {
  if (newVal > oldVal) {
    transitionName.value = 'slide-left' // 下一张：从右进来
  } else {
    transitionName.value = 'slide-right' // 上一张：从左进来
  }
})

const currentImage = computed(() => {
  if (!props.images || props.images.length === 0) return null
  return props.images[currentIndex.value]
})

const previewList = computed(() => 
  (props.images || []).map((i: any) => getFullUrl(i.url))
)

const getFullUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return (import.meta.env.VITE_API_URL || 'http://localhost:1337') + url
}

// 统一切换入口
const changeImage = (index: number) => {
  currentIndex.value = index
}

// 封装切换函数
const nextImage = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
  }
}

const prevImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

// --- 手势逻辑 ---
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
  
  const touchEndX = e.changedTouches[0]!.clientX
  const touchEndY = e.changedTouches[0]!.clientY
  
  const diffX = touchStartX - touchEndX
  const diffY = touchStartY - touchEndY
  
  // 滑动阈值 40px
  if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 0) {
      nextImage() // 左滑 -> 下一张
    } else {
      prevImage() // 右滑 -> 上一张
    }
  }
}
</script>

<style scoped>
.gallery-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

/* --- 主展示区 --- */
.main-stage {
  width: 100%;
  height: 250px;
  background-color: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  position: relative;
  overflow: hidden; /* 关键：隐藏滑出边界的图片 */
  
  touch-action: pan-y; 
  user-select: none;
}

/* --- 🟢 动画核心样式 --- */
/* 图片容器 */
.main-image {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  /* 关键：确保动画过程中，离开的图片和进入的图片重叠在同一位置 */
  position: absolute; 
  top: 0;
  left: 0;
}

/* 1. 向左滑动 (下一张) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}
.slide-left-enter-from {
  transform: translateX(100%); /* 新图从右边进来 */
  opacity: 0.5;
}
.slide-left-leave-to {
  transform: translateX(-100%); /* 旧图向左边出去 */
  opacity: 0.5;
}

/* 2. 向右滑动 (上一张) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}
.slide-right-enter-from {
  transform: translateX(-100%); /* 新图从左边进来 */
  opacity: 0.5;
}
.slide-right-leave-to {
  transform: translateX(100%); /* 旧图向右边出去 */
  opacity: 0.5;
}

/* --- 🟢 导航按钮样式优化 --- */
.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 32px; /* 稍微缩小尺寸 */
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10; /* 保证在图片之上 */
  transition: all 0.2s;
  
  /* 高对比度配色 */
  background: rgba(31, 41, 55, 0.6); /* 深灰半透明 */
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
}

.nav-btn:hover {
  background: rgba(31, 41, 55, 0.9); /* 悬停变深 */
  transform: translateY(-50%) scale(1.1); /* 微放大 */
}

/* 贴边显示，减少遮挡 */
.nav-btn.left { left: 8px; }
.nav-btn.right { right: 8px; }

/* 计数器 */
.image-counter {
  position: absolute;
  bottom: 8px;
  right: 12px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  pointer-events: none;
  z-index: 10;
}

/* --- 缩略图条 (保持不变) --- */
.thumbnail-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px;
  scrollbar-width: none;
}
.thumbnail-strip::-webkit-scrollbar { display: none; }

.thumb-item {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  flex-shrink: 0;
  cursor: pointer;
  background-color: #f3f4f6;
  transition: all 0.2s;
}

.thumb-item.active {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.2);
}

.thumb-image {
  width: 100%;
  height: 100%;
  display: block;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #d1d5db;
  height: 100%;
}
.mini-empty { padding: 10px 0; }
</style>