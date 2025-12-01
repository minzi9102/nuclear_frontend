import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    // 强制使用 IPv4 地址，解决 Firefox "Upgrade Required" 问题
    host: '127.0.0.1', 
    // 明确指定端口，防止自动跳到 5174
    port: 5173,        
  }
})
