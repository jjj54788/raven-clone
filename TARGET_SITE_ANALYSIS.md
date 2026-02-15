# Raven AI Engine（目标站点）功能清单 / 逆向地图

Last inspected: **2026-02-15**  
Target URL: `https://raven-ai-engine.up.railway.app`

> 范围说明：以下内容仅基于**公开可访问**资源（前端 Next.js chunks、后端/AI-service 健康检查与 AI-service OpenAPI）整理，用于功能盘点与复刻规划；不包含任何绕过鉴权/攻击/漏洞利用步骤。登录态下的完整 UI/权限差异建议再用 DevTools Network 验证。

---

## 1) 架构与服务拆分（从 headers/CSP/探测得到）

- **Frontend**：Next.js App Router（响应头含 `X-Powered-By: Next.js`），语言 `zh-CN`，Tailwind 风格。
- **Backend API**：`https://raven-ai-engine-backend.up.railway.app`
  - API 前缀：`/api/v1`
  - `GET /api/v1`：返回版本、health 路径等（含 `workspaceAiV2Enabled`）
  - `GET /api/v1/health`：包含 `database`、`cache` 健康与延迟（推断：Postgres + Redis）
  - 观察到限流响应头：`X-Ratelimit-*`
- **AI Service（独立服务）**：`https://raven-ai-engine-ai-service.up.railway.app`
  - OpenAPI：`/openapi.json`，文档：`/docs`、`/redoc`
  - 该服务包含“资源对话 / 报告生成 / 翻译 / 摘要 / insights / workspace 任务队列”等能力（见第 6 节）
- **CSP**：前端 `connect-src` 明确允许 `backend` 与 `ai-service` 域名（前端可能直接调用或由后端代理）

---

## 2) 鉴权与会话（从前端代码与后端 401 行为得到）

- **Google OAuth 登录**：`GET /api/v1/auth/google` -> 302 跳转到 Google 授权页。
- **Token 形态**（前端实现）：
  - `accessToken`、`refreshToken` 存在 `localStorage`（登录/刷新后写入）。
  - API 调用使用 `Authorization: Bearer <accessToken>`。
  - 刷新：`POST /api/v1/auth/refresh`（带 `Authorization`）返回新 token（失败会清理本地登录态并回到 `/`）。
- **后端未登录行为**：多数业务接口直接 `401`，message 常见为 `Please sign in to continue`。
- **API 响应风格（从公开接口响应可见）**：
  - 成功：`{ success: true, data: ..., metadata: { requestId, timestamp, duration } }`
  - 失败：`{ statusCode, timestamp, path, method, message, code, requestId, traceId }`（示例：401/404）

---

## 3) 前端主要页面（UI Routes）

从前端 bundles 提取到的**用户可见页面路由**（不含动态详情页）：

- 入口与常用：
  - `/ai-ask`（对话）
  - `/library`（我的资料库）
  - `/library/knowledge-graph`（知识图谱）
  - `/ai-image`、`/ai-image/create`（图像）
  - `/ai-insights`（洞察/报告）
  - `/ai-research`（研究/报告工作区，功能非常重）
  - `/ai-planning`（规划）
  - `/ai-simulation`（仿真）
  - `/ai-office`（Office：Slides/Docs/Excel）
  - `/ai-social`（社媒/内容分发）
  - `/ai-writing`（写作）
  - `/ai-store`（工具/技能商店）
  - `/explore`、`/notifications`、`/profile`、`/credits`、`/changelog`
  - `/login?redirect=...`
- Admin（管理台）入口与分区（节选）：
  - `/admin/overview`
  - `/admin/access/*`：`billing`、`credits`、`permissions`、`secrets`、`users`、`security`
  - `/admin/ai/*`：`models`、`skills`、`teams`、`tools`
  - `/admin/data/*`：`collection`
  - `/admin/system/*`：`logs`、`mcp-server`、`monitoring`、`notifications`、`storage`
  - `/admin/feedback`、`/admin/data-management`

---

## 4) 功能清单（按模块）

### 4.1 AI Ask（对话）

用户侧能力（从页面 chunk 代码中可确认）：

