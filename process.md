# 前端开发实战记录 - Phase 1：环境搭建与基础配置

日期：2025年12月01日
项目名称：hospital-cms (治疗效果记录管理平台)
技术栈：Vue 3 + TypeScript + Vite + Element Plus + Pinia + Axios

## 1. 🚀 操作步骤记录

### 1.1 初始化项目

使用 Vite 脚手架快速生成 Vue 3 + TypeScript 项目模板。
```bash
# 在目标目录下创建项目
npm create vite@latest hospital-cms -- --template vue-ts
```

### 1.2 安装核心依赖

安装项目所需的 UI 库、路由、状态管理和网络请求库。
```bash
cd hospital-cms
npm install element-plus axios pinia vue-router
```

### 1.3 基础文件配置

*   `src/router/index.ts`：创建了基础路由文件，暂时指向登录页。
*   `src/main.ts`：在入口文件中挂载了 Element Plus、Pinia 和 Router。

### 1.4 🧪 核心任务：Axios 封装 (src/utils/request.ts)

为了统一处理前后端交互，封装了 Axios 实例：

*   `BaseURL`：配置为 `http://localhost:1337/api` (Strapi 后端地址)。
*   **请求拦截器**：自动从 `localStorage` 读取 JWT Token 并加入 Header (`Authorization: Bearer <token>`)。
*   **响应拦截器**：全局处理错误，特别是 `401 Unauthorized` 状态下自动清除缓存并跳转回登录页。

# **📝 前端开发实战记录 - Phase 2：核心页面框架构建**

日期：2025-12-01  
阶段名称：Phase 2 - 核心页面框架构建  
任务目标：完成用户登录流程、搭建系统主布局（侧边栏+顶部导航）、配置嵌套路由，确保系统"骨架"搭建完毕。

---

## **1. 🏗️ 核心功能实现记录**

### **1.1 目录结构规划**

为了规范页面管理，建立了标准的视图层级：

* `src/views/login/`：存放登录页组件。
* `src/views/layout/`：存放系统主框架组件（侧边栏、顶栏）。
* `src/views/home/`：存放系统首页（仪表盘）组件。

### **1.2 登录流程开发**

**UI 实现**：使用 `<el-card>` 构建卡片式登录界面，集成 Element Plus 表单验证。

**逻辑实现**：
* 调用 POST /auth/local 接口进行身份验证。
* 关键动作：登录成功后，将 jwt (Token) 和 user (用户信息) 分别存入 localStorage。
* 跳转逻辑：验证通过后自动跳转至 / (即首页)。

### **1.3 主布局 (Layout) 开发**

**布局结构**：采用经典的后台管理布局（左侧固定菜单 + 顶部导航 + 右侧内容区）。

**组件使用**：使用 `<el-container>`, `<el-aside>`, `<el-header>`, `<el-main>` 构建整体框架。

**侧边栏菜单**：
* 配置 `<el-menu router>` 模式，实现点击菜单项自动跳转路由。
* 引入 `@element-plus/icons-vue` 图标库增强视觉体验。

**顶部导航**：实现了"退出登录"功能（清除 Token 并跳转回登录页）。

### **1.4 路由系统升级（嵌套路由）**

将路由从"单层结构"升级为"嵌套结构（Parent-Child）"：

* **`/login`**：独立路由，全屏显示登录页。
* **`/`（Layout）**：
  * 作为父路由，加载 Layout 组件（相框）。
  * **`/home`**：作为子路由，加载 Home 组件（画），显示在 Layout 的 `<router-view />` 中。

**路由守卫**：全局拦截无 Token 的访问，强制重定向至 `/login`。

---


# **📝 前端开发实战记录 - Phase 3.1：患者列表对接**

日期：2025-12-01

任务目标：实现患者数据的获取（Read）、列表展示、分页及搜索功能，打通 Vue 前端与 Strapi 后端的 API 通信。

---

## **1. 🏗️ 核心实现步骤 (Implementation)**

### **1.1 定义 TypeScript 类型 (src/api/types.ts)**

为了规范数据流，我们根据 Strapi v5 的文档定义了接口类型。

**特点**：Strapi v5 的响应结构变平了，不再像 v4 那样包裹在 attributes 里。

**定义**：
* `Patient`：实体结构（患者基本信息）
* `ApiResponse<T>`：通用响应壳（包含 data 和 meta）
* `PatientQueryParams`：查询参数（分页、过滤、排序）

### **1.2 封装 API 请求 (src/api/patient.ts)**

将 HTTP 请求逻辑与 UI 分离。

**对接接口**：GET /patients

**关键参数**：
* `pagination[page]`：当前页码
* `pagination[pageSize]`：每页数量
* `filters`：过滤条件
* `sort`：排序字段

### **1.3 构建列表页面 (src/views/patients/index.vue)**

**UI 组件**：
* 使用 `<el-card>` 布局，`<el-table>` 展示数据，`<el-pagination>` 处理分页。

**交互逻辑**：

* **fetchData()**：核心函数，负责调接口、解包数据。
* **搜索**：监听输入框，修改 filters 参数并重置页码。
* **删除**：预留了 `deletePatient` 调用逻辑（UI 已实现）。

### **1.4 路由配置 (src/router/index.ts)**

* 在 Layout 的 `children` 下新增 `path: 'patients'`。
* 将登录后的默认重定向从 `/home` 改为 `/patients`，方便调试。


## **3. 💡 关键经验 (Key Takeaways)**

* **调试大法**：当数据出不来时，第一时间在 `fetchData` 里 `console.log(res)`，看控制台打印的真实 JSON 结构，永远不要盲目相信文档或记忆。

* **Strapi 结构**：Strapi 的标准返回通常是 `{ data: [...], meta: {...} }`，前端需要根据 Axios 拦截器的配置决定剥离几层。

* **API 权限**：永远记得在 Strapi 后台 **Settings -> Roles -> Public/Authenticated** 中勾选对应的 API 权限，并点击 Save。


# 📝 前端开发实战记录 - Phase 3：治疗记录管理 (Treatment)

**日期：** 2025年12月12日

**目标：** 实现治疗记录的增删改查，建立患者与治疗记录的一对多关联，并实现后端自动生成治疗序号。

**技术栈：** Vue 3 (Frontend) + Strapi v5 (Backend)

---

## 1. 🏗️ 后端构建 (Strapi v5)

由于早期开发环境的数据污染问题，本阶段首先执行了后端重建。

### 1.1 数据模型设计 (Schema)

**Collection Type: Treatment**

关键字段：

- **treatmentNo** (Short Text): 自动生成的编号（如"第1次"）。
- **sequence_number** (Integer): 用于计算的纯数字序号。
- **target** (Enumeration): 治疗部位。
- **Images** (Media): 图片（当前设为非必填）。
- **patient** (Relation): 关联到 Patient (Many-to-One)，设置为 Required (必填)。

### 1.2 核心业务逻辑：自动序号生成

利用 Strapi 的 Lifecycle Hooks (`beforeCreate`) 实现。

**文件路径:** `src/api/treatment/content-types/treatment/lifecycles.js`

**逻辑流程:**

1. 拦截创建请求，提取关联的 patient ID。
2. 兼容处理 Strapi 后台 (`connect/set` 数组) 和 API (`documentId` 字符串) 的不同数据格式。
3. 若获取到的是 Integer ID，先反查数据库获取 DocumentId。
4. 查询该患者名下 `sequence_number` 最大的记录（包含 Draft 状态）。
5. 计算 `nextSequence` 并格式化为 `treatmentNo` 写入数据库。

### 1.3 权限配置

在 Settings -> Roles -> Authenticated 中开放了 Treatment 的 `find`, `findOne`, `create`, `delete` 权限。

---

## 2. 💻 前端构建 (Vue 3)

