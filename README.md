# V-Monitor

前端监控系统，包含监控 SDK、后端服务和演示应用。

## 项目结构

```
├── packages/
│   ├── monitor/          # 监控 SDK
│   └── playground/       # 演示应用
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

### 2. 启动后端服务

```bash
# 启动所有服务 (PostgreSQL + Redis + Server)
pnpm server:up

# 生成 Prisma 客户端
pnpm db:generate

# 运行数据库迁移
pnpm db:migrate
```

### 3. 启动演示应用

```bash
# 启动 playground 演示应用
pnpm dev
```

### 4. 访问服务

- **演示应用**: http://localhost:3000
- **后端 API**: http://localhost:3001
- **API 文档**: http://localhost:3001/api/docs
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
pnpm db:migrate:deploy  # 部署迁移到生产环境
pnpm db:studio          # 打开 Prisma Studio

# Docker 管理
pnpm server:up          # 启动所有服务
pnpm server:down        # 停止所有服务
pnpm server:logs        # 查看服务日志
```

### 监控 SDK (Monitor)

```bash
# 构建 SDK
pnpm build:monitor

# 开发模式
cd packages/monitor
npm run dev
```

### 演示应用 (Playground)

```bash
# 开发模式
pnpm dev

# 构建
pnpm build:playground
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
- **数据库**: PostgreSQL + Redis
- **ORM**: Prisma
- **API 文档**: Swagger/OpenAPI
- **容器化**: Docker + Docker Compose

### 监控 SDK
- **语言**: TypeScript
- **构建工具**: Vite
- **错误处理**: 自定义错误处理器
- **上报方式**: Fetch/XHR/Beacon
- **包名**: @monitor/sdk
- **支持格式**: ES Module, CommonJS

### 演示应用
- **框架**: Vue 3 + Vite
- **语言**: TypeScript
- **UI**: 自定义组件

## 环境配置

### 后端服务环境变量

复制 `apps/server/env.example` 到 `apps/server/.env` 并配置：

```env
# 应用配置
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# 数据库配置 (Prisma)
DATABASE_URL="postgresql://postgres:password@localhost:5432/monitor?schema=public"

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 日志配置
LOG_LEVEL=info
```

## 开发指南

### 添加新的错误类型

1. 在 `apps/server/prisma/schema.prisma` 中的 `MonitorErrorType` 枚举中添加新类型
2. 运行 `pnpm db:generate` 重新生成客户端
3. 在 `apps/server/src/modules/errors/errors.service.ts` 中添加处理逻辑
4. 更新 API 文档

### 添加新的性能指标

1. 在 `apps/server/prisma/schema.prisma` 中的 `Performance` 模型中添加新字段
2. 创建对应的 DTO
3. 在 `apps/server/src/modules/analytics/` 中添加处理逻辑
4. 更新 API 接口

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
