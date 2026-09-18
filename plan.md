# 随时记 — Build Plan

- Derived from: spec.md (spec-001, approved), intent/intent.md (intent-001, approved)
- Author: product-engineer
- Status: Draft
- Date: 2026-09-18

## Files that change

- index.html
- style.css
- app.js

全部新建，位于仓库根目录，零构建、零依赖。不改其他文件。

## Order of work

### Step 1 — index.html：静态骨架

产出：
- `<head>` 引入 style.css 与 defer 的 app.js，`<title>随时记</title>`，`<html lang="zh-CN">`。
- 顶部统一消息提示容器 `<div id="toast" role="status" aria-live="polite"></div>`，置于 `<body>` 直接子级（全局容器，不放入任何 section —— 落实 spec-001 Nit 4：提示/模态容器的 DOM 归属为全局，与三个 section 平级）。
- 三个常驻视图 section：`#view-new`、`#view-list`、`#view-detail`，默认隐藏，由 router 切换。
- 登记表单：`#f-title`（text）、`#f-content`（textarea）、`#f-time`（datetime-local），每个控件配 `<label>`；`#form-error`（红色错误文案位）；提交按钮。
- 列表视图：搜索框 `#search-input`（label「搜索」）+ `<ul id="record-list">`。
- 详情视图：`#d-title`、`#d-content`、`#d-time` 空壳节点 + `<button id="d-delete">删除</button>`。
- 不含任何动态数据；打开即渲染骨架无 JS 错误。

### Step 2 — style.css：全部样式

产出：
- 移动优先的简洁布局，中文界面观感；列表项可点击态、表单基础样式。
- `#toast` 定位为**页面顶部居中的浮层**，含 `.toast-error`（红）/`.toast-warn`（黄）/`.toast-info`（蓝）三种语义色；所有非阻塞提示（存储不可用黄条、保存失败、数据损坏重置提示等）统一走此容器，3 秒自动消失（持久性提示如「存储不可用」为常驻不消失，见 Step 3）—— 落实 spec-001 Nit 2：消息提示位置与消失时机统一。
- `#form-error` 表单内红色提示样式（区别于 toast：表单校验错误属于字段上下文，留在表单上方）。

### Step 3 — app.js：数据层 + 路由

产出（函数职责按 spec.md Design 节）：
- `loadRecords()` / `saveRecords()`：单 key `suishiji.records`，JSON.parse 包 try/catch，损坏时重置为 `[]` 并 toast 提示「本地数据损坏，已重置」。
- 启动时 localStorage 可用性探测（写入再删除测试值），失败则显示**常驻**顶部黄条「浏览器存储不可用，本次记录不会被保存」，页面进入内存态仍可操作。
- `escapeHtml()`、`formatTime(ts)`。
- hash 路由 `router()`：`#/new` / `#/list` / `#/detail/:id`，`hashchange` 驱动；`#/detail/:id` 的 id 不存在时回退 `#/list`；渲染列表时从 `#search-input` 取当前关键词（不重置，保证删除后返回列表仍保留过滤）。

### Step 4 — app.js：登记功能（F1）

产出：
- 进入 `#/new` 时 `#f-time` 初始化为当前本地时间 `YYYY-MM-DDTHH:mm`。
- submit 校验：标题/内容 trim 后非空，否则显示「标题和内容不能为空」并阻止提交。
- **datetime-local 被清空时**：静默回退为提交时刻 `Date.now()`，**并同步把回退后的时间回显到 `#f-time`**，使保存结果与用户所见一致（落实 spec-001 Minor 2）。
- 保存成功 → `saveRecords` 写入并跳 `#/list`。
- **保存失败（QuotaExceededError 等，`saveRecords` 返回 false）**：toast 提示「保存失败：存储空间已满」，**停留在登记表单视图，标题/内容/时间字段值原样保留，供用户直接重试**（落实 spec-001 Minor 1）。

### Step 5 — app.js：列表 + 搜索（F2）

产出：
- `renderList(keyword)`：`createdAt` 降序、同毫秒按 id 降序；摘要前 50 字符加「…」；时间格式 `YYYY-MM-DD HH:mm`。
- 搜索：`input` 事件实时过滤，`keyword.toLowerCase()` 与 **`title`、`content` 的完整字段值**做子串匹配 —— 明确使用原始存储字段而非 50 字摘要，不受列表截断影响（落实 spec-001 Nit 3）；匹配对大小写不敏感。
- 所有用户内容插入 DOM 前经 `escapeHtml`。
- 空列表文案「暂无记录，去记一条吧」+ 跳登记按钮；搜索无结果文案「没有匹配「关键词」的记录」。
- 列表项点击（事件委托）→ `#/detail/:id`。

### Step 6 — app.js：详情 + 删除（F3、F4）

