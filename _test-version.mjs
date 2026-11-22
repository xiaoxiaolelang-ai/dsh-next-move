/**
 * 版本一致性自检。
 *
 * 起因：改名与升版本时，`index.js` 里硬编码的 `rev: '0.1.19'` 没跟着改，
 * 于是跑着 0.1.20 的代码、上报 0.1.19 的标签——客户端不读它，所以完全不报错，
 * 只有人去翻数据才看得出来。这里把「三处必须一致」钉住：
 *   1. package.json 的 version  ==  index.js 的 rev 字面量
 *   2. package.json 的 name     ==  index.js 的 name 常量
 *   3. 客户端 MARKER 前缀       ==  package.json 的 name
 */
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const host = readFileSync('index.js', 'utf8')
const client = readFileSync('client.js', 'utf8')

/* 1. version ↔ rev */
const revMatches = [...host.matchAll(/rev:\s*'([^']+)'/g)].map((m) => m[1])
assert.ok(revMatches.length > 0, 'index.js 里应能找到 rev 字面量')
for (const rev of revMatches) {
  assert.strictEqual(rev, pkg.version, `index.js 的 rev(${rev}) 必须等于 package.json 的 version(${pkg.version})`)
}

/* 2. name ↔ 包名 */
const nameMatch = /const name = '([^']+)'/.exec(host)
assert.ok(nameMatch, 'index.js 里应声明 name 常量')
assert.strictEqual(nameMatch[1], pkg.name, `index.js 的 name(${nameMatch[1]}) 必须等于包名(${pkg.name})`)

/* 3. 客户端 MARKER 前缀 ↔ 包名 */
const markers = [...host.matchAll(/const MARKER = '([^']+)'/g), ...client.matchAll(/const MARKER = '([^']+)'/g)].map((m) => m[1])
assert.ok(markers.length >= 2, 'host 与 client 都应声明 MARKER')
for (const marker of markers) {
  assert.ok(marker.startsWith(pkg.name + '/'), `MARKER(${marker}) 必须以包名开头：${pkg.name}/`)
}

/* 4. 客户端与服务端的 MARKER 必须一致（不一致就永远渲染不出来） */
const hostMarker = /const MARKER = '([^']+)'/.exec(host)?.[1]
const clientMarker = /const MARKER = '([^']+)'/.exec(client)?.[1]
assert.strictEqual(hostMarker, clientMarker, `host MARKER(${hostMarker}) 与 client MARKER(${clientMarker}) 必须相同`)

console.log(`OK   版本一致：${pkg.name}@${pkg.version} · rev ${revMatches.join(',')} · MARKER ${hostMarker}`)
