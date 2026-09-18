# 随时记 — Specification

- Derived from: intent/intent.md (gate ledger: intent-001)
- Author: product-engineer (agent) + Bouboo (human reviewer)
- Status: Draft
- Date: 2026-09-18

## Requirements

### Functional

**F1 登记（新增记录）**
- 表单字段：标题（text，必填）、内容（textarea，必填）、创建时间（datetime-local，自动填充为当前时间，用户可修改）。
- 提交时校验：标题与内容均去除首尾空白后不得为空，否则禁止提交并提示「标题和内容不能为空」。
- 保存成功后：写入 localStorage，跳转到列表视图。
- 时间自动生成逻辑：进入登记视图时，将时间输入框初始化为 `new Date()` 的本地时间（格式 `YYYY-MM-DDTHH:mm`）；用户可任意改动，保存时按用户改后的值为准。

**F2 列表**
- 按创建时间倒序展示全部记录（`createdAt` 降序；同毫秒时按 `id` 降序兜底）。
- 每条展示：标题、内容摘要（前 50 字符，超出加「…」）、创建时间（格式 `YYYY-MM-DD HH:mm`）。
- 顶部搜索框：输入关键词实时过滤（`input` 事件，无需回车），匹配规则为大小写不敏感的子串匹配，范围覆盖标题与内容（`title.toLowerCase().includes(kw) || content.toLowerCase().includes(kw)`）。
- 点击任一条记录 → 进入该记录详情视图。
- 清空搜索框即恢复全量列表。

**F3 详情**
- 展示完整信息：标题、完整内容（保留换行）、创建时间。
- 提供「删除」按钮，点击后弹出二次确认（原生 `confirm()`：`确定删除这条记录吗？`）。确认则删除并返回列表视图；取消则停留。

**F4 持久化**
- 所有增删后立即写 localStorage；刷新页面后数据不丢失。

### Non-functional

- 中文界面。
- 零依赖、零构建：纯 HTML/CSS/JS，直接以静态文件打开或任意静态服务器托管。
- 首屏渲染无网络请求。
- localStorage 不可用或写入失败时给出降级提示（见 Design / 边界情况），不得抛未捕获异常导致页面不可用。
- 搜索输入即时响应，几百条记录量级下无需虚拟化。

## Design

### 数据模型

- 存储 key：单 key 方案，`suishiji.records`，值为 JSON 数组。
  - 理由：数据量小，倒序排序与搜索需全量遍历；单 key 一次 `getItem` 即可，免去 key 枚举（`localStorage.length` 遍历）与 `suishiji.record.` 前缀拼接的复杂度。
- 记录结构（数组元素）：
  ```
  {
    "id": "r-1726636800000-x7k2a",   // `r-` + Date.now() + '-' + 5位随机 base36
    "title": "字符串",
    "content": "字符串（保留换行）",
    "createdAt": 1726636800000        // 毫秒时间戳（number），来自用户可改的时间输入
  }
  ```
- id 生成：`"r-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7)`。时间戳部分保证大体有序，随机后缀避免同毫秒冲突；不做 UUID（调试与排序无需，长度更短）。
- createdAt 用 number 时间戳而非字符串：排序、比较可靠；展示时统一格式化。
- 读取时做防御性解析：`JSON.parse` 包 try/catch，解析失败视为空数组并提示「本地数据损坏，已重置」。

### 视图路由

- 采用 hash 路由（`#/list`、`#/new`、`#/detail/:id`），`hashchange` 事件驱动渲染。
  - 理由：支持浏览器前进/后退与刷新停留在当前视图（显示/隐藏方案做不到后退）；实现成本与显示/隐藏方案相当；无需服务器路由配置（区别于 History API）。
- 视图结构：三个 `<section>`（`view-new` / `view-list` / `view-detail`）常驻 DOM，路由函数按 hash 显示对应 section、隐藏其余，并调用对应渲染函数。
- `#/detail/:id` 中 id 不存在（如已被删除后点后退）→ 回退到 `#/list`。

### 文件结构

