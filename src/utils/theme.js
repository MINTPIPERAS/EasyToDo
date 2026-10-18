// 主题应用工具：通过 CSS 变量驱动按钮主色与页面背景
// 约定：
//   - 按钮主色 = 覆盖 Element Plus 的 --el-color-primary 及其派生色阶
//   - 页面背景 = 自定义 --app-page-bg / --app-page-bg-image 系列变量

export const DEFAULT_PRIMARY_COLOR = '#409EFF'
export const DEFAULT_PAGE_BG = '#f5f7fa'
export const DEFAULT_LIST_BG = '#f0f2f5'

// 纯色背景接近默认白灰时，列表栏保持原设计色，保证与白色卡片的层次
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/**
 * 校验是否为合法 hex 颜色
 */
export function isValidHex(hex) {
  return typeof hex === 'string' && HEX_RE.test(hex.trim())
}

function normalizeHex(hex) {
  const h = hex.trim()
  if (h.length === 4) {
    return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
  }
  return h.toLowerCase()
}

function hexToRgb(hex) {
  const h = normalizeHex(hex)
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16),
  }
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

/**
 * 混合两个颜色，weight 为 color1 的占比（0-100）
 */
function mixColor(color1, color2, weight) {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  return rgbToHex(
    (c1.r * weight + c2.r * (100 - weight)) / 100,
    (c1.g * weight + c2.g * (100 - weight)) / 100,
    (c1.b * weight + c2.b * (100 - weight)) / 100
  )
}

/**
 * YIQ 亮度（0-1），用于判断颜色深浅
 */
function getYiq(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 / 255
}

/**
 * 派生 Element Plus 的亮/暗色阶（light-N = 混入 N*10% 白）
 */
function getLightShade(hex, level) {
  return mixColor('#ffffff', hex, level * 10)
}

function getDarkShade(hex, level) {
  return mixColor('#000000', hex, level * 10)
}

/**
 * 派生与页面背景同色系但有层次差的列表栏颜色：
 * 浅色背景略深一档，深色背景略浅一档
 */
function deriveListBg(bgColor) {
  if (normalizeHex(bgColor) === DEFAULT_PAGE_BG) return DEFAULT_LIST_BG
  if (getYiq(bgColor) > 0.6) {
    return mixColor('#000000', bgColor, 4)
  }
  return mixColor('#ffffff', bgColor, 15)
}

/**
 * 应用按钮主色（全局所有 primary 按钮 + 派生色阶）
 */
function applyPrimary(primaryColor) {
  const root = document.documentElement
  root.style.setProperty('--el-color-primary', primaryColor)
  ;[3, 5, 7, 8, 9].forEach((level) => {
    root.style.setProperty(
      `--el-color-primary-light-${level}`,
      getLightShade(primaryColor, level)
    )
  })
  root.style.setProperty('--el-color-primary-dark-2', getDarkShade(primaryColor, 2))

  // 主色过浅时按钮文字自动切换为深色，保证可读性
  const textColor = getYiq(primaryColor) > 0.7 ? '#303133' : '#ffffff'
  root.style.setProperty('--app-primary-text', textColor)
}

/**
 * 应用页面背景（纯色 / 图片两种模式）
 */
function applyBackground({ bgType, bgColor, bgFit, bgImageUrl }) {
  const root = document.documentElement

  if (bgType === 'image' && bgImageUrl) {
    root.style.setProperty('--app-page-bg-image', `url("${bgImageUrl}")`)
    if (bgFit === 'tile') {
      root.style.setProperty('--app-bg-size', 'auto')
      root.style.setProperty('--app-bg-repeat', 'repeat')
    } else if (bgFit === 'contain') {
      root.style.setProperty('--app-bg-size', 'contain')
      root.style.setProperty('--app-bg-repeat', 'no-repeat')
    } else {
      root.style.setProperty('--app-bg-size', 'cover')
      root.style.setProperty('--app-bg-repeat', 'no-repeat')
    }
    // 图片下方兜底色 + 列表栏毛玻璃，保证内容可读性
    root.style.setProperty('--app-page-bg', DEFAULT_PAGE_BG)
    root.style.setProperty('--app-list-bg', 'rgba(255, 255, 255, 0.78)')
    root.style.setProperty('--app-list-backdrop', 'blur(8px)')
  } else {
    root.style.setProperty('--app-page-bg-image', 'none')
    root.style.setProperty('--app-page-bg', bgColor)
    root.style.setProperty('--app-list-bg', deriveListBg(bgColor))
    root.style.setProperty('--app-list-backdrop', 'none')
  }
}

/**
 * 应用完整主题
 * @param {{primaryColor: string, bgType: string, bgColor: string, bgFit: string, bgImageUrl: string}} settings
 */
export function applyTheme(settings) {
  const primaryColor = isValidHex(settings.primaryColor)
    ? normalizeHex(settings.primaryColor)
    : DEFAULT_PRIMARY_COLOR
  applyPrimary(primaryColor)

  const bgColor =
    settings.bgType === 'image'
      ? DEFAULT_PAGE_BG
      : isValidHex(settings.bgColor)
        ? normalizeHex(settings.bgColor)
        : DEFAULT_PAGE_BG
  applyBackground({
    bgType: settings.bgType,
    bgColor,
    bgFit: settings.bgFit,
    bgImageUrl: settings.bgImageUrl || '',
  })
}
