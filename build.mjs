/**
 * 将 src 下的样式与脚本内联为一个可离线双击运行的 HTML。
 * 用法：node build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, 'src', p), 'utf8');

const css = read('style.css');
const js = ['data.js', 'rules.js', 'content.js', 'ui.js', 'main.js']
  .map((f) => `/* ===== ${f} ===== */\n` + read(f))
  .join('\n\n');

const shell = read('shell.html');
const html = shell
  .replace('/*__CSS__*/', () => css)
  .replace('/*__JS__*/', () => js);

const outputs = ['index.html', '灰烬王冠.html'];
for (const name of outputs) {
  fs.writeFileSync(path.join(root, name), html, 'utf8');
}
console.log('built:', outputs.join(', '), '—', (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
