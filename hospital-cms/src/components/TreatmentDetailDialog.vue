<template>
  <el-dialog 
    v-model="visible" 
    title="治疗记录详情" 
    width="90%"               style="max-width: 450px;" align-center
    destroy-on-close
    append-to-body
  >
    <div v-if="loading" class="py-10 text-center">
      <el-icon class="is-loading text-3xl text-blue-500"><Loading /></el-icon>
      <p class="mt-2 text-gray-500">正在加载影像数据...</p>
    </div>

    <div v-else-if="detail" class="detail-content">
      <div class="flex justify-between items-center mb-6 bg-gray-50 p-4 rounded-lg">
        <div>
          <h3 class="text-xl font-bold text-gray-800">{{ detail.treatmentNo }}</h3>
          <p class="text-sm text-gray-500 mt-1">
            治疗时间：{{ new Date(detail.createdAt).toLocaleString() }}
          </p>
        </div>
        <el-tag effect="dark" size="large">
          <!-- {{ detail.target }} -->
          {{ TREATMENT_TARGET_MAP[detail.target] || detail.target }}
        </el-tag>
      </div>

      <div class="mb-4">
        <h4 class="font-bold mb-3 border-l-4 border-blue-500 pl-3">治疗影像</h4>
        
        <div v-if="detail.Images && detail.Images.length > 0" class="flex flex-wrap gap-3">
          <el-image 
            v-for="img in detail.Images" 
            :key="img.documentId"
            :src="getFullUrl(img.url)" 
            :preview-src-list="detail.Images.map((i: any) => getFullUrl(i.url))"
            class="w-32 h-32 rounded-lg border shadow-sm cursor-zoom-in"
            fit="cover"
            preview-teleported
          />
        </div>
        <el-empty v-else description="本次治疗暂无影像" :image-size="60" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { getTreatmentDetail } from '../api/treatment'
import type { Treatment } from '../api/types'
import { ElMessage } from 'element-plus'
import { TREATMENT_TARGET_MAP } from '../constants/treatment' // 💡 引入翻译映射

const visible = ref(false)
const loading = ref(false)
const detail = ref<Treatment | null>(null)

// 拼接图片完整路径 (兼容本地开发和生产环境)
const getFullUrl = (url: string) => {
  if (!url) return ''
  // 如果已经是完整路径则直接返回，否则拼接 API 地址
  if (url.startsWith('http')) return url
  return import.meta.env.VITE_API_URL + url
}

// 暴露给父组件的方法
const open = async (documentId: string) => {
  visible.value = true
  loading.value = true
  detail.value = null

  try {
    const res = await getTreatmentDetail(documentId) as any
    console.log('API Response:', res) // 调试用

    // 🔥🔥🔥 核心修复：针对未解包的 Axios 响应进行双重解包
    // 情况 A: res 是完整的 Axios 响应对象 (包含 status, headers 等)
    if (res.status === 200 && res.data && res.data.data) {
      // res.data 是 Strapi 的响应体 { data: {...}, meta: {} }
      // res.data.data 才是我们要的 Treatment 对象
      detail.value = res.data.data
    } 
    // 情况 B: 如果你的拦截器以后改了，直接返回了 body
    else if (res.data) {
      detail.value = res.data
    } 
    // 情况 C: 兜底
    else {
      detail.value = res
    }

  } catch (error) {
    console.error(error)
    ElMessage.error('无法获取治疗详情')
  } finally {
    loading.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
/* 简单的 Flex 布局兼容 */
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-center { align-items: center; }
.flex-wrap { flex-wrap: wrap; }
.gap-3 { gap: 12px; }
.mb-6 { margin-bottom: 24px; }
.mb-4 { margin-bottom: 16px; }
.mb-3 { margin-bottom: 12px; }
.p-4 { padding: 16px; }
.py-10 { padding-top: 40px; padding-bottom: 40px; }
.pl-3 { padding-left: 12px; }
.mt-1 { margin-top: 4px; }
.text-center { text-align: center; }
.rounded-lg { border-radius: 8px; }
.bg-gray-50 { background-color: #f9fafb; }
.text-xl { font-size: 1.25rem; }
.font-bold { font-weight: 700; }
.text-gray-800 { color: #1f2937; }
.text-gray-500 { color: #6b7280; }
.border-l-4 { border-left-width: 4px; }
.border-blue-500 { border-color: #3b82f6; }
.w-32 { width: 8rem; }
.h-32 { height: 8rem; }
.cursor-zoom-in { cursor: zoom-in; }
</style>