### 2.1 API 封装 (src/api/treatment.ts)

- **查 (List):** 使用 `populate: 'patient'` 参数，确保返回数据中包含患者姓名。
- **删 (Delete):** 关键修正 —— 参数必须使用字符串类型的 `documentId`，而非整数 `id`。
- **增 (Create):** 提交数据结构需包裹在 `{ data: { ... } }` 中。

### 2.2 页面实现 (src/views/treatments/index.vue)

**列表页:**

- 使用 `el-table` 展示数据。
- 展示"关联患者"列（处理空值情况）。
- 搜索栏支持按 `treatmentNo` 模糊查询。

**新建弹窗:**

- 使用 `el-select` 的远程搜索 (remote method) 功能，调用 `getPatientList` 接口实时检索患者。
- 下拉框 `value` 绑定患者的 `documentId`。
- 表单提交后自动刷新列表，显示后端计算好的序号。

---

## 3. 🐛 踩坑与故障排除记录 (Troubleshooting Log)

这是本阶段最有价值的经验总结，针对 Strapi v5 的特性进行了大量适配。

### 🔴 问题一：ID 类型混淆导致删除失败

**现象：** 点击删除，弹出确认框后请求发送，但后端返回 404 或无反应，数据未删除。

**原因：** Strapi v5 的 REST API 默认强制使用字符串格式的 `documentId` 进行操作，而前端传了整数 `id`。

**✅ 解决：** 修改 API 定义和页面逻辑，将所有操作的主键从 `row.id` 改为 `row.documentId`。

### 🔴 问题二：自动编号逻辑报错 Invalid key sequenceNumber

**现象：** 创建记录时后端报错。

**原因：** 误以为 Strapi 会自动将字段转为驼峰命名，但 `schema.json` 中定义的是下划线 `sequence_number`。

**✅ 解决：** 查阅 Schema 文件，将代码中所有字段名统一修正为 `sequence_number`。

### 🔴 问题三：数据库查询报错 Undefined attribute level operator id

**现象：** 无法自动计算序号。

**原因：** 在 `lifecycles.js` 中，将包含对象的变量（如 `{ documentId: '...' }`）直接传给了查询过滤器，Strapi 无法解析。

**✅ 解决：** 增加数据提取逻辑，确保传给 `filters` 的是纯字符串或数字 ID。

### 🔴 问题四：自动编号失效 (提取不到 Patient ID)

**现象：** 日志提示"未找到关联 Patient"，跳过计算逻辑。

**原因：** Strapi 后台（Admin Panel）提交关联数据时，使用了 `{ connect: [...] }` 或 `{ set: [...] }` 结构，且对象中只包含 Integer id。

**✅ 解决：**

- 增强提取逻辑，同时兼容 `connect` 和 `set` 操作符。
- 增加"反查"步骤：如果提取到的是 Integer ID，先查 Patient 表换取 `documentId`，再进行后续操作。

### 🔴 问题五：Element Plus 警告 Invalid prop: type

**现象：** 浏览器控制台报 Vue Warn。

**原因：** `<el-tag>` 的 `type` 属性被赋值为空字符串 `""`。

**✅ 解决：** 修改三元表达式，将空字符串改为默认值 `'primary'`。

### 🔴 问题六：Postman / 前端 403 Forbidden

**现象：** 重建后端后，API 请求全部失败。

**原因：** 数据库重置，导致旧的 JWT Token 和用户失效。

**✅ 解决：**

- 在新后台创建新用户。
- 前端清除 LocalStorage 缓存。
- Postman 重新调用 Login 接口获取新 Token 并更新环境变量。

---

## 4. 💡 Strapi v5 核心经验

通过本次开发，我们确认了 Strapi v5 的几个关键最佳实践：

1. **DocumentId 优于 ID：** 在前端开发和 API 调用中，始终优先使用 `documentId`。
2. **Schema 为准：** 字段命名（驼峰还是下划线）永远以 `schema.json` 为准。
3. **防御性编程：** 在编写 Lifecycle Hooks 时，必须考虑到数据来源的多样性（API 调用 vs 后台界面操作），数据结构可能完全不同。

---


# Phase 4 开发全过程总结 (Summary)

## 1. 后端配置 (Strapi v5)

**权限开启**：在 Settings -> Users & Permissions -> Roles -> Public 中，勾选了 Upload 插件的 upload (上传) 和 destroy (删除) 权限。

**模型确认**：确认 Treatment 模型中存在 Images 字段（多媒体类型，多选）。

## 2. 前端基础设施 (API & Types)

**类型定义**：定义了 StrapiMedia 接口，包含 id, url, formats 等核心字段。

**API 封装**：编写 `src/api/upload.ts`。
- 使用 FormData 封装文件。
- 处理 Axios 响应类型问题，使用 `as StrapiMedia` 断言确保类型安全。
- 实现了 `uploadFile` 方法，返回上传后的文件对象。

## 3. 核心组件封装 (<ImageUploader />)

**自定义上传**：覆盖 Element Plus 默认行为，使用 `:http-request` 调用自定义 API。

**双向绑定**：实现了 `v-model` (即 `modelValue` 和 `update:modelValue`)，在父子组件间同步图片对象数组。

**回显处理**：自动拼接后端 Base URL (`http://localhost:1337`)，解决相对路径无法显示的问题。

**手动状态管理**：不依赖 Element Plus 的自动列表更新，而是手动维护 `fileList`，确保 Strapi 返回的完整对象（包含 ID）不丢失。

## 4. 业务集成 (TreatmentForm)

**表单集成**：在 `src/views/treatments/index.vue` 中引入组件。

**数据提交**：提取图片数组中的 id，组装成 ID 数组 (`[1, 2]`) 发送给后端。

**列表展示**：使用 `el-image` 和 `getThumbnailUrl` 工具函数，在表格中展示缩略图及大图预览。

**清理机制**：使用 `destroy-on-close` 确保弹窗关闭后组件销毁，避免状态残留。

---

## 🏆 核心问题与解决方案复盘 (Post-Mortem Analysis)

### 1. 后端与 API 协议 (Strapi v5)

| 现象 / 报错 | 根本原因 (Root Cause) | 解决方案 (Solution) |
|-----------|-------------------|-----------------|
| **400 Bad Request**<br/>`Invalid key images` | Strapi v5 的 REST API 写入时，强制要求 Payload 必须包裹在 `data` 对象层级内，不能直接放在根节点。 | **API 层修正**：<br/>`request.post('/treatments', { data: submitData })` |
| **列表显示有图，但新建记录无图**<br/>（后端没报错，但关联失败） | 字段名称大小写敏感。<br/>Strapi 文档显示 Schema Name 为 `Images` (大写)，而后端默认只接受准确的字段名。 | **统一字段名**：<br/>前端提交和查询时，统一使用 `Images` (大写)，与 API 文档保持严格一致。 |
| **上传多张图，后端只存了一张** | Strapi 后台的内容模型配置错误。 | **后台配置**：<br/>进入 Content-Type Builder -> Treatment -> Images，确保勾选 "Multiple media"。 |

### 2. 前端组件逻辑 (Vue 3 + Element Plus) —— 最难点

| 现象 / 报错 | 根本原因 (Root Cause) | 解决方案 (Solution) |
|-----------|-------------------|-----------------|
| **提交时 `Images` 为空数组 `[]`**<br/>（尽管已上传成功） | **引用丢失 (Reference Lost)**。<br/>Element Plus 的 `onChange` 钩子会返回全新的文件对象列表 (Proxy)，覆盖了我们在 `customUploadRequest` 中手动挂载了 `response` (含ID) 的旧对象。导致 ID 丢失。 | **引入"外部映射表" (Map Strategy)**：<br/>建立一个 `reactive(new Map())`，以 `uid` 为键，永久存储后端返回的数据。无论视图列表怎么变，同步时都去 Map 里查 ID。 |
| **前端只能上传一张图**<br/>（第二张会顶替第一张） | `<el-upload>` 组件默认行为是单文件覆盖模式。 | **开启多选**：<br/>在组件标签上添加 `multiple` 属性。 |
| **再次打开新建弹窗，显示旧图片** | `el-dialog` 默认只是 `v-show` (隐藏)，组件实例未销毁，保留了上次的 `fileList` 状态。 | **生命周期管理**：<br/>给 `<el-dialog>` 添加 `destroy-on-close` 属性，强制关闭即销毁。 |

