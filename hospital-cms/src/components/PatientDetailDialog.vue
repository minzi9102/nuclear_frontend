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
            新建治疗记录
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
                  <el-tag v-if="treatment.duration" type="info" size="large" effect="plain" class="ml-2" style="display: flex; align-items: center; border: 1px solid #f3f4f6;">
                    <el-icon style="margin-right: 4px"><Timer /></el-icon>
                    {{ treatment.duration }} 小时
                  </el-tag>
                  <span class="date-text ml-2" style="margin-left: 20px;">
                    {{ new Date(treatment.createdAt).toLocaleDateString() }}
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
      
      <div style="height: 20px;"></div>
    </div>

    <TreatmentCreateDialog ref="treatmentCreateRef" @success="onTreatmentCreated" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loading, Male, Female, Picture, Pointer, Timer, Close, Plus } from '@element-plus/icons-vue'
import { getPatientList } from '../api/patient'
import { ElMessage } from 'element-plus'
import { TREATMENT_TARGET_MAP, PAST_TREATMENT_MAP } from '../constants/treatment'
import TreatmentCreateDialog from './TreatmentCreateDialog.vue'

const visible = ref(false)
const loading = ref(false)
const patientData = ref<any>(null)
const activeNames = ref<number[]>([0])
const treatmentCreateRef = ref()
const carouselRefs = ref<Record<number, any>>({})
const currentDocumentId = ref('')

// 辅助逻辑
const setCarouselRef = (el: any, index: number | string) => { if (el) carouselRefs.value[Number(index)] = el }
const calculateAge = (birthday: string) => { if (!birthday) return '?'; const age = new Date().getFullYear() - new Date(birthday).getFullYear(); return age }
const getFullUrl = (url: string) => { if (!url) return ''; if (url.startsWith('http')) return url; return (import.meta.env.VITE_API_URL || 'http://localhost:1337') + url }

let touchStartX = 0
let touchStartY = 0
const onTouchStart = (e: TouchEvent) => { if (e.touches && e.touches.length > 0) { touchStartX = e.touches[0]!.clientX; touchStartY = e.touches[0]!.clientY } }
const onTouchEnd = (e: TouchEvent, index: number | string) => { if (!e.changedTouches || e.changedTouches.length === 0) return; const diffX = touchStartX - e.changedTouches[0]!.clientX; const diffY = touchStartY - e.changedTouches[0]!.clientY; if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) { const target = carouselRefs.value[Number(index)]; target && (diffX > 0 ? target.next() : target.prev()) } }

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
.header-title { font-size: 18px; font-weight: bold; color: #303133; }

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
:deep(.el-collapse-item__arrow) { margin: 24px !important; flex-shrink: 0;}
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
</style>