<script setup lang="ts">
import { ref } from 'vue'
import { Search, Plus, Filter, Refresh, Finished } from '@element-plus/icons-vue'
import { PAST_TREATMENT_OPTIONS } from '../../../constants/treatment'

// Props: 接收父组件的响应式对象
defineProps<{
  keyword: string
  advancedForm: any
}>()

// Emits: 更新数据需要通知父组件
const emit = defineEmits(['update:keyword', 'search', 'reset', 'create'])

const drawerVisible = ref(false)
const isMobile = ref(window.innerWidth <= 768)

const handleKeywordInput = (val: string) => emit('update:keyword', val)
const onSearch = () => emit('search')
const onReset = () => emit('reset')
const onAdvancedSearch = () => { drawerVisible.value = false; emit('search') }
</script>

<template>
  <div class="header-actions mb-6">
    <div class="search-box">
      <el-button size="large" :icon="Filter" @click="drawerVisible = true">高级搜索</el-button>
      <el-input 
        :model-value="keyword" 
        @input="handleKeywordInput"
        placeholder="输入患者姓名进行搜索..." 
        size="large" 
        clearable 
        @clear="onSearch" 
        @keyup.enter="onSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" :icon="Search" size="large" @click="onSearch">搜索</el-button>
    </div>
    <el-button type="success" :icon="Plus" size="large" @click="emit('create')" class="create-btn">新建患者</el-button>
  </div>

  <el-drawer v-model="drawerVisible" title="🔍 高级搜索" :size="isMobile ? '100%' : '380px'" destroy-on-close>
     <el-form :model="advancedForm" label-position="top" class="p-2">
       <el-form-item label="患者姓名"><el-input v-model="advancedForm.Name" placeholder="模糊搜索" size="large" /></el-form-item>
       <el-form-item label="性别">
         <el-radio-group v-model="advancedForm.Gender" class="w-full">
            <el-radio-button label="">全部</el-radio-button>
            <el-radio-button label="male">男</el-radio-button>
            <el-radio-button label="female">女</el-radio-button>
         </el-radio-group>
       </el-form-item>
       <el-form-item label="出生日期"><el-date-picker v-model="advancedForm.birthdayRange" type="daterange" value-format="YYYY-MM-DD" class="w-full" /></el-form-item>
       <el-form-item label="既往治疗">
         <el-select v-model="advancedForm.past_treatments" multiple collapse-tags class="w-full">
            <el-option v-for="opt in PAST_TREATMENT_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
         </el-select>
       </el-form-item>
     </el-form>
     <template #footer>
        <div class="flex gap-2">
            <el-button class="flex-1" :icon="Refresh" @click="onReset">重置</el-button>
            <el-button class="flex-1" type="primary" :icon="Finished" @click="onAdvancedSearch">搜索</el-button>
        </div>
     </template>
  </el-drawer>
</template>

<style scoped>
/* --- 顶部操作栏布局 --- */
.header-actions { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; }
.search-box { flex: 1; display: flex; gap: 8px; }
.search-box :deep(.el-input) { flex: 1; } /* 让输入框自动撑开 */
.search-box .el-button, .create-btn { flex-shrink: 0; }

/* --- 工具类 --- */
.w-full { width: 100%; }
.p-2 { padding: 8px; }
.flex { display: flex; }
.gap-2 { gap: 8px; }
.flex-1 { flex: 1; }

/* --- 移动端适配 (重要！) --- */
@media (max-width: 768px) {
  .header-actions { flex-direction: column; align-items: stretch; gap: 10px; }
  .search-box { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
  /* 在手机上，输入框换行显示 */
  .search-box :deep(.el-input) { order: -1; flex: none; width: 100%; }
  .search-box .el-button { flex: 1; margin: 0; }
  .create-btn { width: 100%; margin-left: 0 !important; }
}
</style>