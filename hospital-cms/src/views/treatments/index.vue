<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { Search, Refresh, Plus, Delete, Timer, Calendar } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 组件引入
import TreatmentCreateDialog from '../../components/TreatmentCreateDialog.vue'

// API 引入
import { getTreatmentList, deleteTreatment } from '../../api/treatment'
import type { Treatment, StrapiMedia, LesionDetail } from '../../api/types'

// 常量引入
import { TREATMENT_TARGET_MAP } from '../../constants/treatment';

// Base URL
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1337'

// --- 列表数据 ---
const tableData = ref<Treatment[]>([])
const loading = ref(false)
const total = ref(0)
const queryParams = reactive({
  page: 1,
  pageSize: 10,
  treatmentNo: ''
})

// --- 响应式判断 ---
const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

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

// --- 核心逻辑 ---

// 1. 获取列表
const fetchData = async () => {
  loading.value = true
  try {
    const apiParams: any = {
      'pagination[page]': queryParams.page,
      'pagination[pageSize]': queryParams.pageSize,
      // 🟢 核心修改：深度 Populate 以获取 details 组件及其图片
      populate: {
        patient: true,
        Images: true, // 兼容旧数据
        details: {
          populate: 'photos'
        }
      },
      sort: 'createdAt:desc',
    }
    if (queryParams.treatmentNo) {
      apiParams['filters[treatmentNo][$contains]'] = queryParams.treatmentNo
    }

    const res: any = await getTreatmentList(apiParams)
    if (res.data) {
      tableData.value = res.data.data || res.data || []
      total.value = res.data.meta?.pagination?.total || res.meta?.pagination?.total || 0
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

// 3. 删除
const handleDelete = (row: Treatment) => {
  ElMessageBox.confirm('确定删除吗?', '警告', { type: 'warning' })
    .then(async () => {
      await deleteTreatment(row.documentId)
      ElMessage.success('删除成功')
      fetchData()
    })
}

const handleSearch = () => { queryParams.page = 1; fetchData() }
const handleCurrentChange = (val: number) => { queryParams.page = val; fetchData() }

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
      <div class="filter-container" :class="{ 'is-mobile': isMobile }">
        <div class="search-section">
          <el-input 
            v-model="queryParams.treatmentNo" 
            placeholder="搜索治疗编号..." 
            class="search-input" 
            :size="isMobile ? 'default' : 'large'"
            clearable 
            @clear="handleSearch" 
            @keyup.enter="handleSearch"
          >
            <template #append><el-button :icon="Search" @click="handleSearch" /></template>
          </el-input>
        </div>
        <div class="action-section">
          <el-button type="primary" :icon="Plus" :size="isMobile ? 'default' : 'large'" @click="handleCreate">
            新建治疗记录
          </el-button>
          <el-button :icon="Refresh" circle :size="isMobile ? 'default' : 'large'" @click="fetchData" />
        </div>
      </div>

      <div v-loading="loading" class="data-wrapper">
        
        <el-table v-if="!isMobile" :data="tableData" border style="margin-top: 20px">
          <el-table-column prop="treatmentNo" label="编号" width="120">
            <template #default="{ row }">
              <el-tag>{{ row.treatmentNo }}</el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="影像资料" width="120">
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

          <el-table-column label="部位">
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

          <el-table-column label="时长" width="100" align="center">
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

          <el-table-column label="操作" fixed="right" width="100">
            <template #default="{ row }">
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-else class="mobile-list">
          <div v-if="tableData.length === 0" class="empty-text">暂无数据</div>
          <div v-for="item in tableData" :key="item.id" class="mobile-card">
            <div class="card-header">
              <span class="card-no">{{ item.treatmentNo }}</span>
              <el-tag v-if="item.duration" size="small" type="info" effect="plain">
                <el-icon><Timer /></el-icon> {{ item.duration }}h
              </el-tag>
            </div>
            
            <div class="card-body">
              <div class="img-wrapper">
                 <el-image 
                  v-if="getTreatmentImages(item).length > 0"
                  class="mobile-thumb"
                  :src="getThumbnailUrl(getTreatmentImages(item)[0])"
                  :preview-src-list="getTreatmentImages(item).map(img => getThumbnailUrl(img).replace('thumbnail_', ''))"
                  preview-teleported
                  fit="cover"
                >
                  <template #error><div class="img-placeholder">无图</div></template>
                </el-image>
                <div v-else class="img-placeholder">无图</div>
                
                <div v-if="getTreatmentImages(item).length > 1" class="img-count">
                  +{{ getTreatmentImages(item).length }}
                </div>
              </div>

              <div class="info-wrapper">
                <div class="info-row">
                  <span class="label">患者:</span>
                  <span class="value link" v-if="item.patient">{{ item.patient.Name }}</span>
                  <span class="value warning" v-else>未关联</span>
                </div>
                <div class="info-row">
                  <span class="label">部位:</span>
                  <div class="value">
                    <template v-if="item.details && item.details.length > 0">
                      <span v-for="(d, idx) in item.details" :key="idx">
                        {{ TREATMENT_TARGET_MAP[d.part] || d.part }}
                        <span v-if="idx < item.details.length - 1">, </span>
                      </span>
                    </template>
                    <template v-else>
                      {{ item.target ? (TREATMENT_TARGET_MAP[item.target] || item.target) : '-' }}
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <div class="time">
                <el-icon><Calendar /></el-icon>
                {{ new Date(item.createdAt).toLocaleDateString() }}
              </div>
              <el-button type="danger" link size="small" :icon="Delete" @click="handleDelete(item)">
                删除
              </el-button>
            </div>
          </div>
        </div>

      </div>

      <div class="pagination-container" :class="{ 'is-mobile': isMobile }">
        <el-pagination 
          v-model:current-page="queryParams.page" 
          v-model:page-size="queryParams.pageSize" 
          :total="total" 
          :pager-count="5"
          :layout="isMobile ? 'prev, pager, next' : 'total, prev, pager, next, sizes'"
          :small="isMobile"
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

.card-body {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
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
</style>