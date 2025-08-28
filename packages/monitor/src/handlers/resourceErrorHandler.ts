import { MonitorErrorType, type ErrorInfo } from '../types';

export class ResourceErrorHandler {
  private errorCallback: (error: ErrorInfo) => void;

  constructor(errorCallback: (error: ErrorInfo) => void) {
    this.errorCallback = errorCallback;
    this.init();
  }

  // Initialize resource error capture
  private init() {
    // Listen for resource loading errors (in capture phase)
    window.addEventListener('error', this.handleResourceError, true);
  }

  // Handle resource loading errors
  private handleResourceError = (event: ErrorEvent) => {
    const target = event.target || event.srcElement;
    
    // Only handle resource loading errors, not script errors
    if (target && target !== window && (target as any).src) {
      const element = target as HTMLElement & { src: string; tagName: string };
      
      // Get resource type
      const resourceType = this.getResourceType(element);
      
      const errorInfo: ErrorInfo = {
        type: MonitorErrorType.RESOURCE,
        message: `${resourceType} failed to load: ${element.src}`,
        filename: element.src,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        // Add additional resource information
        ...this.getResourceDetails(element)
      };
      
      this.errorCallback(errorInfo);
    }
  };

  // Get resource type
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

  // Get resource details
  private getResourceDetails(element: HTMLElement) {
    const details: Record<string, any> = {
      tagName: element.tagName.toLowerCase(),
    };

    // Get element ID and class
    if (element.id) details.elementId = element.id;
    if (element.className) details.elementClass = element.className;

    // Get specific information based on element type
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
      details.scriptType = script.type; // Renamed to avoid conflicts
    }

    return details;
  }

  // Destroy listener
  destroy() {
    window.removeEventListener('error', this.handleResourceError, true);
  }
}