- **会话列表**：拉取 session 列表、搜索（按 title/summary）、按时间分组（today/yesterday/lastWeek/older）与 **bookmarked** 分组。
- **会话操作**：收藏/取消收藏、重命名、删除。
- **知识库选择器**：从“我的资料库”选择个人 KB（支持搜索、展示文档数量、限制最大选择数、清空全部）。
- **工具菜单**：至少包含 1 个工具入口：跳转 `/ai-image/create`（图像生成）。

相关接口（前端明确调用）：

- `GET    /api/v1/ask/sessions?limit=100`
- `PATCH  /api/v1/ask/sessions/:id`（收藏、标题等）
- `DELETE /api/v1/ask/sessions/:id`

### 4.2 Library / RAG（资料库、知识库、知识图谱）

用户侧能力（从路由/接口/Key 可确认）：

- `/library` 支持多 tab：`personal-kb`、`google-drive`、`notion`
- `/library/knowledge-graph`：知识图谱视图（并在 research 模块里也出现 “graph” 能力）
- 资料与条目管理存在**批量操作**（移动/删除/状态/标签）与统计汇总

相关接口（前端常量路径提取）：

- Collections（资料条目/收藏体系）
  - `GET    /api/v1/collections`
  - `GET    /api/v1/collections/:id`
  - `GET    /api/v1/collections/items/paginated?...`
  - `POST   /api/v1/collections/items/batch/move`
  - `POST   /api/v1/collections/items/batch/delete`
  - `POST   /api/v1/collections/items/batch/status`
  - `POST   /api/v1/collections/items/batch/tags`
  - `GET    /api/v1/collections/stats/summary`
  - `GET    /api/v1/collections/tags/all`
- Resources（资源）
  - `GET    /api/v1/resources/...`（前端出现 `resources/` 前缀，细项多为拼接）
- RAG（知识库/文档/检索）
  - `GET    /rag/knowledge-bases`
  - `POST   /rag/knowledge-bases/:id?`（创建/更新）
  - `DELETE /rag/knowledge-bases/:id`
  - `DELETE /rag/documents/:id`
  - `POST   /rag/query`（检索问答）

### 4.3 Integrations（Notion / Google Drive / 飞书）

**Notion**（API 常量可确认）：

- `GET    /notion/connect`
- `GET    /notion/connections`
- `DELETE /notion/disconnect/:connectionId`
- `POST   /notion/sync`（可带 `fullSync`）
- `GET    /notion/sync/status?connectionId=...`
- `POST   /notion/sync/bidirectional`
- `POST   /notion/sync/resolve`
- `GET    /notion/pages?connectionId=&search=&page=&limit=`
- `GET    /notion/pages/:pageId`
- `PATCH  /notion/pages/:pageId`（更新 blocks）
- `POST   /notion/pages/:pageId/push`

**Google Drive**（API 常量可确认）：

- `GET    /google-drive/connect`
- `DELETE /google-drive/disconnect/:connectionId`
- `POST   /google-drive/sync`
- `POST   /google-drive/sync/resolve`

**Feishu/飞书数据源绑定**（从前端 fetch 可确认）：

- `GET    /feishu-data-source/binding`
- `PATCH  /feishu-data-source/binding`（提交 `feishuOpenId`）
- `DELETE /feishu-data-source/binding`

### 4.4 Profile（个人设置 / API Keys / 偏好 / 统计）

从 key 与页面代码可确认的能力：

- 基本资料：头像、昵称、Bio、研究兴趣等；语言与外观（含 Dark Mode）
- 通知偏好：邮件通知、weekly digest、推荐通知等
- 统计：AI chats、images、notes、reports、resources viewed、comments、bookmarked、member since 等
- **API Keys 管理**（个人 key / 捐赠 key / 自定义 endpoint / 测试连接）
  - `POST   /user/api-keys/...`
  - `PUT    /user/api-keys/...`
  - `DELETE /user/api-keys/...`

### 4.5 Credits（积分/计费）

用户侧能力（从 key 与接口可确认）：

- Credits center：余额、今日/周/月消耗、累计赚取/消耗、交易流水
- Daily check-in、streak reward、insufficient credits 提示

相关接口（节选）：

- `GET /api/v1/credits`
- `GET /api/v1/credits/transactions?offset=...`
- 还出现了一组相对路径：`/credits/stats`、`/credits/rules`、`/credits/transactions?`、`/credits/freeze`、`/credits/grant`、`/credits/checkin/history?limit=...`

