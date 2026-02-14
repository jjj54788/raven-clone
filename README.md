# Raven AI Engine - Phase 3

## 新增功能
- PostgreSQL 数据库（Docker）
- 用户注册/登录（JWT 认证）
- 聊天会话管理（创建/删除/切换）
- 消息历史保存到数据库
- 多 AI 模型切换

## 快速启动（4 步）

### 第 1 步：启动 PostgreSQL 数据库

```powershell
docker run --name raven-postgres -e POSTGRES_PASSWORD=admin123 -e POSTGRES_DB=raven_ai -p 5432:5432 -d postgres
```

### 第 2 步：启动后端

```powershell
cd backend

# 创建 .env 文件（用 VS Code 或记事本手动创建，内容如下）：
# DATABASE_URL="postgresql://postgres:admin123@localhost:5432/raven_ai?schema=public"
# JWT_SECRET=raven-super-secret-key
# DEEPSEEK_API_KEY=sk-你的key

pnpm install
npx prisma generate
npx prisma migrate dev --name init
pnpm prisma:seed
pnpm start:dev
```

### 第 3 步：启动前端（新终端）

```powershell
cd frontend
pnpm install
pnpm dev
```

### 第 4 步：打开浏览器

访问 http://localhost:3000

默认账户：admin@raven.local / admin123
