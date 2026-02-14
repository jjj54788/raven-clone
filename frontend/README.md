# Phase 1: 纯静态 UI 复刻

## 目标

在浏览器中看到一个和 Raven AI Engine 几乎一模一样的界面。
此阶段**不需要后端、不需要数据库**，纯前端独立运行。
所有交互都是假数据/模拟的。

## 操作步骤

### 1. 创建 Next.js 项目

```powershell
mkdir raven-mvp
cd raven-mvp
pnpm create next-app frontend --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd frontend
```

### 2. 安装额外依赖

```powershell
pnpm add react-markdown lucide-react
```

### 3. 复制文件

将本目录下 `src/` 中的所有文件复制到 `frontend/src/` 中，覆盖同名文件。

### 4. 启动

```powershell
pnpm dev
```

### 5. 验证

打开 http://localhost:3000 ，你应该看到:
- 左侧侧边栏 (和原站一样的导航菜单)
- 中间 "Good morning, User" 问候语
- 聊天输入框 + 工具栏
- 底部名言引用区
- 输入消息后能看到模拟的 AI 回复 (假数据)
