// 外观设置专用 IndexedDB（独立于看板数据 EasyToDoDB）
// 仅存放体积较大的二进制数据（背景图片 Blob），
// 不影响现有数据库的导出/导入/重置逻辑

const SETTINGS_DB_NAME = 'EasyToDoSettingsDB'
const SETTINGS_DB_VERSION = 1
const STORE_NAME = 'kv'
const BG_IMAGE_KEY = 'bgImage'

let dbInstance = null

/**
 * 打开并初始化设置数据库
 * @returns {Promise<IDBDatabase>}
 */
export async function initSettingsDB() {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SETTINGS_DB_NAME, SETTINGS_DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

/**
 * 读取背景图片 Blob
 * @returns {Promise<Blob|null>}
 */
export async function getBgImage() {
  await initSettingsDB()
  return new Promise((resolve, reject) => {
    const request = dbInstance
      .transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME)
      .get(BG_IMAGE_KEY)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 保存背景图片 Blob（覆盖旧图）
 * @param {Blob} blob
 */
export async function saveBgImage(blob) {
  await initSettingsDB()
  return new Promise((resolve, reject) => {
    const request = dbInstance
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .put(blob, BG_IMAGE_KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 删除背景图片
 */
export async function removeBgImage() {
  await initSettingsDB()
  return new Promise((resolve, reject) => {
    const request = dbInstance
      .transaction(STORE_NAME, 'readwrite')
      .objectStore(STORE_NAME)
      .delete(BG_IMAGE_KEY)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