选择三文件方案（非单文件）：
```
index.html   // 三个视图的静态骨架 + 模态/提示容器
style.css    // 全部样式
app.js       // 全部逻辑（模块函数见下）
```
理由：index.html 承载静态骨架后 JS 无需拼 HTML 字符串渲染结构，关注点分离，且仍无构建工具。统一放仓库根目录，打开 index.html 即用。

### app.js 函数职责（供 plan/编码直接使用）

- `loadRecords(): Array` / `saveRecords(Array): boolean` — localStorage 读写；save 返回 false 表示写入失败（超限等）。
- `escapeHtml(str): string` — 所有动态插入 DOM 的用户内容必须先转义（防 XSS，虽为本地应用也统一执行）。
- `formatTime(ts: number): string` — `YYYY-MM-DD HH:mm` 本地时间。
- `validateForm(): {title, content, createdAt} | null` — 校验并 trim，不合法返回 null。
- `renderList(keyword: string)` — 过滤 + 排序 + 渲染列表 DOM。
- `renderDetail(id: string)` — 渲染详情或跳回列表。
- `router()` — 解析 `location.hash`，切换 section 并触发对应渲染。
- 事件绑定：表单 submit、搜索框 `input`、列表项 click（事件委托）、删除按钮 click + `confirm()`。

### 边界情况

| 场景 | 行为 |
|---|---|
| 空列表 | 列表视图显示「暂无记录，去记一条吧」+ 跳转登记按钮 |
| 搜索无结果 | 显示「没有匹配「关键词」的记录」，保留搜索框内容 |
| 标题/内容为空或全空白 | 阻止提交，输入框上方红色提示「标题和内容不能为空」，不写入存储 |
| localStorage 不可用（隐私模式/被禁用） | 启动时探测（读写测试值），顶部黄条提示「浏览器存储不可用，本次记录不会被保存」，页面仍可操作（内存态） |
| 写入超限（QuotaExceededError） | saveRecords 捕获异常，返回 false，页面提示「保存失败：存储空间已满」，本次记录保留在界面但不入库 |
| 详情 id 不存在 | 跳回 `#/list` |
| 数据损坏（JSON 解析失败） | 重置为空数组并提示「本地数据损坏，已重置」 |

### 明确不做（与 intent Out of scope 一致）

编辑记录、后端/API、登录/多用户/云同步、标签/分类/心情/图片附件、数据导入导出。

## Standards applied

- 中文界面（intent Constraints）。
- XSS 防护：用户输入一律 `escapeHtml` 后插入 DOM。
- 删除二次确认（intent Constraints）：原生 `confirm()`。
- 无障碍基座：表单控件配 label，删除按钮为真实 button。

## Gotchas

- **同毫秒/系统时间回拨**：id 含时间戳但排序以 createdAt 为主、id 为兜底；用户可把新记录时间改到过去，列表顺序以 createdAt 为准是预期行为（时间可改的需求使然）。
- **datetime-local 空值**：用户可能清空时间输入；校验时若 createdAt 无效则回退为提交时刻 `Date.now()`，不阻断提交。
- **搜索与详情联动**：搜索过滤中点击记录进详情、删除后返回列表需保留搜索关键词（router 渲染列表时从搜索框取当前值即可，不重置）。
- **file:// 打开**：hash 路由与 localStorage 在 file:// 下均可用，无需服务器；但若 reviewer 要求 http 托管亦无冲突。
- **权衡：原生 confirm()** 体验朴素但零依赖且同步阻塞，符合一期范围；后续迭代可换自定义模态。

## Open questions

- 无（intent 层 open questions 已全部关闭；本 spec 新增决策——hash 路由、单 key 存储、三文件结构——待设计评审确认）。

## Verification plan

- 构建/手工验证：完整闭环「登记 → 列表可见 → 搜索过滤 → 详情 → 删除（含取消分支）→ 返回列表」；刷新后数据仍在。
- 边界用例：空标题提交被拒；空列表与搜索无结果文案；DevTools 禁用 localStorage 后出现降级提示且页面可用；伪造损坏的 `suishiji.records` 后重置提示。
- eval 套件（evals/）：闭环脚本 + 刷新持久化断言 + 搜索实时性断言（输入即过滤，无需回车）。
