#!/usr/bin/env node

/**
 * Generate 404.html from built index.html for GitHub Pages SPA routing
 * 
 * GitHub Pages serves 404.html for any route that doesn't match a file.
 * For SPAs with client-side routing, we need 404.html to be identical to index.html
 * so the React app can load and handle the route.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');

console.log('📄 Generating 404.html from index.html...');

// Read the built index.html
if (!fs.existsSync(indexPath)) {
  console.error('❌ Error: dist/index.html not found. Run `npm run build` first.');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexPath, 'utf8');

// Write it as 404.html
fs.writeFileSync(notFoundPath, indexContent);

console.log('✅ 404.html generated successfully');
console.log(`   Source: ${indexPath}`);
console.log(`   Output: ${notFoundPath}`);
