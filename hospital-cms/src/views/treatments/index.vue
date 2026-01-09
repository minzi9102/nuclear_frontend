<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Search, Refresh, Plus, Delete, Timer, Calendar, EditPen, Picture, Download, Male, Female } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { TARGET_OPTIONS } from '../../constants/treatment'; // 引入部位选项
import dayjs from 'dayjs'; // 建议安装: npm install dayjs

// 组件引入
import TreatmentCreateDialog from '../../components/TreatmentCreateDialog.vue'

// API 引入
import { getTreatmentList, deleteTreatment, getExportUrl } from '../../api/treatment'
import { searchPatients } from '../../api/patient'
import type { Treatment, StrapiMedia, Patient } from '../../api/types'

// 常量引入
import { TREATMENT_TARGET_MAP } from '../../constants/treatment';

// Base URL
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

// --- 列表数据 ---
const tableData = ref<Treatment[]>([])
const loading = ref(false)
// --- 状态管理 ---
// 分页状态
const pagination = reactive({
  page: 1,
  pageSize: 10
})

// ⚠️ 修改筛选状态定义
const filters = reactive({
  patientId: '', // [修改] 从 patientName 改为 patientId (存储 documentId)
  target: '',
  dateRange: null as [Date, Date] | null 
})

// 总数 (用于控制导出按钮禁用状态)
const total = ref(0)

// 远程搜索相关状态
const searchLoading = ref(false)
const patientOptions = ref<Patient[]>([])
// 用于计算年龄的简单工具函数
const calculateAge = (birthday: string) => {
  if (!birthday) return '-'
  const age = new Date().getFullYear() - new Date(birthday).getFullYear()
  return age >= 0 ? age : '-'
}

// --- 响应式判断 ---
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}
// --- 新增：导出状态 ---
const exportLoading = ref(false)
// --- 组件引用 ---
const treatmentCreateRef = ref<InstanceType<typeof TreatmentCreateDialog> | null>(null)

// --- 工具方法 ---
const getThumbnailUrl = (img: StrapiMedia | undefined) => {
  if (!img || !img.url) return '' // 这一行已经处理了 undefined 的情况
  const url = img.formats?.thumbnail?.url || img.url
  return url.startsWith('http') ? url : `${BASE_URL}${url}`
}

/**
 * 📷 获取某条记录的所有图片（兼容新旧结构）
 * 优先从 details 组件中提取所有图片，如果没有则取旧的 Images 字段
 */
const getTreatmentImages = (row: Treatment): StrapiMedia[] => {
  // 1. 尝试从新结构 details 中提取
  if (row.details && row.details.length > 0) {
    const allPhotos: StrapiMedia[] = []
    row.details.forEach(detail => {
      if (detail.photos && detail.photos.length > 0) {
        allPhotos.push(...detail.photos)
      }
    })
    if (allPhotos.length > 0) return allPhotos
  }
  
  // 2. 回退到旧结构 Images
  return row.Images || []
}

/**
 * 🏗️ 构建 Strapi 查询参数
 * 将前端的 UI 筛选状态转换为后端 API 需要的 filters 对象
 */
const buildApiParams = () => {
  const apiFilters: any = {}

  // [修改] 1. 患者精确筛选 (改用 documentId)
  if (filters.patientId) {
    apiFilters['filters[patient][documentId][$eq]'] = filters.patientId
  }

  // 2. 日期范围筛选 (创建时间)
  if (filters.dateRange && filters.dateRange.length === 2) {
    const start = dayjs(filters.dateRange[0]).startOf('day').toISOString()
    const end = dayjs(filters.dateRange[1]).endOf('day').toISOString()
    
    apiFilters['filters[createdAt][$gte]'] = start
    apiFilters['filters[createdAt][$lte]'] = end
  }

  // 3. 治疗部位筛选 (难点：新旧数据混合查询)
  // 逻辑：Target = "Face"  =>  (Legacy.target == "Face") OR (New.details.part == "Face")
  if (filters.target) {
    apiFilters['filters[$or][0][target][$eq]'] = filters.target
    apiFilters['filters[$or][1][details][part][$eq]'] = filters.target
  }
  
  // 保留原来的 treatmentNo 搜索吗？
  // 如果产品需求移除了它，这里就不加。如果需要保留作为备用，可以加在这里。

  return apiFilters
}

