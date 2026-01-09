<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, Plus, Filter, Refresh, Finished, Close } from '@element-plus/icons-vue'
import { PAST_TREATMENT_OPTIONS } from '../../../constants/treatment'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

// Props
defineProps<{
  keyword: string
  advancedForm: any
}>()

// Emits
const emit = defineEmits(['update:keyword', 'search', 'reset', 'create'])

const drawerVisible = ref(false)
const isMobile = ref(window.innerWidth <= 768)

// --- 防抖搜索逻辑 ---
let timer: ReturnType<typeof setTimeout> | null = null

const handleInput = (val: string) => {
  // 1. 实时更新父组件的 keyword 变量
  emit('update:keyword', val)
  
  // 2. 防抖触发搜索 (延迟 500ms)
  if (timer) clearTimeout(timer)
  
  // 如果清空了，立即搜索
  if (!val) {
    emit('search')
    return
  }

  timer = setTimeout(() => {
    emit('search') // 通知父组件刷新列表
  }, 500)
}

// 手动点击搜索按钮 (立即触发)
const onManualSearch = () => {
  if (timer) clearTimeout(timer)
  emit('search')
}

// 辅助逻辑
const onReset = () => emit('reset')
const onAdvancedSearch = () => { drawerVisible.value = false; emit('search') }
</script>

<template>
  <div class="header-actions mb-6">
    <div class="search-box">
      <el-button size="large" :icon="Filter" @click="drawerVisible = true">高级搜索</el-button>
      
      <el-input 
        :model-value="keyword" 
        @input="handleInput"
        placeholder="输入姓名" 
        size="large" 
        clearable 
        @clear="onManualSearch" 
        @keyup.enter="onManualSearch"
        class="flex-1"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>

      <el-button type="primary" :icon="Search" size="large" @click="onManualSearch">查询</el-button>
      <el-tooltip content="重置所有条件" placement="top">
        <el-button 
          :icon="Refresh" 
          circle 
          size="large" 
          @click="emit('reset')" 
          style="margin-left: 8px;"
        />
      </el-tooltip>
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
       <el-form-item label="出生月份范围">
         <el-config-provider :locale="zhCn">
           <div class="month-range-container">
             <el-date-picker
               v-model="advancedForm.birthdayRange[0]"
               type="month"
               placeholder="开始月份"
               value-format="YYYY-MM-01" 
               format="YYYY年MM月"
               :editable="false" 
               :size="isMobile ? 'default' : 'large'"
               style="flex: 1"
             />
             <span class="range-separator">至</span>
             <el-date-picker
               v-model="advancedForm.birthdayRange[1]"
               type="month"
               placeholder="结束月份"
               value-format="YYYY-MM-31" 
               format="YYYY年MM月"
               :editable="false"
               :size="isMobile ? 'default' : 'large'"
               style="flex: 1"
             />
           </div>
         </el-config-provider>
       </el-form-item>
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
/* 样式保持不变 */
.header-actions { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; }
.search-box { flex: 1; display: flex; gap: 8px; }
.search-box :deep(.el-input) { flex: 1; } 
.search-box .el-button, .create-btn { flex-shrink: 0; }
.w-full { width: 100%; }
.p-2 { padding: 8px; }
.flex { display: flex; }
.gap-2 { gap: 8px; }
.flex-1 { flex: 1; }

@media (max-width: 768px) {
  .header-actions { flex-direction: column; align-items: stretch; gap: 10px; }
  .search-box { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; }
  .search-box :deep(.el-input) { order: -1; flex: none; width: 100%; }
  .search-box .el-button { flex: 1; margin: 0; }
  .create-btn { width: 100%; margin-left: 0 !important; }
}

/* PC端：左右排列 */
.month-range-container {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.range-separator {
  color: #909399;
  flex-shrink: 0;
}

/* 移动端：上下堆叠 */
@media (max-width: 768px) {
  .month-range-container {
    flex-direction: column; /* 垂直排列 */
    align-items: stretch;   /* 撑满宽度 */
    gap: 8px;
  }
  
  .range-separator {
    text-align: center;
    transform: rotate(90deg); /* 让 "至" 竖过来或者直接隐藏也可以 */
    display: none; /* 移动端通常不需要显示中间的文字，太占地 */
  }
}
</style>