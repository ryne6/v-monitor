# @monitor/sdk

前端监控 SDK，提供错误追踪、性能监控和用户行为分析功能。

## 特性

- 🚀 **轻量级**: 体积小，性能优异
- 🔧 **易集成**: 简单的 API 设计
- 📊 **多维度监控**: JS 错误、资源错误、网络错误、性能数据
- 🔄 **智能上报**: 支持批量上报、重试机制、去重处理
- 🛡️ **类型安全**: 完整的 TypeScript 支持
- 🌐 **多环境支持**: 浏览器、Node.js 环境

## 安装

```bash
npm install @monitor/sdk
# 或
yarn add @monitor/sdk
# 或
pnpm add @monitor/sdk
```

## 快速开始

### 基础使用

```typescript
import { Monitor } from '@monitor/sdk';

// 创建监控实例
const monitor = new Monitor({
  report: {
    url: 'https://your-api.com/api/v1/errors/report',
  },
});

// 监听错误
monitor.onError((error) => {
  console.log('捕获到错误:', error);
});

// 手动上报错误
monitor.reportError({
  type: 'js',
  message: 'Custom error message',
  timestamp: Date.now(),
  url: window.location.href,
  userAgent: navigator.userAgent,
});
```

### 高级配置

```typescript
import { Monitor, MonitorErrorType } from '@monitor/sdk';

const monitor = new Monitor({
  // 上报配置
  report: {
    url: 'https://your-api.com/api/v1/errors/report',
    transport: {
      type: 'auto', // 'auto' | 'fetch' | 'xhr'
      headers: {
        'Authorization': 'Bearer your-token',
      },
    },
    aggregator: {
      windowMs: 5000, // 聚合窗口时间
      maxBatch: 10,   // 最大批量大小
      rateLimitPerMinute: 60, // 每分钟最大上报量
    },
    retry: {
      enabled: true,
      maxAttempts: 3,
      initialDelayMs: 1000,
    },
  },
  
  // 网络监控配置
  network: {
    enabled: true,
    monitorFetch: true,
    monitorXHR: true,
    excludePatterns: ['/api/health', '/analytics'],
    maxResponseLength: 1000,
    detailed: true,
  },
  
  // JS 错误监控
  js: {
    enabled: true,
  },
  
  // 资源错误监控
  resource: {
    enabled: true,
  },
});
```

## API 参考

### Monitor 类

主要的监控类，负责初始化和管理所有监控功能。

#### 构造函数

```typescript
new Monitor(config?: MonitorConfig)
```

#### 方法

- `onError(handler: (error: ErrorInfo) => void)`: 注册错误处理器
- `reportError(error: ErrorInfo)`: 手动上报错误
- `getConfig()`: 获取当前配置
- `updateConfig(newConfig: Partial<MonitorConfig>)`: 更新配置
- `destroy()`: 销毁监控实例

### 配置类型

#### MonitorConfig

```typescript
interface MonitorConfig {
  report?: ReportConfig;
  network?: NetworkConfig;
  js?: JSConfig;
  resource?: ResourceConfig;
}
```

#### ReportConfig

```typescript
interface ReportConfig {
  url: string;
  transport?: TransportConfig;
  aggregator?: AggregatorConfig;
  retry?: RetryConfig;
}
```

### 错误类型

#### MonitorErrorType

```typescript
enum MonitorErrorType {
  JS = 'js',
  RESOURCE = 'resource',
  NETWORK = 'network',
  PERFORMANCE = 'performance',
}
```

#### ErrorInfo

```typescript
interface ErrorInfo {
  type: MonitorErrorType;
  message: string;
  stack?: string;
  filename?: string;
  line?: number;
  column?: number;
  timestamp: number;
  url: string;
  userAgent: string;
  // 网络请求相关字段
  requestMethod?: string;
  requestUrl?: string;
  responseStatus?: number;
  responseStatusText?: string;
  requestDuration?: number;
  requestType?: 'fetch' | 'xhr';
  // 其他扩展字段
  [key: string]: any;
}
```

## 使用示例

### 错误监控

```typescript
import { Monitor, MonitorErrorType } from '@monitor/sdk';

const monitor = new Monitor({
  report: {
    url: 'https://your-api.com/api/v1/errors/report',
  },
});

// 监听所有错误
monitor.onError((error) => {
  console.log('错误类型:', error.type);
  console.log('错误消息:', error.message);
  console.log('错误堆栈:', error.stack);
  console.log('发生时间:', new Date(error.timestamp));
});

// 手动上报 JS 错误
monitor.reportError({
  type: MonitorErrorType.JS,
  message: 'Something went wrong',
  stack: new Error().stack,
  timestamp: Date.now(),
  url: window.location.href,
  userAgent: navigator.userAgent,
});
```

### 性能监控

```typescript
// 监控页面加载性能
window.addEventListener('load', () => {
  const performance = window.performance;
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  monitor.reportError({
    type: MonitorErrorType.PERFORMANCE,
    message: 'Page load performance',
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    metadata: {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
    },
  });
});
```

### 自定义 Reporter

```typescript
import { Reporter, FetchReporter } from '@monitor/sdk';

// 创建自定义 Reporter
const customReporter = new FetchReporter({
  report: {
    url: 'https://your-api.com/api/v1/errors/report',
    transport: {
      headers: {
        'X-API-Key': 'your-api-key',
      },
    },
  },
});

// 使用自定义 Reporter
const monitor = new Monitor();
monitor.setReporter(customReporter);
```

## 浏览器兼容性

- Chrome >= 60
- Firefox >= 55
- Safari >= 12
- Edge >= 79

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview
```

## 许可证

MIT License
