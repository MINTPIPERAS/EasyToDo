# EasyToDo 项目开发方案

> 目标：在现有 Vue 3 + Vite + Element Plus 基础上，构建一个类似 Trello 的个人项目管理 + 日常便签工具，优先使用 Element Plus 组件，本地存储先用 IndexedDB。
> 版本：v1.0

---

## 一、项目定位

EasyToDo 是一个面向个人的看板式任务管理工具：
- 核心形态参考 Trello：Board（看板）→ List（列表）→ Card（卡片）
- 同时支持轻量“日常便签”用途
- 所有数据先保存在浏览器本地（IndexedDB），无需登录
- 重点锻炼 Element Plus 组件集成能力，避免重复造轮子

---

## 二、目标与非目标

### 2.1 目标（MVP 必须实现）

- [x] 看板（Board）的增删改、收藏、切换
- [x] 列表（List）的增删改、拖动排序
- [x] 卡片（Card）的增删改、拖动跨列表/同列表排序
- [x] 卡片详情：标题、描述、标签、截止日期、检查清单、归档
- [x] 标签系统：颜色 + 名称，可筛选
- [x] 关键词搜索 + 标签筛选
- [x] 数据持久化：IndexedDB
- [x] 导入/导出 JSON 备份
- [ ] 深色主题（后续）
- [ ] 看板级路由（后续）

### 2.2 非目标（本次不做）

- 用户登录/注册
- 多用户协作
- 云端同步
- 附件上传
- 评论与活动记录
- 邮件/桌面提醒
- 移动端适配优化（先保证桌面端可用）

---

## 三、技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3（Composition API + `<script setup>`） |
| 构建工具 | Vite |
| UI 组件库 | Element Plus（尽量全部使用其组件） |
| 状态管理 | Pinia（已安装并使用） |
| 本地存储 | IndexedDB（封装为 `src/db/indexedDB.js`） |
| 拖拽 | 原生 HTML5 Drag & Drop API（已实现基础列表/卡片拖拽） |
| 路由 | 暂不需要；若后续扩展再看板级路由 |

> 说明：如后续拖拽体验不佳，再考虑引入 `sortablejs` 或 `@vueuse/gesture`。

---

## 四、数据模型

```ts
// Board
{
  id: string,
  title: string,
  isStarred: boolean,
  createdAt: number,
  updatedAt: number
}

// List
{
  id: string,
  boardId: string,
  title: string,
  order: number,       // 排序权重
  createdAt: number,
  updatedAt: number
}

// Card
{
  id: string,
  listId: string,
  boardId: string,
  title: string,
  description: string,
  labels: string[],    // labelId 数组
  dueDate: number | null,
  checklist: CheckItem[],
  isArchived: boolean,
  order: number,
  createdAt: number,
  updatedAt: number
}

// Label
{
  id: string,
  boardId: string,
  name: string,
  color: string        // Element Plus 颜色或 hex
}

// CheckItem
{
  id: string,
  text: string,
  isDone: boolean
}
```

---

## 五、页面结构

### 5.1 单页面应用布局

```
┌──────────────────────────────────────┐
│  Header：Logo + 搜索 + 看板选择/新建    │
├──────────────────────────────────────┤
│                                      │
│  Board Area（横向滚动）                │
│  ┌─────┐ ┌─────┐ ┌─────┐            │
│  │ List│ │ List│ │ List│ ...         │
│  │ ┌─┐ │ │ ┌─┐ │ │ ┌─┐ │             │
│  │ │Card│ │ │Card│ │ │Card│            │
│  │ └─┘ │ │ └─┘ │ │ └─┘ │             │
│  └─────┘ └─────┘ └─────┘            │
│                                      │
└──────────────────────────────────────┘
```

### 5.2 视图/组件拆分

| 组件 | 职责 | 主要 Element Plus 组件 |
|------|------|------------------------|
| `App.vue` | 根容器、全局状态注入 | `el-container` / `el-header` |
| `AppHeader.vue` | 顶部导航、搜索、看板切换 | `el-menu` / `el-input` / `el-button` / `el-dropdown` |
| `BoardView.vue` | 看板主体、横向列表区 | 自定义 flex 容器 |
| `TaskList.vue` | 单列列表 + 卡片列表 | `el-card` |
| `TaskCard.vue` | 单卡片展示 | `el-card` / `el-tag` |
| `CardDetail.vue` | 卡片详情弹窗 | `el-dialog` |
| `BoardSelector.vue` | 看板切换/新建抽屉 | `el-drawer` / `el-form` |
| `LabelManager.vue` | 标签管理 | `el-tag` / `el-color-picker` / `el-input` |

---

## 六、Element Plus 组件使用清单

