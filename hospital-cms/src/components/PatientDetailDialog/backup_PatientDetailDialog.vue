<template>
  <el-dialog 
    v-model="visible" 
    width="90%" 
    style="max-width: 650px;" 
    align-center
    destroy-on-close
    append-to-body
    :show-close="false" 
    class="custom-dialog fixed-header-dialog" 
  >
    <template #header="{ titleId, titleClass }">
      <div class="dialog-header">
        <span :id="titleId" :class="titleClass" class="header-title">
          {{ loading ? '数据同步中...' : '患者详细档案' }}
        </span>
        
        <div class="header-actions">
          <el-button 
            type="primary" 
            :icon="Plus"
            :disabled="loading || !patientData"
            @click="openCreateDialog"
            round
            size="default"
          >
            新建记录
          </el-button>
          
          <el-button 
            circle 
            :icon="Close" 
            @click="visible = false" 
            style="border: none; background: #f3f4f6;" 
          />
        </div>
      </div>
    </template>

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
        <el-collapse v-model="activeNames" class="custom-collapse" @change="handleCollapseChange">
          <el-collapse-item 
            v-for="(treatment, index) in patientData.treatments" 
            :key="treatment.documentId || index" 
            :name="index"
            class="custom-collapse-item"
            :ref="(el: any) => setCollapseItemRef(el, Number(index))">
            <template #title>
              <div class="collapse-header-wrapper">
                
                <div class="header-primary">
                  <span class="treatment-no">{{ treatment.treatmentNo }}</span>
                  <el-tag size="default" effect="plain" class="target-tag">
                    {{ (TREATMENT_TARGET_MAP as any)[treatment.target] || treatment.target }}
                  </el-tag>
                </div>

                <div class="header-secondary">
                  <template v-if="treatment.duration">
                    <span class="meta-item duration-tag">
                      <el-icon class="meta-icon"><Timer /></el-icon>
                      {{ treatment.duration }}小时
                    </span>
                    <span class="meta-separator">|</span>
                  </template>
                  
                  <span class="meta-item date-text">
                   记录时间：{{ new Date(treatment.createdAt).toLocaleDateString() }}
                  </span>
                </div>

              </div>
              </template>

            <div class="collapse-body">
              <div v-if="treatment.Images && treatment.Images.length > 0" class="image-wrapper" @touchstart="onTouchStart" @touchend="(e) => onTouchEnd(e, index)">
                 <el-carousel :ref="(el: any) => setCarouselRef(el, index)" :autoplay="false" trigger="click" indicator-position="outside" height="250px" arrow="always">
                    <el-carousel-item v-for="(img, imgIndex) in treatment.Images" :key="img.documentId || img.url">
                      <el-image :src="getFullUrl(img.url)" fit="scale-down" class="carousel-image" :preview-src-list="treatment.Images.map((i: any) => getFullUrl(i.url))" preview-teleported hide-on-click-modal :initial-index="imgIndex">
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
      
      <div class="bottom-spacer"></div>
    </div>

    <TreatmentCreateDialog ref="treatmentCreateRef" @success="onTreatmentCreated" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Loading, Male, Female, Picture, Pointer, Timer, Close, Plus } from '@element-plus/icons-vue'
import { getPatientList } from '../../api/patient'
import { ElMessage } from 'element-plus'
import { TREATMENT_TARGET_MAP, PAST_TREATMENT_MAP } from '../../constants/treatment'
import TreatmentCreateDialog from '../TreatmentCreateDialog.vue'

const visible = ref(false)
const loading = ref(false)
const patientData = ref<any>(null)
const activeNames = ref<number[]>([0])
const treatmentCreateRef = ref()
const carouselRefs = ref<Record<number, any>>({})
const currentDocumentId = ref('')
const collapseItemRefs = ref<Record<number, any>>({}) // ✅ 新增：存储折叠项 DOM
const lastActiveNames = ref<number[]>([0]) // 用于记录上一次的折叠状态

// 辅助逻辑
const setCarouselRef = (el: any, index: number | string) => { if (el) carouselRefs.value[Number(index)] = el }
const calculateAge = (birthday: string) => { if (!birthday) return '?'; const age = new Date().getFullYear() - new Date(birthday).getFullYear(); return age }
const getFullUrl = (url: string) => { if (!url) return ''; if (url.startsWith('http')) return url; return (import.meta.env.VITE_API_URL || 'http://localhost:1337') + url }

