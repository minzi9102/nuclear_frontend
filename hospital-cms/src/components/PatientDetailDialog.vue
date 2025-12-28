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
            {{ calculateAge(patientData.Birthday) }} 岁 | 生日：{{ patientData.Birthday }}
          </p>
        </div>
        <div class="header-right">
            <el-tag size="large" type="success" effect="dark" round>
                共 {{ patientData.treatments?.length || 0 }} 次治疗
            </el-tag>
        </div>
      </div>

      <div v-if="patientData.past_treatments?.length" class="history-box">
        <span class="label">既往病史：</span>
        <span class="value">
            {{ patientData.past_treatments.map((key: string) => (PAST_TREATMENT_MAP as any)[key] || key).join('、') }}
        </span>
      </div>

      <el-divider content-position="left">治疗记录时间轴</el-divider>

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
                  <span class="index-badge">{{ patientData.treatments.length - Number(index) }}</span>
                  <span class="treatment-no">{{ treatment.treatmentNo }}</span>
                </div>
                <div class="header-sub">
                  <el-tag size="small" effect="plain">
                      {{ (TREATMENT_TARGET_MAP as any)[treatment.target] || treatment.target }}
                  </el-tag>
                  <span class="date-text">
                      {{ new Date(treatment.createdAt).toLocaleDateString() }}
                  </span>
                </div>
              </div>
            </template>

            <div class="collapse-body">
              
              <div v-if="treatment.Images && treatment.Images.length > 0" class="image-wrapper">
                 <el-carousel 
                   :autoplay="false" 
                   trigger="click" 
                   indicator-position="outside" 
                   height="300px"
                   class="custom-carousel"
                 >
                    <el-carousel-item v-for="img in treatment.Images" :key="img.documentId || img.url">
                      <el-image 
                        :src="getFullUrl(img.url)" 
                        fit="contain" 
                        class="carousel-image"
                        :preview-src-list="treatment.Images.map((i: any) => getFullUrl(i.url))"
                        preview-teleported
                        hide-on-click-modal
                      >
                         <template #error>
                           <div class="image-error">
                             <el-icon><Picture /></el-icon>
                             <span>加载失败</span>
                             <span style="font-size:10px">{{ img.url }}</span>
                           </div>
                         </template>
                      </el-image>
                    </el-carousel-item>
                  </el-carousel>
                  <div class="carousel-tip">
                      <el-icon><DArrowLeft /></el-icon> 左右滑动查看影像 <el-icon><DArrowRight /></el-icon>
                  </div>
              </div>
              
              <el-empty v-else description="本次治疗未上传影像" :image-size="60" class="mini-empty" />
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <el-empty v-if="!patientData.treatments?.length" description="暂无治疗记录" />
    </div>

    <details class="debug-zone">
      <summary>🐞 开发者调试信息 (点我展开)</summary>
      <pre>{{ patientData }}</pre>
    </details>

  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loading, Male, Female, DArrowLeft, DArrowRight, Picture } from '@element-plus/icons-vue'
import { getPatientList } from '../api/patient'
import { ElMessage } from 'element-plus'
import { TREATMENT_TARGET_MAP, PAST_TREATMENT_MAP } from '../constants/treatment'

const visible = ref(false)
const loading = ref(false)
const patientData = ref<any>(null)
const activeNames = ref<number[]>([0])

// 计算年龄
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

// 获取完整图片路径
const getFullUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  // 移除可能多余的斜杠
  const baseUrl = import.meta.env.VITE_API_URL || ''
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const cleanUrl = url.startsWith('/') ? url : `/${url}`
  return cleanBase + cleanUrl
}

const open = async (documentId: string) => {
  console.log('🚀 打开弹窗，请求ID:', documentId)
  visible.value = true
  loading.value = true
  patientData.value = null
  activeNames.value = [0] 

  try {
    // 🔥 关键：确保这里请求了 Images
    const res: any = await getPatientList({
      filters: { documentId: { $eq: documentId } },
      populate: {
        treatments: {
            populate: '*',       // 必须请求 Images
            sort: 'createdAt:desc'
        }
      }
    } as any)

    console.log('📡 API返回原始数据:', res)

    // 解包逻辑
    let data = null
    if (res.data && res.data.data && Array.isArray(res.data.data)) {
        data = res.data.data[0]
    } else if (res.data && Array.isArray(res.data)) {
        data = res.data[0]
    }

    if (data) {
        patientData.value = data
        console.log('✅ 患者数据已设定:', patientData.value)
    } else {
        throw new Error('未找到数据')
    }

  } catch (error) {
    console.error('❌ 获取详情失败:', error)
    ElMessage.error('数据同步失败')
  } finally {
    loading.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
/* -------- 纯 CSS 样式区 (不依赖 Tailwind) -------- */

.loading-state {
  padding: 40px;
  text-align: center;
  color: #909399;
}
.loading-state .el-icon {
  font-size: 32px;
  color: #409EFF;
  margin-bottom: 10px;
}

/* 1. 患者头部卡片 */
.patient-header-card {
  background-color: #ecf5ff; /* 浅蓝色背景 */
  border: 1px solid #d9ecff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.patient-name {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-male { color: #409EFF; }
.icon-female { color: #F56C6C; }

.patient-meta {
  font-size: 14px;
  color: #606266;
  margin: 5px 0 0 0;
}

/* 2. 既往病史 */
.history-box {
  background-color: #f4f4f5;
  border: 1px dashed #dcdfe6;
  padding: 10px 15px;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;
  margin-bottom: 20px;
}
.history-box .label {
  font-weight: bold;
  color: #303133;
}

/* 3. 自定义 Collapse 样式 (让它像卡片) */
.custom-collapse {
  border: none;
}
.custom-collapse-item {
  margin-bottom: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  overflow: hidden;
}

/* 标题栏布局 */
.collapse-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 10px;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 10px;
}

.index-badge {
  background-color: #ecf5ff;
  color: #409EFF;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.treatment-no {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.header-sub {
  display: flex;
  align-items: center;
  gap: 10px;
}
.date-text {
  font-size: 12px;
  color: #909399;
}

/* 内容区 */
.collapse-body {
  padding: 10px;
  background-color: #fafafa;
}

.image-wrapper {
  background-color: #000;
  border-radius: 6px;
  padding: 5px;
}

.custom-carousel {
  background-color: #000;
}

.carousel-image {
  width: 100%;
  height: 100%;
}

.image-error {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  background-color: #333;
}

.carousel-tip {
  text-align: center;
  color: #909399;
  font-size: 12px;
  margin-top: 5px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
}

.mini-empty {
  padding: 10px 0;
}

/* 调试区域样式 */
.debug-zone {
  margin-top: 30px;
  border-top: 1px solid #eee;
  padding-top: 10px;
  color: #F56C6C;
  font-size: 12px;
}
.debug-zone summary {
  cursor: pointer;
  font-weight: bold;
}
.debug-zone pre {
  background: #fff0f0;
  padding: 10px;
  overflow: auto;
  max-height: 200px;
}
</style>