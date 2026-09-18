# 随时记 · 编辑功能（二期） — Specification

- Derived from: intent/intent.md（iteration 002，commit ba79af5；intent 门批准 product_owner_accept-001，commit def0781）
- Author: product engineering agent（draft）; Bouboo（reviewer）
- Status: Draft
- Date: 2026-09-18
- 前序: [spec-001.md](spec-001.md)（一期登记/列表/详情/删除，已上线）

## Requirements

### Functional

**F1 编辑入口**
- 详情视图提供「编辑」按钮，点击进入编辑视图（hash 路由 `#/edit/<id>`）。

**F2 编辑表单**
- 编辑视图复用登记表单形态：标题（text）、内容（textarea）、创建时间（datetime-local），页面标题「编辑记录」。
- 进入时预填该记录当前值；每次进入 `#/edit/<id>` 都重新预填（覆盖残留，含 bfcache/后退场景）。

**F3 保存**
- 校验与登记一致：标题、内容去首尾空白后必填，否则表单内红字提示「标题和内容不能为空」，不写存储。
- 时间非法/被清空：与登记同策略，静默回退为提交时刻并回显。
- 保存成功：按 id 原地更新 `title` / `content` / `createdAt`，写入 `updatedAt = Date.now()`（毫秒时间戳），toast「已保存」，返回该记录详情页。
- 保存失败（localStorage 写入失败，如超限）：停留编辑表单、字段保留，toast「保存失败：存储空间已满」。
- `id` 在编辑中永不改变。

**F4 取消**
- 编辑视图提供「取消」按钮，不写任何数据，返回该记录详情页。

**F5 updatedAt 展示**
- 详情页：存在 `updatedAt` 时显示「创建于 … · 最后修改于 …」；不存在时与一期展示一致。
- 列表项：存在 `updatedAt` 时时间行追加「（已编辑）」标识。
- 列表排序仍按 `createdAt` 降序，编辑不改变排序键。

**F6 向后兼容与健壮性**
- 无 `updatedAt` 的旧数据展示与一期完全一致。
- 直达无效 `#/edit/<id>`（如记录已被删除）→ 回退 `#/list`，不出现空白页。

### Non-functional

- 延续零依赖、零构建、纯前端；中文界面。
- XSS：编辑预填仅通过表单控件 `.value` 赋值，不走 innerHTML；详情/列表仍 `textContent` / `escapeHtml`。
- 性能：一次 load、一次 save，无读写放大；数据量级与一期相同。
- localStorage 不可用时页面仍可用（延续一期降级行为）。

## Design

### 数据模型（增量）

- 记录结构新增可选字段：`"updatedAt": 1726636800000`（毫秒时间戳）。仅在编辑保存时写入；登记不写；读取不假设其存在。

### 路由（增量）

- `router()` 新增 `#/edit/` 前缀分支，与 `#/detail/` 同构：解析 id → `loadRecords()` 查找 → 未找到回退 `#/list`；找到则 `initEditForm(rec)` + 显示 `view-edit`。
- 视图新增第四个 `<section id="view-edit" hidden>`。

### 表单与状态

- 编辑表单为独立 form（`edit-form`），字段 id `e-title` / `e-content` / `e-time` / `e-error`，另以 hidden input `e-id` 持有目标 id —— 编辑目标从表单自身读取，不引入全局编辑态变量，免疫 hash 与表单不同步。
- 不复用 `#new-form` 的元素：避免 `#/new` 的残留清理逻辑与编辑预填互相干扰。
- 校验逻辑抽出共用：`validateRequired(title, content, errEl)`（登记与编辑的 submit handler 各自薄封装）；`parseTimeInput` / `toLocalInputValue` 原样复用。

### 展示（增量）

- `renderDetail(rec)`：追加 updatedAt 行（条件渲染）。
- `renderList`：时间行按 `r.updatedAt` 存在与否追加「（已编辑）」。

## Standards applied

- CLAUDE.md 验证纪律：完成前运行验证命令并附输出。
- 既有约定：IIFE + ES5 风格；用户内容一律不进 innerHTML；中文注释只写「为什么」。
- spec-001 已知限制延续：datetime-local 旧 Safari 退化不在二期修复（一期评审已同意不阻塞，结论不变）。
- 无障碍：编辑表单控件均配 label；按钮为真实 button。

## Gotchas

- **history 栈**：详情 → 编辑 → 保存/取消回详情，后退会再进编辑页；router 每次进入按 id 重新 load + 预填，所见即所存，可接受（与一期删除后跳列表的直跳风格一致）。
- **跨标签页并发编辑**：无 storage 事件监听，编辑保存为整条覆盖；二期接受此限制。
- **`updatedAt` 只增不改**：再次编辑时覆盖为新的 `Date.now()`，不保留历史（历史/撤销在 out of scope）。
- **hidden input 提交**：`e-id` 随 form submit 可读，注意 `novalidate` 保持与登记一致（校验手动做）。

## Open questions

- 无。入口位置、可编辑字段、updatedAt 展示、取消语义已在 intent 门确认。

## Verification plan

- 语法/静态：`node --check app.js`。
- evals：新增 JSON eval，断言 `#/edit/` 路由、`updatedAt` 写入逻辑、详情/列表展示代码存在且 `node --check` 通过。
- 手工清单（浏览器）：预填正确 → 修改标题/内容/时间保存 → 详情「最后修改于」+ 列表「（已编辑）」→ 排序按新 createdAt 生效 → 取消不改动 → 无效 id 回退列表 → 旧数据（手工删除 updatedAt）展示不回归 → 空标题提交被拒。
