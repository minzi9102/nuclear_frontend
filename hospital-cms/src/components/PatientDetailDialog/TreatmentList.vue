<template>
  <div class="timeline-divider">治疗记录</div>

  <div class="timeline-list">
    <el-collapse v-model="activeNames" class="custom-collapse" @change="handleCollapseChange">
      <el-collapse-item 
        v-for="(treatment, index) in treatments" 
        :key="treatment.documentId || index" 
        :name="index"
        class="custom-collapse-item"
        :ref="(el: any) => setCollapseItemRef(el, Number(index))"
      >
        <template #title>
          <div class="collapse-header-wrapper">
            <div class="header-primary">
              <span class="treatment-no">{{ treatment.treatmentNo }}</span>
              
              <el-tag size="default" effect="plain" class="target-tag">
                {{ getSummaryTitle(treatment) }}
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

          <div v-if="treatment.details && treatment.details.length > 0" class="lesion-list">
            <div
              v-for="(lesion, idx) in treatment.details"
              :key="idx"
              class="lesion-item"
            >
              <div class="lesion-header">
                <div class="lesion-title">
                  <span class="bullet-point"></span>
                  部位：{{ getTargetLabel(lesion.part) }}
                </div>
                <div v-if="lesion.duration != null || treatment.duration != null" 
                class="lesion-meta"
                :class="{ 'is-special': lesion.duration != null }"
                >
                  <el-icon class="lesion-meta-icon"><Timer /></el-icon>
                  <span>{{ lesion.duration != null ? lesion.duration : treatment.duration }} 小时</span>
                </div>
              </div>

              <div v-if="lesion.notes" class="lesion-note">
                备注：{{ lesion.notes }}
              </div>

              <TreatmentImages :images="lesion.photos || []" />
            </div>
          </div>

          <div v-else>
            <TreatmentImages :images="treatment.Images || []" />
          </div>

        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
  
  <el-empty v-if="!treatments?.length" description="暂无治疗记录" />
  <div class="bottom-spacer"></div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { Timer } from '@element-plus/icons-vue'
import { TREATMENT_TARGET_MAP } from '../../constants/treatment'
import TreatmentImages from './TreatmentImages.vue'
import type { Treatment } from '../../api/types'


const props = defineProps<{
  treatments: Treatment[]
}>()

const activeNames = ref<number[]>([0])
const lastActiveNames = ref<number[]>([0])
const collapseItemRefs = ref<Record<number, any>>({})

// 监听数据变化
watch(() => props.treatments, () => {
  activeNames.value = [0]
  lastActiveNames.value = [0]
  collapseItemRefs.value = {}
})

// 🟢 核心逻辑：获取单一部位翻译
const getTargetLabel = (target: string) => {
  // @ts-ignore: 忽略 key 匹配检查，直接取值
  return TREATMENT_TARGET_MAP[target] || target || '未知部位'
}

// 🟢 核心逻辑：生成 Header 摘要标题
const getSummaryTitle = (row: Treatment) => {
  // 1. 优先检查是否有新版 details 数据
  if (row.details && row.details.length > 0) {
    const parts = row.details.map(d => getTargetLabel(d.part));

    // 策略：如果只有 1-2 个，直接显示 "面部 + 颈部"
    if (parts.length <= 2) {
      return parts.join(' + ');
    }
    // 策略：如果超过 2 个，显示 "面部 + 2 个部位"
    return `${parts[0]} + ${parts.length - 1} 个部位`;
  }

  // 2. 回退到旧数据 target 字段
  return getTargetLabel(row.target || '');
}

const setCollapseItemRef = (el: any, index: number) => {
  if (el) collapseItemRefs.value[index] = el
}

// 自动滚动逻辑 (保持不变)
const handleCollapseChange = async (val: any) => {
  const currentNames = Array.isArray(val) ? val : [val]
  const prevNames = lastActiveNames.value
  const newlyOpened = currentNames.find((id: number) => !prevNames.includes(id))
  lastActiveNames.value = [...currentNames]

  if (newlyOpened !== undefined && collapseItemRefs.value[newlyOpened]) {
    await nextTick()
    setTimeout(() => {
      const targetComponent = collapseItemRefs.value[newlyOpened]
      const targetEl = targetComponent?.$el || targetComponent

      if (targetEl) {
        const scrollContainer = targetEl.closest('.el-dialog__body')
        if (scrollContainer) {
          const elementRect = targetEl.getBoundingClientRect()
          const containerRect = scrollContainer.getBoundingClientRect()
          const currentScrollTop = scrollContainer.scrollTop
          const offset = 60 
          const targetTop = currentScrollTop + (elementRect.top - containerRect.top) - offset
          scrollContainer.scrollTo({ top: targetTop, behavior: 'smooth' })
        }
      }
    }, 200)
  }
}
</script>

