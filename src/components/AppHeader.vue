<template>
  <div class="header-inner">
    <div class="header-left">
      <el-icon :size="24" color="#409EFF"><Collection /></el-icon>
      <span class="app-title">EasyToDo</span>

      <el-dropdown v-if="store.boards.length > 0" @command="handleBoardCommand">
        <el-button>
          {{ store.currentBoard?.title || '选择看板' }}
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="new">
              <el-icon><Plus /></el-icon> 新建看板
            </el-dropdown-item>
            <el-dropdown-item divided disabled>收藏的看板</el-dropdown-item>
            <el-dropdown-item
              v-for="board in store.starredBoards"
              :key="board.id"
              :command="board.id"
            >
              <el-icon><StarFilled /></el-icon> {{ board.title }}
            </el-dropdown-item>
            <el-dropdown-item divided disabled>所有看板</el-dropdown-item>
            <el-dropdown-item
              v-for="board in store.unstarredBoards"
              :key="board.id"
              :command="board.id"
            >
              {{ board.title }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button v-else @click="openNewBoardDialog">新建看板</el-button>

      <el-tooltip content="收藏当前看板" placement="bottom">
        <el-button
          v-if="store.currentBoard"
          :type="store.currentBoard.isStarred ? 'warning' : 'default'"
          :icon="store.currentBoard.isStarred ? StarFilled : Star"
          circle
          @click="toggleStar"
        />
      </el-tooltip>
    </div>

    <div class="header-center">
      <el-input
        v-model="localSearch"
        placeholder="搜索卡片..."
        clearable
        style="width: 220px"
        @input="onSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select
        v-if="store.labels.length > 0"
        v-model="store.selectedLabelIds"
        multiple
        collapse-tags
        placeholder="按标签筛选"
        style="width: 180px"
        @change="store.setLabelFilter(store.selectedLabelIds)"
      >
        <el-option
          v-for="label in store.labels"
          :key="label.id"
          :label="label.name"
          :value="label.id"
        >
          <span class="label-option">
            <span class="label-dot" :style="{ backgroundColor: label.color }" />
            {{ label.name }}
          </span>
        </el-option>
      </el-select>
    </div>

    <div class="header-right">
      <el-button :icon="Download" @click="handleExport">导出</el-button>
      <el-upload
        accept="application/json"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleImport"
      >
        <el-button :icon="Upload">导入</el-button>
      </el-upload>
      <el-popconfirm title="确定重置为默认示例数据吗？当前数据将被清空。" @confirm="handleReset">
        <template #reference>
          <el-button :icon="RefreshRight" type="danger" plain>重置</el-button>
        </template>
      </el-popconfirm>
    </div>
  </div>

  <el-dialog v-model="newBoardDialogVisible" title="新建看板" width="400px">
    <el-form @submit.prevent="confirmNewBoard">
      <el-form-item label="看板名称">
        <el-input v-model="newBoardTitle" placeholder="请输入看板名称" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="newBoardDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmNewBoard">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useBoardStore } from '../stores/boardStore.js'
import { exportToJSON, importFromJSON } from '../utils/exportImport.js'
import {
  Collection,
  ArrowDown,
  Plus,
  StarFilled,
  Star,
  Search,
  Download,
  Upload,
  RefreshRight,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const store = useBoardStore()
const localSearch = ref('')
const newBoardDialogVisible = ref(false)
const newBoardTitle = ref('')

function onSearch() {
  store.setSearchKeyword(localSearch.value)
}

function handleBoardCommand(command) {
  if (command === 'new') {
    openNewBoardDialog()
  } else {
    store.switchBoard(command)
  }
}

function openNewBoardDialog() {
  newBoardTitle.value = ''
  newBoardDialogVisible.value = true
}

async function confirmNewBoard() {
  const title = newBoardTitle.value.trim()
  if (!title) {
    ElMessage.warning('请输入看板名称')
    return
  }
  await store.createBoard(title)
  ElMessage.success('看板创建成功')
  newBoardDialogVisible.value = false
}

async function toggleStar() {
  await store.toggleStarBoard(store.currentBoard)
}

async function handleExport() {
  try {
    await exportToJSON()
    ElMessage.success('导出成功')
  } catch (err) {
    ElMessage.error('导出失败')
    console.error(err)
  }
}

async function handleImport(file) {
  try {
    await importFromJSON(file.raw)
    await store.loadBoards()
    if (store.boards.length > 0) {
      await store.switchBoard(store.boards[0].id)
    }
    ElMessage.success('导入成功')
  } catch (err) {
    ElMessage.error('导入失败：' + err.message)
    console.error(err)
  }
}

async function handleReset() {
  await store.resetToDefaultData()
  ElMessage.success('已重置为默认数据')
}
</script>

<style scoped>
.header-inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.header-left,
.header-center,
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.label-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
</style>
