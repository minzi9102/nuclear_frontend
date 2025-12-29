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
                {{ getTargetLabel(treatment.target) }}
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
          <TreatmentImages :images="treatment.Images" />
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

const props = defineProps<{
  treatments: any[]
}>()

const activeNames = ref<number[]>([0])
const lastActiveNames = ref<number[]>([0])
const collapseItemRefs = ref<Record<number, any>>({})

// 监听数据变化，重置折叠状态
watch(() => props.treatments, () => {
  activeNames.value = [0]
  lastActiveNames.value = [0]
  collapseItemRefs.value = {}
})

const getTargetLabel = (target: string) => {
  return (TREATMENT_TARGET_MAP as any)[target] || target
}

const setCollapseItemRef = (el: any, index: number) => {
  if (el) collapseItemRefs.value[index] = el
}

// --- 自动滚动逻辑 ---
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
/* 迁移原有的 collapse 相关样式 */
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

/* 深度选择器适配 Element Plus 内部样式 */
:deep(.el-collapse-item__header) { height: auto !important; min-height: 48px; padding: 4px 0 4px 10px !important; align-items: flex-start; border-bottom: 1px solid #f3f4f6; }
:deep(.el-collapse-item__arrow) { margin: auto 12px auto auto !important; color: #d1d5db; flex-shrink: 0; }
:deep(.el-collapse-item__content) { padding-bottom: 0 !important; }
</style>