// 背景图片处理工具

const MAX_DIMENSION = 2560 // 最长边超过此值的位图会被等比压缩
const MAX_FILE_SIZE = 15 * 1024 * 1024

export const BG_IMAGE_ACCEPT = 'image/jpeg,image/png,image/svg+xml'

/**
 * 校验上传的背景图类型与大小
 * @param {File} file
 * @returns {string|null} 出错时返回错误信息，合法返回 null
 */
export function validateBgImage(file) {
  if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
    return '仅支持 JPG / PNG / SVG 格式的图片'
  }
  if (file.size > MAX_FILE_SIZE) {
    return '图片大小不能超过 15MB'
  }
  return null
}

/**
 * 处理上传的背景图：超过最大边长的 JPG/PNG 等比压缩后再存储，SVG 原样保留
 * @param {File} file
 * @returns {Promise<{blob: Blob, name: string}>}
 */
export async function processBgImage(file) {
  if (file.type === 'image/svg+xml') {
    return { blob: file, name: file.name }
  }

  const image = await loadImage(file)
  const maxSide = Math.max(image.naturalWidth, image.naturalHeight)
  if (maxSide <= MAX_DIMENSION) {
    return { blob: file, name: file.name }
  }

  const scale = MAX_DIMENSION / maxSide
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)

  // PNG 保留透明通道，JPEG 用较高画质压缩以减小体积
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('图片压缩失败'))),
      mime,
      0.85
    )
  })

  const ext = mime === 'image/png' ? '.png' : '.jpg'
  return { blob, name: file.name.replace(/\.[^.]+$/, '') + ext }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解析失败'))
    }
    image.src = url
  })
}