let touchStartX = 0
let touchStartY = 0
const onTouchStart = (e: TouchEvent) => { if (e.touches && e.touches.length > 0) { touchStartX = e.touches[0]!.clientX; touchStartY = e.touches[0]!.clientY } }
const onTouchEnd = (e: TouchEvent, index: number | string) => { if (!e.changedTouches || e.changedTouches.length === 0) return; const diffX = touchStartX - e.changedTouches[0]!.clientX; const diffY = touchStartY - e.changedTouches[0]!.clientY; if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) { const target = carouselRefs.value[Number(index)]; target && (diffX > 0 ? target.next() : target.prev()) } }

// ✅ 新增：设置折叠项 Ref
const setCollapseItemRef = (el: any, index: number) => {
  if (el) collapseItemRefs.value[index] = el
}

// ✅ 新增：处理折叠面板切换事件
const handleCollapseChange = async (val: any) => {
  const currentNames = Array.isArray(val) ? val : [val]
  const prevNames = lastActiveNames.value

  // 1. 找出“新展开”的那一项 (在 current 中存在，但在 prev 中不存在的)
  const newlyOpened = currentNames.find((id: number) => !prevNames.includes(id))

  // 2. 更新历史状态，供下次对比使用
  lastActiveNames.value = [...currentNames]

  // 3. 只有当确实有新项被展开时，才滚动
  if (newlyOpened !== undefined && collapseItemRefs.value[newlyOpened]) {
    await nextTick()
    
    // 延迟一点点，配合动画
    setTimeout(() => {
      const targetComponent = collapseItemRefs.value[newlyOpened]
      const targetEl = targetComponent?.$el || targetComponent

      if (targetEl) {
        // --- 核心修改开始 ---
        
        // 1. 找到滚动的父容器 (el-dialog__body)
        // 使用 closest 方法向上查找最近的滚动容器
        const scrollContainer = targetEl.closest('.el-dialog__body')

        if (scrollContainer) {
          // 2. 计算目标元素相对于视口的位置
          const elementRect = targetEl.getBoundingClientRect()
          const containerRect = scrollContainer.getBoundingClientRect()

          // 3. 计算当前容器已滚动的距离
          const currentScrollTop = scrollContainer.scrollTop

          // 4. 计算目标滚动位置
          // 公式：当前滚动高度 + (元素视口坐标 - 容器视口坐标) - 偏移量(60px)
          const offset = 60 // 🔥 这里调整你想多滑的距离，比如 60 或 80
          const targetTop = currentScrollTop + (elementRect.top - containerRect.top) - offset

          // 5. 执行平滑滚动
          scrollContainer.scrollTo({
            top: targetTop,
            behavior: 'smooth'
          })
        }
        // --- 核心修改结束 ---
      }
    }, 200)
  }
}

// --- 交互逻辑 ---
const openCreateDialog = () => {
  if (patientData.value) {
    treatmentCreateRef.value.open({
      documentId: patientData.value.documentId,
      Name: patientData.value.Name
    })
  }
}

const onTreatmentCreated = () => { if (currentDocumentId.value) open(currentDocumentId.value) }