产出：
- `renderDetail(id)`：完整内容以保留换行方式展示（`white-space: pre-wrap` + 转义），显示格式化创建时间。
- 删除按钮：原生 `confirm('确定删除这条记录吗？')`；确认 → 从数组移除、立即写 localStorage、跳 `#/list`（保留搜索关键词）；取消 → 停留详情。
- 每次增删后立即 `saveRecords`（F4）。
- 删除确认使用原生 `confirm()`，无自定义模态 DOM（spec 已定）；若后续迭代引入自定义模态，其 DOM 归属遵循 Step 1 的全局容器约定（Nit 4 的落实口径）。

### Step 7 — 已知限制记录 + 收尾自查

- 旧版 Safari 对 `datetime-local` 支持不一致，一期不实现类型检测降级，**记为已知限制**（spec-001 Nit 1，评审已同意不阻塞）；在验收报告中注明。
- 自查 spec Gotchas：时间改到过去导致排序变化属预期；file:// 下功能可用。

## Risks

| 风险 | 对策 |
|---|---|
| QuotaExceeded / localStorage 被禁用导致未捕获异常 | saveRecords 全量 try/catch 返回 boolean；启动探测降级为内存态；绝不抛未捕获异常（spec NFR） |
| 用户输入含 HTML/JS 被 innerHTML 注入（XSS） | 所有动态内容经 `escapeHtml` 后插入，列表/详情统一走该函数 |
| datetime-local 清空/非法值造成 createdAt 为 NaN | 校验时回退 `Date.now()` 并回显到表单（Minor 2），保证入库值恒为有效时间戳 |
| 同毫秒记录顺序不稳定 | 排序 createdAt 降序 + id 降序兜底 |
| 删除后返回列表丢失搜索状态 | router 渲染列表时读取 `#search-input` 当前值，不重置 |
| 旧 Safari datetime-local 不可用 | 已知限制（Nit 1），不阻塞一期；记录在验收报告 |
| 提示散落各处、样式与消失时机不一致 | 统一 `#toast` 容器（Nit 2）：阻塞级错误留表单内（`#form-error`），非阻塞提示走顶部 toast，常驻级（存储不可用）不自动消失 |

## Proof

- 手工走查记录（四功能闭环、刷新持久化、搜索过滤、全部边界用例）逐条打勾。
- 有条件时用浏览器自动化（Browser Use）对以下场景截图作为视觉证据：列表有数据态、搜索过滤态、详情页、空列表/无结果态、存储禁用降级黄条。
- evals/ 目录的闭环脚本 + 刷新持久化断言 + 搜索实时性断言通过（spec Verification plan 所列）。

## Verification

1. 起本地服务：`python3 -m http.server 8000`，浏览器打开 `http://localhost:8000/`（hash 路由 + localStorage 在 http 与 file:// 下均可用）。
2. 手工走查四功能闭环：
   - 登记：`#/new` 填标题「测试一」、内容「正文内容」，时间默认当前 → 保存 → 跳转列表可见该条，时间格式 `YYYY-MM-DD HH:mm`。
   - 列表：再登记一条更早时间的记录，确认倒序正确；摘要超 50 字显示「…」。
   - 搜索：在 `#search-input` 输入「正文」（存在于完整 content 但可避开标题），列表实时过滤出目标条，无需回车；输入不存在词显示「没有匹配…」；清空恢复全量。
   - 详情：点击记录 → 完整内容（多行内容换行保留）、标题、时间正确。
   - 删除：点删除 → confirm 弹出 → 取消停留详情；再点确认 → 回列表且该条消失。多行记录场景需确认删除后返回列表仍保留搜索过滤。
3. 刷新持久化：登记 2 条 → `Cmd+R` 刷新 → 数据仍在；刷新落在 `#/detail/:id` 时视图恢复正确。
4. 边界用例：
   - 空标题/全空白内容提交 → 红字提示，无写入（DevTools Application 面板确认 `suishiji.records` 不变）。
   - 清空时间输入提交 → 记录保存，`#f-time` 回显了回退后的提交时刻，列表时间为该时刻。
   - DevTools 禁用站点数据（Block all cookies / 模拟配额）：顶部黄条提示、页面可用；或临时在 Console 设 `localStorage.setItem` 抛异常验证 toast「保存失败：存储空间已满」且表单字段保留。
   - Console 执行 `localStorage.setItem('suishiji.records','{broken')` 后刷新 → 「本地数据损坏，已重置」+ 空列表。
   - 直接访问 `#/detail/not-exist` → 自动回 `#/list`。
5. 健康标准：以上全部通过且 Console 无未捕获异常（红色 error）。

## Parallelization

- 三文件为单一功能整体，由 product-engineer 一人顺序完成（Step 1→7），不拆分并行会话。
- 无其他 agent 同时改同一批文件；reviewer 只读评审，不产生写冲突。
