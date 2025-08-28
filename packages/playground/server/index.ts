import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simulate delay middleware
const delay = (ms: number) => (req: any, res: any, next: any) => {
  setTimeout(next, ms);
};

// Success endpoint
app.get('/api/success', (req, res) => {
  res.json({ 
    message: 'Success',
    timestamp: Date.now(),
    data: { id: 1, name: 'Test User' }
  });
});

// 404 error
app.get('/api/not-found', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// 400 error
app.get('/api/bad-request', (req, res) => {
  res.status(400).json({ 
    error: 'Bad Request',
    message: 'Invalid request parameters'
  });
});

// 500 error
app.get('/api/server-error', (req, res) => {
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: 'Something went wrong on the server'
  });
});

// Slow response (for testing timeout)
app.get('/api/slow', delay(3000), (req, res) => {
  res.json({ 
    message: 'Slow response',
    delay: '3 seconds'
  });
});

// POST endpoint test
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

// Random error (50% chance of failure)
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

// Large data response (for testing performance)
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

// CORS test (intentionally return CORS error)
app.get('/api/cors-error', (req, res) => {
  res.removeHeader('Access-Control-Allow-Origin');
  res.json({ message: 'This should cause CORS error' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express test server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /api/success      - Success response`);
  console.log(`   GET  /api/not-found    - 404 error`);
  console.log(`   GET  /api/bad-request  - 400 error`);
  console.log(`   GET  /api/server-error - 500 error`);
  console.log(`   GET  /api/slow         - Slow response (3s)`);
  console.log(`   GET  /api/random-error - Random error`);
  console.log(`   GET  /api/large-data   - Large data response`);
  console.log(`   POST /api/users        - Create user`);
  console.log(`   GET  /health           - Health check`);
});

export default app;
