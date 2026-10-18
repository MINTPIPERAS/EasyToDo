<template>
  <el-dialog v-model="visible" title="外观设置" width="520px">
    <!-- 按钮主题色 -->
    <div class="settings-section">
      <div class="section-title">按钮主题色</div>
      <div class="swatch-row">
        <button
          v-for="color in PRIMARY_PRESETS"
          :key="color"
          type="button"
          class="swatch"
          :class="{ 'is-active': settings.primaryColor.toLowerCase() === color }"
          :style="{ backgroundColor: color }"
          :title="color"
          @click="settings.primaryColor = color"
        />
        <el-color-picker v-model="settings.primaryColor" :predefine="PRIMARY_PRESETS" />
      </div>
    </div>

    <el-divider />

    <!-- 页面背景 -->
    <div class="settings-section">
      <div class="section-title">页面背景</div>
      <el-radio-group v-model="settings.bgType">
        <el-radio-button value="color">纯色</el-radio-button>
        <el-radio-button value="image">图片</el-radio-button>
      </el-radio-group>

      <!-- 纯色背景 -->
      <div v-if="settings.bgType === 'color'" class="swatch-row">
        <button
          v-for="color in BG_PRESETS"
          :key="color"
          type="button"
          class="swatch swatch-square"
          :class="{ 'is-active': settings.bgColor.toLowerCase() === color }"
          :style="{ backgroundColor: color }"
          :title="color"
          @click="settings.bgColor = color"
        />
        <el-color-picker v-model="settings.bgColor" :predefine="BG_PRESETS" />
      </div>

      <!-- 图片背景 -->
      <template v-else>
        <div class="bg-image-row">
          <div class="bg-image-preview" :style="bgPreviewStyle">
            <span v-if="!settings.bgImageUrl" class="preview-empty">暂无背景图</span>
          </div>
          <div class="bg-image-actions">
            <el-upload
              :accept="BG_IMAGE_ACCEPT"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleBgUpload"
            >
              <el-button type="primary" :icon="Upload" :loading="uploading">
                {{ settings.bgImageUrl ? '更换图片' : '上传图片' }}
              </el-button>
            </el-upload>
            <el-button
              v-if="settings.bgImageUrl"
              :icon="Delete"
              :disabled="uploading"
              @click="settings.clearBgImage()"
            >
              清除图片
            </el-button>
            <div v-if="settings.bgFileName" class="bg-file-name">
              {{ settings.bgFileName }}
            </div>
            <div class="bg-image-tip">支持 JPG / PNG / SVG，大图会自动压缩</div>
          </div>
        </div>

        <div class="fit-row">
          <span class="fit-label">填充方式</span>
          <el-radio-group v-model="settings.bgFit">
            <el-radio-button value="cover">填满</el-radio-button>
            <el-radio-button value="contain">居中</el-radio-button>
            <el-radio-button value="tile">平铺</el-radio-button>
          </el-radio-group>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button text type="danger" @click="handleReset">恢复默认</el-button>
        <el-button type="primary" @click="visible = false">完成</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettingsStore } from '../stores/settingsStore.js'
import { validateBgImage, BG_IMAGE_ACCEPT } from '../utils/image.js'
import { Upload, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 预设色使用小写，与 theme.js 的规范化结果保持一致
const PRIMARY_PRESETS = [
  '#409eff',
  '#14c9c9',
  '#67c23a',
  '#9254de',
  '#eb2f96',
  '#f56c6c',
  '#e6a23c',
  '#303133',
]

const BG_PRESETS = [
  '#f5f7fa',
  '#ffffff',
  '#faf6ef',
  '#e8f3fd',
  '#eef7ee',
  '#f3f0fa',
  '#fdf0f2',
]

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const settings = useSettingsStore()
const uploading = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const bgPreviewStyle = computed(() => {
  if (!settings.bgImageUrl) return {}
  return {
    backgroundImage: `url("${settings.bgImageUrl}")`,
    backgroundSize: settings.bgFit === 'tile' ? 'auto' : settings.bgFit,
    backgroundRepeat: settings.bgFit === 'tile' ? 'repeat' : 'no-repeat',
    backgroundPosition: 'center',
  }
})

async function handleBgUpload(uploadFile) {
  const file = uploadFile.raw
  const error = validateBgImage(file)
  if (error) {
    ElMessage.warning(error)
    return
  }
  uploading.value = true
  try {
    await settings.uploadBgImage(file)
    ElMessage.success('背景图已更新')
  } catch (err) {
    ElMessage.error('背景图上传失败：' + err.message)
    console.error(err)
  } finally {
    uploading.value = false
  }
}

async function handleReset() {
  await settings.resetToDefault()
  ElMessage.success('已恢复默认外观')
}
</script>

<style scoped>
.settings-section .section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.swatch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.swatch {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s;
}

.swatch:hover {
  transform: scale(1.15);
}

.swatch.is-active {
  box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px var(--el-color-primary);
}

.swatch-square {
  border-radius: 6px;
}

.bg-image-row {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}

.bg-image-preview {
  width: 160px;
  height: 96px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid #dcdfe6;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-empty {
  font-size: 12px;
  color: #909399;
}

.bg-image-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.bg-file-name {
  font-size: 12px;
  color: #606266;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bg-image-tip {
  font-size: 12px;
  color: #909399;
}

.fit-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.fit-label {
  font-size: 13px;
  color: #606266;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
}
</style>
