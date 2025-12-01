import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue') // 指向我们新建的登录页
  },
  {
    path: '/',
    // 暂时先重定向到登录页，防止首页空白
    // 等下一阶段做完 Layout 布局后，再改回来
    redirect: '/login' 
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：防止未登录用户访问其他页面
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('jwt')
  
  if (to.path !== '/login' && !token) {
    // 如果去的不是登录页，且没有 token，强制去登录页
    next('/login')
  } else {
    next()
  }
})

export default router