// --- 新增：处理导出 ---
// 2. 导出处理
const handleExport = () => {
  if (total.value === 0) return // 防御性检查

  ElMessageBox.confirm(
    `当前筛选命中 ${total.value} 条记录，确认导出吗？`,
    '导出确认',
    {
      confirmButtonText: '确认导出',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    // 逻辑与 fetchData 完全一致
    const filterParams = buildApiParams()
    const url = getExportUrl(filterParams)
    
    // 触发下载
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = url
    document.body.appendChild(iframe)
    
    ElMessage.success('导出任务已开始，请留意浏览器下载')
    setTimeout(() => document.body.removeChild(iframe), 5000)
  })
}

// 防抖计时器
let searchTimer: ReturnType<typeof setTimeout> | null = null

const searchPatientMethod = (query: string) => {
  if (!query) {
    patientOptions.value = []
    return
  }
  
  searchLoading.value = true
  
  if (searchTimer) clearTimeout(searchTimer)
  
  searchTimer = setTimeout(async () => {
    try {
      const res: any = await searchPatients(query)
      
      // 🔍 调试：建议打开控制台确认一下真实结构
      // console.log('API Response:', res) 

      // 🛠️ 修复：兼容 Strapi v5 的嵌套结构
      // 如果 res.data 是对象且包含 data 数组，说明是 { data: [...], meta: ... } 结构
      if (res.data && Array.isArray(res.data.data)) {
        patientOptions.value = res.data.data
      } 
      // 兼容某些拦截器可能已经解了一层包的情况
      else if (Array.isArray(res.data)) {
        patientOptions.value = res.data
      } 
      else {
        patientOptions.value = []
      }
    } catch (error) {
      console.error('搜索患者失败', error)
      patientOptions.value = []
    } finally {
      searchLoading.value = false
    }
  }, 50)
}
// --- 核心逻辑 ---

