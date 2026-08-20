import { exportAllData, importAllData } from '../db/indexedDB.js'

/**
 * 导出数据为 JSON 文件
 */
export async function exportToJSON(filename = 'easytodo-backup.json') {
  const data = await exportAllData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 从 JSON 文件导入数据
 * @param {File} file
 */
export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        importAllData(data).then(resolve).catch(reject)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
