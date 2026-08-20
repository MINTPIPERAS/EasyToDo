<template>
  <el-card
    class="task-card"
    shadow="hover"
    :body-style="{ padding: '10px' }"
    @click="handleClick"
  >
    <div class="card-labels" v-if="card.labels.length > 0">
      <el-tag
        v-for="labelId in card.labels"
        :key="labelId"
        :color="store.getLabelById(labelId)?.color"
        effect="dark"
        size="small"
        class="card-label"
      >
        {{ store.getLabelById(labelId)?.name }}
      </el-tag>
    </div>

    <div class="card-title">{{ card.title }}</div>

    <div class="card-badges">
      <el-tag v-if="card.dueDate" size="small" type="info" effect="plain">
        <el-icon><Calendar /></el-icon>
        {{ formatDate(card.dueDate) }}
      </el-tag>

      <el-tag v-if="card.checklist.length > 0" size="small" type="info" effect="plain">
        <el-icon><CircleCheck /></el-icon>
        {{ doneCheckCount }}/{{ card.checklist.length }}
      </el-tag>
    </div>
  </el-card>
</template>

<script setup>
import { computed, inject } from 'vue'
import { useBoardStore } from '../stores/boardStore.js'
import { Calendar, CircleCheck } from '@element-plus/icons-vue'

const props = defineProps({
  card: { type: Object, required: true },
  index: { type: Number, default: 0 },
})

const store = useBoardStore()
const openCardDetail = inject('openCardDetail')

const doneCheckCount = computed(() => {
  return props.card.checklist.filter((item) => item.isDone).length
})

function handleClick() {
  openCardDetail?.(props.card)
}

function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<style scoped>
.task-card {
  cursor: pointer;
  background-color: #ffffff;
  border: 1px solid #ebeef5;
}

.task-card:hover {
  border-color: #c0c4cc;
}

.card-labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.card-label {
  border: none;
  color: #fff;
}

.card-title {
  font-size: 14px;
  color: #303133;
  line-height: 1.4;
  word-break: break-word;
}

.card-badges {
  margin-top: 8px;
  display: flex;
  gap: 6px;
}
</style>
