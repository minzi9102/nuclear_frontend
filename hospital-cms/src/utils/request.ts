import axios from 'axios'
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router' // 引入我们刚才创建的路由，用于跳转

// 1. 创建 axios 实例
const service: AxiosInstance = axios.create({
  // 根据你的要求配置 baseURL
  baseURL: 'http://localhost:1337/api', 
  // 设置请求超时时间（10秒）
  timeout: 10000 
})

// 2. 请求拦截器 (Request Interceptor)
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 localStorage 获取 token (假设 key 叫 'jwt')
    const token = localStorage.getItem('jwt')
    
    if (token) {
      // 如果有 token，添加到 Authorization 头中
      // Strapi 的标准格式是 'Bearer <token>'
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 3. 响应拦截器 (Response Interceptor)
service.interceptors.response.use(
  (response: AxiosResponse) => {
    // 2xx 范围内的状态码都会触发该函数
    return response
  },
  (error: AxiosError) => {
    // 超出 2xx 范围的状态码都会触发该函数
    const status = error.response?.status

    if (status === 401) {
      // 401 Unauthorized: Token 过期或无效
      ElMessage.error('登录已过期，请重新登录')
      // 清除本地过期的 token
      localStorage.removeItem('jwt')
      localStorage.removeItem('user')
      // 强制跳转回登录页
      router.push('/login')
    } else if (status === 403) {
      ElMessage.error('没有权限执行此操作')
    } else if (status === 404) {
      ElMessage.error('请求的资源不存在')
    } else if (status === 500) {
      ElMessage.error('服务器内部错误')
    } else {
      ElMessage.error(error.message || '网络请求错误')
    }

    return Promise.reject(error)
  }
)

export default service