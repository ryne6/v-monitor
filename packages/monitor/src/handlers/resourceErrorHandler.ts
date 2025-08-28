import { MonitorErrorType, type ErrorInfo } from '../types';

export class ResourceErrorHandler {
  private errorCallback: (error: ErrorInfo) => void;

  constructor(errorCallback: (error: ErrorInfo) => void) {
    this.errorCallback = errorCallback;
    this.init();
  }

  // 初始化资源错误捕获
  private init() {
    // 监听资源加载错误（在捕获阶段）
    window.addEventListener('error', this.handleResourceError, true);
  }

  // 处理资源加载错误
  private handleResourceError = (event: ErrorEvent) => {
    const target = event.target || event.srcElement;
    
    // 只处理资源加载错误，不处理脚本错误
    if (target && target !== window && (target as any).src) {
      const element = target as HTMLElement & { src: string; tagName: string };
      
      // 获取资源类型
      const resourceType = this.getResourceType(element);
      
      const errorInfo: ErrorInfo = {
        type: MonitorErrorType.RESOURCE,
        message: `${resourceType} 加载失败: ${element.src}`,
        filename: element.src,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        // 添加额外的资源信息
        ...this.getResourceDetails(element)
      };
      
      this.errorCallback(errorInfo);
    }
  };

  // 获取资源类型
  private getResourceType(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'img':
        return 'Image';
      case 'script':
        return 'JavaScript';
      case 'link':
        const rel = (element as HTMLLinkElement).rel;
        if (rel === 'stylesheet') return 'CSS';
        if (rel === 'preload' || rel === 'prefetch') return 'Preload';
        return 'Link';
      case 'audio':
        return 'Audio';
      case 'video':
        return 'Video';
      case 'source':
        return 'Source';
      case 'iframe':
        return 'Iframe';
      default:
        return 'Unknown';
    }
  }

  // 获取资源详细信息
  private getResourceDetails(element: HTMLElement) {
    const details: Record<string, any> = {
      tagName: element.tagName.toLowerCase(),
    };

    // 获取元素的 ID 和 class
    if (element.id) details.elementId = element.id;
    if (element.className) details.elementClass = element.className;

    // 根据元素类型获取特定信息
    if (element.tagName.toLowerCase() === 'img') {
      const img = element as HTMLImageElement;
      details.naturalWidth = img.naturalWidth;
      details.naturalHeight = img.naturalHeight;
      details.alt = img.alt;
    }

    if (element.tagName.toLowerCase() === 'link') {
      const link = element as HTMLLinkElement;
      details.rel = link.rel;
      details.media = link.media;
    }

    if (element.tagName.toLowerCase() === 'script') {
      const script = element as HTMLScriptElement;
      details.async = script.async;
      details.defer = script.defer;
      details.scriptType = script.type; // 重命名避免冲突
    }

    return details;
  }

  // 销毁监听器
  destroy() {
    window.removeEventListener('error', this.handleResourceError, true);
  }
}
