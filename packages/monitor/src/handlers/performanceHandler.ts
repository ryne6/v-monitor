import type { ErrorInfo } from '../types';
import { MonitorErrorType } from '../types';

export interface PerformanceMetrics {
  // 页面加载性能
  navigationStart: number;
  loadEventEnd: number;
  domContentLoadedEventEnd: number;
  
  // Web Vitals
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  
  // 资源加载性能
  resourceTiming: Array<{
    name: string;
    duration: number;
    transferSize: number;
    initiatorType: string;
  }>;
  
  // 内存使用
  memoryUsed?: number;
  memoryLimit?: number;
  
  // 网络信息
  connectionType?: string;
  downlink?: number;
  rtt?: number;
}

export interface PerformanceHandlerConfig {
  enabled?: boolean;
  // 是否监控 Web Vitals
  monitorWebVitals?: boolean;
  // 是否监控资源加载
  monitorResourceTiming?: boolean;
  // 是否监控内存使用
  monitorMemory?: boolean;
  // 是否监控网络信息
  monitorNetwork?: boolean;
  // 性能数据上报阈值
  thresholds?: {
    fcp?: number; // First Contentful Paint 阈值 (ms)
    lcp?: number; // Largest Contentful Paint 阈值 (ms)
    fid?: number; // First Input Delay 阈值 (ms)
    cls?: number; // Cumulative Layout Shift 阈值
  };
}

export class PerformanceHandler {
  private config: PerformanceHandlerConfig;
  private onError: (error: ErrorInfo) => void;
  private observer: PerformanceObserver | null = null;
  private clsObserver: PerformanceObserver | null = null;
  private lcpObserver: PerformanceObserver | null = null;
  private fidObserver: PerformanceObserver | null = null;

  constructor(onError: (error: ErrorInfo) => void, config: PerformanceHandlerConfig = {}) {
    this.onError = onError;
    this.config = {
      enabled: true,
      monitorWebVitals: true,
      monitorResourceTiming: true,
      monitorMemory: true,
      monitorNetwork: true,
      thresholds: {
        fcp: 1800, // 1.8s
        lcp: 2500, // 2.5s
        fid: 100,  // 100ms
        cls: 0.1,  // 0.1
      },
      ...config,
    };

    if (this.config.enabled) {
      this.init();
    }
  }

