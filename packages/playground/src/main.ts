// @ts-nocheck
import { Monitor, type ErrorInfo } from '~/monitor/main';

// 初始化监控器
const monitor = new Monitor();

// 错误日志容器
const errorLogContainer = document.getElementById('errorLog')!;

// 注册错误处理器
monitor.onError((error: ErrorInfo) => {
  console.log('捕获到错误:', error);
  displayError(error);
});

// 显示错误信息
function displayError(error: ErrorInfo) {
  // 清空初始状态
  if (errorLogContainer.children.length === 1 && 
      errorLogContainer.children[0].textContent?.includes('等待错误触发')) {
    errorLogContainer.innerHTML = '';
  }

  const errorElement = document.createElement('div');
  errorElement.className = 'error-item';
  
  const timestamp = new Date(error.timestamp).toLocaleTimeString();
  
  let metaInfo = `时间: ${timestamp}`;
  
  // 根据错误类型显示不同的元信息
  if (error.type === 'network') {
    metaInfo += ` | 方法: ${error.requestMethod} | 状态: ${error.responseStatus} | 耗时: ${error.requestDuration}ms`;
    if (error.requestQuery) metaInfo += ` | Query: ${error.requestQuery}`;
  } else {
    if (error.filename) metaInfo += ` | 文件: ${error.filename}`;
    if (error.line) metaInfo += ` | 行: ${error.line}`;
    if (error.column) metaInfo += ` | 列: ${error.column}`;
  }

  let additionalInfo = '';
  if (error.type === 'network') {
    // 请求信息
    if (error.requestBody) {
      additionalInfo += `<div class="error-meta" style="margin-top: 0.5rem; font-size: 0.75rem;"><strong>请求 Body:</strong> <pre style="margin: 0.25rem 0; background: rgba(0,0,0,0.1); padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(error.requestBody, null, 2)}</pre></div>`;
    }
    if (error.requestHeaders && Object.keys(error.requestHeaders).length > 0) {
      additionalInfo += `<div class="error-meta" style="margin-top: 0.25rem; font-size: 0.75rem;"><strong>请求 Headers:</strong> <pre style="margin: 0.25rem 0; background: rgba(0,0,0,0.1); padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(error.requestHeaders, null, 2)}</pre></div>`;
    }
    
    // 响应信息
    if (error.responseBody) {
      const responseBodyStr = typeof error.responseBody === 'string' 
        ? error.responseBody 
        : JSON.stringify(error.responseBody, null, 2);
      additionalInfo += `<div class="error-meta" style="margin-top: 0.25rem; font-size: 0.75rem;"><strong>响应 Body:</strong> <pre style="margin: 0.25rem 0; background: rgba(255,0,0,0.1); padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${responseBodyStr}</pre></div>`;
    }
    if (error.responseHeaders && Object.keys(error.responseHeaders).length > 0) {
      additionalInfo += `<div class="error-meta" style="margin-top: 0.25rem; font-size: 0.75rem;"><strong>响应 Headers:</strong> <pre style="margin: 0.25rem 0; background: rgba(255,0,0,0.1); padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(error.responseHeaders, null, 2)}</pre></div>`;
    }
  }

  errorElement.innerHTML = `
    <div class="error-type">${error.type}</div>
    <div class="error-message">${error.message}</div>
    <div class="error-meta">${metaInfo}</div>
    ${additionalInfo}
    ${error.stack ? `<div class="error-meta" style="margin-top: 0.5rem; font-size: 0.7rem;">${error.stack.split('\n').slice(0, 3).join('\n')}</div>` : ''}
  `;
  
  errorLogContainer.prepend(errorElement);
  
  // 限制显示数量
  if (errorLogContainer.children.length > 10) {
    errorLogContainer.removeChild(errorLogContainer.lastChild!);
  }
}

// 错误触发函数
(window as any).triggerSyntaxError = () => {
  eval('const a = ;'); // 语法错误
};

(window as any).triggerReferenceError = () => {
  console.log(undefinedVariable); // 引用错误
};

(window as any).triggerTypeError = () => {
  const obj = null;
  obj.someMethod(); // 类型错误
};

(window as any).triggerPromiseError = () => {
  Promise.reject(new Error('这是一个 Promise 拒绝错误'));
};

(window as any).triggerAsyncError = async () => {
  await new Promise((_, reject) => {
    setTimeout(() => reject(new Error('异步操作失败')), 100);
  });
};

// 资源错误触发函数
(window as any).triggerImageError = () => {
  const img = document.createElement('img');
  img.src = 'https://non-existent-domain-12345.com/image.jpg';
  img.alt = '测试图片';
  img.style.display = 'none';
  document.body.appendChild(img);
};

(window as any).triggerScriptError = () => {
  const script = document.createElement('script');
  script.src = 'https://non-existent-domain-12345.com/script.js';
  script.async = true;
  document.head.appendChild(script);
};

(window as any).triggerCSSError = () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://non-existent-domain-12345.com/styles.css';
  document.head.appendChild(link);
};

(window as any).triggerAudioError = () => {
  const audio = document.createElement('audio');
  audio.src = 'https://non-existent-domain-12345.com/audio.mp3';
  audio.controls = true;
  audio.style.display = 'none';
  document.body.appendChild(audio);
};

// 网络请求错误触发函数
(window as any).triggerFetch404 = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/not-found');
    console.log('Response:', response);
  } catch (error) {
    console.log('Fetch error caught:', error);
  }
};

(window as any).triggerFetch500 = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/server-error');
    console.log('Response:', response);
  } catch (error) {
    console.log('Fetch error caught:', error);
  }
};

(window as any).triggerFetchNetwork = async () => {
  try {
    const response = await fetch('https://non-existent-domain-12345.com/api/data');
    console.log('Response:', response);
  } catch (error) {
    console.log('Fetch error caught:', error);
  }
};

(window as any).triggerXHR404 = () => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://localhost:3001/api/not-found', true);
  xhr.send();
};

(window as any).triggerXHRTimeout = () => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'http://localhost:3001/api/slow', true);
  xhr.timeout = 1000; // 1秒超时，但接口需要3秒
  xhr.send();
};

// 额外的测试函数
(window as any).triggerFetchSuccess = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/success?userId=123&action=test');
    const data = await response.json();
    console.log('Success response:', data);
  } catch (error) {
    console.log('Fetch error caught:', error);
  }
};

(window as any).triggerRandomError = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/random-error');
    const data = await response.json();
    console.log('Random endpoint response:', data);
  } catch (error) {
    console.log('Fetch error caught:', error);
  }
};

// POST 请求测试 (带 body)
(window as any).triggerPostError = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'test-value'
      },
      body: JSON.stringify({
        name: 'Test User',
        // email: 'test@example.com',
        age: 25
      })
    });
    const data = await response.json();
    console.log('POST response:', data);
  } catch (error) {
    console.log('POST error caught:', error);
  }
};

console.log('Monitor Playground 已启动！');
console.log('🔧 Express 测试服务器运行在: http://localhost:3001');
