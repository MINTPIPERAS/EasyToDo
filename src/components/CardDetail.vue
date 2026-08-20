<template>
  <el-dialog
    v-model="visible"
    :title="localTitle || '卡片详情'"
    width="600px"
    @closed="handleClose"
  >
    <div class="card-detail-body">
      <el-form label-position="top">
        <el-form-item label="标题">
          <el-input v-model="localTitle" placeholder="卡片标题" @blur="saveTitle" @keyup.enter="saveTitle" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="localDescription"
            type="textarea"
            :rows="4"
            placeholder="添加更详细的描述..."
            @blur="saveDescription"
          />
        </el-form-item>

        <el-form-item label="标签">
          <div class="label-row">
            <el-check-tag
              v-for="label in store.labels"
              :key="label.id"
              :checked="localLabels.includes(label.id)"
              :style="{ backgroundColor: localLabels.includes(label.id) ? label.color : '', color: localLabels.includes(label.id) ? '#fff' : '' }"
              @change="() => toggleLabel(label.id)"
            >
              {{ label.name }}
            </el-check-tag>
            <el-button :icon="Edit" size="small" text @click="showLabelManager = true">
              管理标签
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="截止日期">
          <el-date-picker
            v-model="localDueDate"
            type="date"
            placeholder="选择截止日期"
            value-format="x"
            clearable
            @change="saveDueDate"
          />
        </el-form-item>

        <el-form-item label="检查清单">
          <div class="checklist">
            <div
              v-for="item in localChecklist"
              :key="item.id"
              class="check-item"
            >
              <el-checkbox v-model="item.isDone" @change="saveChecklist">
                <el-input
                  v-model="item.text"
                  size="small"
                  placeholder="子任务"
                  @blur="saveChecklist"
                  @keyup.enter="saveChecklist"
                />
              </el-checkbox>
              <el-button :icon="Delete" size="small" text type="danger" @click="removeCheckItem(item.id)" />
            </div>
            <el-button :icon="Plus" size="small" text @click="addCheckItem">添加子任务</el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-popconfirm title="确定归档此卡片吗？" @confirm="archiveCard">
          <template #reference>
            <el-button type="warning" plain>归档</el-button>
          </template>
        </el-popconfirm>
        <el-popconfirm title="确定删除此卡片吗？此操作不可撤销。" @confirm="deleteCard">
          <template #reference>
            <el-button type="danger" plain>删除</el-button>
          </template>
        </el-popconfirm>
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="saveAllAndClose">保存</el-button>
      </div>
    </template>
  </el-dialog>

  <LabelManager v-model="showLabelManager" />
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useBoardStore } from '../stores/boardStore.js'
import LabelManager from './LabelManager.vue'
import { Plus, Delete, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { generateId } from '../utils/id.js'

const props = defineProps({
  card: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const store = useBoardStore()

const visible = ref(true)
const isClosed = ref(false)
const localTitle = ref(props.card.title)
const localDescription = ref(props.card.description)
const localLabels = ref([...props.card.labels])
const localDueDate = ref(props.card.dueDate)
const localChecklist = ref([...props.card.checklist])
const showLabelManager = ref(false)

const currentCard = computed(() => store.cards.find((c) => c.id === props.card.id) || props.card)

watch(
  () => props.card,
  (newCard) => {
    localTitle.value = newCard.title
    localDescription.value = newCard.description
    localLabels.value = [...newCard.labels]
    localDueDate.value = newCard.dueDate
    localChecklist.value = newCard.checklist ? [...newCard.checklist] : []
  },
  { immediate: true }
)

watch(showLabelManager, async (val) => {
  if (!val) {
    // 关闭标签管理器后刷新标签列表
    await store.loadBoardData(store.currentBoardId)
  }
})

function toggleLabel(labelId) {
  const index = localLabels.value.indexOf(labelId)
  if (index === -1) {
    localLabels.value.push(labelId)
  } else {
    localLabels.value.splice(index, 1)
  }
}

function addCheckItem() {
  localChecklist.value.push({
    id: generateId('check'),
    text: '',
    isDone: false,
  })
}

function removeCheckItem(id) {
  localChecklist.value = localChecklist.value.filter((item) => item.id !== id)
}

async function saveTitle() {
  const title = localTitle.value.trim()
  if (!title) {
    ElMessage.warning('卡片标题不能为空')
    localTitle.value = currentCard.value.title
    return false
  }
  if (title === currentCard.value.title) return true
  await store.updateCard({ ...currentCard.value, title })
  return true
}

async function saveDescription() {
  const description = localDescription.value
  if (description === currentCard.value.description) return true
  await store.updateCard({ ...currentCard.value, description })
  return true
}

async function saveLabels() {
  const sorted = [...localLabels.value].sort()
  const currentSorted = [...currentCard.value.labels].sort()
  if (JSON.stringify(sorted) === JSON.stringify(currentSorted)) return true
  await store.updateCard({ ...currentCard.value, labels: [...localLabels.value] })
  return true
}

async function saveDueDate() {
  const dueDate = localDueDate.value ? new Date(localDueDate.value).getTime() : null
  if (dueDate === currentCard.value.dueDate || (dueDate === null && currentCard.value.dueDate === null)) return true
  await store.updateCard({ ...currentCard.value, dueDate })
  return true
}

async function saveChecklist() {
  const current = JSON.stringify(currentCard.value.checklist || [])
  const local = JSON.stringify(localChecklist.value || [])
  if (current === local) return true
  await store.updateCard({ ...currentCard.value, checklist: [...localChecklist.value] })
  return true
}

async function saveAll() {
  try {
    const ok = await saveTitle()
    if (!ok) return false
    await Promise.all([saveDescription(), saveLabels(), saveDueDate(), saveChecklist()])
    ElMessage.success('已保存')
    return true
  } catch (err) {
    ElMessage.error('保存失败：' + (err.message || '未知错误'))
    console.error(err)
    return false
  }
}

async function saveAllAndClose() {
  if (isClosed.value) return
  const ok = await saveAll()
  if (ok) {
    isClosed.value = true
    visible.value = false
    emit('close')
  }
}

async function handleClose() {
  if (isClosed.value) return
  isClosed.value = true
  await saveAll()
  visible.value = false
  emit('close')
}

async function archiveCard() {
  if (isClosed.value) return
  isClosed.value = true
  await saveAll()
  await store.archiveCard(currentCard.value.id, true)
  ElMessage.success('已归档')
  visible.value = false
  emit('close')
}

async function deleteCard() {
  if (isClosed.value) return
  isClosed.value = true
  await store.deleteCard(currentCard.value.id)
  ElMessage.success('已删除')
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.card-detail-body {
  padding: 0 8px;
}

.label-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.check-item :deep(.el-checkbox) {
  flex: 1;
  margin-right: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
