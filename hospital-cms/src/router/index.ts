import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/index.vue')
  },
  {
    path: '/',
    // 关键点：这里加载的是 Layout 组件，它是父容器
    component: () => import('../views/layout/index.vue'),
    redirect: '/home', // 访问根路径 / 时，自动跳到 /home
    // children 里的路由，都会显示在 Layout 组件内部的 <router-view /> 里
    children: [
      {
        path: 'home', // 对应的 URL 是 /home
        name: '首页',
        component: () => import('../views/home/index.vue')
      },
      // 👇 下面这俩是给 Phase 3 预留的坑位
      // 暂时先把它们也都指向 Home 页面，防止报错，等下一阶段做好了页面再改过来
      {
        path: 'patients',
        name: '患者管理',
        component: () => import('../views/home/index.vue')
      },
      {
        path: 'treatments',
        name: '治疗记录',
        component: () => import('../views/home/index.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：防止没登录的人乱跑
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('jwt')

  // 逻辑：如果去的不是登录页，且没有 Token，则强制跳转到登录页
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router