# Monitor Server

前端监控系统的后端服务，基于 NestJS 构建，支持错误上报、性能监控和数据分析。

## 技术栈

- **框架**: NestJS (TypeScript)
- **数据库**: PostgreSQL + Redis
- **ORM**: Prisma
- **缓存**: Redis
- **API 文档**: Swagger/OpenAPI
- **日志**: Winston
- **容器化**: Docker + Docker Compose

## 功能特性

### 错误监控
- ✅ JS 错误上报
- ✅ 资源加载错误上报
- ✅ 网络请求错误上报
- ✅ 批量错误上报
- ✅ 错误去重和聚合
- ✅ 错误统计分析

### 性能监控
- ✅ 页面加载性能数据
- ✅ 资源加载性能
- ✅ 内存使用情况
- ✅ 网络连接信息

### 用户会话
- ✅ 用户会话跟踪
- ✅ 地理位置信息
- ✅ 设备信息收集
- ✅ 浏览器信息

## 快速开始

### 使用 Docker Compose (推荐)

1. 克隆项目并进入 server 目录：
```bash
cd apps/server
```

2. 启动所有服务：
```bash
docker-compose up -d
```

3. 运行数据库迁移：
```bash
docker-compose exec server npm run db:migrate
```

4. 访问服务：
- API 服务: http://localhost:3001
- API 文档: http://localhost:3001/api/docs
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 本地开发

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp env.example .env
# 编辑 .env 文件，配置数据库连接信息
```

3. 启动 PostgreSQL 和 Redis：
```bash
# 使用 Docker 启动数据库
docker run -d --name postgres -p 5432:5432 -e POSTGRES_DB=monitor -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password postgres:15-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

4. 生成 Prisma 客户端：
```bash
npm run db:generate
```

5. 运行数据库迁移：
```bash
npm run db:migrate
```

6. 启动开发服务器：
```bash
npm run dev
```

## 数据库管理

### Prisma 命令

```bash
# 生成 Prisma 客户端
npm run db:generate

# 创建并应用迁移
npm run db:migrate

# 部署迁移到生产环境
npm run db:migrate:deploy

# 打开 Prisma Studio (数据库管理界面)
npm run db:studio


```

### 数据库 Schema

Prisma schema 定义了三个主要模型：

- **Error**: 错误信息存储
- **UserSession**: 用户会话跟踪
- **Performance**: 性能监控数据

## API 接口

### 错误上报接口

#### 单个错误上报
```http
POST /api/v1/errors/report
Content-Type: application/json

{
  "type": "JS",
  "message": "TypeError: Cannot read property 'length' of undefined",
  "stack": "TypeError: Cannot read property 'length' of undefined\n    at processData (app.js:15:10)",
  "filename": "app.js",
  "line": 15,
  "column": 10,
  "timestamp": 1640995200000,
  "url": "https://example.com/page",
  "userAgent": "Mozilla/5.0...",
  "projectId": "project-123"
}
```

#### 批量错误上报
```http
POST /api/v1/errors/report/batch
Content-Type: application/json

{
  "errors": [
    {
      "type": "JS",
      "message": "Error 1",
      "timestamp": 1640995200000,
      "url": "https://example.com/page",
      "userAgent": "Mozilla/5.0..."
    },
    {
      "type": "NETWORK",
      "message": "Network Error",
      "timestamp": 1640995201000,
      "url": "https://example.com/page",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

### 错误查询接口

#### 获取错误列表
```http
GET /api/v1/errors?page=1&limit=20&type=JS&projectId=project-123
```

#### 获取错误统计
```http
GET /api/v1/errors/stats?projectId=project-123&startDate=2024-01-01&endDate=2024-01-31
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | development |
| PORT | 服务端口 | 3001 |
| ALLOWED_ORIGINS | 允许的跨域来源 | http://localhost:3000 |
| DATABASE_URL | 数据库连接URL | postgresql://postgres:password@localhost:5432/monitor |
| REDIS_HOST | Redis 主机 | localhost |
| REDIS_PORT | Redis 端口 | 6379 |
| LOG_LEVEL | 日志级别 | info |

## 开发指南

### 项目结构
```
src/
├── config/           # 配置文件
├── common/           # 公共模块
├── modules/          # 业务模块
│   ├── errors/       # 错误处理模块
│   └── analytics/    # 数据分析模块
├── app.module.ts     # 主模块
└── main.ts          # 入口文件

prisma/
└── schema.prisma    # 数据库模型定义
```

### 添加新的错误类型

1. 在 `prisma/schema.prisma` 中的 `MonitorErrorType` 枚举中添加新类型
2. 运行 `npm run db:generate` 重新生成客户端
3. 在 `ErrorsService` 中添加处理逻辑
4. 更新 API 文档

### 添加新的性能指标

1. 在 `prisma/schema.prisma` 中的 `Performance` 模型中添加新字段
2. 创建对应的 DTO
3. 在 `AnalyticsService` 中添加处理逻辑
4. 更新 API 接口

## 部署

### 生产环境部署

1. 构建 Docker 镜像：
```bash
docker build -t monitor-server .
```

2. 使用 Docker Compose 部署：
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. 运行数据库迁移：
```bash
docker-compose exec server npm run db:migrate:deploy
```

### 监控和日志

- 应用日志存储在 `logs/` 目录
- 使用 Winston 进行日志管理
- 支持结构化日志输出
- 集成 ELK Stack 进行日志分析

## 贡献

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License
