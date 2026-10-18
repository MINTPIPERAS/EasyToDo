import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { applyTheme, DEFAULT_PRIMARY_COLOR, DEFAULT_PAGE_BG } from '../utils/theme.js'
import { getBgImage, saveBgImage, removeBgImage } from '../db/settingsDB.js'
import { processBgImage } from '../utils/image.js'

const STORAGE_KEY = 'easytodo-settings'

export const useSettingsStore = defineStore('settings', () => {
  // ================= State =================
  const primaryColor = ref(DEFAULT_PRIMARY_COLOR)
  const bgType = ref('color') // 'color' | 'image'
  const bgColor = ref(DEFAULT_PAGE_BG)
  const bgFit = ref('cover') // 'cover' | 'contain' | 'tile'
  const bgFileName = ref('')
  const bgImageUrl = ref('') // 运行时生成的 objectURL，不持久化
  const isBgImageLoading = ref(false)

  let currentObjectUrl = ''

  // ================= Theme =================
  function buildThemeState() {
    return {
      primaryColor: primaryColor.value,
      bgType: bgType.value,
      bgColor: bgColor.value,
      bgFit: bgFit.value,
      bgImageUrl: bgType.value === 'image' ? bgImageUrl.value : '',
    }
  }

  function setBgImageUrl(url) {
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = url
    bgImageUrl.value = url
    applyTheme(buildThemeState())
  }

  // 设置变化时实时应用主题并持久化
  watch([primaryColor, bgType, bgColor, bgFit, bgFileName], () => {
    applyTheme(buildThemeState())
    persist()
  })

  // ================= Persistence =================
  function persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          primaryColor: primaryColor.value,
          bgType: bgType.value,
          bgColor: bgColor.value,
          bgFit: bgFit.value,
          bgFileName: bgFileName.value,
        })
      )
    } catch (err) {
      console.error('[Settings] 偏好保存失败:', err)
    }
  }

  function loadLocalSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  // ================= Actions =================

  /**
   * 同步初始化主题（挂载前调用，读取 localStorage 并应用，避免刷新闪默认色）
   */
  function initTheme() {
    const saved = loadLocalSettings()
    if (saved.primaryColor) primaryColor.value = saved.primaryColor
    if (saved.bgType) bgType.value = saved.bgType
    if (saved.bgColor) bgColor.value = saved.bgColor
    if (saved.bgFit) bgFit.value = saved.bgFit
    if (saved.bgFileName) bgFileName.value = saved.bgFileName

    // 背景图需等异步加载，此时先按纯色兜底渲染
    applyTheme(buildThemeState())
  }

  /**
   * 异步加载 IndexedDB 中保存的背景图（挂载后调用）
   */
  async function initBgImage() {
    if (bgType.value !== 'image') return
    isBgImageLoading.value = true
    try {
      const blob = await getBgImage()
      if (blob) {
        setBgImageUrl(URL.createObjectURL(blob))
      } else {
        // 图库中无图（如被手动清库），回退纯色模式
        bgType.value = 'color'
      }
    } catch (err) {
      console.error('[Settings] 背景图加载失败:', err)
      bgType.value = 'color'
    } finally {
      isBgImageLoading.value = false
    }
  }

  /**
   * 上传并应用新的背景图
   * @param {File} file
   */
  async function uploadBgImage(file) {
    const { blob, name } = await processBgImage(file)
    await saveBgImage(blob)
    bgType.value = 'image'
    bgFileName.value = name
    setBgImageUrl(URL.createObjectURL(blob))
  }

  /**
   * 清除背景图，回退纯色模式（图库中的 Blob 一并删除）
   */
  async function clearBgImage() {
    await removeBgImage()
    bgFileName.value = ''
    bgType.value = 'color'
    setBgImageUrl('')
  }

  /**
   * 恢复全部外观默认值
   */
  async function resetToDefault() {
    await removeBgImage().catch(() => {})
    bgFileName.value = ''
    primaryColor.value = DEFAULT_PRIMARY_COLOR
    bgType.value = 'color'
    bgColor.value = DEFAULT_PAGE_BG
    bgFit.value = 'cover'
    setBgImageUrl('')
    applyTheme(buildThemeState())
    persist()
  }

  return {
    primaryColor,
    bgType,
    bgColor,
    bgFit,
    bgFileName,
    bgImageUrl,
    isBgImageLoading,
    initTheme,
    initBgImage,
    uploadBgImage,
    clearBgImage,
    resetToDefault,
  }
})
