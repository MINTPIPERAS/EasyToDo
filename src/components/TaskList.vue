<template>
  <el-card class="task-list" shadow="hover" :body-style="{ padding: '12px' }">
    <template #header>
      <div class="list-header">
        <el-input
          v-if="isEditingTitle"
          v-model="editTitle"
          size="small"
          @blur="confirmEditTitle"
          @keyup.enter="confirmEditTitle"
        />
        <h4 v-else class="list-title" @click="startEditTitle">{{ list.title }}</h4>

        <el-dropdown trigger="click" @command="handleCommand">
          <el-button :icon="More" size="small" text />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="edit">重命名</el-dropdown-item>
              <el-dropdown-item command="delete" divided>删除列表</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </template>

    <div
      ref="cardContainer"
      class="card-container"
      @dragover.prevent="onCardDragOver"
      @drop="onCardDrop"
    >
      <TaskCard
        v-for="(card, index) in list.cards"
        :key="card.id"
        :card="card"
        :index="index"
        draggable="true"
        @dragstart="(e) => onCardDragStart(e, card, index)"
      />

      <el-card
        v-if="isAddingCard"
        shadow="never"
        :body-style="{ padding: '8px' }"
        class="add-card-input-card"
      >
        <el-input
          v-model="newCardTitle"
          type="textarea"
          :rows="2"
          placeholder="输入卡片标题"
          @keyup.enter="confirmAddCard"
        />
        <div class="add-card-actions">
          <el-button type="primary" size="small" @click="confirmAddCard">添加</el-button>
          <el-button size="small" @click="cancelAddCard">取消</el-button>
        </div>
      </el-card>

      <el-button
        v-else
        :icon="Plus"
        text
        class="add-card-btn"
        @click="startAddCard"
      >
        添加卡片
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, inject, nextTick } from 'vue'
import { useBoardStore } from '../stores/boardStore.js'
import TaskCard from './TaskCard.vue'
import { Plus, More } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  list: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const store = useBoardStore()
const openCardDetail = inject('openCardDetail')

const isEditingTitle = ref(false)
const editTitle = ref('')
const isAddingCard = ref(false)
const newCardTitle = ref('')
const draggingCardIndex = ref(-1)
const cardContainer = ref(null)

function startEditTitle() {
  editTitle.value = props.list.title
  isEditingTitle.value = true
}

async function confirmEditTitle() {
  const title = editTitle.value.trim()
  if (title && title !== props.list.title) {
    await store.updateList({ ...props.list, title })
  }
  isEditingTitle.value = false
}

function handleCommand(command) {
  if (command === 'edit') {
    startEditTitle()
  } else if (command === 'delete') {
    ElMessageBox.confirm('删除列表将同时删除列表内的所有卡片，是否继续？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(async () => {
      await store.deleteList(props.list.id)
      ElMessage.success('列表已删除')
    })
  }
}

function startAddCard() {
  isAddingCard.value = true
  newCardTitle.value = ''
}

function cancelAddCard() {
  isAddingCard.value = false
  newCardTitle.value = ''
}

async function confirmAddCard() {
  const title = newCardTitle.value.trim()
  if (!title) {
    ElMessage.warning('请输入卡片标题')
    return
  }
  await store.createCard(props.list.id, title)
  cancelAddCard()
}

// ===== Card drag & drop =====
function onCardDragStart(event, card, index) {
  draggingCardIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/card-id', card.id)
  event.dataTransfer.setData('text/source-list-id', card.listId)
}

function getDropIndex(event) {
  const container = cardContainer.value
  if (!container) return 0
  const children = Array.from(container.children).filter(
    (el) => el.classList.contains('task-card') || el.classList.contains('add-card-input-card')
  )
  if (children.length === 0) return 0

  const rect = container.getBoundingClientRect()
  const offsetY = event.clientY - rect.top + container.scrollTop

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    const childRect = child.getBoundingClientRect()
    const childTop = childRect.top - rect.top + container.scrollTop
    const childMiddle = childTop + childRect.height / 2
    if (offsetY < childMiddle) return i
  }
  return children.length
}

function onCardDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

async function onCardDrop(event) {
  event.preventDefault()
  const cardId = event.dataTransfer.getData('text/card-id')
  const sourceListId = event.dataTransfer.getData('text/source-list-id')
  if (!cardId || !sourceListId) return

  const dropIndex = getDropIndex(event)
  await store.moveCard(cardId, props.list.id, dropIndex)
  draggingCardIndex.value = -1
}
</script>

<style scoped>
.task-list {
  flex-shrink: 0;
  width: 280px;
  max-height: calc(100vh - 130px);
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-title {
  margin: 0;
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  cursor: pointer;
}

.card-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 40px;
}

.add-card-btn {
  justify-content: flex-start;
  color: #606266;
}

.add-card-input-card {
  background-color: #ffffff;
}

.add-card-actions {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
