import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// 1. 引入 Element Plus 及其样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 2. 引入 Router 和 Pinia
import router from './router'
import { createPinia } from 'pinia'

const app = createApp(App)

// 3. 挂载插件
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')