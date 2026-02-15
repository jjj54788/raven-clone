# Raven Clone 开发待办（按逆向文档推进）

Last updated: **2026-02-15**

目标：以你提供的 `raven-reverse-engineering/00-TESTING-SUMMARY.md` 与 `01-24-*.md` 为“验收基线”，按阶段做出**可稳定迭代**的版本（每阶段都有可演示闭环、可回归测试、可上线/可回滚）。

> 约定：每个阶段尽量只引入 **1 个新领域模块**（避免同时改 DB/鉴权/前端大重构导致不稳定）。

---

## 0) 统一规范（先定死，后面不会越做越乱）

### 0.1 对象（Domain Objects）规范

- **通用字段**
  - `id`：UUID 字符串（前后端一致）
  - `createdAt` / `updatedAt`：ISO8601 字符串
- **Resource（全站核心对象）**
  - 统一承载：YouTube、Blog、Notion、Drive、URL、上传文件等
  - 最小字段建议：`id,type,title,url,sourceType,publishedAt?,thumbnailUrl?,summary?,insights?,tags?,metadata?`
- **Task（异步任务）**
  - 用于：字幕抓取/翻译、PDF 导出、洞察刷新、PPT 生成、向量化等
  - 最小字段：`id,type,status,progress?,result?,error?,createdAt,updatedAt`
- **Ask Session / Message**
  - `Session`：`id,title,summary?,isBookmarked,updatedAt`
  - `Message`：`id,role,content,model?,createdAt`
- **Explore：Transcript / KeyMoment / Note / Comment**
  - Transcript：`resourceId,language,segments[]`
  - Segment：`startTime,endTime,text`
  - KeyMoment：`timestamp,title,description,tags[]`
  - Note（私有）：`resourceId,content,anchorTime?`
  - Comment（公开）：`resourceId,content,parentId?,likesCount`

### 0.2 API 规范（Backend ↔ Frontend）

- **响应壳**（建议统一）
  - 成功：`{ success: true, data, metadata: { requestId, timestamp, duration } }`
  - 失败：`{ statusCode, code, message, requestId, traceId, timestamp, path, method }`
- **分页**
  - 列表默认用 `cursor`（或 `offset` 但要统一），并固定参数名：`take/limit`、`cursor`、`q/search`
- **鉴权**
  - 默认 Bearer；401 统一语义（过期/未登录/无权限区分 code）
  - Refresh token 方案必须落地：要么提供 refresh endpoint + rotation，要么彻底移除 refreshToken（避免“看似有但不可用”）
- **流式/进度**
  - SSE/stream：事件类型固定 `progress|chunk|result|error|done`（前端统一解析器）
  - 禁止把长效 token 放在 URL（优先后端代理或一次性 ticket）

### 0.3 结构规范（代码组织）

- **Backend（NestJS）**
  - `backend/src/modules/<domain>/{controller,service,dto,types}`；跨域放 `backend/src/common/*`
  - 复杂异步处理集中到 `jobs/tasks`（不要散落到各处 controller）
  - Prisma：每次改 schema 必须有迁移 + seed 最小可运行
- **Frontend（Next.js App Router）**
  - 页面只做组装；业务放 `frontend/src/features/<domain>/{api,components,hooks,types}`
  - 任何网络请求只走 `frontend/src/lib/api.ts`（统一 401/错误处理/重试/metrics）
  - i18n key 统一 `module.section.key`，禁止在组件里硬编码中英文长文案

### 0.4 Definition of Done（每条任务都要满足）

- `npm -C backend run build` + `npm -C frontend run build` 通过
- 关键流程有最小测试（后端：service 单测或 e2e 冒烟；前端：至少组件级/路由级冒烟）
- 错误状态可见且可恢复（toast + retry；不会 silent fail）
- 文档更新：相关 `backend/**/ANALYSIS.md` / `frontend/**/ANALYSIS.md` 或本文件勾选

---

## 1) 里程碑路径图（按逆向文档推进）

> 每个阶段建议 1–2 周；你后续“开新窗口逐一实现”时，直接从每阶段的 **Next 3** 开始做。

### Phase 0 — 基础稳定与契约（强烈建议先做）

参考：`00-TESTING-SUMMARY.md` 的“数据流架构/技术特点”部分

- [ ] P0-01：补齐 refresh token 方案（后端 refresh endpoint + 前端存取策略一致）
- [ ] P0-02：统一 API 响应壳 + 全局异常格式（含 requestId）
- [ ] P0-03：Prisma 迁移漂移收敛（schema/迁移/seed 对齐，最小可启动）
- [ ] P0-04：前端 `api.ts` 增加：超时、重试、错误映射（4xx/5xx/网络）
- [ ] P0-05：基础观测：结构化日志（requestId/userId/route/duration）、前端错误上报钩子（可先 console + 预留）