| 功能 | 组件 |
|------|------|
| 页面布局 | `el-container`、`el-header`、`el-main` |
| 按钮 | `el-button`、`el-button-group` |
| 输入 | `el-input`、`el-input-number` |
| 表单 | `el-form`、`el-form-item` |
| 弹窗/抽屉 | `el-dialog`、`el-drawer` |
| 下拉菜单 | `el-dropdown`、`el-dropdown-menu`、`el-dropdown-item` |
| 标签 | `el-tag`、`el-check-tag` |
| 日期 | `el-date-picker` |
| 颜色 | `el-color-picker` |
| 复选框 | `el-checkbox` |
| 提示 | `el-tooltip`、`el-popconfirm` |
| 消息 | `el-message`、`el-notification` |
| 空状态 | `el-empty` |
| 加载 | `el-loading` / `v-loading` |
| 滚动条 | `el-scrollbar` |
| 图标 | `@element-plus/icons-vue`（需安装） |

> 原则：优先用 Element Plus 组件完成交互；仅在无法通过配置满足时，才写少量包裹组件。

---

## 七、本地存储方案

### 7.1 选型：IndexedDB

- 容量大，适合结构化数据
- 异步 API，避免阻塞主线程
- 数据模型清晰：Board / List / Card / Label 四张表

### 7.2 封装思路

新建 `src/db/indexedDB.js`：

```js
const DB_NAME = 'EasyToDoDB'
const DB_VERSION = 1

export async function initDB() { ... }
export async function addBoard(board) { ... }
export async function updateBoard(board) { ... }
export async function deleteBoard(id) { ... }
export async function getBoards() { ... }
// List / Card / Label 类似
```

### 7.3 数据初始化

- 首次打开若 IndexedDB 为空，自动创建一个默认看板：
  - 标题：“我的待办”
  - 列表：待办 / 进行中 / 已完成
  - 示例卡片 1~2 条
- 提供“清空所有数据”和“重置示例数据”功能。

---

## 八、实现阶段

### 阶段 1：基础设施（已完成）

- [x] 安装 Pinia、`@element-plus/icons-vue`
- [x] 创建 `src/db/indexedDB.js` 并完成 CRUD 封装
- [x] 配置初始示例数据
- [x] 在 `App.vue` 中初始化 IndexedDB

### 阶段 2：看板框架（已完成）

- [x] 实现 `AppHeader`：搜索、看板选择/新建
- [x] 实现 `BoardView`：横向布局、列表容器
- [x] 实现 `TaskList`：列表增删改、拖动排序
- [x] 实现 `TaskCard`：卡片展示、跨列表拖拽

### 阶段 3：卡片详情（已完成）

- [x] 实现 `CardDetail.vue`
- [x] 标题、描述编辑
- [x] 标签选择/管理
- [x] 截止日期
- [x] 检查清单（Checklist）
- [x] 归档/删除

### 阶段 4：搜索与筛选（已完成）

- [x] 顶部搜索实时过滤卡片
- [x] 按标签筛选
- [x] 空状态提示

### 阶段 5：数据导入导出与优化（已完成）

- [x] JSON 导出所有数据
- [x] JSON 导入恢复数据
- [x] 操作成功/失败消息提示
- [ ] 大数据量渲染优化（待后续）

---

## 九、文件结构规划

```
src/
├── App.vue
├── main.js
├── style.css
├── db/
│   └── indexedDB.js          # IndexedDB 封装
├── stores/
│   └── boardStore.js         # Pinia 状态管理
├── components/
│   ├── AppHeader.vue         # 顶部导航、搜索、看板切换、导入导出
│   ├── BoardView.vue         # 看板主体、横向列表区
│   ├── TaskList.vue          # 单列列表 + 卡片拖拽容器
│   ├── TaskCard.vue          # 单卡片展示
│   ├── CardDetail.vue        # 卡片详情弹窗
│   └── LabelManager.vue      # 标签管理弹窗
└── utils/
    ├── id.js                 # 生成唯一 id
    └── exportImport.js       # JSON 导入导出
```

---

## 十、命名与代码规范

- 组件名：PascalCase，如 `TaskCard.vue`
- 组合式函数：camelCase 以 `use` 开头
- 数据库方法：camelCase，如 `getBoards`
- 状态管理：优先使用 Pinia，避免 prop drilling
- 样式：Element Plus 变量 + 少量 scoped 样式；不使用 Tailwind 等额外 CSS 框架
- 图标：统一使用 `@element-plus/icons-vue`

---

## 十一、验收标准

- [ ] 能创建、切换、删除看板
- [ ] 能在看板内增删改列表
- [ ] 能增删改卡片，并拖动卡片在不同列表间排序
- [ ] 能设置标签、截止日期、检查清单
- [ ] 搜索和标签筛选能实时过滤卡片
- [ ] 刷新页面后数据不丢失
- [ ] 能导出和导入 JSON 备份
- [ ] 90% 以上界面元素来自 Element Plus 组件
- [ ] 无明显控制台报错

---

## 十二、后续可扩展方向

- Vue Router 实现看板级 URL
- 深色主题（Element Plus 主题定制）
- Markdown 描述编辑
- 附件上传（本地 File API 或后端）
- 数据同步到后端/云
- 登录与多设备同步
- 移动端触摸拖拽优化
