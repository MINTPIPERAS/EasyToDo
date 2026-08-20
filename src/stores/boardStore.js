import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  initDB,
  seedInitialData,
  getBoards,
  addBoard,
  updateBoard as dbUpdateBoard,
  deleteBoard as dbDeleteBoard,
  getListsByBoard,
  addList,
  updateList as dbUpdateList,
  deleteList as dbDeleteList,
  getCardsByBoard,
  getCardsByList,
  addCard,
  updateCard as dbUpdateCard,
  deleteCard as dbDeleteCard,
  archiveCard as dbArchiveCard,
  getLabelsByBoard,
  addLabel,
  updateLabel as dbUpdateLabel,
  deleteLabel as dbDeleteLabel,
  resetToDefault,
} from '../db/indexedDB.js'
import { generateId, now } from '../utils/id.js'

export const useBoardStore = defineStore('board', () => {
  // ================= State =================
  const isReady = ref(false)
  const isLoading = ref(false)
  const boards = ref([])
  const currentBoardId = ref('')
  const lists = ref([])
  const cards = ref([])
  const labels = ref([])
  const searchKeyword = ref('')
  const selectedLabelIds = ref([])

  // ================= Getters =================
  const currentBoard = computed(() => boards.value.find((b) => b.id === currentBoardId.value) || null)

  const starredBoards = computed(() => boards.value.filter((b) => b.isStarred))

  const unstarredBoards = computed(() => boards.value.filter((b) => !b.isStarred))

  const listsWithCards = computed(() => {
    return lists.value.map((list) => ({
      ...list,
      cards: getFilteredCards(list.id),
    }))
  })

  function getFilteredCards(listId) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    return cards.value
      .filter((card) => card.listId === listId)
      .filter((card) => {
        if (!keyword) return true
        return (
          card.title.toLowerCase().includes(keyword) ||
          (card.description || '').toLowerCase().includes(keyword)
        )
      })
      .filter((card) => {
        if (selectedLabelIds.value.length === 0) return true
        return selectedLabelIds.value.some((id) => card.labels.includes(id))
      })
      .sort((a, b) => a.order - b.order)
  }

  function getLabelById(id) {
    return labels.value.find((l) => l.id === id)
  }

  // ================= Actions =================

  async function initialize() {
    await initDB()
    const seeded = await seedInitialData()
    if (seeded) {
      console.log('[EasyToDo] 已初始化默认示例数据')
    }
    await loadBoards()
    if (!currentBoardId.value && boards.value.length > 0) {
      currentBoardId.value = boards.value[0].id
      await loadBoardData(currentBoardId.value)
    }
    isReady.value = true
  }

  async function loadBoards() {
    boards.value = await getBoards()
  }

  async function loadBoardData(boardId) {
    isLoading.value = true
    currentBoardId.value = boardId
    try {
      const [boardLists, boardCards, boardLabels] = await Promise.all([
        getListsByBoard(boardId),
        getCardsByBoard(boardId),
        getLabelsByBoard(boardId),
      ])
      lists.value = boardLists
      cards.value = boardCards.filter((c) => !c.isArchived)
      labels.value = boardLabels
    } finally {
      isLoading.value = false
    }
  }

  async function switchBoard(boardId) {
    await loadBoardData(boardId)
  }

  async function createBoard(title) {
    const board = {
      id: generateId('board'),
      title: title.trim(),
      isStarred: false,
      createdAt: now(),
      updatedAt: now(),
    }
    await addBoard(board)

    // 自动创建默认列表
    const defaultListTitles = ['待办', '进行中', '已完成']
    await Promise.all(
      defaultListTitles.map((listTitle, index) =>
        addList({
          id: generateId('list'),
          boardId: board.id,
          title: listTitle,
          order: index,
          createdAt: now(),
          updatedAt: now(),
        })
      )
    )

    await loadBoards()
    await switchBoard(board.id)
    return board
  }

  async function updateBoard(board) {
    await dbUpdateBoard(board)
    await loadBoards()
    if (board.id === currentBoardId.value) {
      // 当前 board 的信息在 boards 数组中会更新
    }
  }

  async function deleteBoard(boardId) {
    await dbDeleteBoard(boardId)
    await loadBoards()
    if (currentBoardId.value === boardId) {
      const nextBoard = boards.value[0]
      if (nextBoard) {
        await switchBoard(nextBoard.id)
      } else {
        currentBoardId.value = ''
        lists.value = []
        cards.value = []
        labels.value = []
      }
    }
  }

  async function toggleStarBoard(board) {
    await dbUpdateBoard({ ...board, isStarred: !board.isStarred, updatedAt: now() })
    await loadBoards()
  }

  // ===== List =====
  async function createList(title) {
    if (!currentBoardId.value) return null
    const list = {
      id: generateId('list'),
      boardId: currentBoardId.value,
      title: title.trim(),
      order: lists.value.length,
      createdAt: now(),
      updatedAt: now(),
    }
    await addList(list)
    lists.value.push(list)
    return list
  }

  async function updateList(list) {
    const updated = await dbUpdateList(list)
    const index = lists.value.findIndex((l) => l.id === updated.id)
    if (index !== -1) lists.value[index] = updated
  }

  async function deleteList(listId) {
    await dbDeleteList(listId)
    lists.value = lists.value.filter((l) => l.id !== listId)
    cards.value = cards.value.filter((c) => c.listId !== listId)
  }

  async function reorderList(reorderedLists) {
    const updates = reorderedLists.map((list, index) => ({ ...list, order: index, updatedAt: now() }))
    await Promise.all(updates.map((l) => dbUpdateList(l)))
    lists.value = updates
  }

  // ===== Card =====
  async function createCard(listId, title) {
    const listCards = cards.value.filter((c) => c.listId === listId)
    const card = {
      id: generateId('card'),
      listId,
      boardId: currentBoardId.value,
      title: title.trim(),
      description: '',
      labels: [],
      dueDate: null,
      checklist: [],
      isArchived: false,
      order: listCards.length,
      createdAt: now(),
      updatedAt: now(),
    }
    await addCard(card)
    cards.value.push(card)
    return card
  }

  async function updateCard(card) {
    const updated = await dbUpdateCard(card)
    const index = cards.value.findIndex((c) => c.id === updated.id)
    if (index !== -1) cards.value[index] = updated
    return updated
  }

  async function deleteCard(cardId) {
    await dbDeleteCard(cardId)
    cards.value = cards.value.filter((c) => c.id !== cardId)
  }

  async function archiveCard(cardId, isArchived = true) {
    const updated = await dbArchiveCard(cardId, isArchived)
    if (isArchived) {
      cards.value = cards.value.filter((c) => c.id !== cardId)
    } else {
      cards.value.push(updated)
    }
    return updated
  }

  async function moveCard(cardId, targetListId, newOrder) {
    const index = cards.value.findIndex((c) => c.id === cardId)
    if (index === -1) return
    const card = cards.value[index]

    // 同列表内重排
    if (card.listId === targetListId) {
      const listCards = cards.value
        .filter((c) => c.listId === targetListId && c.id !== cardId)
        .sort((a, b) => a.order - b.order)
      listCards.splice(newOrder, 0, card)
      const updates = listCards.map((c, i) => ({ ...c, order: i, updatedAt: now() }))
      await Promise.all(updates.map((c) => dbUpdateCard(c)))
      cards.value = cards.value.map((c) => updates.find((u) => u.id === c.id) || c)
      return
    }

    // 跨列表移动
    const sourceListCards = cards.value
      .filter((c) => c.listId === card.listId && c.id !== cardId)
      .sort((a, b) => a.order - b.order)
    const sourceUpdates = sourceListCards.map((c, i) => ({ ...c, order: i, updatedAt: now() }))
    await Promise.all(sourceUpdates.map((c) => dbUpdateCard(c)))

    const targetListCards = cards.value
      .filter((c) => c.listId === targetListId)
      .sort((a, b) => a.order - b.order)
    const movedCard = { ...card, listId: targetListId }
    targetListCards.splice(newOrder, 0, movedCard)
    const targetUpdates = targetListCards.map((c, i) => ({ ...c, order: i, updatedAt: now() }))
    await Promise.all(targetUpdates.map((c) => dbUpdateCard(c)))

    cards.value = cards.value
      .filter((c) => c.id !== cardId)
      .map((c) => sourceUpdates.find((u) => u.id === c.id) || targetUpdates.find((u) => u.id === c.id) || c)
    cards.value.push(...targetUpdates.filter((c) => c.id === cardId))
  }

  // ===== Label =====
  async function createLabel(name, color) {
    const label = {
      id: generateId('label'),
      boardId: currentBoardId.value,
      name: name.trim(),
      color,
      createdAt: now(),
      updatedAt: now(),
    }
    await addLabel(label)
    labels.value.push(label)
    return label
  }

  async function updateLabel(label) {
    const updated = await dbUpdateLabel(label)
    const index = labels.value.findIndex((l) => l.id === updated.id)
    if (index !== -1) labels.value[index] = updated
  }

  async function deleteLabel(labelId) {
    await dbDeleteLabel(labelId)
    labels.value = labels.value.filter((l) => l.id !== labelId)
    cards.value.forEach((card) => {
      if (card.labels.includes(labelId)) {
        card.labels = card.labels.filter((id) => id !== labelId)
      }
    })
  }

  // ===== Filter =====
  function setSearchKeyword(keyword) {
    searchKeyword.value = keyword
  }

  function setLabelFilter(labelIds) {
    selectedLabelIds.value = labelIds
  }

  function toggleLabelFilter(labelId) {
    const index = selectedLabelIds.value.indexOf(labelId)
    if (index === -1) {
      selectedLabelIds.value.push(labelId)
    } else {
      selectedLabelIds.value.splice(index, 1)
    }
  }

  // ===== Reset =====
  async function resetToDefaultData() {
    await resetToDefault()
    await loadBoards()
    if (boards.value.length > 0) {
      await switchBoard(boards.value[0].id)
    }
  }

  return {
    isReady,
    isLoading,
    boards,
    currentBoardId,
    lists,
    cards,
    labels,
    searchKeyword,
    selectedLabelIds,
    currentBoard,
    starredBoards,
    unstarredBoards,
    listsWithCards,
    getFilteredCards,
    getLabelById,
    initialize,
    loadBoards,
    loadBoardData,
    switchBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    toggleStarBoard,
    createList,
    updateList,
    deleteList,
    reorderList,
    createCard,
    updateCard,
    deleteCard,
    archiveCard,
    moveCard,
    createLabel,
    updateLabel,
    deleteLabel,
    setSearchKeyword,
    setLabelFilter,
    toggleLabelFilter,
    resetToDefaultData,
  }
})
