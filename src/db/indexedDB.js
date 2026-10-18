const DB_NAME = 'EasyToDoDB'
const DB_VERSION = 1

const STORE_NAMES = {
  BOARDS: 'boards',
  LISTS: 'lists',
  CARDS: 'cards',
  LABELS: 'labels',
}

let dbInstance = null

/**
 * 打开并初始化 IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(STORE_NAMES.BOARDS)) {
        const boardStore = db.createObjectStore(STORE_NAMES.BOARDS, { keyPath: 'id' })
        boardStore.createIndex('isStarred', 'isStarred', { unique: false })
        boardStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.LISTS)) {
        const listStore = db.createObjectStore(STORE_NAMES.LISTS, { keyPath: 'id' })
        listStore.createIndex('boardId', 'boardId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.CARDS)) {
        const cardStore = db.createObjectStore(STORE_NAMES.CARDS, { keyPath: 'id' })
        cardStore.createIndex('boardId', 'boardId', { unique: false })
        cardStore.createIndex('listId', 'listId', { unique: false })
        cardStore.createIndex('isArchived', 'isArchived', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_NAMES.LABELS)) {
        const labelStore = db.createObjectStore(STORE_NAMES.LABELS, { keyPath: 'id' })
        labelStore.createIndex('boardId', 'boardId', { unique: false })
      }
    }
  })
}

/**
 * 获取所有数据（按某个 store）
 */
function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 根据索引查询
 */
function getByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 深度克隆并去除 Vue 响应式代理
 * IndexedDB 无法直接克隆 Proxy 对象，需要在写入前转换为普通对象
 */
function deepClone(data) {
  try {
    return JSON.parse(JSON.stringify(data))
  } catch (err) {
    console.error('[IndexedDB] 数据克隆失败:', err)
    throw err
  }
}

/**
 * 添加一条记录
 */
function add(storeName, data) {
  const cloned = deepClone(data)
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.add(cloned)
    request.onsuccess = () => resolve(cloned)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 更新一条记录
 */
function put(storeName, data) {
  const cloned = deepClone(data)
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(cloned)
    request.onsuccess = () => resolve(cloned)
    request.onerror = () => reject(request.error)
  })
}

/**
 * 删除一条记录
 */
function deleteById(storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * 清空某个 store
 */
function clear(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = dbInstance.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ================== Board ==================

export async function getBoards() {
  return getAll(STORE_NAMES.BOARDS)
}

export async function addBoard(board) {
  return add(STORE_NAMES.BOARDS, board)
}

export async function updateBoard(board) {
  return put(STORE_NAMES.BOARDS, { ...board, updatedAt: Date.now() })
}

export async function deleteBoard(id) {
  // 级联删除该看板下的列表、卡片、标签
  const lists = await getListsByBoard(id)
  const cards = await getCardsByBoard(id)
  const labels = await getLabelsByBoard(id)

  await Promise.all([
    ...lists.map((l) => deleteList(l.id)),
    ...cards.map((c) => deleteCard(c.id)),
    ...labels.map((label) => deleteLabel(label.id)),
    deleteById(STORE_NAMES.BOARDS, id),
  ])
}

// ================== List ==================

export async function getListsByBoard(boardId) {
  const lists = await getByIndex(STORE_NAMES.LISTS, 'boardId', boardId)
  return lists.sort((a, b) => a.order - b.order)
}

export async function addList(list) {
  return add(STORE_NAMES.LISTS, list)
}

export async function updateList(list) {
  return put(STORE_NAMES.LISTS, { ...list, updatedAt: Date.now() })
}

export async function deleteList(id) {
  const cards = await getCardsByList(id)
  await Promise.all(cards.map((c) => deleteCard(c.id)))
  await deleteById(STORE_NAMES.LISTS, id)
}

// ================== Card ==================

export async function getCardsByBoard(boardId) {
  return getByIndex(STORE_NAMES.CARDS, 'boardId', boardId)
}

export async function getCardsByList(listId) {
  const cards = await getByIndex(STORE_NAMES.CARDS, 'listId', listId)
  return cards
    .filter((c) => !c.isArchived)
    .sort((a, b) => a.order - b.order)
}

export async function addCard(card) {
  return add(STORE_NAMES.CARDS, card)
}

export async function updateCard(card) {
  return put(STORE_NAMES.CARDS, { ...card, updatedAt: Date.now() })
}

export async function deleteCard(id) {
  await deleteById(STORE_NAMES.CARDS, id)
}

export async function archiveCard(id, isArchived = true) {
  const transaction = dbInstance.transaction(STORE_NAMES.CARDS, 'readwrite')
  const store = transaction.objectStore(STORE_NAMES.CARDS)
  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => {
      const card = request.result
      if (!card) return reject(new Error('Card not found'))
      card.isArchived = isArchived
      card.updatedAt = Date.now()
      const putRequest = store.put(card)
      putRequest.onsuccess = () => resolve(card)
      putRequest.onerror = () => reject(putRequest.error)
    }
    request.onerror = () => reject(request.error)
  })
}

