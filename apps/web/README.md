# @monitor/web

React + Vite 前端可视化界面，用于查看错误与性能数据、解析 sourcemap。

## 开发

```bash
pnpm dev
```

## 构建与 sourcemap 拷贝

```bash
# 一键构建并将 sourcemap 复制到服务端目录（默认 apps/server/sourcemaps）
pnpm run build:with-maps

# 自定义 sourcemap 输出目录
SOURCEMAP_DIR=/abs/path/to/sourcemaps pnpm run build:with-maps
```

生成结构：`<SOURCEMAP_DIR>/<projectId>/<version>/*.map`

## SDK 集成

`src/sdk/monitor.ts` 中注入 `projectId` 与 `version`，上报体包含 `metadata`，用于性能指标与拓展字段。

## 堆栈反混淆

前端在错误详情中调用后端 `/api/v1/sourcemaps/resolve`，传入 `projectId`、`version`、原始 stack 与 `baseUrl`，后端在本地 sourcemap 目录中查找并解析。


