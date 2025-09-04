#!/usr/bin/env node
// Build web and copy sourcemaps into server by project/version
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: false, ...options });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
    child.on('error', reject);
  });
}

function copySourceMaps({ projectId, version, sourcemapDir, webRoot }) {
  const src = path.join(webRoot, 'dist', 'assets');
  const dest = path.join(sourcemapDir, projectId, version);
  if (!fs.existsSync(src)) {
    console.warn(`[build-with-maps] No assets dir at ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src).filter((f) => f.endsWith('.map'));
  for (const f of files) fs.copyFileSync(path.join(src, f), path.join(dest, f));
  console.log(`[build-with-maps] Copied ${files.length} sourcemap(s) to ${dest}`);
}

(async () => {
  const webRoot = process.cwd();
  const pkg = require(path.join(webRoot, 'package.json'));
  const projectId = process.env.PROJECT_ID || pkg.name || '@monitor/web';
  const version = pkg.version || '0.0.0';
  const defaultDest = path.join(webRoot, '..', 'server', 'sourcemaps');
  const sourcemapDir = process.env.SOURCEMAP_DIR || path.resolve(defaultDest);

  console.log(`[build-with-maps] Building ${projectId}@${version} ...`);
  await run('pnpm', ['run', 'build'], { cwd: webRoot, env: process.env });
  copySourceMaps({ projectId, version, sourcemapDir, webRoot });
})().catch((e) => {
  console.error('[build-with-maps] Failed:', e.message);
  process.exit(1);
});