Next 3：P0-01 / P0-02 / P0-03

---

### Phase 1 — AI 问答（AI Ask）闭环（对应 01–08、24）

验收目标：完成“登录 → 新建会话 → 选模型/开关联网搜索/选知识库 → 流式对话 → 会话可管理”的闭环。

参考文档：`01-ai-ask-main.md` `02-model-selector.md` `03-web-search-toggle.md` `04-knowledge-selector.md` `05-chat-message-ui.md` `06-chat-history-panel.md` `07-session-loading.md` `08-new-chat-welcome.md` `24-ai-ask-homepage.md`

- [ ] P1-01：AI Ask 页面布局对齐（输入框/工具栏/快捷键提示/空状态）
- [ ] P1-02：模型选择器（后端 models + 前端缓存/默认值/失败降级）
- [ ] P1-03：联网搜索 Toggle（后端 `webSearch` → 前端 UI + 状态持久化）
- [ ] P1-04：知识库选择器（先接“个人 KB 列表”与“最大选择数”）
- [ ] P1-05：流式对话稳定性（Abort/重试/断线提示/TTFT 观测）
- [ ] P1-06：会话面板：列表/搜索/按更新时间分组/删除
- [ ] P1-07：会话操作：重命名、收藏（bookmarked）、（可选）summary
- [ ] P1-08：每日一言（静态占位 → 后端接口 → 可配置）

Next 3：P1-02 / P1-03 / P1-06

---

### Phase 2 — 我的知识库（Data Sources + Personal KB + RAG v1）（对应 19–20）

验收目标：能把内容“入库→索引→检索→在 AI Ask 中使用”，并看到 RAG 状态。

参考文档：`19-my-library-datasources.md` `20-my-library-personal.md`

- [ ] P2-01：Library 基础导航：数据源/个人KB/团队KB（团队 KB 可先 Coming soon）
- [ ] P2-02：RAG 状态指示器（健康检查 + 手动刷新按钮）
- [ ] P2-03：个人知识库 CRUD（创建/删除/重命名/文档数量）
- [ ] P2-04：RAG：知识库/文档入库/删除/查询（最小可用 + 限制配额）
- [ ] P2-05：数据源：URL 抓取入库（最先做，投入产出最高）
- [ ] P2-06：数据源：本地文件上传入库（pdf/markdown/html 先做一类）
- [ ] P2-07：Notion 集成 v1（connect → 选页面 → sync → resolve 冲突）
- [ ] P2-08：Google Drive 集成 v1（connect → sync → resolve 冲突）
- [ ] P2-09：飞书绑定 v1（仅绑定/解绑；内容同步后置）

Next 3：P2-03 / P2-04 / P2-05

---

### Phase 3 — AI 探索（Explore Shell）+ YouTube 列表/详情（对应 10、12、13）

验收目标：Explore 能跑起来：列表可筛选，详情可播放。

参考文档：`10-ai-explore-main.md` `12-ai-explore-youtube-list.md` `13-ai-explore-youtube-detail.md`

- [ ] P3-01：Explore 主页面与路由（tabs：YouTube/Blogs/Papers；Papers 先空态）
- [ ] P3-02：YouTube 列表：卡片结构、过滤/排序、分页/懒加载
- [ ] P3-03：YouTube 详情：播放器 iframe、返回列表、基础元信息
- [ ] P3-04：Bookmark/Like（先本地/后端最小接口）

Next 3：P3-01 / P3-02 / P3-03

---

### Phase 4 — YouTube 字幕/关键时刻/AI Chat/Notes/Comments（对应 14–16）

验收目标：字幕可用（自动滚动/翻译/导出 PDF），并能基于字幕进行 AI Chat；Notes 可落库；Comments 至少不报错且可重试。

参考文档：`14-ai-explore-transcript-feature.md` `15-ai-explore-ai-chat-loading.md` `16-ai-explore-notes-comments.md`

- [ ] P4-01：Transcript 后端获取与缓存（优先“已有字幕”路径；无字幕再考虑 ASR）
- [ ] P4-02：前端 Transcript 面板：分段渲染 + 自动滚动 + 当前段高亮
- [ ] P4-03：字幕翻译（分段翻译 + 进度提示 + 可取消）
- [ ] P4-04：关键时刻（Key Moments）生成与跳转（先规则/后 AI）
- [ ] P4-05：导出 PDF（字幕/关键时刻/笔记可选项）
- [ ] P4-06：AI Chat（把 transcript/key moments 作为 context 注入）
- [ ] P4-07：Notes：CRUD + 关联时间戳 + 从字幕复制创建
- [ ] P4-08：Comments：列表/发布/重试（先修到“不会 Failed to load comments”）

