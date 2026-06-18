import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const workspaceDir = resolve(rootDir, '..')
const hrisFeDir = join(workspaceDir, 'hris-fe')
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
const apkOutputDir = join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'release')
const version = packageJson.version
const versionedName = `ess-hompimplay-v${version}.apk`
const latestName = 'ess-hompimplay-latest.apk'

function findReleaseApk() {
  if (!existsSync(apkOutputDir)) {
    throw new Error(`Release APK folder not found: ${apkOutputDir}`)
  }

  const candidates = readdirSync(apkOutputDir)
    .filter((file) => file.endsWith('.apk'))
    .filter((file) => !file.includes('unsigned'))
    .map((file) => join(apkOutputDir, file))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)

  if (!candidates.length) {
    throw new Error(`No signed release APK found in: ${apkOutputDir}`)
  }

  return candidates[0]
}

function copyApkTo(targetDir, sourceApk) {
  mkdirSync(targetDir, { recursive: true })

  const versionedPath = join(targetDir, versionedName)
  const latestPath = join(targetDir, latestName)

  copyFileSync(sourceApk, versionedPath)
  copyFileSync(sourceApk, latestPath)

  return [versionedPath, latestPath]
}

const sourceApk = findReleaseApk()
const publicFiles = copyApkTo(join(hrisFeDir, 'public', 'download'), sourceApk)
const copiedFiles = [...publicFiles]

const distDir = join(hrisFeDir, 'dist')
if (existsSync(distDir)) {
  copiedFiles.push(...copyApkTo(join(distDir, 'download'), sourceApk))
}

console.log(`Published APK from ${basename(sourceApk)}`)
for (const file of copiedFiles) {
  console.log(`- ${file}`)
}