// ================== Label ==================

export async function getLabelsByBoard(boardId) {
  return getByIndex(STORE_NAMES.LABELS, 'boardId', boardId)
}

export async function addLabel(label) {
  return add(STORE_NAMES.LABELS, label)
}

export async function updateLabel(label) {
  return put(STORE_NAMES.LABELS, { ...label, updatedAt: Date.now() })
}

export async function deleteLabel(id) {
  await deleteById(STORE_NAMES.LABELS, id)
}

// ================== Seed / Export / Import / Clear ==================

/**
 * 生成默认示例数据
 */
export function createDefaultData(now = Date.now()) {
  const boardId = 'board_' + now
  const todoListId = 'list_' + (now + 1)
  const doingListId = 'list_' + (now + 2)
  const doneListId = 'list_' + (now + 3)

  const labelUrgent = {
    id: 'label_' + (now + 10),
    boardId,
    name: '紧急',
    color: '#F56C6C',
    createdAt: now,
    updatedAt: now,
  }

  const labelWork = {
    id: 'label_' + (now + 11),
    boardId,
    name: '工作',
    color: '#409EFF',
    createdAt: now,
    updatedAt: now,
  }

  return {
    boards: [
      {
        id: boardId,
        title: '我的待办',
        isStarred: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    lists: [
      { id: todoListId, boardId, title: '待办', order: 0, createdAt: now, updatedAt: now },
      { id: doingListId, boardId, title: '进行中', order: 1, createdAt: now, updatedAt: now },
      { id: doneListId, boardId, title: '已完成', order: 2, createdAt: now, updatedAt: now },
    ],
    cards: [
      {
        id: 'card_' + (now + 20),
        listId: todoListId,
        boardId,
        title: '完成 EasyToDo 项目规划',
        description: '参考 Trello 设计个人任务管理功能',
        labels: [labelUrgent.id, labelWork.id],
        dueDate: null,
        checklist: [
          { id: 'check_' + (now + 30), text: '撰写 plan.md', isDone: true },
          { id: 'check_' + (now + 31), text: '完成 IndexedDB 封装', isDone: true },
        ],
        isArchived: false,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'card_' + (now + 21),
        listId: doingListId,
        boardId,
        title: '集成 Element Plus 组件',
        description: '使用 el-card、el-dialog、el-tag 等组件实现界面',
        labels: [labelWork.id],
        dueDate: null,
        checklist: [],
        isArchived: false,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    labels: [labelUrgent, labelWork],
  }
}

/**
 * 初始化默认数据（仅当数据库为空时）
 */
export async function seedInitialData() {
  const boards = await getBoards()
  if (boards.length > 0) return false

  const data = createDefaultData()
  await Promise.all([
    ...data.boards.map((b) => addBoard(b)),
    ...data.lists.map((l) => addList(l)),
    ...data.cards.map((c) => addCard(c)),
    ...data.labels.map((l) => addLabel(l)),
  ])
  return true
}

/**
 * 导出全部数据为对象
 */
export async function exportAllData() {
  const [boards, lists, cards, labels] = await Promise.all([
    getBoards(),
    getAll(STORE_NAMES.LISTS),
    getAll(STORE_NAMES.CARDS),
    getAll(STORE_NAMES.LABELS),
  ])
  return { boards, lists, cards, labels, exportedAt: Date.now() }
}

/**
 * 导入全部数据（会先清空）
 */
export async function importAllData(data) {
  if (!data || !Array.isArray(data.boards)) {
    throw new Error('无效的备份数据')
  }

  await Promise.all([
    clear(STORE_NAMES.BOARDS),
    clear(STORE_NAMES.LISTS),
    clear(STORE_NAMES.CARDS),
    clear(STORE_NAMES.LABELS),
  ])

  await Promise.all([
    ...(data.boards || []).map((b) => addBoard(b)),
    ...(data.lists || []).map((l) => addList(l)),
    ...(data.cards || []).map((c) => addCard(c)),
    ...(data.labels || []).map((l) => addLabel(l)),
  ])
}

/**
 * 清空全部数据
 */
export async function clearAllData() {
  await Promise.all([
    clear(STORE_NAMES.BOARDS),
    clear(STORE_NAMES.LISTS),
    clear(STORE_NAMES.CARDS),
    clear(STORE_NAMES.LABELS),
  ])
}

/**
 * 重置为默认示例数据
 */
export async function resetToDefault() {
  await clearAllData()
  await seedInitialData()
}