### 3. TypeScript 类型问题

| 现象 / 报错 | 根本原因 (Root Cause) | 解决方案 (Solution) |
|-----------|-------------------|-----------------|
| **`undefined` 不能分配给 `StrapiMedia`** | API 函数在非数组路径下没有明确的返回值。 | **严谨的控制流**：<br/>使用 `throw Error` 覆盖所有异常路径，并使用 `as StrapiMedia` 断言。 |
| **`undefined` 不能分配给 `number`** | Element Plus 的 `UploadFile.uid` 类型定义包含 `undefined`，但 Map 的键必须是确定的类型。 | **类型断言/默认值**：<br/>使用 `file.uid ?? 0` 或 `file.uid as number` 确保类型安全。 |

---

## 🔧 踩坑与解决方案记录 (Troubleshooting Log)

这是最宝贵的经验财富，请仔细阅读：

| 问题分类 | 遇到的现象/报错 | 原因分析 | 解决方案 |
|---------|----------------|--------|--------|
| **TypeScript** | 不能将类型 `undefined` 分配给 `StrapiMedia` | API 函数在数组判断逻辑外没有明确返回值，TS 认为可能返回 undefined。 | 增加 `throw Error` 确保所有路径都有返回，并使用 `as StrapiMedia` 进行类型断言。 |
| **Element Plus** | 找不到名称 `UploadFiles` / `uid` 类型错误 | 1. Element Plus 导出类型名为 `UploadUserFile[]`。<br/>2. 组件要求 `uid` 为 `number`，但代码曾转为 `string`。 | 1. 修正类型引用。<br/>2. 保持 `uid` 与 Strapi 返回的 `id` (number) 一致，不进行转换。 |
| **Strapi API** | `ValidationError: Invalid key images` | Strapi v5 REST API 强制要求 payload 必须包裹在 `data: {}` 对象中，不能直接放在根节点。 | 修改 API 调用：`request.post('/treatments', { data: submitData })` |
| **Strapi API** | 列表能查到图，但新建记录关联不上图 | Strapi v5 字段大小写敏感。查询(Populate)时需要 Schema Name (Images)，写入时通常兼容小写驼峰。 | 1. 查询参数保持 `populate: ['Images']` (大写)。<br/>2. 提交 Payload 最终确认使用 `{ data: { ..., Images: [id] } }` 结构。 |
| **组件通信** | 上传成功但提交时 `Images` 为空数组 `[]` | Element Plus 的 `handleSuccess` 钩子返回的 `uploadFiles` 状态更新滞后，覆盖了我们手动挂载好 `response` 的文件列表。 | 核心修复：在 `customUploadRequest` 中手动更新 `fileList` 并触发 `emit`，不再信任 `handleSuccess` 的回调参数。 |
| **用户体验** | 再次打开新建弹窗，显示上一张图片 | `el-dialog` 默认仅隐藏 (`v-show`) DOM，组件实例未销毁，保留了上次的 `fileList` 状态。 | 给 `<el-dialog>` 添加 `destroy-on-close` 属性，强制关闭时销毁组件。 |

---

# 📝 局域网部署操作全流程 (Operation Log)

## 1. 前端服务配置 (Vite)

**目标**：允许外部设备访问你的开发服务器，而不仅仅是本机。

**操作**：修改 `vite.config.ts`。

**代码**：

```typescript
server: {
  host: '0.0.0.0', // 监听所有网卡接口
  port: 5173,
  open: true
}
```

---

## 2. 确定服务器地址

**目标**：找到开发机在局域网中的"门牌号"。

**操作**：在终端运行 `ipconfig` (Windows) 或 `ifconfig` (Mac/Linux)。

**结果**：获取 IPv4 地址（例如：192.168.1.5）。

---

## 3. 环境变量更新 (Environment Variables)

**目标**：让运行在手机上的前端代码知道去哪里找后端 API。

**操作**：修改 `.env` 文件。

**重要变更**：将 `localhost` 替换为局域网 IP。

```properties
# ❌ 旧值: http://localhost:1337
# ✅ 新值: http://192.168.1.5:1337
VITE_API_URL=http://192.168.1.5:1337
```

**注意**：修改后必须重启 Vite (`npm run dev`)。

---

## 4. 代码硬编码清理

**目标**：消除代码中残留的死地址。

**操作**：检查 `src/views/treatments/index.vue` 及其他组件。

**变更**：将所有手动拼接的 `'http://localhost:1337'` 字符串替换为 `import.meta.env.VITE_API_URL`。

---

## 🔧 遇到的问题与解决方案 (Troubleshooting)

在本次部署过程中，我们主要解决了两个核心问题：

| 现象 (Symptom) | 根本原因 (Root Cause) | 解决方案 (Solution) |
|---|---|---|
| **手机能访问网页，但图片显示 "FAILED"** | **代码硬编码 (Hardcoding)**。<br/><br/>虽然 API 地址改了，但列表页的 `getThumbnailUrl` 函数里依然写死了 `'http://localhost:1337'`。手机访问时，localhost 指向的是手机自己，当然找不到图片。 | **统一使用环境变量**：<br/><br/>将拼接逻辑改为 `return url.startsWith('http') ? url : ${import.meta.env.VITE_API_URL}${url}` |
| **手机无法访问网页，或无法加载图片** | **防火墙拦截 (Firewall Blocking)**。<br/><br/>Windows 防火墙默认可能会阻止 Node.js 接受来自外部网络的连接请求（特别是 1337 和 5173 端口）。 | **配置防火墙白名单**：<br/><br/>进入 Windows 安全中心 -> 允许应用通过防火墙 -> 勾选 Node.js JavaScript Runtime 的"专用"和"公用"权限。 |
| **API 请求失败** | **环境变量未生效**。<br/><br/>修改了 `.env` 文件，但浏览器依然请求旧地址。 | **重启服务**：<br/><br/>Vite 在启动时才会读取 `.env`。修改后必须执行 `Ctrl+C` 并重新运行 `npm run dev`。 |

---

## 🧠 核心知识点总结

### Localhost vs 局域网 IP

- **Localhost (127.0.0.1)**：只有电脑自己能访问自己。
- **局域网 IP (192.168.x.x)**：同一 WiFi 下的所有设备都能访问。
- **前端是运行在客户端的**：当手机打开网页时，JS 代码是在手机浏览器里跑的。如果你写 localhost，手机就会去连接手机本身，而不是你的电脑。

### 环境变量的重要性

- **永远不要在代码里写死 URL (Hardcoding)**。使用 `VITE_API_URL` 可以让你在不做任何代码修改的情况下，适应本机开发、局域网测试和上线生产环境。


# Phase 4.2 开发记录：患者列表集成治疗记录查看功能

---

## 1. 功能实现总结 (Phase 4.2 Achievements)

### API 增强 (Strapi Populate)
* 重构了 `getPatientList` 接口，引入 `qs` 库实现了 Strapi v5 复杂的嵌套查询参数（`populate[treatments][sort]=createdAt:desc`），实现了在列表页预加载最近的治疗记录。
* 新建了 `getTreatmentDetail` 接口，用于按需加载单条记录的完整详情（包含大体积的图片数据）。