// 1. 获取列表
const fetchData = async () => {
  loading.value = true
  try {
    // 获取筛选参数
    const filterParams = buildApiParams()

    const apiParams: any = {
      'pagination[page]': pagination.page,      // 改用 pagination 对象
      'pagination[pageSize]': pagination.pageSize,
      populate: {
        patient: true,
        Images: true,
        details: { populate: 'photos' }
      },
      sort: 'updatedAt:desc',
      ...filterParams // 展开筛选参数
    }

    const res: any = await getTreatmentList(apiParams)
    if (res.data) {
      tableData.value = res.data.data || res.data || []
      total.value = res.data.meta?.pagination?.total || 0
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 2. 打开新建弹窗
const handleCreate = () => {
  treatmentCreateRef.value?.open()
}
// 🟢 3. 新增：处理编辑
const handleEdit = (row: Treatment) => {
  if (row.patient) {
    // 传入 patient 对象和当前 treatment 对象，触发编辑回显
    treatmentCreateRef.value?.open(row.patient, row)
  } else {
    ElMessage.warning('该记录未关联有效患者，无法编辑')
  }
}

// 4. 删除
const handleDelete = (row: Treatment) => {
  ElMessageBox.confirm('确定删除吗?', '警告', { type: 'warning' })
    .then(async () => {
      await deleteTreatment(row.documentId)
      ElMessage.success('删除成功')
      fetchData()
    })
}

// 3. 重置筛选
const handleReset = () => {
  filters.patientId = ''
  filters.target = ''
  filters.dateRange = null
  pagination.page = 1 // 重置回第一页
  fetchData()
}
// 4. 搜索触发
const handleSearch = () => {
  pagination.page = 1
  fetchData()
}
const handleCurrentChange = (val: number) => { pagination.page = val; fetchData() }

// 生命周期
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  fetchData()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="app-container">
    <el-card shadow="never" :body-style="{ padding: isMobile ? '10px' : '20px' }">
      <div class="filter-wrapper-layered" :class="{ 'is-mobile': isMobile }">
        
        <div class="operation-row">
          <div class="left-panel">
            <span class="page-title">治疗记录管理</span>
          </div>
          <div class="right-panel">
            <el-button 
              type="success" 
              :icon="Download" 
              :disabled="total === 0" 
              plain
              :size="isMobile ? 'small' : 'default'"
              @click="handleExport"
            >
              {{ isMobile ? '导出' : `导出结果 (${total})` }}
            </el-button>

            <el-button 
              type="primary" 
              :icon="Plus" 
              :size="isMobile ? 'small' : 'default'"
              @click="handleCreate"
            >
              新建记录
            </el-button>
          </div>
        </div>

        <div class="search-row">
          <div class="search-inputs">
            <el-select
              v-model="filters.patientId"
              filterable
              remote
              clearable
              placeholder="搜姓名或ID"
              :remote-method="searchPatientMethod"
              :loading="searchLoading"
              class="filter-item w-name"
              @change="handleSearch"
            >
              <el-option
                v-for="item in patientOptions"
                :key="item.documentId"
                :label="item.Name"
                :value="item.documentId"
              >
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                  <span style="font-weight: bold;">{{ item.Name }}</span>
                  <span style="color: #8492a6; font-size: 12px; transform: scale(0.9);">
                    <el-icon v-if="item.Gender === 'male'" style="color: #409EFF; margin-right:2px; vertical-align: middle;"><Male /></el-icon>
                    <el-icon v-else style="color: #F56C6C; margin-right:2px; vertical-align: middle;"><Female /></el-icon>
                    {{ calculateAge(item.Birthday) }}岁
                  </span>
                </div>
              </el-option>
            </el-select>

            <el-select 
              v-model="filters.target" 
              placeholder="治疗部位" 
              clearable 
              class="filter-item w-target"
              @change="handleSearch"
            >
              <el-option 
                v-for="opt in TARGET_OPTIONS" 
                :key="opt.value" 
                :label="opt.label" 
                :value="opt.value" 
              />
            </el-select>

            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              class="filter-item w-date"
              value-format="YYYY-MM-DD"
              @change="handleSearch"
            />
          </div>

          <div class="search-btns">
            <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          </div>
        </div>

      </div>

      <div v-loading="loading" class="data-wrapper">
        
        <el-table v-if="!isMobile" :data="tableData" border style="margin-top: 20px" row-key="id">
          
          <el-table-column type="expand">
            <template #default="{ row }">
              <div class="expand-container">
                <div v-if="row.details && row.details.length > 0" class="lesion-list">
                  <div v-for="lesion in row.details" :key="lesion.id" class="lesion-item">
                    <div class="lesion-gallery">
                      <div v-if="lesion.photos && lesion.photos.length > 0" class="photo-grid">
                        <el-image 
                          v-for="photo in lesion.photos"
                          :key="photo.id"
                          class="lesion-img"
                          :src="getThumbnailUrl(photo)"
                          :preview-src-list="lesion.photos.map((p: StrapiMedia) => getThumbnailUrl(p).replace('thumbnail_', ''))"
                          preview-teleported
                          fit="cover"
                        />
                      </div>
                      <div v-else class="no-photo-placeholder">
                        <el-icon><Picture /></el-icon> 暂无影像
                      </div>
                    </div>
                    
                    <div class="lesion-meta">
                      <div class="meta-header">
                        <span class="part-badge">{{ TREATMENT_TARGET_MAP[lesion.part] || lesion.part }}</span>
                        <el-tag 
                          v-if="lesion.duration || row.duration" 
                          size="small" 
                          :type="lesion.duration ? 'warning' : 'info'" 
                          :effect="lesion.duration ? 'light' : 'plain'"
                          round
                          class="duration-tag"
                        >
                          <el-icon><Timer /></el-icon> 
                          {{ lesion.duration || row.duration }}h
                        </el-tag>
                      </div>
                      <div v-if="lesion.notes" class="meta-notes">
                        <el-icon><EditPen /></el-icon> {{ lesion.notes }}
                      </div>
                      <div v-else class="text-gray-300 text-xs mt-2">无备注</div>
                    </div>
                  </div>
                </div>

                <div v-else class="legacy-notice">
                  此记录为旧版本格式，无详细病灶分项数据。
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="treatmentNo" label="编号" width="120">
            <template #default="{ row }">
              <el-tag>{{ row.treatmentNo }}</el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="影像概览" width="120">
            <template #default="{ row }">
              <div v-if="getTreatmentImages(row).length > 0" style="display: flex; align-items: center;">
                <el-image 
                  style="width: 40px; height: 40px; border-radius: 4px; margin-right: 5px;"
                  :src="getThumbnailUrl(getTreatmentImages(row)[0])"
                  :preview-src-list="getTreatmentImages(row).map(img => getThumbnailUrl(img).replace('thumbnail_', ''))"
                  preview-teleported
                  fit="cover"
                />
                <span v-if="getTreatmentImages(row).length > 1" style="font-size: 12px; color: #909399;">
                  +{{ getTreatmentImages(row).length - 1 }}
                </span>
              </div>
              <span v-else style="color: #dcdfe6;">-</span>
            </template>
          </el-table-column>

          <el-table-column label="关联患者" width="150">
            <template #default="{ row }">
              <span v-if="row.patient">{{ row.patient.Name }}</span>
              <el-tag v-else type="warning">无关联</el-tag>
            </template>
          </el-table-column>

          <el-table-column label="涉及部位">
            <template #default="{ row }">
              <div v-if="row.details && row.details.length > 0" class="flex-tags">
                 <el-tag v-for="detail in row.details" :key="detail.id" size="small" type="success" style="margin-right: 4px;">
                   {{ TREATMENT_TARGET_MAP[detail.part] || detail.part }}
                 </el-tag>
              </div>
              <div v-else-if="row.target">
                 {{ TREATMENT_TARGET_MAP[row.target] || row.target }}
              </div>
              <span v-else class="text-gray-300">-</span>
            </template>
          </el-table-column>

          <el-table-column label="总时长" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.duration" type="info" effect="plain">
                {{ row.duration }} 小时
              </el-tag>
              <span v-else class="text-gray-300">-</span>
            </template>
          </el-table-column>

          <el-table-column prop="createdAt" label="创建时间">
            <template #default="{ row }">
              {{ new Date(row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>

          <el-table-column label="操作" fixed="right" width="100" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="EditPen" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-else class="mobile-list">
          <div v-if="tableData.length === 0" class="empty-text">暂无数据</div>
          
          <div v-for="item in tableData" :key="item.id" class="mobile-card">
            <div class="card-header">
              <span class="card-no">{{ item.treatmentNo }}</span>
              <div class="header-right">
                <span class="patient-name" v-if="item.patient">{{ item.patient.Name }}</span>
                <el-tag v-if="item.duration" size="small" type="info" effect="plain" style="margin-left: 8px;">
                   {{ item.duration }}h
                </el-tag>
              </div>
            </div>
            
            <div class="card-body-wrapper">
              
              <template v-if="item.details && item.details.length > 0">
                <div v-for="(lesion, idx) in item.details" :key="lesion.id" class="lesion-stack-item" :class="{'no-border': idx === item.details.length - 1}">
                  <div class="stack-thumb-wrapper">
                    <el-image 
                      v-if="lesion.photos && lesion.photos.length > 0"
                      class="stack-thumb"
                      :src="getThumbnailUrl(lesion.photos[0])"
                      :preview-src-list="lesion.photos.map(p => getThumbnailUrl(p).replace('thumbnail_', ''))"
                      preview-teleported
                      fit="cover"
                    />
                    <div v-else class="stack-placeholder">无图</div>
                    <div v-if="lesion.photos && lesion.photos.length > 1" class="stack-count">
                      +{{ lesion.photos.length }}
                    </div>
                  </div>

                  <div class="stack-info">
                    <div class="stack-row-main">
                      <span class="stack-part">{{ TREATMENT_TARGET_MAP[lesion.part] || lesion.part }}</span>
                      <span 
                        v-if="lesion.duration || item.duration" 
                        class="stack-duration"
                        :class="{ 'is-special': lesion.duration }"
                      >
                        {{ lesion.duration || item.duration }}h
                      </span>
                    </div>
                    <div v-if="lesion.notes" class="stack-note">
                      {{ lesion.notes }}
                    </div>
                  </div>
                </div>
              </template>

              <template v-else>
                 <div class="card-body-legacy">
                    <div class="img-wrapper">
                       <el-image 
                        v-if="getTreatmentImages(item).length > 0"
                        class="mobile-thumb"
                        :src="getThumbnailUrl(getTreatmentImages(item)[0])"
                        :preview-src-list="getTreatmentImages(item).map(img => getThumbnailUrl(img).replace('thumbnail_', ''))"
                        preview-teleported
                        fit="cover"
                      />
                      <div v-else class="img-placeholder">无图</div>
                      <div v-if="getTreatmentImages(item).length > 1" class="img-count">
                        +{{ getTreatmentImages(item).length }}
                      </div>
                    </div>

                    <div class="info-wrapper">
                      <div class="info-row">
                        <span class="label">部位:</span>
                        <span class="value">
                          {{ item.target ? (TREATMENT_TARGET_MAP[item.target] || item.target) : '-' }}
                        </span>
                      </div>
                      <div class="info-row warning">
                        (旧版数据)
                      </div>
                    </div>
                 </div>
              </template>

            </div>

            <div class="card-footer">
              <div class="time">
                <el-icon><Calendar /></el-icon>
                {{ new Date(item.createdAt).toLocaleDateString() }}
              </div>
              <div class="footer-actions">
                <el-button type="primary" link size="small" :icon="EditPen" @click="handleEdit(item)">
                  编辑
                </el-button>
                <el-button type="danger" link size="small" :icon="Delete" @click="handleDelete(item)">
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <div class="pagination-container">
        <el-pagination 
          v-model:current-page="pagination.page" 
          v-model:page-size="pagination.pageSize" 
          :total="total" 
          layout="total, prev, pager, next"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <treatment-create-dialog 
      ref="treatmentCreateRef" 
      @success="fetchData" 
    />
  </div>
</template>

<style scoped>
.app-container { padding: 20px; }

.filter-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
}

.filter-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}

.filter-item {
  margin-bottom: 5px; /* 防止折行时挤压 */
}

/* 响应式容器调整 */
@media screen and (max-width: 768px) {
  .app-container { padding: 10px; }
}

/* 顶部过滤器 */
.filter-container { 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  gap: 15px;
}
.search-input { width: 300px; }

/* 移动端过滤器适配 */
.filter-container.is-mobile {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}
.filter-container.is-mobile .search-input {
  width: 100%;
}
.filter-container.is-mobile .action-section {
  display: flex;
  justify-content: space-between;
}

/* --- PC Expand Styles (方案 B) --- */
.expand-container {
  padding: 10px 20px;
  background-color: #f8f9fa;
  border-radius: 4px;
}
.lesion-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.lesion-item {
  display: flex;
  gap: 20px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #e4e7ed;
}
.lesion-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

/* PC Gallery Grid */
.lesion-gallery {
  width: 200px; /* 固定宽度，左图右文 */
  flex-shrink: 0;
}
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.lesion-img {
  width: 100%;
  aspect-ratio: 1; /* 正方形 */
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}
.no-photo-placeholder {
  width: 100%;
  height: 60px;
  background: #fff;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 13px;
  gap: 5px;
}
/* 🟢 新增：按钮组右对齐容器 */
.footer-actions {
  display: flex;
  gap: 8px; /* 按钮间距 */
}

/* PC Meta Info */
.lesion-meta {
  flex: 1;
}
.meta-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.part-badge {
  font-weight: bold;
  font-size: 15px;
  color: #303133;
}
.meta-notes {
  font-size: 13px;
  color: #606266;
  background: #fff;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.4;
}
.legacy-notice {
  text-align: center;
  color: #909399;
  font-style: italic;
  padding: 10px;
}

/* --- Mobile Stack Styles (方案 C) --- */
.card-body-wrapper {
  margin-bottom: 12px;
}

/* New Data: Vertical Stack */
.lesion-stack-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #f2f6fc;
}
.lesion-stack-item.no-border {
  border-bottom: none;
  padding-bottom: 0;
}

.stack-thumb-wrapper {
  position: relative;
  width: 70px;
  height: 70px;
  flex-shrink: 0;
}
.stack-thumb {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}
.stack-placeholder {
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #c0c4cc;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}
.stack-count {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0,0,0,0.6);
  color: white;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px 0 6px 0;
}

.stack-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 4px;
}
.stack-row-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.stack-part {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}
.stack-duration {
  font-size: 12px;
  padding: 2px 8px; /* 稍微加宽一点 */
  border-radius: 10px;
  
  /* 默认样式 (灰色 - 对应继承总时长) */
  color: #909399;
  background: #f4f4f5;
  border: 1px solid transparent; /* 占位，防止切换时抖动 */
}
.stack-note {
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
  background: #fafafa;
  padding: 4px 8px;
  border-radius: 4px;
  margin-top: 2px;
}
.stack-duration.is-special {
  background-color: #fffbeb; /* 浅黄色背景 */
  color: #b45309;            /* 深琥珀色文字 */
  border: 1px solid #fcd34d; /* 增加边框增强辨识度 */
  font-weight: 500;
}
/* Legacy Data: Horizontal */
.card-body-legacy {
  display: flex;
  gap: 12px;
}
.header-right {
  display: flex;
  align-items: center;
}
.patient-name {
  font-size: 13px;
  color: #409EFF;
  font-weight: 500;
}

/* 移动端卡片列表 */
.mobile-list {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f2f6fc;
}
.card-no {
  font-weight: bold;
  font-size: 16px;
  color: #303133;
}

.img-wrapper {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}
.mobile-thumb {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}
.img-placeholder {
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border-radius: 6px;
}
.img-count {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 10px;
  padding: 1px 4px;
  border-top-left-radius: 4px;
  border-bottom-right-radius: 6px;
}

.info-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}
.info-row {
  display: flex;
  align-items: center;
  font-size: 14px;
}
.info-row .label {
  color: #909399;
  margin-right: 8px;
  width: 40px;
}
.info-row .value {
  color: #606266;
  font-weight: 500;
  /* 增加这一行，防止多部位文本过长 */
  word-break: break-all; 
}
.info-row .value.link { color: #409EFF; }
.info-row .value.warning { color: #E6A23C; }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}
.card-footer .time {
  display: flex;
  align-items: center;
  gap: 4px;
}

.empty-text {
  text-align: center;
  color: #909399;
  padding: 20px 0;
  font-size: 14px;
}

/* 分页适配 */
.pagination-container { 
  margin-top: 20px; 
  display: flex; 
  justify-content: flex-end; 
}
.pagination-container.is-mobile {
  justify-content: center;
  margin-top: 15px;
}

/* PC端 Tag 容器 */
.flex-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

:deep(.el-tag--warning.el-tag--light) {
  background-color: #fffbeb;
  border-color: #fcd34d;
  color: #b45309;
}

/* 控件宽度控制 */
.w-name { width: 160px; }
.w-target { width: 140px; }
.w-date { width: 320px !important; } /* DatePicker 默认宽度较宽，强制覆盖 */

.action-section {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

/* 移动端适配 */
.filter-wrapper.is-mobile {
  flex-direction: column;
}
.filter-wrapper.is-mobile .filter-controls {
  width: 100%;
  flex-direction: column;
}
.filter-wrapper.is-mobile .filter-item,
.filter-wrapper.is-mobile .w-name,
.filter-wrapper.is-mobile .w-target,
.filter-wrapper.is-mobile .w-date {
  width: 100% !important;
}
.filter-wrapper.is-mobile .action-section {
  width: 100%;
  justify-content: space-between;
}
.filter-wrapper.is-mobile .action-section .el-button {
  flex: 1;
}

.filter-wrapper-layered {
  display: flex;
  flex-direction: column;
  gap: 15px; /* 两行之间的垂直间距 */
  margin-bottom: 20px;
}

/* 第一行：操作层 */
.operation-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5; /* 增加分割线 */
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  /* 左侧加个竖条装饰，增加层次感 */
  border-left: 4px solid #409EFF;
  padding-left: 10px;
}

.right-panel {
  display: flex;
  gap: 10px;
}

/* 第二行：筛选层 */
.search-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.search-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1; /* 占据左侧剩余空间 */
}

.search-btns {
  display: flex;
  gap: 10px;
  flex-shrink: 0; /* 防止按钮被挤压 */
}

.filter-item {
  /* 移除之前的 margin-bottom，改用 gap 控制 */
  margin-bottom: 0; 
}

/* 控件宽度定义 */
.w-name { width: 220px; } /*稍微加宽一点，显示名字更全*/
.w-target { width: 140px; }
.w-date { width: 320px !important; }

/* --- 移动端适配 --- */
.filter-wrapper-layered.is-mobile .operation-row {
  /* 移动端标题可以稍微小一点，或者隐藏标题只留按钮 */
  padding-bottom: 10px;
}
.filter-wrapper-layered.is-mobile .page-title {
  font-size: 16px;
}

.filter-wrapper-layered.is-mobile .search-row {
  flex-direction: column;
  align-items: stretch; /* 拉伸占满宽度 */
}

.filter-wrapper-layered.is-mobile .search-inputs {
  flex-direction: column;
}

.filter-wrapper-layered.is-mobile .w-name,
.filter-wrapper-layered.is-mobile .w-target,
.filter-wrapper-layered.is-mobile .w-date {
  width: 100% !important; /* 移动端强制 100% 宽 */
}

.filter-wrapper-layered.is-mobile .search-btns {
  display: flex;
  /* 移动端按钮并排撑满 */
}
.filter-wrapper-layered.is-mobile .search-btns .el-button {
  flex: 1;
}
</style>