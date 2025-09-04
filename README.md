# V-Monitor

前端监控系统：前端 SDK（@monitor/sdk）+ 后端（NestJS + Prisma + PostgreSQL）+ 可视化 Web。

## 项目结构

```
├── packages/
│   ├── monitor/          # 监控 SDK (@monitor/sdk)
│   └── playground/       # demo（可选）
├── apps/
│   ├── server/           # 后端服务 (NestJS + Prisma)
│   └── web/              # Web 管理界面
└── package.json          # 根目录配置
```

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 数据库与 Prisma（如需）

```bash
pnpm db:generate

pnpm db:migrate
# 或直接部署迁移
pnpm db:migrate:deploy
```

### 3. 启动服务与 Web

```bash
# 启动后端（Nest 开发模式）
pnpm dev:server

# 启动 Web 前端
pnpm dev:web
```

### 4. 访问

- **Web 前端**: http://localhost:5173
- **后端 API**: http://localhost:3001/api/v1
- **Prisma Studio**: http://localhost:5555 (运行 `pnpm db:studio` 后)

## 开发命令

### 后端服务 (Server)

```bash
# 开发模式启动
pnpm dev:server

# 构建
pnpm build:server

# 数据库相关
pnpm db:generate        # 生成 Prisma 客户端
pnpm db:migrate         # 创建并应用迁移
pnpm db:migrate:deploy  # 部署迁移
pnpm db:studio          # 打开 Prisma Studio

# Docker 管理
pnpm server:up          # 启动所有服务
pnpm server:down        # 停止所有服务
pnpm server:logs        # 查看服务日志
```

### 监控 SDK (@monitor/sdk)

```bash
# 构建 SDK
pnpm build:monitor

# 开发模式
cd packages/monitor
npm run dev
```

# 即时回放（仅报错时上传）
- 在 SDK 中开启 `replay.enabled` 即可，仅错误发生时附带最近窗口事件快照到 `metadata.replay`，服务端 `metadata` 将原样保存；Web 详情页支持回放查看。

### Web 前端 (apps/web)

```bash
# 开发
pnpm dev:web

# 一键构建并复制 sourcemap 至服务端
pnpm -F @monitor/web run build:with-maps
# 或指定输出目录
SOURCEMAP_DIR=/abs/path/to/sourcemaps pnpm -F @monitor/web run build:with-maps
```

### 通用命令

```bash
# 构建所有项目
pnpm build

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 技术栈

### 后端服务
- **框架**: NestJS (TypeScript)
- **数据库**: PostgreSQL
- **ORM**: Prisma
- **容器化**: Docker + Docker Compose

### 监控 SDK
- **语言**: TypeScript
- **构建工具**: Vite
- **错误处理**: 自定义错误处理器
- **上报方式**: Fetch/XHR/Beacon
- **包名**: @monitor/sdk
- **支持格式**: ES Module, CommonJS

### Web 前端
- **框架**: React + Vite + Tailwind + TanStack Query + Recharts

## 环境配置

### 后端服务环境变量

在 `apps/server/.env` 中配置：

```env
# 应用
PORT=3001

# Prisma 数据库
DATABASE_URL="postgresql://postgres:password@localhost:5432/monitor?schema=public"

# Sourcemap 目录（用于堆栈反混淆）
SOURCEMAP_DIR=/abs/path/to/sourcemaps  # 推荐：apps/server/sourcemaps
```

## 开发指南

### 添加新的错误类型

1. 在 `apps/server/prisma/schema.prisma` 中的 `MonitorErrorType` 枚举中添加新类型
2. 运行 `pnpm db:generate` 重新生成客户端
3. 在 `apps/server/src/errors/errors.service.ts` 中添加处理逻辑

### 前端 SDK 传参

- 在 `Monitor` 初始化时传入 `projectId` 与 `version`（Web 里已通过 Vite 注入包版本）。
- SDK 上报体包含：`projectId`、`version`、`metadata`（性能指标等）。

## 部署

### 生产环境部署

```bash
# 构建所有项目
pnpm build

# 启动生产环境服务
cd apps/server
docker-compose -f docker-compose.prod.yml up -d

# 运行数据库迁移
docker-compose exec server npm run db:migrate:deploy
```

## 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
