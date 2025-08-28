import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 模拟延迟的中间件
const delay = (ms: number) => (req: any, res: any, next: any) => {
  setTimeout(next, ms);
};

// 正常接口
app.get('/api/success', (req, res) => {
  res.json({ 
    message: 'Success',
    timestamp: Date.now(),
    data: { id: 1, name: 'Test User' }
  });
});

// 404 错误
app.get('/api/not-found', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// 400 错误
app.get('/api/bad-request', (req, res) => {
  res.status(400).json({ 
    error: 'Bad Request',
    message: 'Invalid request parameters'
  });
});

// 500 错误
app.get('/api/server-error', (req, res) => {
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong on the server'
  });
});

// 延迟响应 (用于测试超时)
app.get('/api/slow', delay(3000), (req, res) => {
  res.json({ 
    message: 'Slow response',
    delay: '3 seconds'
  });
});

// POST 接口测试
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Name and email are required'
    });
  }
  
  res.status(201).json({
    message: 'User created successfully',
    user: { id: Date.now(), name, email }
  });
});

// 随机错误 (50% 概率失败)
app.get('/api/random-error', (req, res) => {
  if (Math.random() > 0.5) {
    res.status(500).json({
      error: 'Random Error',
      message: 'This endpoint randomly fails'
    });
  } else {
    res.json({
      message: 'Success! You were lucky this time.',
      timestamp: Date.now()
    });
  }
});

// 大数据响应 (测试性能)
app.get('/api/large-data', (req, res) => {
  const data = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    createdAt: new Date().toISOString()
  }));
  
  res.json({
    message: 'Large dataset',
    count: data.length,
    data
  });
});

// CORS 测试 (故意返回 CORS 错误)
app.get('/api/cors-error', (req, res) => {
  res.removeHeader('Access-Control-Allow-Origin');
  res.json({ message: 'This should cause CORS error' });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Express test server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/success      - 成功响应`);
  console.log(`   GET  /api/not-found    - 404 错误`);
  console.log(`   GET  /api/bad-request  - 400 错误`);
  console.log(`   GET  /api/server-error - 500 错误`);
  console.log(`   GET  /api/slow         - 慢响应 (3秒)`);
  console.log(`   GET  /api/random-error - 随机错误`);
  console.log(`   GET  /api/large-data   - 大数据响应`);
  console.log(`   POST /api/users        - 创建用户`);
  console.log(`   GET  /health           - 健康检查`);
});

export default app;
