import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getMobileHtml, getManifestJson, getServiceWorkerJs } from '../src/main/mobile/mobileHtml.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')

const targetDirs = [
  path.join(rootDir, 'mobile-web'),
  path.join(rootDir, 'docs') // GitHub Pages 기본 지원 폴더
]

console.log('📦 Building static mobile PWA bundle for Cloud hosting...')

const htmlContent = getMobileHtml('교행 보드', 'v2.0.58', 'cloud')
const manifestContent = getManifestJson()
const swContent = getServiceWorkerJs()
const srcIcon = path.join(rootDir, 'resources', 'icon.png')

// GitHub Pages에서 Jekyll 엔진을 완전히 비활성화하기 위한 .nojekyll 파일 생성
fs.writeFileSync(path.join(rootDir, '.nojekyll'), '', 'utf8')

for (const targetDir of targetDirs) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent, 'utf8')
  fs.writeFileSync(path.join(targetDir, 'manifest.json'), manifestContent, 'utf8')
  fs.writeFileSync(path.join(targetDir, 'sw.js'), swContent, 'utf8')
  fs.writeFileSync(path.join(targetDir, '.nojekyll'), '', 'utf8')
  if (fs.existsSync(srcIcon)) {
    fs.copyFileSync(srcIcon, path.join(targetDir, 'icon.png'))
  }
  console.log(`  ✓ Generated in ${path.relative(rootDir, targetDir)}/`)
}

console.log('🎉 Static mobile PWA bundle ready for GitHub Pages (/docs)!')