### 4.6 AI Image（图像生成）

用户侧能力（从 key 与接口可确认）：

- 创建/历史/搜索/收藏、删除、可见性（public/private），以及 team 维度入口
- 支持多模型列表；支持“生成 + 流式生成 + 带文件生成（图生图/参考图）”

接口（前端字符串可确认）：

- `GET  /api/v1/ai-image/models`
- `POST /api/v1/ai-image/generate`
- `POST /api/v1/ai-image/generate/stream`
- `POST /api/v1/ai-image/generate-with-files`
- `GET  /api/v1/ai-image/history`
- `GET  /api/v1/ai-image/bookmarks`
- 以及 `GET /api/v1/ai-image/:id`（以 `/api/v1/ai-image/` 前缀出现）

### 4.7 AI Social（社媒内容生产与发布）

用户侧能力（从 key 与接口可确认）：

- 平台账号连接（connect/configure/refresh/test/断开）
- 内容工作台：创建、预览、发布、查看外链、删除、重试、刷新
- 状态：draft/pending/scheduled/published/failed
- 批量操作：批量选择、批量发布、批量删除
- 过滤器：时间范围、内容类型、来源类型、是否有连接、review status 等
- 支持通过 URL 处理生成内容（process URL）

接口（前端字符串可确认）：

- `GET/POST   /api/v1/ai-social/connections...`
- `GET/POST   /api/v1/ai-social/contents...`
- `GET        /api/v1/ai-social/sources/{explore|office|research|writing}`
- `POST       /api/v1/ai-social/ai/process-url`
- `POST       /api/v1/ai-social/ai/process-source`
- `POST       /api/v1/ai-social/ai/regenerate/:id`

### 4.8 AI Writing（写作项目）

用户侧能力（从 key 与接口可确认）：

- 项目列表/搜索/创建/编辑/删除；写作风格、题材、预计字数、可选设置、自动推荐
- 可见性 public/private；skills/team 入口

接口（前端字符串可确认）：

- `GET/POST/... /api/v1/ai-writing/projects...`
- `GET/POST/... /api/v1/ai-writing/volumes/...`
- `GET/POST/... /api/v1/ai-writing/chapters/...`
- `GET/POST/... /api/v1/ai-writing/missions/...`
- `GET        /api/v1/ai-writing/style-presets`
- 章节 AI 编辑动作：`POST /api/v1/ai-writing/chapters/:chapterId/ai-edit`

### 4.9 AI Planning（规划）

用户侧能力（从 key 与接口可确认）：

- 计划列表/搜索/新建/编辑/删除
- 新建包含 depth、template、目标与名称等字段

接口（前端字符串可确认）：

- `/api/v1/ai-planning`
- `/api/v1/ai-planning/templates`

### 4.10 AI Simulation（仿真）

用户侧能力（从 key 可确认）：

- Scenarios 与 Templates 两区
- Scenario 支持状态：running/paused/completed/not running；支持编辑/删除

（接口名出现 `/ai-simulation/run/:id`，但更多细节需要登录后抓包确认）

### 4.11 AI Teams（团队/公开团队/申请加入）

用户侧能力（从 key 可确认）：

- 我的团队 / 发现公开团队
- 创建/编辑/删除团队；tags；分享；设为 public/private
- 申请加入：支持附言；查看/取消 pending requests

后端“Topics/Teams”相关接口在 bundles 中大量出现（节选，详见 `4730-*.js`）：

- Topics CRUD：`/api/v1/topics`、`/api/v1/topics/:id`
- 成员：`/api/v1/topics/:id/members`、`/members/invite`、`/leave`
- 消息/表情：`/messages`、`/messages/:id/reactions`
- 资源：`/resources`
- 摘要：`/summaries`
- 任务：`/missions`
- AI 生成：`/ai/generate`
- 其他：`/topics/public`、`/topics/join-requests/*`、`/topics/detect-and-parse-urls`

### 4.12 AI Insights（Topic Insights / 报告刷新流）

前端明确内置了 `topic-insights` 子系统，并使用 **EventSource（SSE）** 做进度流：

