import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from "rollup-plugin-visualizer";
// 引入压缩插件
import viteCompression from 'vite-plugin-compression';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 开启 Gzip 压缩 (大幅减小文件体积)
    viteCompression({
      verbose: true,     // 在控制台输出压缩结果
      disable: false,    // 开启压缩
      threshold: 10240,  // 体积大于 10kb 才进行压缩
      algorithm: 'gzip', // 压缩算法
      ext: '.gz',        // 生成的文件后缀
    }),
    // 打包分析 (放到 plugins 数组最后)
    visualizer({ 
      open: false,             // ❌ 关闭自动弹出
      gzipSize: true,          // ✅ 显示 Gzip 压缩后的大小 (这才是医院局域网关心的体积)
      brotliSize: true,        // ✅ 显示 Brotli 压缩大小
      filename: "stats.html" 
    })
  ],
  server: {
    // 强制使用 IPv4 地址
    host: '0.0.0.0', 
    // 明确指定端口
    port: 5173,        
  },
  // 构建选项优化
  build: {
    // 调高警告阈值 (从默认 500kb 调到 1000kb)，避免打包时报 warning
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 手动分包策略：将大文件切碎，便于浏览器并行下载
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 1. 单独拆分 Element Plus (通常体积最大)
            if (id.includes('element-plus')) {
              return 'element-plus';
            }
            // 2. 单独拆分 Vue 全家桶 (变化频率低，利于浏览器缓存)
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vue-vendor';
            }
            // 3. 其他依赖打入 vendor
            return 'vendor';
          }
        }
      }
    }
  }
})