<style scoped>
/* 原有样式保持不变... */
.timeline-divider { text-align: center; position: relative; margin: 25px 0 15px; color: #9ca3af; font-size: 12px; }
.timeline-divider::before, .timeline-divider::after { content: ''; position: absolute; top: 50%; width: 40%; height: 1px; background-color: #e5e7eb; }
.timeline-divider::before { left: 0; } .timeline-divider::after { right: 0; }
.custom-collapse { border: none; }
.custom-collapse-item { margin-bottom: 5px; border: 1px solid rgba(0,0,0,0.04); border-radius: 10px; background-color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.04); overflow: hidden; transition: all 0.2s; }
.collapse-header-wrapper { display: flex; flex-direction: column; justify-content: center; padding: 8px 0; width: 100%; line-height: 1.4; }
.header-primary { display: flex; align-items: center; margin-bottom: 6px; }
.treatment-no { font-size: 17px; font-weight: 700; color: #111827; margin-right: 10px; }
.target-tag { border: none; background-color: #eff6ff; color: #2563eb; font-weight: 500; }
.header-secondary { display: flex; align-items: center; font-size: 13px; color: #9ca3af; }
.meta-item { display: flex; align-items: center; }
.meta-icon { margin-right: 3px; font-size: 14px; position: relative; top: -1px; }
.meta-separator { margin: 0 8px; color: #e5e7eb; font-size: 10px; }
.date-text { font-size: 16px; color: #9ca3af; white-space: nowrap; font-weight: 500; }
.collapse-body { padding: 16px; background-color: #fff; }
.bottom-spacer { height: 40vh; width: 100%; flex-shrink: 0; }

/* 🟢 新增：多病灶堆叠样式 */
.lesion-list {
  display: flex;
  flex-direction: column;
  gap: 24px; /* 病灶之间的间距 */
}

.lesion-item {
  position: relative;
  padding-left: 14px;
  border-left: 3px solid #e5e7eb; /* 左侧灰色竖线，建立层级感 */
}

.lesion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.lesion-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
}

/* 蓝色小圆点，装饰用 */
.bullet-point {
  width: 6px;
  height: 6px;
  background-color: #3b82f6;
  border-radius: 50%;
  margin-right: 8px;
  position: absolute;
  left: -4.5px; /* 定位在边框线上 */
  top: 8px;
}

.lesion-meta {
  display: flex;           /* 🟢 新增：使用 flex 布局 */
  align-items: center;     /* 🟢 新增：垂直居中 */
  gap: 4px;               /* 🟢 新增：图标和文字的间距 */
  font-size: 12px;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 2px 8px;       /* 微调左右内边距 */
  border-radius: 4px;
  white-space: nowrap;     /* 防止文字换行 */
}

.lesion-meta-icon {
  font-size: 13px;
  position: relative;
  top: -0.5px;            /* 微调图标位置，视觉上更平衡 */
}

.lesion-note { 
  font-size: 13px; 
  color: #4b5563; 
  margin-bottom: 12px; 
  background-color: #fffbeb; /* 浅黄色背景 */
  padding: 8px 12px; 
  border-radius: 6px; 
  border: 1px solid #fcd34d; 
  line-height: 1.5;
}

/* 🟡 新增：特殊时长高亮样式 */
.lesion-meta.is-special {
  background-color: #fffbeb; /* 浅黄色背景 (与备注背景呼应) */
  color: #b45309;            /* 深琥珀色文字 (比备注文字更深一点，增强可读性) */
  font-weight: 500;          /* 稍微加粗，强调特殊性 */
}

/* 可选：如果你希望特殊时长的图标也变色，可以加上这个 */
.lesion-meta.is-special .el-icon {
  color: #d97706;
}

:deep(.el-collapse-item__header) { height: auto !important; min-height: 48px; padding: 4px 0 4px 10px !important; align-items: flex-start; border-bottom: 1px solid #f3f4f6; }
:deep(.el-collapse-item__arrow) { margin: auto 12px auto auto !important; color: #d1d5db; flex-shrink: 0; }
:deep(.el-collapse-item__content) { padding-bottom: 0 !important; }
</style>