- 主题：`/api/v1/topic-insights/topics`（CRUD）
- 刷新：`POST /api/v1/topic-insights/topics/:id/refresh`
- 状态：`GET /api/v1/topic-insights/topics/:id/refresh/status`
- 取消：`POST /api/v1/topic-insights/topics/:id/refresh/cancel`
- 进度流：`/api/v1/topic-insights/topics/:id/refresh/progress?token=...`（前端把 accessToken 作为 query param）

### 4.13 Export / Share（导出与分享）

从 key 可确认导出对话框支持：

- Render mode：`wysiwyg` / `editable`
- 页面设置：portrait/landscape、page size
- 选项：cover、toc、references、page numbers

接口（常量可确认）：

- `POST /export`
- `GET  /export/:id?`

### 4.14 Admin（管理台：配置/监控/运维/安全）

可见能力（从路由与接口常量可确认，按域归类）：

- Access & Security：用户/权限/密钥/安全、Billing、Credits
- AI Engine：模型/团队/技能/工具管理；AI 服务 key 健康检查；usage stats
- MCP：内置 MCP server 状态/会话/metrics；外部 servers 管理
- Search/Extraction/TTS/YouTube：一系列配置页与 test endpoint
- 通知：统计与 broadcast
- 表与存储：storage config、table list、batch diagnose/cleanup
- 反馈：反馈工单管理（类型含 bug/feature/improvement/annotation）

接口（节选，常量路径）：

- Users：`/api/v1/admin/users`
- Storage config：`/api/v1/admin/storage-config`
- Secrets：`/admin/secrets/*`
- MCP external servers：`/admin/mcp/external-servers/*`
- AI Teams config：`/admin/ai-teams/*`
- 以及大量 `/admin/*` 相对路径（多为拼接生成，建议登录后抓包补全）

---

## 5) 站点内置“研究工作区（topicResearch）”的可见特性（从 i18n keys 推断）

`topicResearch.*` keys 数量非常多（700+），可以确认这是一块“重功能”区域，包含：

- 多 agent 协作面板：leader / dimension researcher / report writer / quality reviewer 等角色与决策历史
- 报告生产：开始写报告、质量审阅、可信度报告、查看全文、删除/再生成标题
- 引用与来源：跳转引用、打开原文、查看完整来源
- 图表可视化：加载/再生成、数据表、点击放大、查看引用来源
- 批注/讨论（annotations）：回复、resolve、jump to text、提交反馈
- **AI 编辑（AI Edit）**：选中文本后快速“润色/改写/扩写/压缩/风格化/自定义指令”，支持预览与应用变更
- 深度研究工具：出现 `commandPalette.graph`（与知识图谱/关系图能力呼应）
- 研究设置：知识库选择、成员可见性等

---

## 6) AI Service OpenAPI（可直接对照实现/复刻）

Base：`https://raven-ai-engine-ai-service.up.railway.app/api/v1`

主要操作（共 21 个 operation，节选重点）：

- 对话：
  - `POST /api/v1/ai/simple-chat`（模型枚举含 `grok/openai`，可选 stream）
  - `POST /api/v1/ai/chat`（**Chat With Resources**：`resources[] + message + history[]`，资源最多 10 条）
  - `POST /api/v1/reports/chat`（报告对话）
- 报告/摘要/洞察：
  - `GET  /api/v1/ai/report-templates`
  - `POST /api/v1/ai/generate-report`（模板：`comparison|trend|learning-path|literature-review`）
  - `POST /api/v1/ai/generate-structured-summary`（资源类型含 `PAPER/NEWS/YOUTUBE_VIDEO/BLOG/REPORT/RSS/...`）
  - `POST /api/v1/ai/summary`
  - `POST /api/v1/ai/insights`
  - `POST /api/v1/ai/classify`
  - `POST /api/v1/ai/quick-action`（`summary/insights/methodology`）
- 翻译/YouTube：
  - `POST /api/v1/ai/translate`、`/translate-segments`、`/translate-single`
  - `POST /api/v1/ai/youtube-report`
- Office：
  - `POST /api/v1/ai-office/quick-generate`
- Workspace 任务队列：
  - `POST /api/v1/workspace-tasks`（创建任务）
  - `GET  /api/v1/workspace-tasks/{task_id}`（查询状态：queue_position、estimated_time、result/error）

模型信息（从 schemas 可见的枚举/正则）：