Next 3：P4-01 / P4-02 / P4-06

---

### Phase 5 — Blogs 列表/详情/Reader Mode/AI 摘要（对应 17–18）

验收目标：Blog 可读、可收藏、可 AI 摘要/洞察、可推荐相似内容。

参考文档：`17-ai-explore-blogs.md` `18-ai-explore-blog-detail.md`

- [ ] P5-01：Blogs 列表（来源/日期/洞察标签/搜索/筛选）
- [ ] P5-02：Blog 详情：正文抽取 + Reader Mode
- [ ] P5-03：AI 摘要/关键洞察（写入 Resource 的 summary/insights）
- [ ] P5-04：相似内容推荐（先基于 tags/来源，后置向量相似）

Next 3：P5-01 / P5-02 / P5-03

---

### Phase 6 — AI 洞察（Topic Monitoring）v1（对应 21）

验收目标：能创建洞察专题、看到来源统计、触发刷新并生成报告（进度可见）。

参考文档：`21-ai-insights.md`

- [ ] P6-01：洞察列表页：新建/搜索/卡片统计（reports/sources/进度/上次刷新）
- [ ] P6-02：洞察详情页：维度/来源列表/报告列表（先占位）
- [ ] P6-03：Refresh 任务：后端 job + 进度流（SSE）+ 可取消
- [ ] P6-04：报告生成与落库（最小模板：summary + sections）
- [ ] P6-05：协作与可见性（public/private/team，占位即可）

Next 3：P6-01 / P6-03 / P6-04

---

### Phase 7 — AI Office Slides v1（对应 22）

验收目标：能生成 PPT（至少：outline → layout → content），并有 task history。

参考文档：`22-ai-research-and-office.md`

- [ ] P7-01：AI Slides 创建流程三步走（UI + 状态机）
- [ ] P7-02：Task list（创建记录、查看、删除）
- [ ] P7-03：导出（PPT/PDF 先做一种）
- [ ] P7-04：资源选择（接入 Library 的 Resource picker）

Next 3：P7-01 / P7-02 / P7-04

---

### Phase 8 — AI 研究（Research）从空态到可用（对应 22）

验收目标：从空态进入“创建研究项目 → 生成报告草稿 → AI Edit 改写”。

- [ ] P8-01：Research 空态 → 创建项目向导（选资源/输入问题/开始）
- [ ] P8-02：报告阅读与引用跳转（引用最小可用）
- [ ] P8-03：AI Edit（选中文本：润色/改写/扩写/压缩 + 预览/应用）
- [ ] P8-04：批注/回复/resolve（annotations，先最小 CRUD）

Next 3：P8-01 / P8-03 / P8-02

---

### Phase 9 — AI 写作 & AI 商店（对应 23）

验收目标：写作项目最小闭环 + 商店可用（工具/技能列表 + 自定义提交）。

参考文档：`23-ai-writing-and-store.md`

- [ ] P9-01：AI 写作：项目列表空态 → 创建项目 → 生成章节草稿
- [ ] P9-02：AI 写作：风格/题材/字数等参数保存
- [ ] P9-03：AI 商店：工具/技能列表、分类、搜索、详情跳转
- [ ] P9-04：AI 商店：自定义条目提交（审核/私有/删除）

Next 3：P9-03 / P9-04 / P9-01

---

## 2) 横切项（任何阶段都可能插入，但要控制数量）

- [ ] X-01：Credits：余额/交易流水/扣费钩子（先只覆盖 AI Ask + Explore）
- [ ] X-02：Daily Check-in：后端接口 + 前端提醒（与你当前 `DailyCheckInReminder.tsx` 对齐）
- [ ] X-03：Notification：基础列表 + 标记已读（后置推送/邮件）
- [ ] X-04：Admin：只做 4 块最重要的（users / auth settings / credits / notifications）
- [ ] X-05：导出统一（Explore transcript PDF、Research report、Office slides）

---

## 3) 建议的“下一步开工顺序”（保证稳定推进）

1. **P0-01**（refresh token 方案）→ 解决长期稳定登录/流式接口问题
2. **P1-06**（会话面板 CRUD + 搜索/分组）→ 立刻提升 AI Ask 可用性
3. **P2-04**（RAG query 最小闭环）→ 解锁“知识库选择器”真正可用

