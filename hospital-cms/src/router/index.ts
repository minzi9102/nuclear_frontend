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
    // 💡 建议修改：登录后直接跳转到"患者管理"，方便我们调试刚才写的页面
    redirect: '/patients', 
    // children 里的路由，都会显示在 Layout 组件内部的 <router-view /> 里
    children: [
      {
        path: 'home', // 对应的 URL 是 /home
        name: 'Home',
        component: () => import('../views/home/index.vue')
      },
      // 👇 核心修改在这里
      {
        path: 'patients',
        name: 'Patients', // 建议改用英文 Name，中文名称放在 meta 里
        component: () => import('../views/patients/index.vue'), // ✅ 指向新建的真实文件
        meta: { title: '患者管理' }
      },
      // 👇 治疗记录还未开发，继续保持占位
      {
        path: 'treatments',
        name: 'Treatments',
        component: () => import('../views/home/index.vue')
      },

      {
      path: 'treatments', // 访问路径 /treatments
      name: 'Treatments',
      component: () => import('../views/treatments/index.vue'),
      meta: { title: '治疗记录' }
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