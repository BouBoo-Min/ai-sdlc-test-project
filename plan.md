# 随时记 · 编辑功能（二期） — Build Plan

- Derived from: spec.md（iteration 002，commit 14b53a2；spec 门批准 product_owner_approve-001，commit affa78c）
- Status: Approved
- Date: 2026-09-18
- 前序: [plan-001.md](plan-001.md)

## Files that change

- index.html
- app.js
- style.css
- evals/edit-feature.json（新增）
- spec.md / plan.md（如实现偏离设计，同提交内更新）

## Order of work

1. **index.html**：新增 `<section id="view-edit" hidden>`（标题「编辑记录」，form `edit-form` novalidate，字段 `e-title` / `e-content` / `e-time` / `e-error`，hidden input `e-id`，按钮「保存」「取消」）；详情视图在删除按钮前加「编辑」按钮（`#/edit/` 链接，初始 href 为 `#/edit/`，由 renderDetail 填全 id）。
2. **app.js — 校验抽取**：新增 `validateRequired(title, content, errEl): boolean`；登记 submit handler 改为调用它（行为不变）。
3. **app.js — 路由**：`router()` 新增 `#/edit/` 分支（解析 id → 查找 → 未找到回退 `#/list`；找到 `initEditForm(rec)` + `showSection('view-edit')`）；`showSection` 的视图清单加入 `view-edit`。
4. **app.js — 编辑逻辑**：`initEditForm(rec)`（按 id 预填 + 时间转 `toLocalInputValue` + 清错误）；`onEditSubmit`（校验 → 时间回退策略 → 按 `e-id` 原地更新 `title/content/createdAt`，写 `updatedAt` → `saveRecords` 失败停留报错 → 成功 toast + 跳 `#/detail/<id>`）；取消按钮直接跳详情。
5. **app.js — 展示**：`renderDetail` 条件追加「· 最后修改于 …」；`renderList` 时间行按 `r.updatedAt` 追加「（已编辑）」。
6. **style.css**：`view-edit` 复用既有表单/按钮样式，仅在需要时补少量规则（预期接近零新增）。
7. **evals**：新增 `evals/edit-feature.json`（checks：`node --check app.js`；grep 断言 `#/edit/` 路由、`updatedAt` 写入、「最后修改于」「（已编辑）」展示）。
8. **验证**（见 Verification），全绿后提交 PR 描述并请求代码评审门。

## Risks

- **hash 与表单不同步**：编辑目标 id 存 hidden input，router 每次进入重新预填，缓解不同步/残留（spec Gotchas 已列）。
- **改登记校验引入回归**：抽取 `validateRequired` 后先跑一期手工闭环（登记/搜索/删除）再继续，若登记行为有变立即回退该步。
- **旧数据无 updatedAt**：展示层全部条件渲染；验证清单含手工删字段的回归项。
- **bfcache/后退到编辑页**：router 依赖 `hashchange` + `pageshow` 行为，验证清单含后退用例；若 bfcache 下未触发 router，则监听 `pageshow` 强制 `router()`（实现时按需补）。

## Proof

- `node --check app.js` 通过；evals 全绿（`run_evals.py --min-pass-rate 0.9`）。
- 浏览器手工清单通过（spec Verification plan 全项），关键路径附截图：编辑预填、保存后详情「最后修改于」、列表「（已编辑）」、取消不改动。

## Verification

- `node --check app.js` → 无输出（语法通过）。
- `python3 scripts/run_evals.py evals/ --min-pass-rate 0.9` → 全部 pass。
- 手工闭环（本地静态打开或 `python3 -m http.server`）：编辑保存闭环、取消分支、无效 id 回退、空标题被拒、旧数据兼容、后退/前进行为。

## Parallelization

- 单会话顺序执行即可：改动集中在 3 个文件且相互耦合（路由/表单/展示），拆分会话反而引入合并风险。无后台子代理。