### 前端 UI/UX 升级
* **列表页**：在表格中新增了一列，使用"按钮组"展示治疗记录。采用视觉分级策略（最新的记录用高亮实心按钮，历史记录用灰色空心按钮）。
* **详情弹窗**：封装了 `TreatmentDetailDialog.vue` 组件，实现了 Loading 状态管理、日期格式化、以及多张影像的预览展示。

### 逻辑优化
* 实现了"按需加载"策略：列表只查摘要，点击才查详情，保证了首屏加载速度。

---

## 2. 遇到的问题与解决方案 (Troubleshooting Log)

### Q1: 分页报错 `PaginationError`

* **现象**：获取患者列表失败，API 返回 400 错误。
* **原因**：Strapi v5 要求分页参数必须包裹在 `pagination` 对象中，而原本的代码通过 `...params` 直接展开在顶层。
* **解决**：

```typescript
// 修改前：qs.stringify({ page: 1 })
// 修改后：
const queryObject = {
  pagination: { page, pageSize }, // ✅ 必须包裹
  ...filters
}
```

### Q2: CRUD 操作类型报错 (Number vs String)

* **现象**：删除或编辑患者时，TS 报错 `Type 'number' is not assignable to type 'string'`。
* **原因**：Strapi v5 的 REST API 强制使用字符串格式的 `documentId` 进行操作，而前端组件还在传旧版的整数 `id`。
* **解决**：
  1. 在 `types.ts` 中为 Patient 接口增加 `documentId: string`。
  2. 在 API 调用时（Delete/Update）统一改传 `row.documentId`。

### Q3: 字段大小写不匹配 (Images vs images)

* **现象**：TS 提示 `Property 'Images' does not exist... Did you mean 'images'?`，且图片无法显示。
* **原因**：Strapi 后台 Schema 定义的是大写 `Images`，API 返回的 JSON 也是大写，但 TypeScript 接口定义写成了小写。
* **解决**：严格校对 `types.ts`，将 `images` 修正为 `Images`，保持前后端一致。

### Q4: 详情弹窗数据为空 / Invalid Date

* **现象**：弹窗能打开，但时间显示 Invalid Date，图片不显示，蓝色 Tag 为空。
* **原因**：**双重数据包裹**问题。
  1. Axios 响应本身有一层 `data`。
  2. Strapi v5 的响应体内部又有一层 `data`。
  3. 代码只解了一层包，导致前端试图在 `{ data: {...} }` 这个壳子上找 `treatmentNo`，自然找不到。

* **解决**：实现双重解包逻辑。

```typescript
if (res.status === 200 && res.data && res.data.data) {
  detail.value = res.data.data; // ✅ 剥离两层，直达核心数据
}
```

---

## 3. 下一步建议 (Next Step)

现在你的系统已经具备了相当完善的"读"能力（查看患者、查看关联的治疗记录、查看影像）。

# 患者管理页面 UI 美化与移动端适配 - 阶段总结

在这一阶段，我们从一个传统的 PC 端后台表格（Table），成功转型为一个 **现代化、响应式、移动优先（Mobile First）** 的卡片式应用。

## 1. 开发成果 (Achievements)

### A. 核心布局重构 (Layout Transformation)

- **弃用表格**：废弃了在手机上体验极差的 `el-table` 组件。

- **采用栅格卡片**：使用 Element Plus 的 `el-row` 和 `el-col` 构建了响应式网格。
  - 大屏：一行 4 张卡片 (lg=6)，高效利用空间。
  - 平板：一行 2 张卡片 (sm=12)。
  - 手机：一行 1 张卡片 (xs=24)，完美铺满屏幕。

### B. 视觉与交互优化 (UI/UX)

- **去头像化设计**：移除了头像，改用 **加粗姓名 + 彩色性别图标**（蓝/粉）来区分性别，视觉更专业干练。

- **治疗记录可视化**：
  - 重点突出：将"一堆按钮"改为一个醒目的 **蓝色状态块**，只显示最近一次治疗的时间和部位。
  - 历史收纳：过往记录收纳进"更多历史"下拉列表，保持界面整洁。

- **辅助信息**：增加了 `calculateAge` 函数，自动将出生日期转换为"年龄"，更符合医生直觉。

### C. 移动端深度适配 (Mobile Adaptation)

- **导航栏改造**：实现了 PC 端侧边栏 (Sidebar) 与移动端抽屉 (Drawer) 的自动切换。

- **触控优化**：增大了新建按钮和弹窗操作区的尺寸，适配手指点击。

## 2. 遇到的问题与解决方案 (Troubleshooting Log)

这一阶段主要面临 **CSS 布局冲突** 和 **TypeScript 类型安全** 两个层面的挑战。

### Q1: 手机端布局错乱，侧边栏挤压内容

**现象**：在手机上打开网页时，左侧深色菜单栏依然存在，占据了屏幕 40% 的宽度，导致右侧卡片被挤压变形。

**原因**：`layout/index.vue` 中的 CSS 媒体查询类名 (`.sidebar-container`) 与实际模板中使用的类名 (`.aside`) 不匹配，导致隐藏样式的代码未生效。

**解决**：
- 修正 CSS 选择器，使用 `@media screen and (max-width: 768px)` 强制隐藏 PC 端侧边栏 (`display: none`)。
- 引入 **汉堡菜单按钮 + el-drawer 组件**，在手机端通过抽屉滑出菜单，保证导航功能可用。

### Q2: TypeScript 报错 "Object is possibly 'undefined'"

**现象**：在模板中访问 `patient.treatments[0].treatmentNo` 时报错，虽然用了 `v-if` 判断长度。

**原因**：TypeScript 的静态分析不够智能，或者认为数组索引访问可能越界/为空。

**解决**：
- 放弃非空断言 (`!`)，改用更安全的 **可选链操作符 (`?.`) 和 空值合并 (`||`)**。
- 代码示例：`{{ patient.treatments?.[0]?.treatmentNo || '最新' }}`。

### Q3: 弹窗在手机上过宽

**现象**：`TreatmentDetailDialog` 弹窗宽度写死为 700px，在手机上撑破屏幕或需要横向滚动。

**原因**：固定像素宽度不具备响应性。

**解决**：改为 **百分比宽度 + 最大宽度限制**。
- 代码：`width="90%"` (手机适配) + `style="max-width: 450px"` (电脑限制)。

### Q4: "更多历史"记录显示不全

**现象**：点击"更多历史"时，列表里缺了一条记录。

**原因**：代码中使用了 `.slice(1)`，原本是为了跳过第一条（因为第一条已高亮显示），但后来交互改为"查看所有历史"，切片逻辑多余。

**解决**：移除 `.slice(1)`，遍历完整数组。

---


# 📝 开发实战记录：治疗部位翻译与规范化

## 开发目标
本次开发的目标是实现全系统内治疗部位从"后端英文枚举"到"前端中文显示"的转换，并建立一套标准化的常量管理机制。

## 1. 核心架构：建立单一事实来源 (Single Source of Truth)

为了避免在多个组件中重复写死翻译逻辑，首先在 `src/constants/treatment.ts` 中建立了中心化的常量池：

- **翻译映射表 (TREATMENT_TARGET_MAP)**：定义了从 Strapi 后端枚举值到中文标签的 1:1 映射。
- **选项数组 (TARGET_OPTIONS)**：通过 `Object.entries` 自动生成的对象数组，专供下拉选择器 (`el-select`) 使用，确保 Label 和 Value 始终匹配。

## 2. 类型增强：实现类型安全 (Type Safety)

在 `src/api/types.ts` 中，摒弃了手动维护字符串联合类型的方式：

- **动态推导**：利用 TypeScript 的 `keyof typeof` 特性，从常量映射表的键名中自动推导 `TreatmentTarget` 类型。
- **效果**：当常量表更新时，全系统的代码补全和类型检查会自动同步，无需手动修改类型定义。

