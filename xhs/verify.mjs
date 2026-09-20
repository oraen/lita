import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
const out = fileURLToPath(new URL("./dist/", import.meta.url));
const html = await readFile(path.join(out, "index.html"), "utf8");
const js = await readFile(path.join(out, "app.js"), "utf8");
new vm.Script(js);
assert(!/type=["']module|\bdownload(?:[\s=>])|target=["']_blank|<iframe|<object|\son\w+=/.test(html));
assert(!/\b(?:fetch\s*\(|XMLHttpRequest|WebAssembly|eval\s*\(|new Function\s*\(|new Worker\s*\(|new SharedWorker\s*\(|WebSocket|EventSource|RTCPeerConnection)|navigator\.(?:share|canShare|clipboard|geolocation|serviceWorker)|window\.(?:open|prompt)\s*\(/.test(js));
assert(!/\bimport\.meta|^\s*(?:import |export )/m.test(js));
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert(match[1].startsWith("./"), `Nonlocal URL: ${match[1]}`);
  await access(path.join(out, match[1]));
}
for (const match of js.matchAll(/["'](\.\/assets\/[^"']+)["']/g)) await access(path.join(out, match[1]));
for (const id of ["hearing-link", "voice-link", "psychology-link", "vision-link", "certificate-link", "home-author-card"]) {
  assert(html.includes(`id="${id}"`));
}
assert(js.includes("saveImageToPhotosAlbum") && js.includes("writeTempFile"));
console.log("Mini-tool static checks passed: classic script, local assets, five sections, native save, restricted APIs.");
