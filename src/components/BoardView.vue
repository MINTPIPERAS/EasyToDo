<template>
  <div class="board-view">
    <div class="board-title-row">
      <h2 class="board-title">{{ store.currentBoard?.title || '未命名看板' }}</h2>
      <el-button :icon="Plus" type="primary" plain @click="startAddList">
        添加列表
      </el-button>
    </div>

    <div
      ref="boardArea"
      class="lists-container"
      @dragover.prevent
      @drop="onDropList"
    >
      <TaskList
        v-for="(list, index) in store.listsWithCards"
        :key="list.id"
        :list="list"
        :index="index"
        draggable="true"
        @dragstart="(e) => onListDragStart(e, list, index)"
        @dragover="(e) => onListDragOver(e, index)"
      />

      <div class="add-list-area">
        <el-card v-if="isAddingList" shadow="never" class="add-list-card">
          <el-input
            v-model="newListTitle"
            placeholder="输入列表标题"
            @keyup.enter="confirmAddList"
          />
          <div class="add-list-actions">
            <el-button type="primary" size="small" @click="confirmAddList">确定</el-button>
            <el-button size="small" @click="cancelAddList">取消</el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>

  <CardDetail v-if="selectedCard" :card="selectedCard" @close="selectedCard = null" />
</template>

<script setup>
import { ref, provide } from 'vue'
import { useBoardStore } from '../stores/boardStore.js'
import TaskList from './TaskList.vue'
import CardDetail from './CardDetail.vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const store = useBoardStore()

const isAddingList = ref(false)
const newListTitle = ref('')
const selectedCard = ref(null)
const draggingListIndex = ref(-1)

provide('openCardDetail', (card) => {
  selectedCard.value = card
})

function startAddList() {
  isAddingList.value = true
  newListTitle.value = ''
}

function cancelAddList() {
  isAddingList.value = false
  newListTitle.value = ''
}

async function confirmAddList() {
  const title = newListTitle.value.trim()
  if (!title) {
    ElMessage.warning('请输入列表标题')
    return
  }
  await store.createList(title)
  cancelAddList()
}

// ===== List drag & drop =====
function onListDragStart(event, list, index) {
  draggingListIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/list-index', String(index))
}

async function onListDragOver(event, index) {
  event.preventDefault()
  const fromIndex = draggingListIndex.value
  if (fromIndex === -1 || fromIndex === index) return

  const reordered = [...store.lists]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(index, 0, moved)
  await store.reorderList(reordered)
  draggingListIndex.value = index
}

async function onDropList(event) {
  event.preventDefault()
  draggingListIndex.value = -1
}
</script>

<style scoped>
.board-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.board-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.board-title {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.lists-container {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 0 16px 16px;
  overflow-x: auto;
  overflow-y: hidden;
}

.add-list-area {
  flex-shrink: 0;
  width: 280px;
}

.add-list-card {
  background-color: #ffffff;
}

.add-list-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
