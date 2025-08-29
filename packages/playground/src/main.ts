// @ts-nocheck
import { Monitor, type ErrorInfo, BeaconReporter } from '~/monitor/main';

// Initialize monitor
const monitor = new Monitor();

// Setup error reporter
monitor.setupReporter({
  endpoint: 'http://localhost:3001/api/errors',
  appId: 'playground-app',
  env: 'development',
  enabled: true
});

// Error log container
const errorLogContainer = document.getElementById('errorLog')!;

// Register error handler
monitor.onError((error: ErrorInfo) => {
  console.log('Error captured:', error);
  displayError(error);
});

// Display error information
function displayError(error: ErrorInfo) {
  // Clear initial state
  if (errorLogContainer.children.length === 1 && 
      errorLogContainer.children[0].textContent?.includes('Waiting for errors')) {
    errorLogContainer.innerHTML = '';
  }

  const errorElement = document.createElement('div');
  errorElement.className = 'error-item';
  
  const timestamp = new Date(error.timestamp).toLocaleTimeString();
  
  let metaInfo = `Time: ${timestamp}`;
  
  // Display different meta information based on error type
  if (error.type === 'network') {
    metaInfo += ` | Method: ${error.requestMethod} | Status: ${error.responseStatus} | Duration: ${error.requestDuration}ms`;
    if (error.requestQuery) metaInfo += ` | Query: ${error.requestQuery}`;
  } else {
    if (error.filename) metaInfo += ` | File: ${error.filename}`;
    if (error.line) metaInfo += ` | Line: ${error.line}`;
    if (error.column) metaInfo += ` | Column: ${error.column}`;
  }

  let additionalInfo = '';
  if (error.type === 'network') {
    // Request information
    if (error.requestBody) {
      additionalInfo += `<div class="error-meta" style="margin-top: 0.5rem; font-size: 0.75rem;"><strong>Request Body:</strong> <pre style="margin: 0.25rem 0; background: rgba(0,0,0,0.1); padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(error.requestBody, null, 2)}</pre></div>`;
    }
    if (error.requestHeaders && Object.keys(error.requestHeaders).length > 0) {
      additionalInfo += `<div class="error-meta" style="margin-top: 0.25rem; font-size: 0.75rem;"><strong>Request Headers:</strong> <pre style="margin: 0.25rem 0; background: rgba(0,0,0,0.1); padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(error.requestHeaders, null, 2)}</pre></div>`;
    }
    
    // Response information
    if (error.responseBody) {
      const responseBodyStr = typeof error.responseBody === 'string' 
        ? error.responseBody 
        : JSON.stringify(error.responseBody, null, 2);
      additionalInfo += `<div class="error-meta" style="margin-top: 0.25rem; font-size: 0.75rem;"><strong>Response Body:</strong> <pre style="margin: 0.25rem 0; background: rgba(255,0,0,0.1); padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${responseBodyStr}</pre></div>`;
    }
    if (error.responseHeaders && Object.keys(error.responseHeaders).length > 0) {
      additionalInfo += `<div class="error-meta" style="margin-top: 0.25rem; font-size: 0.75rem;"><strong>Response Headers:</strong> <pre style="margin: 0.25rem 0; background: rgba(255,0,0,0.1); padding: 0.5rem; border-radius: 4px; overflow-x: auto;">${JSON.stringify(error.responseHeaders, null, 2)}</pre></div>`;
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
  
  // Limit display count
  if (errorLogContainer.children.length > 10) {
    errorLogContainer.removeChild(errorLogContainer.lastChild!);
  }
}

// Error trigger functions
(window as any).triggerSyntaxError = () => {
  eval('const a = ;'); // Syntax error
};

(window as any).triggerReferenceError = () => {
  console.log(undefinedVariable); // Reference error
};

(window as any).triggerTypeError = () => {
  const obj = null;
  obj.someMethod(); // Type error
};

(window as any).triggerPromiseError = () => {
  Promise.reject(new Error('This is a Promise rejection error'));
};

(window as any).triggerAsyncError = async () => {
  await new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Async operation failed')), 100);
  });
};

// Resource error trigger functions
(window as any).triggerImageError = () => {
  const img = document.createElement('img');
  img.src = 'https://non-existent-domain-12345.com/image.jpg';
  img.alt = 'Test image';
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

// Network request error trigger functions
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
  xhr.timeout = 1000; // 1 second timeout, but the API needs 3 seconds
  xhr.send();
};

// Additional test functions
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

// POST request test (with body)
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

// Reporter test functions
(window as any).testReporter = () => {
  const reporter = monitor.getReporter();
  if (reporter) {
    console.log('Reporter config:', reporter.getConfig());
    console.log('sendBeacon supported:', BeaconReporter.isSupported());
  } else {
    console.log('No reporter configured');
  }
};

(window as any).testManualReport = () => {
  const testError: ErrorInfo = {
    type: 'js',
    message: 'Manual test error',
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  const success = monitor.reportError(testError);
  console.log('Manual report result:', success);
};

console.log('Monitor Playground started!');
console.log('🔧 Express test server running at: http://localhost:3001');