- 多处出现 `model`：`grok` / `gpt-4` / `openai`

---

## 6.1)（推断）核心数据实体与字段（用于你在 DB/DTO 里快速对齐）

> 仅列“在前端代码/OpenAPI 里能看到或高度确定”的字段；细节以登录后抓包/数据库为准。

- **User / Account**
  - `user`: `email/fullName/username/avatarUrl`（profile 下拉与设置页可见）
  - credits：`account.balance`；check-in：`checkinStatus.canCheckin`
- **Ask Session（对话会话）**
  - `session`: `id/title/summary?/isBookmarked/updatedAt`
- **Knowledge Base（知识库选择器）**
  - `kb`: `id/name/type/sourceType/_count.documents`
- **Topic / Team（团队/研究主题）**
  - 端点显示存在：`members`、`ai-members`、`messages`、`resources`、`summaries`、`missions`、`join-requests`
  - 消息支持 reactions（emoji）
- **AI Writing**
  - 项目：`projects`；结构：`volumes/chapters`；任务：`missions`；风格：`style-presets`
  - 章节支持 AI 编辑动作（`/chapters/:id/ai-edit`）
- **AI Social**
  - `connections`（平台账号）与 `contents`（内容条目），内容有 status：`draft/pending/scheduled/published/failed`
- **AI Image**
  - `models`、`history`、`bookmarks`、`generate`（含 stream 与 with-files）
- **AI Service / Resource（OpenAPI 明确 schema）**
  - `Resource`: `id/title/type` + `abstract/authors/published_date/tags`（可为空）
  - workspace tasks：`status/queue_position/estimated_time/result/error`

---

## 7) 建议的“合法逆向”抓包清单（你可以用来补齐缺口）

1. 登录后在浏览器 DevTools → Network：
   - 记录 `Authorization` 头、401/403 行为、分页参数、`success/data/metadata` 结构
2. 对每个模块（Ask/Library/RAG/Research/Office/Planning/Social/Image）：
   - 列出“用户动作 → API → 请求体 → 响应体 → DB 变化”
3. 对所有流式能力：
   - SSE：`EventSource`（如 topic-insights progress）
   - fetch stream（如 image generate/stream、chat stream）
4. 把“模型/积分”纳入统一账本：
   - 每次调用扣费规则、交易类型、透支/冻结等边界

---

## 8) 做“更好版本”的高价值改进点（基于本次静态分析能看到的）

- **Token 安全性**：目标站点把 `accessToken/refreshToken` 放在 `localStorage`；更好的做法通常是 `httpOnly` Cookie + CSRF 防护 + refresh rotation。
- **流式接口的 token 传递**：观察到有用 query param 传 token 的 SSE（`.../progress?token=...`）；可改为后端代理/短期一次性票据，减少泄漏面（日志、分享链接、误复制等）。
- **统一“AI 调用账本”**：把 credits、token usage、模型选择、队列任务（workspace-tasks）统一到一套可观测的计费/审计流水（对 admin/用户都更清晰）。
- **RAG 体验**：已有 KB selector + `/rag/query`；可以进一步做“可引用片段高亮/来源段落定位/引用质量评分”，并在导出里保留引用链路。
- **可插拔集成**：Notion/Drive/飞书已存在；建议抽象为 connector framework（统一授权、同步、冲突解决、增量游标、重试与告警）。

---

## 9) 复刻优先级（建议的最小闭环 → 完整产品）

- **P0（最小闭环）**
  - Google 登录 + token 刷新
  - credits（余额/交易流水/扣费钩子）
  - AI models 列表（至少 grok/gpt-4/claude/gemini 四类占位）
  - AI Ask：sessions CRUD + SSE/stream chat + 选择 KB（RAG query）
- **P1（形成差异化体验）**
  - Library：collections + tags + stats + export（带 references）
  - topic-insights：refresh + SSE 进度 + 报告落库
  - topicResearch：引用/图表/批注/AI Edit（先做 20% 高频路径）
- **P2（扩展模块）**
  - AI Image / AI Writing / AI Social / AI Planning / AI Simulation
  - Integrations：Notion/Drive/飞书（先只做只读同步 → 冲突解决 → 双向）
  - Admin：先做 models/credits/users/notifications 四块，其余按需要补