  private init() {
    // 监控 Web Vitals
    if (this.config.monitorWebVitals) {
      this.initWebVitalsMonitoring();
    }

    // 监控资源加载
    if (this.config.monitorResourceTiming) {
      this.initResourceTimingMonitoring();
    }

    // 监控内存使用
    if (this.config.monitorMemory) {
      this.initMemoryMonitoring();
    }

    // 监控网络信息
    if (this.config.monitorNetwork) {
      this.initNetworkMonitoring();
    }

    // 页面加载完成后收集性能数据
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.collectPerformanceData();
      });
    } else {
      this.collectPerformanceData();
    }

    // 页面完全加载后再次收集
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.collectPerformanceData();
      }, 1000);
    });
  }

  private initWebVitalsMonitoring() {
    // 监控 First Contentful Paint (FCP)
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'first-contentful-paint') {
              const fcp = entry.startTime;
              this.reportPerformanceMetric('FCP', fcp, this.config.thresholds?.fcp);
            }
          });
        });
        this.observer.observe({ entryTypes: ['first-contentful-paint'] });
      } catch (e) {
        console.warn('FCP monitoring not supported:', e);
      }
    }

    // 监控 Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        this.lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            const lcp = lastEntry.startTime;
            this.reportPerformanceMetric('LCP', lcp, this.config.thresholds?.lcp);
          }
        });
        this.lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('LCP monitoring not supported:', e);
      }
    }

    // 监控 First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      try {
        this.fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'first-input') {
              const firstInputEntry = entry as PerformanceEventTiming;
              const fid = firstInputEntry.processingStart - firstInputEntry.startTime;
              this.reportPerformanceMetric('FID', fid, this.config.thresholds?.fid);
            }
          });
        });
        this.fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('FID monitoring not supported:', e);
      }
    }

    // 监控 Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        this.clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.reportPerformanceMetric('CLS', clsValue, this.config.thresholds?.cls);
        });
        this.clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('CLS monitoring not supported:', e);
      }
    }
  }

  private initResourceTimingMonitoring() {
    // 监控资源加载性能
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              this.reportResourceTiming(resourceEntry);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource timing monitoring not supported:', e);
      }
    }
  }

  private initMemoryMonitoring() {
    // 监控内存使用情况
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          this.reportMemoryUsage(memory);
        }
      }, 30000); // 每30秒检查一次
    }
  }

  private initNetworkMonitoring() {
    // 监控网络连接信息
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.reportNetworkInfo(connection);
        
        // 监听网络变化
        connection.addEventListener('change', () => {
          this.reportNetworkInfo(connection);
        });
      }
    }
  }

  private collectPerformanceData() {
    const metrics = this.getPerformanceMetrics();
    this.reportPerformanceData(metrics);
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    const timing = performance.timing;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics: PerformanceMetrics = {
      navigationStart: timing?.navigationStart || performance.now(),
      loadEventEnd: timing?.loadEventEnd || navigation?.loadEventEnd || 0,
      domContentLoadedEventEnd: timing?.domContentLoadedEventEnd || navigation?.domContentLoadedEventEnd || 0,
      resourceTiming: [],
    };

    // 获取 Web Vitals
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcpEntry) {
      metrics.firstPaint = fcpEntry.startTime;
      metrics.firstContentfulPaint = fcpEntry.startTime;
    }

    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      const lastLcp = lcpEntries[lcpEntries.length - 1];
      metrics.largestContentfulPaint = lastLcp.startTime;
    }

    // 获取资源加载信息
    if (this.config.monitorResourceTiming) {
      const resourceEntries = performance.getEntriesByType('resource');
      metrics.resourceTiming = resourceEntries.map((entry) => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: (entry as PerformanceResourceTiming).transferSize || 0,
        initiatorType: (entry as PerformanceResourceTiming).initiatorType || 'unknown',
      }));
    }

    // 获取内存信息
    if (this.config.monitorMemory && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        metrics.memoryUsed = memory.usedJSHeapSize;
        metrics.memoryLimit = memory.jsHeapSizeLimit;
      }
    }

    // 获取网络信息
    if (this.config.monitorNetwork && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        metrics.connectionType = connection.effectiveType;
        metrics.downlink = connection.downlink;
        metrics.rtt = connection.rtt;
      }
    }

    return metrics;
  }

  private reportPerformanceMetric(type: string, value: number, threshold?: number) {
    const isPoor = threshold && value > threshold;
    
    if (isPoor) {
      this.onError({
        type: MonitorErrorType.PERFORMANCE,
        message: `${type} 性能指标异常: ${value}ms`,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          metricType: type,
          value,
          threshold,
          isPoor: true,
        },
      });
    }
  }

  private reportResourceTiming(entry: PerformanceResourceTiming) {
    // 只报告加载时间超过1秒的资源
    if (entry.duration > 1000) {
      this.onError({
        type: MonitorErrorType.PERFORMANCE,
        message: `资源加载缓慢: ${entry.name}`,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          resourceName: entry.name,
          duration: entry.duration,
          transferSize: entry.transferSize,
          initiatorType: entry.initiatorType,
        },
      });
    }
  }

  private reportMemoryUsage(memory: any) {
    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    
    // 内存使用超过80%时报告
    if (usagePercent > 80) {
      this.onError({
        type: MonitorErrorType.PERFORMANCE,
        message: `内存使用率过高: ${usagePercent.toFixed(2)}%`,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          memoryUsed: memory.usedJSHeapSize,
          memoryLimit: memory.jsHeapSizeLimit,
          usagePercent,
        },
      });
    }
  }

  private reportNetworkInfo(connection: any) {
    this.onError({
      type: MonitorErrorType.PERFORMANCE,
      message: `网络连接信息`,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata: {
        connectionType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      },
    });
  }

  private reportPerformanceData(metrics: PerformanceMetrics) {
    this.onError({
      type: MonitorErrorType.PERFORMANCE,
      message: '页面性能数据',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata: metrics,
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.clsObserver) {
      this.clsObserver.disconnect();
      this.clsObserver = null;
    }
    if (this.lcpObserver) {
      this.lcpObserver.disconnect();
      this.lcpObserver = null;
    }
    if (this.fidObserver) {
      this.fidObserver.disconnect();
      this.fidObserver = null;
    }
  }
}
