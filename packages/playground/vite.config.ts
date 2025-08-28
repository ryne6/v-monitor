import { defineConfig } from 'vite'
import path from 'path'
import { spawn } from 'child_process'

// Start Express server
function startExpressServer() {
  console.log('🚀 Starting Express test server...')
  
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    shell: true,
    cwd: __dirname
  })
  
  server.on('error', (err) => {
    console.error('❌ Failed to start Express server:', err)
  })
  
  // Handle process exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...')
    server.kill('SIGINT')
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    server.kill('SIGTERM')
    process.exit(0)
  })
}

export default defineConfig({
  resolve: {
    alias: {
      '~/monitor': path.resolve(__dirname, '../monitor/src')
    }
  },
  server: {
    port: 3000,
    open: true
  },
  plugins: [
    {
      name: 'express-server',
      buildStart() {
        // Only start Express server in development mode
        if (process.env.NODE_ENV !== 'production') {
          startExpressServer()
        }
      }
    }
  ]
})