const open = async (documentId: string) => {
  visible.value = true
  loading.value = true
  patientData.value = null
  activeNames.value = [0]
  lastActiveNames.value = [0] 
  carouselRefs.value = {}
  currentDocumentId.value = documentId

  try {
    const res: any = await getPatientList({
      filters: { documentId: { $eq: documentId } },
      populate: {
        treatments: { populate: 'Images', sort: 'createdAt:desc' }
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
/* Header 样式 */
.dialog-header { 
    display: flex; 
    align-items: center; 
    justify-content: space-between; 
    width: 100%;
}
.header-title { font-size: 16px; font-weight: bold; color: #303133; }

/* Header 右侧操作区 */
.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto; /* 确保靠右 */
}

/* 原有内容样式保留 */
.loading-state { padding: 40px; text-align: center; color: #909399; }
.patient-header-card { background: linear-gradient(135deg, #e3f2fd, #ffffff); border-radius: 12px; padding: 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
.patient-name { font-size: 20px; font-weight: 700; color: #1f2937; margin: 0; display: flex; align-items: center; gap: 8px; }
.icon-male { color: #2563eb; }
.icon-female { color: #db2777; }
.patient-meta { font-size: 13px; color: #6b7280; margin: 6px 0 0 0; }
.history-box { background-color: #fef2f2; border: 1px solid #fee2e2; padding: 10px 15px; border-radius: 8px; font-size: 13px; color: #b91c1c; margin-bottom: 20px; }
.history-box .label { font-weight: 600; }
.timeline-divider { text-align: center; position: relative; margin: 25px 0 15px; color: #9ca3af; font-size: 12px; }
.timeline-divider::before, .timeline-divider::after { content: ''; position: absolute; top: 50%; width: 40%; height: 1px; background-color: #e5e7eb; }
.timeline-divider::before { left: 0; } .timeline-divider::after { right: 0; }
.custom-collapse { border: none; }
.custom-collapse-item { margin-bottom: 5px; border: 1px solid rgba(0,0,0,0.04); border-radius: 10px; background-color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; transition: all 0.2s; }
.custom-collapse-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
:deep(.el-collapse-item__header) { height: auto !important; line-height: normal !important; padding: 1px 5px 1px 5px !important; font-size: 15px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; }
:deep(.el-collapse-item__header.is-active) { background-color: #f9fafb; }
:deep(.el-collapse-item__arrow) { margin: 16px !important; flex-shrink: 0;}
:deep(.el-collapse-item__content) { padding-bottom: 0 !important; }
.collapse-header-content { flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; margin-right: 12px; }
.header-main { display: flex; align-items: center; flex-shrink: 0; }
.treatment-no { font-size: 18px; font-weight: 700; color: #111827; }
.ml-2 { margin-left: 10px; }
.header-sub { display: flex; align-items: center; flex-shrink: 0; }
.date-text { font-size: 16px; color: #9ca3af; white-space: nowrap; font-weight: 500; }
:deep(.header-main .el-tag) { font-size: 15px !important; height: 32px; padding: 0 12px; }
.collapse-body { padding: 16px; background-color: #fff; }
.image-wrapper { background-color: #f9fafb; border-radius: 8px; padding: 12px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.03); touch-action: pan-y; }
.carousel-image { width: 100%; height: 100%; border-radius: 4px; }
.image-error { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #d1d5db; }
.carousel-tip { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 4px; }
.mini-empty { padding: 15px 0; }
:deep(.el-carousel__arrow) { background-color: rgba(255, 255, 255, 0.8); color: #6b7280; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
:deep(.el-carousel__indicators--outside button) { background-color: #e5e7eb; }
:deep(.el-carousel__indicators--outside .is-active button) { background-color: #3b82f6; }
/* --- 新增：上下分层布局样式 --- */

/* 容器：垂直排列 */
.collapse-header-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8px 0; /* 增加上下内边距，让点击区域更大 */
  width: 100%;
  line-height: 1.4; /* 优化行高 */
}

/* 第一行：序号和部位 */
.header-primary {
  display: flex;
  align-items: center;
  margin-bottom: 6px; /* 与第二行的间距 */
}

.treatment-no {
  font-size: 17px;
  font-weight: 700;
  color: #111827;
  margin-right: 10px; /* 序号右侧留白 */
}

.target-tag {
  border: none; /* 去除边框，显得更现代 */
  background-color: #eff6ff; /* 极淡的蓝色背景 */
  color: #2563eb;
  font-weight: 500;
}

/* 第二行：辅助信息 */
.header-secondary {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #9ca3af; /* 灰色文字 */
}

.meta-item {
  display: flex;
  align-items: center;
}

.meta-icon {
  margin-right: 3px;
  font-size: 14px;
  position: relative;
  top: -1px; /* 微调图标位置对齐 */
}

.meta-separator {
  margin: 0 8px;
  color: #e5e7eb; /* 极淡的分隔线 */
  font-size: 10px;
}

/* 覆盖旧样式：确保折叠面板头部高度自动撑开 */
:deep(.el-collapse-item__header) {
  height: auto !important; 
  min-height: 48px;
  padding: 4px 0 4px 10px !important; /* 左侧留一点空隙 */
  align-items: flex-start; /* 箭头顶部对齐，防止两行时箭头位置尴尬 */
}

/* 调整箭头位置，让它居中显示 */
:deep(.el-collapse-item__arrow) {
  margin: auto 12px auto auto !important; /* 垂直居中 */
  color: #d1d5db;
}

</style>

<style>
/* 注意：这里没有 scoped */

/* 修改后的样式：仅保留高度限制，去除 Footer 的强制布局 */
.fixed-header-dialog {
  margin-top: 5vh !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.fixed-header-dialog .el-dialog__body {
  overflow-y: auto;
  padding-top: 10px !important;
  flex: 1; /* 让 Body 占据剩余空间 */
}
.bottom-spacer {
  height: 40vh; /* 这里的关键：给底部留出巨大的空间 */
  width: 100%;
  flex-shrink: 0;
}
</style>