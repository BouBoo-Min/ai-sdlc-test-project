# Review: spec.md (spec-001)

- Reviewer: reviewer-1
- Date: 2026-09-18
- Artifact: /Users/bouboo/Documents/privateCase/GitHub/ai-sdlc-test-project/spec.md
- Basis: intent/intent.md (intent-001), org/roles/reviewer.md, REVIEW.md

## 覆盖性核查（Bugs / Compliance passes）

- intent 四功能：F1 登记（spec.md:12-16）、F2 列表含搜索（spec.md:18-23）、F3 详情含删除二次确认（spec.md:25-27）、F4 持久化（spec.md:29-30）→ 覆盖完整。
- intent 完成标准三项闭环均落在 Requirements + Verification plan（spec.md:124-126）。
- Out of scope 与 intent 逐项一致（spec.md:99-101 vs intent.md:39-44），无越界功能。
- 数据模型、hash 路由、文件结构、函数职责、边界情况表均具体可实施（spec.md:42-97）。
- 未发现 Critical/Major 问题。三次 pass（bugs/security/compliance）均无阻塞项；XSS（escapeHtml，spec.md:79）与删除二次确认（spec.md:27）已在规范层覆盖 security 要求。

## Findings

### Critical

无。

### Major

无。

### Minor

1. [Compliance/Bugs] spec.md:95 —— QuotaExceededError 提示「本次记录保留在界面但不入库」未定义「界面」具体形态（登记表单保留？还是列表顶部提示？）。建议实现前明确：登记场景下停留在表单且字段值保留，便于用户重试。
2. [Bugs] spec.md:113 —— datetime-local 清空时「静默回退为 Date.now()」与 F1「保存时按用户改后的值为准」（spec.md:16）存在轻微张力：用户清空意图可能是「现在」，静默回退可接受，但建议在表单内同步回显回退后的时间，避免保存结果与用户预期不一致。

### Nit（≤5）

1. spec.md:16 —— `YYYY-MM-DDTHH:mm` 格式依赖 datetime-local 原生格式，Safari 旧版支持不一致；建议实现时检测 input 类型，降级为 text 输入（一期可记为已知限制，不阻塞）。
2. spec.md:94-97 —— 各类提示（黄条/红字/重置提示）的出现位置与消失时机（常驻 vs 自动消失）未统一约定，建议 plan 阶段统一为单一提示容器。
3. spec.md:21 —— 搜索匹配规则用 JS 伪代码表达，`content` 为完整内容而非 50 字摘要，建议补一句「匹配范围为完整字段值，不受列表摘要截断影响」以免实现者误用截断文本。
4. spec.md:63 —— 三个 section 常驻 DOM，但「模态/提示容器」（spec.md:70）与 section 的归属关系（全局 or 视图内）未说明。

## Verdict

**approved** — 无阻塞项；上述 2 条 Minor 建议在 plan.md 中落实即可，nits 供实现参考。
