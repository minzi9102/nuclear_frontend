<template>
  <el-dialog 
    v-model="visible" 
    :title="loading ? '数据同步中...' : '患者详细档案'" 
    width="90%" 
    style="max-width: 650px;" 
    align-center
    destroy-on-close
    append-to-body
    class="custom-dialog"
  >
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>正在获取完整病历...</p>
    </div>

    <div v-else-if="patientData" class="detail-container">
      
      <div class="patient-header-card">
        <div class="header-left">
          <h2 class="patient-name">
            {{ patientData.Name }}
            <el-icon :class="patientData.Gender === 'male' ? 'icon-male' : 'icon-female'">
              <Male v-if="patientData.Gender === 'male'" />
              <Female v-else />
            </el-icon>
          </h2>
          <p class="patient-meta">
            {{ calculateAge(patientData.Birthday) }} 岁 | {{ patientData.Birthday }}
          </p>
        </div>
        <div class="header-right">
            <el-tag size="large" type="success" effect="dark" round>
                共 {{ patientData.treatments?.length || 0 }} 次
            </el-tag>
        </div>
      </div>

      <div v-if="patientData.past_treatments?.length" class="history-box">
        <span class="label">既往治疗：</span>
        <span class="value">
            {{ patientData.past_treatments.map((key: string) => (PAST_TREATMENT_MAP as any)[key] || key).join('、') }}
        </span>
      </div>

      <div class="timeline-divider">治疗记录</div>

      <div class="timeline-list">
        <el-collapse v-model="activeNames" class="custom-collapse">
          <el-collapse-item 
            v-for="(treatment, index) in patientData.treatments" 
            :key="treatment.documentId || index" 
            :name="index"
            class="custom-collapse-item"
          >
            <template #title>
              <div class="collapse-header-content">
                <div class="header-main">
                  <span class="treatment-no">{{ treatment.treatmentNo }}</span>
                  <el-tag size="large" effect="plain" class="ml-2">
                      {{ (TREATMENT_TARGET_MAP as any)[treatment.target] || treatment.target }}
                  </el-tag>
                  <el-tag 
                    v-if="treatment.duration" 
                    type="info" 
                    size="large" 
                    effect="plain" 
                    class="ml-2"
                    style="display: flex; align-items: center; border: 1px solid #f3f4f6;"
                  >
                    <el-icon style="margin-right: 4px"><Timer /></el-icon>
                    {{ treatment.duration }} 小时
                  </el-tag>
                </div>
                
                <div class="header-sub">
                  <span class="date-text">
                      {{ new Date(treatment.createdAt).toLocaleDateString() }}
                  </span>
                </div>
              </div>
            </template>

            <div class="collapse-body">
              
              <div 
                v-if="treatment.Images && treatment.Images.length > 0" 
                class="image-wrapper"
                @touchstart="onTouchStart"
                @touchend="(e) => onTouchEnd(e, index)"
              >
                 <el-carousel 
                   :ref="(el: any) => setCarouselRef(el, index)"
                   :autoplay="false" 
                   trigger="click" 
                   indicator-position="outside" 
                   height="250px"
                   arrow="always"
                 >
                    <el-carousel-item v-for="(img, imgIndex) in treatment.Images" :key="img.documentId || img.url">
                      <el-image 
                        :src="getFullUrl(img.url)" 
                        fit="scale-down" 
                        class="carousel-image"
                        :preview-src-list="treatment.Images.map((i: any) => getFullUrl(i.url))"
                        preview-teleported
                        hide-on-click-modal
                        :initial-index="imgIndex" 
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
                  
                  <div class="carousel-tip" v-if="treatment.Images.length > 1">
                    <el-icon><Pointer /></el-icon> 可左右滑动切换，点击可查看大图
                  </div>
              </div>
              
              <el-empty v-else description="本次未上传影像" :image-size="50" class="mini-empty" />
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <el-empty v-if="!patientData.treatments?.length" description="暂无治疗记录" />
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Loading, Male, Female, Picture, Pointer, Timer } from '@element-plus/icons-vue'
import { getPatientList } from '../api/patient'
import { ElMessage } from 'element-plus'
import { TREATMENT_TARGET_MAP, PAST_TREATMENT_MAP } from '../constants/treatment'

const visible = ref(false)
const loading = ref(false)
const patientData = ref<any>(null)
const activeNames = ref<number[]>([0])

// 存储轮播图实例
const carouselRefs = ref<Record<number, any>>({})

// 🔥 修复1：允许 index 为 string | number，并允许 el 为 any
const setCarouselRef = (el: any, index: number | string) => {
  if (el) {
    carouselRefs.value[Number(index)] = el // 强制转为数字存储
  }
}

// 手写触控逻辑
let touchStartX = 0
let touchStartY = 0

// 🔥 修复2：增加 touches 长度检查，防止 undefined 报错
const onTouchStart = (e: TouchEvent) => {
  if (e.touches && e.touches.length > 0) {
    touchStartX = e.touches[0]!.clientX
    touchStartY = e.touches[0]!.clientY
  }
}

// 🔥 修复3：修改 index 类型定义，并增加 changedTouches 检查
const onTouchEnd = (e: TouchEvent, index: number | string) => {
  if (!e.changedTouches || e.changedTouches.length === 0) return

  const touchEndX = e.changedTouches[0]!.clientX
  const touchEndY = e.changedTouches[0]!.clientY

  const diffX = touchStartX - touchEndX
  const diffY = touchStartY - touchEndY

  // 只有水平滑动距离大于 50px，且大于垂直滑动距离时才触发
  if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
    const targetCarousel = carouselRefs.value[Number(index)]
    if (targetCarousel) {
      if (diffX > 0) {
        targetCarousel.next() // 向左滑 -> 下一张
      } else {
        targetCarousel.prev() // 向右滑 -> 上一张
      }
    }
  }
}

