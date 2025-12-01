<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  HomeFilled, 
  UserFilled, 
  List, 
  SwitchButton 
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

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
</script>

<template>
  <el-container class="layout-container">
    <!-- 左侧菜单栏 -->
    <el-aside width="200px" class="aside">
      <div class="logo">🏥 治疗管理系统</div>
      <el-menu
        :default-active="route.path"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
        class="el-menu-vertical"
      >
        <!-- 菜单项 -->
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

    <!-- 右侧内容区 -->
    <el-container>
      <el-header class="header">
        <div class="breadcrumb">当前位置: {{ route.name }}</div>
        <el-button type="danger" text @click="handleLogout">
          <el-icon style="margin-right: 5px"><SwitchButton /></el-icon>
          退出
        </el-button>
      </el-header>

      <el-main class="main-content">
        <!-- 这里是关键：子页面（Home）会显示在这里 -->
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-container {
  height: 100vh; /* 强制占满全屏 */
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

.main-content {
  background-color: #f0f2f5;
  padding: 20px;
  height: calc(100vh - 60px); /* 减去头部高度 */
}
</style>