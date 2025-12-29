<script setup lang="ts">
import { ref , onMounted} from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  HomeFilled, 
  UserFilled, 
  List, 
  SwitchButton,
  Expand
} from '@element-plus/icons-vue'
import logoImg from '../../assets/FUQILOGO.png'

const router = useRouter()
const route = useRoute()
const drawerVisible = ref(false) // 控制手机侧边栏

// --- 🔥 新增代码开始：获取当前用户名 ---
const username = ref('管理员') // 默认值，防止读取失败显示为空

onMounted(() => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      const user = JSON.parse(userStr)
      // Strapi 默认返回的对象里有 username 字段
      if (user.username) {
        username.value = user.username
      }
    } catch (e) {
      console.error('解析用户信息失败', e)
    }
  }
})
// --- 🔥 新增代码结束 ---

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
      <div class="logo">核素敷贴疗效管理系统</div>
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
      <div class="drawer-header">
        <div class="logo">核素敷贴疗效管理系统</div>
        <div class="user-info-mobile">
          <img :src="logoImg" class="mobile-logo" alt="Hospital Logo" />
          <div class="username-text">你好, {{ username }}</div>
        </div>
      </div>
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
        
        <div class="header-right">
          <span class="user-name hidden-xs">
            你好, <strong>{{ username }}</strong>
          </span>

          <el-button type="danger" text @click="handleLogout">
            <el-icon style="margin-right: 5px"><SwitchButton /></el-icon>
            <span class="hidden-xs">退出</span>
          </el-button>
        </div>
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

.header-right {
  display: flex;
  align-items: center;
}

.user-name {
  margin-right: 15px;
  font-size: 14px;
  color: #606266;
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

.drawer-header {
  background-color: #2b3649; /* 与 Logo 背景一致或稍深 */
  padding-bottom: 20px;
  border-bottom: 1px solid #454d5e;
}

.user-info-mobile {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
  color: #fff;
}

.mobile-logo {
  width: 60px;       /* 控制 Logo 大小 */
  height: 60px;
  border-radius: 50%; /* 50% 是圆形，如果你想要方形圆角，可以改成 8px */
  background-color: #fff; /* 白色背景，防止透明 Logo 在深色底上看不清 */
  padding: 4px;      /* 留一点白边，类似相框效果 */
  object-fit: contain; /* 保证图片按比例缩放，不会变形 */
  margin-bottom: 10px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1); /* 加一点阴影更有质感 */
}

.username-text {
  font-size: 14px;
  color: #bfcbd9;
}
</style>

/* 🟢 全局样式修正 (可选，防止 Drawer 样式问题) */
<style>
.mobile-drawer-custom .el-drawer__body {
  padding: 0;
  background-color: #304156;
  
}
</style>