const calculateAge = (birthday: string) => {
  if (!birthday) return '?'
  const birthDate = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

const getFullUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const baseUrl = import.meta.env.VITE_API_URL || ''
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const cleanUrl = url.startsWith('/') ? url : `/${url}`
  return cleanBase + cleanUrl
}

const open = async (documentId: string) => {
  visible.value = true
  loading.value = true
  patientData.value = null
  activeNames.value = [0]
  carouselRefs.value = {}

  try {
    const res: any = await getPatientList({
      filters: { documentId: { $eq: documentId } },
      populate: {
        treatments: {
            populate: 'Images',
            sort: 'createdAt:desc'
        }
      }
    } as any)

    let data = null
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
        data = res.data.data[0]
    } else if (res.data && Array.isArray(res.data)) {
        data = res.data[0]
    }

    if (data) {
        patientData.value = data
    } else {
        throw new Error('未找到数据')
    }

  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('数据同步失败')
  } finally {
    loading.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
/* === 改良版: 现代卡片风 (修复溢出与字体) === */

.loading-state { padding: 40px; text-align: center; color: #909399; }

/* 患者头部卡片 */
.patient-header-card {
  background: linear-gradient(135deg, #e3f2fd, #ffffff);
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 20px;
  display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.patient-name {
  font-size: 20px; font-weight: 700; color: #1f2937;
  margin: 0; display: flex; align-items: center; gap: 8px;
}
.icon-male { color: #2563eb; }
.icon-female { color: #db2777; }
.patient-meta { font-size: 13px; color: #6b7280; margin: 6px 0 0 0; }

.history-box {
  background-color: #fef2f2; border: 1px solid #fee2e2;
  padding: 10px 15px; border-radius: 8px;
  font-size: 13px; color: #b91c1c; margin-bottom: 20px;
}
.history-box .label { font-weight: 600; }

.timeline-divider {
    text-align: center; position: relative; margin: 25px 0 15px; color: #9ca3af; font-size: 12px;
}
.timeline-divider::before, .timeline-divider::after {
    content: ''; position: absolute; top: 50%; width: 40%; height: 1px; background-color: #e5e7eb;
}
.timeline-divider::before { left: 0; } .timeline-divider::after { right: 0; }

/* 列表项样式 */
.custom-collapse { border: none; }
.custom-collapse-item {
  margin-bottom: 14px;
  border: 1px solid rgba(0,0,0,0.04);
  border-radius: 10px; background-color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden;
  transition: all 0.2s;
}
.custom-collapse-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

/* 强制撑开头部并修复溢出 */
:deep(.el-collapse-item__header) {
  height: auto !important; line-height: normal !important;
  padding: 14px 12px !important; /* 稍微减小内边距，给内容更多空间 */
  font-size: 15px; border-bottom: 1px solid #f3f4f6;
  display: flex; /* 确保是 flex 布局 */
  align-items: center;
}
:deep(.el-collapse-item__header.is-active) { background-color: #f9fafb; }
:deep(.el-collapse-item__content) { padding-bottom: 0 !important; }

/* 标题内容容器：关键修复 */
.collapse-header-content {
  flex: 1; /* 🔥 改为 flex: 1，自动占据剩余空间 */
  min-width: 0; /* 🔥 防止 flex 子项溢出 */
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-right: 10px; /* 🔥 右侧留出空隙，防止紧贴箭头或溢出 */
}

.header-main { 
  display: flex; 
  align-items: center; 
  flex-shrink: 0; /* 防止标题被压缩 */
}

/* 🔥 字体加大 */
.treatment-no { 
  font-size: 24px; /* 从 15px 改为 24px */
  font-weight: 700; 
  color: #111827; 
}

.ml-2 { margin-left: 10px; }

.header-sub { 
  display: flex; 
  align-items: center; 
  flex-shrink: 0; /* 防止日期被压缩换行 */
}

.date-text { 
  font-size: 18px; 
  color: #9ca3af; 
  white-space: nowrap; /* 🔥 防止日期换行 */
  font-weight: 500; /* 稍微加粗一点点 */
}

/* 使用 :deep() 穿透 Element Plus 的默认样式 */
:deep(.header-main .el-tag) {
  font-size: 15px !important; /* 强制设为 15px */
  height: 32px; /* 配合 size="large" 确保高度足够 */
  padding: 0 12px; /* 增加一点左右内边距 */
}

/* 内容区与图片 */
.collapse-body { padding: 16px; background-color: #fff; }
.image-wrapper {
  background-color: #f9fafb;
  border-radius: 8px; padding: 12px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.03);

  /* touch-action: none; */
  touch-action: pan-y;
}
.carousel-image { width: 100%; height: 100%; border-radius: 4px; }
.image-error {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: #d1d5db;
}
.carousel-tip {
  text-align: center; color: #9ca3af; font-size: 12px;
  margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 4px;
}
.mini-empty { padding: 15px 0; }

:deep(.el-carousel__arrow) { background-color: rgba(255, 255, 255, 0.8); color: #6b7280; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
:deep(.el-carousel__indicators--outside button) { background-color: #e5e7eb; }
:deep(.el-carousel__indicators--outside .is-active button) { background-color: #3b82f6; }
</style>