## 3. UI 适配：全系统多点应用

在各业务模块中引入常量并实现翻译展示：

### 治疗记录列表 (views/treatments/index.vue)
- **表格**：使用自定义插槽，通过 `TREATMENT_TARGET_MAP[row.target]` 渲染中文。
- **表单**：将 `el-option` 绑定至 `TARGET_OPTIONS`，实现"选中文，存英文"。

### 患者管理卡片 (views/patients/index.vue)
- 在"最近治疗"栏位通过映射表显示中文部位。

### 详情弹窗 (components/TreatmentDetailDialog.vue)
- 在详情顶部的 `el-tag` 处实现翻译转换。

## 🐛 遇到的问题与解决方案 (Troubleshooting)

| 问题现象 (Symptom) | 根本原因 (Root Cause) | 解决方案 (Solution) |
|---|---|---|
| 多处维护成本高 | 部位名称在多个组件中硬编码，修改一处需同步修改多处。 | 常量化管理：将所有部位定义提取到 `src/constants/treatment.ts`。 |
| 类型定义不同步 | `types.ts` 里的类型与实际映射表可能不一致，导致 IDE 无法准确纠错。 | 动态推导类型：使用 `export type TreatmentTarget = keyof typeof TREATMENT_TARGET_MAP`。 |
| 提交数据非法 | Strapi 后端枚举字段只接受英文，如果前端直接传中文会导致 400 错误。 | Label/Value 分离：下拉框显示 label (中文)，但 `v-model` 绑定 value (英文)。 |
| 数据渲染不确定性 | 如果后端返回了映射表之外的旧数据，前端可能显示为空。 | 防御性渲染：使用 `TREATMENT_TARGET_MAP[key] || '未知部位'` 确保始终有备选显示。 |

# 开发记录 - Phase 4.5

## 一、 开发过程回顾

### 1. 后端模型构建 (Strapi v5)

- **字段定义**：在 Patient 集合类型中新增了名为 past_treatments 的字段。

- **类型选择**：由于 Strapi 原生枚举 (Enumeration) 仅支持单选，因此选用了 JSON 类型来存储字符串数组（如 ['surgery', 'laser']）。

### 2. 前端标准化管理 (Constants & Types)

- **常量池建设**：在 src/constants/treatment.ts 中建立了 PAST_TREATMENT_MAP（翻译映射）和 PAST_TREATMENT_OPTIONS（供 UI 使用的选项数组）。

- **类型推导**：通过 TypeScript 的 keyof typeof 动态推导 PastTreatment 类型，确保前后端字段值的一致性。

- **接口更新**：在 src/api/types.ts 的 Patient 接口中加入了 past_treatments 属性。

### 3. 业务逻辑与 UI 实现

- **表单初始化**：在 formData 中将 past_treatments 默认值设为 ['none']（即"无"）。

- **交互逻辑**：使用 Element Plus 的 el-checkbox-group 实现多选，并通过 watch 监听器实现了"无"选项与其他治疗选项的互斥逻辑。

- **数据展示**：在患者卡片上，利用映射表将后端返回的英文 Key 实时转换为中文标签显示。

## 二、 遇到的问题与解决方法 (Troubleshooting)

在开发过程中，我们通过三轮调试解决了 TypeScript 类型安全和 Strapi v5 接口规范的问题：

| 问题分类 | 现象描述 / 报错信息 | 根本原因 | 解决方法 |
|---------|-------------------|---------|---------|
| TS 引用错误 | ts(2552): 找不到名称 "PastTreatment" | 在目标文件中未显式导入在常量文件中定义的类型。 | 在 types.ts 或组件中使用 `import type { PastTreatment }` 进行导入。 |
| 模板变量丢失 | ts-plugin(2339): 类型上不存在属性 "form" / "PAST_TREATMENT_OPTIONS" | 变量未在 `<script setup>` 顶层定义，或未正确导入到组件中。 | 确保所有在 Template 中使用的变量都在 Setup 中定义并 export，或检查是否误写在了嵌套对象内。 |
| 接口调用失败 | 400 Bad Request (修改患者数据时报错) | 字段污染：发送的请求载荷 data 对象中包含了系统保留字段 documentId。 | 数据清洗：在 API 层（patient.ts）使用解构赋值剔除 documentId、id 及 treatments 等非属性字段。 |

## 三、 核心经验总结

1. **Strapi v5 写入规范**：执行 PUT 或 POST 操作时，传递给 data 对象的必须纯粹是 schema.json 中定义的 attributes。任何如 documentId 或 createdAt 的系统字段都会导致校验失败。

2. **单一事实来源 (SSOT)**：通过在 constants 中统一定义翻译表，不仅解决了多语言显示问题，还通过类型推导保障了代码在重构时的健壮性。

3. **互斥逻辑处理**：在医学表单中，利用 Vue 的 watch 深度监听可以优雅地处理"无"与其他选项的逻辑排他性，提升数据录入的准确度。


# 搜索与按钮样式开发总结

## 一、核心功能演进回顾

整个搜索体系的构建经历了一个从"基础功能"到"准生产级交互"的过程：

- **UI 标准化 (Standardization)**：
  - 统一将搜索框、搜索按钮、高级搜索按钮及新建按钮的 `size` 设为 `large`（40px 高度），确保视觉对齐。
  - 采用 Flex 布局管理顶部操作栏，利用 `flex: 1` 让输入框自适应拉伸，而按钮通过 `flex-shrink: 0` 保持固定宽度。

- **搜索逻辑增强 (Search Logic)**：
  - 模糊搜索：利用 Strapi v5 的 `$containsi` 操作符实现不区分大小写的姓名匹配。
  - 高级搜索：构建了基于 `filters` 的组合查询，支持性别、生日区间及既往治疗（JSON 数组）的精确筛选。

- **响应式适配 (Responsive Design)**：
  - 布局转型：弃用 `el-table`，改用 `el-row`/`el-col` 栅格卡片，提升在手机端的展示效率。
  - 空间收纳：将复杂的高级搜索表单收纳进 `el-drawer`（抽屉），确保移动端首屏简洁。

## 二、遇到的问题与解决方法 (Troubleshooting)

在样式调整与功能集成过程中，主要攻克了以下难点：

### 1. UI 布局与高度对齐问题

| 现象 (Symptom) | 根本原因 (Root Cause) | 解决方案 (Solution) |
|---------|---------|---------|
| 搜索框与按钮高度错位 | Element Plus 组件未显式声明 `size`，导致不同组件回退到不同的默认高度。 | 统一在 Template 中为 `el-input` 和 `el-button` 设置 `size="large"`。 |
| 侧边栏挤压搜索区域 | 移动端未正确隐藏 PC 侧边栏，导致有效显示宽度被压缩。 | 修正 CSS 媒体查询类名，在 768px 以下强制隐藏 `.aside` 并改用抽屉导航。 |
| 高度塌陷/菜单消失 | Vue 根节点 `#app` 默认高度由内容撑开，导致侧边栏无法撑满全屏。 | 在 `App.vue` 中强制设置 `html, body, #app { height: 100% }`。 |

### 2. 移动端溢出与挤压问题

| 现象 (Symptom) | 根本原因 (Root Cause) | 解决方案 (Solution) |
|---------|---------|---------|
| 搜索组件超出屏幕右侧 | 在窄屏下，多个固定宽度的按钮强制并排，导致 `el-input` 宽度被挤压至 0。 | 在媒体查询中使用 `flex-direction: column` 将布局重组，输入框与按钮组分行显示。 |
| 高级搜索抽屉内容切断 | 抽屉 `size="380px"` 超过部分旧款手机的屏幕宽度。 | 将抽屉宽度设为响应式，移动端强制使用 `size="100%"` 或 `size="90%"`。 |
| 日期选择器撑破布局 | `el-date-picker` 范围模式在移动端有最小宽度限制，无法自适应。 | 使用 `:deep()` 穿透组件样式，强制设置 `width: 100% !important` 并缩小内部字体。 |

