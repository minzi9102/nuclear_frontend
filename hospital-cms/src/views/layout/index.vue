<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  HomeFilled, 
  UserFilled, 
  List, 
  SwitchButton,
  Expand
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const drawerVisible = ref(false) // 控制手机侧边栏

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    localStorage.removeItem('jwt')
    localStorage.removeItem('user')
    ElMessage.success('已退出登录')
    router.push('/login')
  })
}

// 选中菜单后关闭抽屉
const handleSelect = () => {
  drawerVisible.value = false
}
</script>

<template>
  <el-container class="layout-container">
    
    <el-aside width="200px" class="aside hidden-on-mobile">
      <div class="logo">🏥 治疗管理系统</div>
      <el-menu
        :default-active="route.path"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
        class="el-menu-vertical"
      >
        <el-menu-item index="/home">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/patients">
          <el-icon><UserFilled /></el-icon>
          <span>患者管理</span>
        </el-menu-item>
        <el-menu-item index="/treatments">
          <el-icon><List /></el-icon>
          <span>治疗记录</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      size="220px"
      :with-header="false"
      class="mobile-drawer-custom"
    >
      <div class="logo" style="width: 100%">🏥 管理系统</div>
      <el-menu
        :default-active="route.path"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
        class="el-menu-vertical"
        @select="handleSelect"
      >
        <el-menu-item index="/home">
          <el-icon><HomeFilled /></el-icon>
          <span>首页</span>
        </el-menu-item>
        <el-menu-item index="/patients">
          <el-icon><UserFilled /></el-icon>
          <span>患者管理</span>
        </el-menu-item>
        <el-menu-item index="/treatments">
          <el-icon><List /></el-icon>
          <span>治疗记录</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <div class="mobile-toggle" @click="drawerVisible = true">
             <el-icon size="24" color="#606266"><Expand /></el-icon>
          </div>
          <div class="breadcrumb">当前位置: {{ route.name }}</div>
        </div>
        
        <el-button type="danger" text @click="handleLogout">
          <el-icon style="margin-right: 5px"><SwitchButton /></el-icon>
          <span class="hidden-xs">退出</span>
        </el-button>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100vw;
}

.aside {
  background-color: #304156;
  color: white;
  height: 100%;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  background-color: #2b3649;
  color: #fff;
}

.el-menu-vertical {
  border-right: none;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

/* 默认隐藏汉堡按钮 */
.mobile-toggle {
  display: none;
  margin-right: 15px;
  cursor: pointer;
  display: flex; /* 为了垂直居中 */
  align-items: center;
}

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  height: calc(100vh - 60px);
}

/* 🔥🔥🔥 修复后的手机适配样式 🔥🔥🔥 */
@media screen and (max-width: 768px) {
  /* 1. 隐藏电脑端侧边栏 (注意这里类名是 .aside) */
  .hidden-on-mobile {
    display: none !important;
    width: 0 !important;
  }
  
  /* 2. 显示汉堡按钮 */
  .mobile-toggle {
    display: flex !important;
  }

  /* 3. 调整内边距 */
  .main-content {
    padding: 10px;
  }

  .header {
    padding: 0 15px;
  }

  /* 4. 隐藏退出文字 */
  .hidden-xs {
    display: none;
  }
}
</style>

/* 🟢 全局样式修正 (可选，防止 Drawer 样式问题) */
<style>
.mobile-drawer-custom .el-drawer__body {
  padding: 0;
  background-color: #304156;
}
</style>