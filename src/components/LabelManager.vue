<template>
  <el-dialog v-model="localVisible" title="管理标签" width="420px" @closed="close">
    <div class="label-list">
      <div v-for="label in store.labels" :key="label.id" class="label-item">
        <el-color-picker v-model="label.color" size="small" show-alpha :predefine="predefineColors" />
        <el-input v-model="label.name" size="small" placeholder="标签名称" @blur="saveLabel(label)" />
        <el-button :icon="Delete" size="small" text type="danger" @click="removeLabel(label.id)" />
      </div>
    </div>

    <el-divider />

    <div class="add-label-row">
      <el-color-picker v-model="newLabelColor" size="small" show-alpha :predefine="predefineColors" />
      <el-input v-model="newLabelName" size="small" placeholder="新标签名称" @keyup.enter="addLabel" />
      <el-button type="primary" size="small" :icon="Plus" @click="addLabel">添加</el-button>
    </div>

    <template #footer>
      <el-button @click="close">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useBoardStore } from '../stores/boardStore.js'
import { Delete, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const store = useBoardStore()
const localVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const newLabelName = ref('')
const newLabelColor = ref('#409EFF')

const predefineColors = [
  '#F56C6C',
  '#E6A23C',
  '#67C23A',
  '#409EFF',
  '#909399',
  '#9254DE',
  '#FF6A6A',
]

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      newLabelName.value = ''
      newLabelColor.value = '#409EFF'
    }
  }
)

async function addLabel() {
  const name = newLabelName.value.trim()
  if (!name) {
    ElMessage.warning('请输入标签名称')
    return
  }
  await store.createLabel(name, newLabelColor.value)
  newLabelName.value = ''
  ElMessage.success('标签创建成功')
}

async function saveLabel(label) {
  const name = label.name.trim()
  if (!name) {
    ElMessage.warning('标签名称不能为空')
    return
  }
  await store.updateLabel({ ...label, name })
}

async function removeLabel(id) {
  try {
    await ElMessageBox.confirm('删除标签会从所有卡片中移除该标签，是否继续？', '提示', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await store.deleteLabel(id)
    ElMessage.success('标签已删除')
  } catch {
    // 取消
  }
}

function close() {
  localVisible.value = false
}
</script>

<style scoped>
.label-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.label-item,
.add-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-item .el-input,
.add-label-row .el-input {
  flex: 1;
}
</style>
