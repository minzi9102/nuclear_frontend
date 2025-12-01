<script setup lang="ts">
import { ref, onMounted } from 'vue'

const user = ref<any>({})

onMounted(() => {
  // 从 localStorage 取出用户信息
  const userStr = localStorage.getItem('user')
  if (userStr) {
    user.value = JSON.parse(userStr)
  }
})
</script>

<template>
  <div class="home-container">
    <el-card>
      <h2>👋 欢迎回来，{{ user.username || '医生' }}</h2>
      <p>今天是 {{ new Date().toLocaleDateString() }}，祝您工作顺利！</p>
    </el-card>

    <div class="dashboard-grid">
      <!-- 这是一个占位用的数据概览 -->
      <el-card shadow="hover" class="stat-card">
        <h3>今日待诊</h3>
        <div class="number">12</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <h3>总患者数</h3>
        <div class="number">85</div>
      </el-card>
      <el-card shadow="hover" class="stat-card">
        <h3>本月治疗</h3>
        <div class="number">340</div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  padding: 20px;
}
.dashboard-grid {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}
.stat-card {
  flex: 1;
  text-align: center;
}
.number {
  font-size: 24px;
  font-weight: bold;
  color: #409EFF;
  margin-top: 10px;
}
</style>