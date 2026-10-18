/**
 * 生成基于时间戳 + 随机数的唯一 ID
 * @param {string} prefix - ID 前缀
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 生成当前时间戳
 * @returns {number}
 */
export function now() {
  return Date.now()
}
