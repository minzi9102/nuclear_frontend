import { createRouter, createWebHistory } from 'vue-router'

// 暂时先只定义登录页，防止报错
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../App.vue') // 暂时指向 App.vue，后面Phase 2再换成真正的登录页
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router