import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './style.css'
import { useSettingsStore } from './stores/settingsStore.js'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(ElementPlus)

// 挂载前同步应用已保存的主题，避免刷新时闪默认配色；
// 背景图片存在 IndexedDB 中，挂载后异步加载
const settingsStore = useSettingsStore(pinia)
settingsStore.initTheme()
settingsStore.initBgImage()

app.mount('#app')
