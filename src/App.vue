<template>
  <el-container v-loading="!store.isReady" class="app-container">
    <el-header class="app-header" height="56px">
      <AppHeader />
    </el-header>

    <el-main class="app-main">
      <BoardView v-if="store.currentBoard" />
      <el-empty v-else description="暂无看板，请创建或导入数据" />
    </el-main>
  </el-container>
</template>

<script setup>
import { onMounted } from 'vue'
import { useBoardStore } from './stores/boardStore.js'
import AppHeader from './components/AppHeader.vue'
import BoardView from './components/BoardView.vue'

const store = useBoardStore()

onMounted(async () => {
  await store.initialize()
})
</script>

<style scoped>
.app-container {
  height: 100vh;
  background-color: #f5f7fa;
}

.app-header {
  padding: 0 16px;
  background-color: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
}

.app-main {
  padding: 0;
  overflow: hidden;
}
</style>