### 3. 交互逻辑与后端适配

| 现象 (Symptom) | 根本原因 (Root Cause) | 解决方案 (Solution) |
|---------|---------|---------|
| 变量未定义报错 (2304) | 在实现高级搜索时，变量名拼写不一致（如多打了 `Search` 关键字）。 | 统一变量名为 `advancedSearchForm` 并重启 TS Server 刷新缓存。 |
| 搜索结果不准确 | 逻辑中未处理"顶部搜索框"与"高级搜索框"的优先级。 | 在 `fetchData` 中实现逻辑合并：优先使用高级搜索字段，为空则回退至通用关键词。 |
| JSON 字段无法筛选 | Strapi v5 对 JSON 类型（如 `past_treatments`）需要特定的 `$contains` 语法。 | 确保后端 Schema 字段名为大写 `Images` 或准确的下划线格式，前端按需构建 `$contains` 对象。 |

## 三、核心开发经验总结 (Key Takeaways)

- **单一事实来源 (SSOT)**：通过 `constants` 统一定义治疗部位等映射表，避免了在搜索和展示时出现硬编码导致的逻辑不一致。

- **移动优先 (Mobile First)**：对于医疗 CMS 这种需要现场使用的系统，弹窗和抽屉必须使用百分比宽度，且复杂组件（如日期范围）需做深度样式降级。

- **防御性解包**：Strapi v5 的响应结构较深，处理 `res.data.data` 时必须通过可选链或逻辑判断防止页面白屏。


# iOS 图片上传旋转问题完整复盘 (Phase 4.7)


## 一、 核心问题：为什么 iOS 拍照会旋转？

### 现象
在 iPhone/iPad 上拍照上传后，预览看着是正的，但上传到服务器并在列表页显示时，图片往往旋转了 90 度或 180 度。

### 原理
iOS 为了拍照速度，相机传感器始终按"横屏"模式记录数据。如果用户竖屏拍照，iOS 不会旋转像素，而是给图片打上一个 EXIF Orientation 标记（告诉显示设备"请旋转 90 度显示我"）。

### 坑点
- **浏览器预览**：Safari/Chrome 读取 Blob 时会自动应用 EXIF，所以预览是正的（视觉欺骗）。
- **后端存储**：上传的是原始二进制流（物理像素是躺着的）。如果后端或列表页组件不识别 EXIF，图片就会打回原形。

## 二、 解决过程与演进

### 阶段 1：尝试自动修正 (Compressor.js)
- **尝试**：引入 compressorjs 插件，设置 `checkOrientation: true`。
- **问题**：插件不起作用
- **结论**：完全依赖自动算法不可靠，需要人工介入 + 强制清洗。

### 阶段 2：交互流程重构 (延迟上传)
- **需求**：为了支持医生手动旋转修正，不能一选图就上传。
- **改造**：
  - 将 `el-upload` 改为 `auto-upload="false"`。
  - 组件内部维护 `localFileList`，仅在前端进行图片处理。
  - 父组件点击"确认创建"时，调用 `submitAll()` 批量上传。

### 阶段 3：终极方案——"像素固化" (Pixel Baking)
- **问题**：即使在预览弹窗里看着是正的，上传后列表页还是歪的。
- **原因**：预览用的是 `<img>` 标签（浏览器处理了 EXIF），但上传传的是 File 原件（带 EXIF 的歪图）。
- **解决**：
  - 利用 Canvas 的 `drawImage` 方法。
  - 将浏览器渲染好的（视觉正确的）Image 对象画到画布上。
  - 即使不旋转（角度0），也要重绘。
  - **效果**：Canvas 导出的是纯像素数据，EXIF 被剥离，物理像素被永久"扶正"。

## 三、 遇到的关键问题 (Bug) 与 解决方案 (Fix)

| 问题分类 | 具体表现 | 原因分析 | 解决方案 |
|--------|--------|--------|--------|
| 旋转逻辑 | 插件不起作用（仍然自动颠倒） | 插件不起作用。 | 禁用插件的自动修正，或者依靠 Canvas 重绘接管控制权。 |
| 特殊场景 | 俯拍（拍伤口）方向随机 | 手机平行地面时，陀螺仪无法判断方向（万向节死锁）。 | 增加"手动旋转"按钮。允许用户在上传前预览并点击按钮修正方向。 |
| TypeScript | Object is possibly undefined | 数组索引访问 `list[index].url` 被 TS 认为可能为空。 | 使用 计算属性 (Computed) `currentFile` 统一处理空值检查，或使用可选链 `?.`。 |
| 异步陷阱 | 上传的文件大小为 0 字节 | `processRotation` 中图片还没加载完（onload前）就绘制了 Canvas。 | 增加 `fileToImage` 辅助函数，强制 `await img.onload` 确保图片就绪后再绘图。 |
| 后端报错 | API 返回 400 Bad Request | Strapi 报错 Invalid key data。 | 双重封装问题。API 函数封装了一层 `{data: ...}`，组件调用时又封装了一层。解包即可。 |
| 画质损耗 | 图片模糊 | compressorjs 和 Canvas 导出默认会有压缩（默认 0.8）。 | 将 Canvas 导出质量参数 (encoderOptions) 和插件参数显式设为 1.0。 |

📝 开发实战记录：患者页面交互重构与移动端适配
一、 开发目标与过程回顾

本次开发的主要目标是将原本信息过载的"患者卡片"进行瘦身，并将详细的治疗历史转移至"详情弹窗"中，同时重点优化移动端的浏览体验（如图片滑动）。
1. 界面重构 (UI Refactoring)

    列表页瘦身：移除了卡片上复杂的"最新治疗"预览和操作按钮，仅保留患者基本信息（姓名、年龄、性别）和"既往病史"摘要，点击卡片即可打开详情。

    详情弹窗设计：

        采用了 "患者信息头 + 治疗时间轴" 的布局。

        使用 el-collapse（折叠面板）展示治疗历史，每条记录独立封装，解决了 Element Plus 默认样式"连体"的问题。

        提供了三种设计风格（清爽医疗、现代卡片、时间轴），最终选用了 现代卡片风 (Modern Card)。

2. 数据逻辑增强 (Data & API)

    按需加载：列表页仅加载基础信息，点击卡片后才触发 open(id) 方法，请求该患者完整的治疗记录与图片。

    API 改造：修改了 src/api/patient.ts，修复了硬编码 populate 导致组件传参无效的问题，实现了对 Images 字段的精准获取。

3. 移动端交互升级 (Mobile Interaction)

    手势滑动：摒弃了只能点击切换图片的交互，实现了 "左右滑动切图" 的原生级体验。

    引用隔离：解决了在 v-for 循环中，多个轮播图实例互相干扰的问题，实现了每条记录独立控制。

    预览优化：修复了点击第 N 张图却总是从第 1 张开始预览的问题。

二、 遇到的问题与解决方法 (Troubleshooting Log)

在本次开发中，我们攻克了以下 7 个关键技术难点：

| 问题分类 | 现象描述 (Symptom) | 根本原因 (Root Cause) | 解决方案 (Solution) |
|---------|------------------|-------------------|-----------------|
| API 数据 | 图片显示为空：详情弹窗展开后，图片区域空白，调试发现 Images 字段不存在。 | 1. Strapi v5 机制：默认不返回深层嵌套关系（孙子级数据）。2. API 拦截：src/api/patient.ts 中硬编码了 populate 参数，覆盖了组件传递的 Images 请求。 | 1. 修改 API 封装，优先使用组件传入的 populate 参数。2. 在组件中显式声明 populate: { treatments: { populate: 'Images' } }。 |
| 样式布局 | 折叠面板头部塌陷：治疗记录的日期和 Tag 被挤压或消失。 | Element Plus 的 header 默认 width: 100% 且 flex 布局未处理好剩余空间分配。 | 使用 CSS :deep() 穿透，给标题容器设置 flex: 1 和 min-width: 0，并强制 white-space: nowrap 防止日期换行。 |
| 交互逻辑 | 滑动控制错乱：滑动第 3 条记录的图片，结果第 1 条记录的图片被切换了。 | 使用了全局单一的 ref，导致所有轮播图都绑定到了同一个变量上。 | 1. 改用 carouselRefs 对象字典存储实例。2. 使用 :ref="(el) => setCarouselRef(el, index)" 动态绑定。3. 触摸结束时传入 index 精准控制目标实例。 |
| TypeScript | 对象可能未定义：e.touches[0].clientX 报错 Object is possibly undefined。 | TS 严格模式认为数组可能为空。 | 使用 非空断言符 (!)，如 e.touches[0]!.clientX，明确告诉编译器此处必有值。 |
| 手势冲突 | 滑动图片时页面乱滚：左右滑图片时，页面会跟着上下滚动，体验极差。 | 浏览器的默认滚动行为与我们的 JS 手势逻辑冲突。 | 在图片容器 .image-wrapper 上设置 CSS 属性 touch-action: none;，强制接管该区域的触摸事件。 |
| 预览体验 | 大图预览位置错误：已经在走马灯滑到了第 3 张，点开大图却显示第 1 张。 | el-image 的预览器默认索引 (initial-index) 为 0。 | 在 v-for 中获取 imgIndex，并绑定 :initial-index="imgIndex"，同步列表与预览器的位置。 |
| 环境依赖 | Vite 启动报错：Error: ENOENT... node_modules\qs\... | 误删文件或依赖安装不完整，导致 qs 库丢失。 | 停止服务，运行 npm install 重新补全依赖。 |



# 📝 全栈开发实战记录 - Phase 4.9：治疗时长字段集成

**日期：** 2025年12月28日  
**模块：** 治疗记录 (Treatment)  
**目标：** 在治疗记录中新增"治疗时长 (duration)"字段，实现从数据库到前端展示的全链路打通，并优化详情页的视觉体验。

---

## 一、 开发流程 (Development Workflow)

本次迭代遵循了标准的 **"后端优先 → 类型定义 → 逻辑接入 → UI 呈现"** 的全栈开发模式：

### 1. 后端构建 (Strapi v5)

- **操作：** 在 Content-Type Builder 中为 Treatment 集合增加字段。
- **配置：**
  - Field Name: `duration`
  - Type: `Number (Integer)`
  - Default Value: `0`
  - Required: `False` (兼容旧数据)

### 2. 前端类型同步 (TypeScript)

- **文件：** `src/api/types.ts`
- **操作：** 更新 Treatment 接口定义，增加可选字段。

```typescript
export interface Treatment {
  // ...
  duration?: number; // 新增字段
}
```

### 3. 业务逻辑接入 (Vue Logic)

- **文件：** `src/views/treatments/index.vue`
- **表单模型：** 在 `formData` 中初始化 `duration`。
- **提交逻辑：** 这是本次最关键的改动点。在 `handleSubmit` 函数组装 Payload 时，显式加入该字段。

```typescript
const submitData = {
  // ...其他字段
  duration: formData.duration, // ✅ 必须显式包含
  Images: imageIds
}
```

### 4. UI 界面呈现

- **新建弹窗：** 使用 `el-input-number` 允许用户输入时长（单位：小时）。
- **列表页：** 在 `el-table` 中新增一列，使用 `el-tag` 展示时长。
- **详情弹窗：** 在 `PatientDetailDialog.vue` 的折叠面板头部，增加带图标 (Timer) 的时长标签。

---

## 二、 遇到的问题与解决方案 (Troubleshooting Log)

本次开发中主要攻克了数据静默丢失、环境缓存报错以及样式定制三个问题。

| 问题分类 | 现象描述 (Symptom) | 根本原因 (Root Cause) | 解决方案 (Solution) |
|---------|-------------------|-------------------|------------------|
| **数据持久化** | 静默失败：API 请求成功 (200 OK)，列表也能刷新，但新增的"时长"字段始终为空或 0，后端数据库未存入。 | 前端 Payload 组装缺失。虽然在 API 封装层 (`createTreatment`) 支持透传 data，但在组件层 (`handleSubmit`) 手动构建提交对象时，漏写了 `duration` 字段。 | **补全 Payload：** 在 `src/views/treatments/index.vue` 的提交逻辑中，显式添加 `duration: formData.duration`。 |
| **开发环境** | 幽灵文件报错：删除旧组件 `TreatmentDetailDialog.vue` 后，`tsconfig.app.json` 依然报错提示找不到该文件。 | TS 服务缓存滞后。VS Code 的 TypeScript Language Server 没有及时刷新文件列表，仍试图索引已删除的文件。 | **重启 TS 服务：** 在 VS Code 中使用 `Ctrl+Shift+P` → `Restart TS Server`，强制刷新缓存。 |
| **UI 样式** | 字体过小：详情弹窗中的"第N次"、"1小时"和日期显示不够醒目。 | 默认样式限制。Element Plus 的 small 尺寸组件和默认字体大小无法满足重点突出的需求。 | **样式重写：** 1. 将 `el-tag` 尺寸改为 `large`。 2. 编写 CSS 覆盖：`font-size` 提升至 24px (标题) 和 16px (日期)。 |

---

# 开发记录：新建治疗记录组件集成

## 1. 功能概述

本次开发的核心目标是实现**"治疗记录"的快捷创建**，并将其复用到系统的不同层级中。

- **组件名称**： TreatmentCreateDialog.vue
- **涉及页面**： 
  - views/patients/index.vue (病人列表)
  - components/PatientDetailDialog.vue (病人详情)
- **核心能力**： 支持"锁定病人"模式（从病人入口进入）和"搜索病人"模式（独立入口进入，暂未启用但预留逻辑），支持多图上传、部位选择及治疗时长记录。

## 2. 核心开发步骤

### 第一步：组件封装 (TreatmentCreateDialog.vue)

**状态管理**： 使用 isPatientLocked 状态位。
- 如果调用 open({ documentId, Name }) 传入了参数，则锁定输入框，禁止修改病人。
- 如果未传参，则允许通过 API 远程搜索病人（searchPatients）。

**表单设计**：
- 包含：关联患者、治疗部位、治疗时长、影像上传（复用 ImageUploader）、手动序号。
- 使用了 nextTick 清除表单校验残留。

**对外暴露**： 使用 defineExpose({ open }) 供父组件调用，遵循统一的交互规范。

**事件通信**： 提交成功后触发 emit('success')，通知父组件刷新数据。

### 第二步：详情页集成 (PatientDetailDialog.vue)

**入口位置**： 放置在弹窗顶部的 Header 区域（右侧），提高了操作的可见性。

**数据流转**：
- 点击"新建治疗记录" -> 调用子组件 open()，传入当前 patientData。
- 子组件提交成功 -> 触发 @success。
- 父组件捕获事件 -> 重新调用 open(currentDocumentId) 刷新详情数据，更新"共 N 次"标签和时间轴列表。

### 第三步：列表页集成 (views/patients/index.vue)

**入口位置**： 每个病人卡片的底部操作栏（Footer）。

**数据流转**：
- 点击卡片按钮 -> 获取当前行数据 row -> 调用子组件 open()。
- 提交成功 -> 触发 @success -> 调用 fetchData() 刷新整个列表（更新卡片上的统计数据）。

Dev Context Snapshot [2025-12-29]
1. 核心任务与状态

    当前目标: 重构患者列表卡片 (PatientCard) UI，优化移动端交互与视觉层级。

    当前状态: ✅ 代码已生成 (Ready to Apply)

    关键文件:

        src/views/patients/index.vue: 修改 Header/Body/Footer 结构，引入下拉菜单。

2. 本次会话变动 (Changelog)

    [UI重构] el-card Header:

        移除: 独立的年龄 Tag。

        新增: el-dropdown (图标: MoreFilled, 旋转90度)，包含"编辑"与"删除"选项。

        逻辑: 添加 @click.stop 阻止冒泡，避免触发卡片详情跳转。

    [UI重构] el-card Body:

        修改: 将年龄信息 (N岁) 移至生日字段旁显示。

    [UI重构] el-card Footer:

        移除: 原有的"编辑/删除"按钮组。

        保留: 仅保留"新建治疗记录"按钮，样式改为 plain。

    [Style]: 新增 .text-danger 样式，使下拉菜单中的删除项显示为红色。

3. 挂起的任务与已知问题 (CRITICAL)

    TODO: 将提供的 <template>, <script> (imports), <style> 代码片段应用到 src/views/patients/index.vue。

    Note: 需验证移动端点击"三个点"图标的触控区域是否足够灵敏。

4. 环境与依赖上下文

    Tech Stack: Vue 3, TypeScript, Element Plus (Icons: @element-plus/icons-vue)

    Config: 依赖 MoreFilled 图标组件。

Dev Context Snapshot [2025-12-29]
1. 核心任务与状态

    当前目标: 优化 TreatmentCreateDialog 组件的移动端适配、弹窗定位及表单默认值逻辑。

    当前状态: 已完成 (代码已生成，待应用)。

    关键文件:

        src/components/TreatmentCreateDialog.vue: 全量重构 template (布局/属性) 与 script (响应式逻辑/默认值)。

2. 本次会话变动 (Changelog)

    [重构] 响应式布局:

        引入 window.innerWidth 监听，计算 isMobile (<768px)。

        el-form: 移动端 label-position 设为 top，PC 端设为 right。

        el-col: 字段布局调整为 :xs="24" :sm="12" (手机端强制换行)。

    [优化] 弹窗体验 (UI/UX):

        el-dialog: 宽度调整为 :width="isMobile ? '90%' : '600px'"。

        el-dialog: 顶部距离调整为 :top="isMobile ? '4vh' : '5vh'" (解决 PC/Mobile 弹窗位置过低问题)。

        CSS: 放弃了 overflow-y: auto 的内部滚动方案，回归 Element Plus 默认页面滚动逻辑。

    [修改] 表单默认值:

        target: 默认值由 'face' 改为 '' (强制用户选择)。

        duration: 默认值设为 1，步长 1，精度 0 (仅允许整数)。

3. 挂起的任务与已知问题 (CRITICAL)

    NOTE: 用户明确决定删除用于强制内部滚动的全局 <style> 块，保留 scoped 样式。

4. 环境与依赖上下文

    Tech Stack: Vue 3 (Composition API), TypeScript, Element Plus.

    Utils: 使用原生 window.addEventListener('resize') 实现响应式判断，未引入 @vueuse/core。

Dev Context Snapshot [2025-12-29]
1. 核心任务与状态

    当前目标: 优化 PatientDetailDialog 组件在移动端的显示，解决治疗记录折叠面板头部信息拥挤溢出的问题。

    当前状态: 已完成 (代码待应用)

    关键文件:

        src/components/PatientDetailDialog.vue: 重构 <el-collapse-item> 的 #title 插槽结构与样式。

2. 本次会话变动 (Changelog)

    [重构] 治疗记录头部布局 (Header Layout):

        从单行 Flex 布局改为 上下分层 (Column) 布局。

        Row 1: treatmentNo (序号) + target (部位 Tag, style: plain)。

        Row 2: duration (时长) + date (日期)。

    [UI/UX] 视觉优化:

        增加 padding: 8px 0 扩大点击区域。

        第二行辅助信息采用灰色小字 (#9ca3af)，增强层级感。

    [新增] 字段修饰:

        日期字段前增加静态文本前缀 "记录时间：" 。

3. 挂起的任务与已知问题 (CRITICAL)

    TODO: 将提供的 Template 代码块（#title 部分）与 CSS 代码块（.collapse-header-wrapper 等）应用到 src/components/PatientDetailDialog.vue。

4. 环境与依赖上下文

    Tech Stack: Vue 3, TypeScript, Element Plus (Icons: <Timer />).

    Dependencies: 依赖 ../constants/treatment 中的 TREATMENT_TARGET_MAP 进行字典映射。

Dev Context Snapshot [2025-12-29]
1. 核心任务与状态

    当前目标: 重构 views/treatments/index.vue，废弃局部表单逻辑，集成统一的 TreatmentCreateDialog 组件。

    当前状态: ✅ 已完成 (代码已生成并应用)

    关键文件:

        src/views/treatments/index.vue: 全量替换了 <script> 和 <template>，接入了通用创建弹窗。

2. 本次会话变动 (Changelog)

    [重构] 组件复用:

        引入 TreatmentCreateDialog 替代原有的 el-dialog 表单。

        移除了 ImageUploader、createTreatment、getPatientList 等局部引入。

        删除了 formData、rules、patientOptions 等冗余状态。

    [逻辑] 交互流转:

        handleCreate 改为调用 treatmentCreateRef.value?.open() (无参调用，启用非锁定搜索模式)。

        监听 @success 事件触发 fetchData 刷新列表。

    [数据] 字段同步:

        确保了 duration (治疗时长) 字段在新建流程中的传递已被封装在子组件内，外部无需关心 Payload 组装。

3. 挂起的任务与已知问题 (CRITICAL)

    TODO: 验证在 views/treatments/index.vue 打开弹窗时，"关联患者"搜索框是否正常工作（非锁定状态）。

    TODO: 检查新建记录后，列表页的 "时长" 和 "部位" 字段是否正确渲染。

4. 环境与依赖上下文

    Tech Stack: Vue 3 (Composition API), TypeScript, Element Plus

    Dependencies: 依赖 src/components/TreatmentCreateDialog.vue

    Config: 沿用 VITE_API_URL 环境变量。

Dev Context Snapshot [2025-12-29]
1. 核心任务与状态

    当前目标: views/treatments/index.vue 移动端适配与 TypeScript 类型修复

    当前状态: 已完成 (代码已生成并修正)

    关键文件:

        src/views/treatments/index.vue: 实现 Table/Card 响应式切换，修正 getThumbnailUrl 参数签名。

2. 本次会话变动 (Changelog)

    [新增] 响应式布局:

        引入 isMobile (阈值 768px) 及 resize 监听。

        PC 端保持 <el-table>，移动端渲染 .mobile-card 列表。

        顶部搜索栏在移动端改为垂直堆叠 (Column Layout)。

    [优化] 分页逻辑: 移动端强制简化为 prev, pager, next 布局。

    [修复] TS 类型错误:

        报错: item.Images[0] 可能为 undefined 导致无法赋值给 StrapiMedia。

        解决: 修改 getThumbnailUrl 签名，接受 StrapiMedia | undefined 并内部处理空值。

3. 挂起的任务与已知问题 (CRITICAL)

    TODO: 在真机环境验证移动端卡片列表的滚动流畅度及图片预览 (Preview) 的层级显示。

    TODO: 检查新建弹窗 (TreatmentCreateDialog) 在移动端触发时的宽度适配情况。

4. 环境与依赖上下文

    Tech Stack: Vue 3 (Composition API), TypeScript, Element Plus (Icons: Timer, Calendar, Plus, etc.)

    Config: 依赖 VITE_API_URL 环境变量。
