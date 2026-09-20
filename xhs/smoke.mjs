// Desktop integration checks, with a mocked native bridge. Not a device certification.
import { mkdtemp, cp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const here = path.dirname(fileURLToPath(import.meta.url));
const work = await mkdtemp(path.join(tmpdir(), "lita-xhs-smoke-"));
await cp(path.join(here, "dist"), work, { recursive: true });
let html = await readFile(path.join(work, "index.html"), "utf8");
html = html.replace('<script src="./app.js"></script>', '<script src="./setup.js"></script><script src="./app.js"></script><script src="./checks.js"></script>');
await writeFile(path.join(work, "index.html"), html);
await writeFile(path.join(work, "setup.js"), `
window.failures = []; window.bridgeCalls = [];
window.addEventListener('error', e => failures.push(e.message));
window.addEventListener('unhandledrejection', e => failures.push(String(e.reason)));
// Exercise the app's ES2017 runtime fallbacks in modern Chrome as well.
Object.fromEntries = undefined; Array.prototype.at = undefined; Element.prototype.replaceChildren = undefined;
localStorage.clear();
for (const kind of ['hearing', 'voice']) localStorage.setItem('lita-' + kind + '-records', JSON.stringify([{time:new Date().toISOString(), minimum:100, maximum:1600}]));
const avatar = document.createElement('canvas'); avatar.width=64; avatar.height=64;
avatar.getContext('2d').fillRect(0,0,64,64);
localStorage.setItem('lita-certificate-profile', JSON.stringify({nickname:'离线测试', avatar:avatar.toDataURL()}));
window.xhs = {miniTool:{
 writeTempFile: async options => { bridgeCalls.push(['write',options]); return {filePath:'/native/report.png'}; },
 saveImageToPhotosAlbum: async options => { bridgeCalls.push(['save',options]); },
 openRedPage: async options => { bridgeCalls.push(['open',options]); }
}};
window.micDenied = true;
window.syntheticTracks = [];
navigator.mediaDevices.getUserMedia = async () => {
 if (window.micDenied) throw new DOMException('denied','NotAllowedError');
 const context = new AudioContext();
 const oscillator = context.createOscillator(); oscillator.frequency.value=440;
 const destination = context.createMediaStreamDestination();
 oscillator.connect(destination); oscillator.start(); await context.resume();
 window.syntheticTracks = destination.stream.getTracks();
 window.syntheticContext = context;
 return destination.stream;
};
`);
await writeFile(path.join(work, "checks.js"), `
(async () => {
 const q = s => document.querySelector(s);
 const ok = (condition, text) => { if (!condition) throw new Error(text); };
 const wait = () => new Promise(resolve => setTimeout(resolve, 60));
 const go = async hash => { location.hash=hash; await wait(); };
 try {
  await wait();
  ok(!q('#home-author-card').hidden, 'author hidden');
  q('#home-author-card').click(); await wait();
  ok(bridgeCalls.length === 0 && q('#home-author-card').tagName === 'DIV', 'author display only');
  for (const route of ['hearing','voice','psychology','vision','certificate']) {
   await go(route); ok(!q('#'+route+'-view').hidden, 'route '+route);
   ok(document.documentElement.scrollWidth <= innerWidth, 'horizontal overflow '+route);
  }
  await go('hearing'); q('#history .history-row').click(); ok(q('#report-dialog').open,'hearing card'); q('#report-dialog').close();
  q('#play-button').click(); await wait(); ok(q('#play-button').getAttribute('aria-pressed')==='true','audio start');
  q('#frequency-slider').value='1500'; q('#frequency-slider').dispatchEvent(new Event('input'));
  ok(q('#frequency-value').value.includes('1,500'),'frequency slider'); q('#play-button').click();
  await go('voice'); q('#voice-history .history-row').click(); ok(q('#voice-report-dialog').open,'voice card'); q('#voice-report-dialog').close();
  await go('voice-professional'); q('#voice-start').click(); await wait();
  ok(!q('#voice-error').hidden,'microphone permission error');
  window.micDenied=false; q('#voice-start').click(); await wait();
  ok(q('#voice-error').hidden && !q('#voice-session').hidden,'microphone capture');
  await go('voice');
  ok(window.syntheticTracks.every(track=>track.readyState==='ended'),'microphone release');
  await window.syntheticContext.close();
  await go('psychology-test');
  ok(document.querySelectorAll('.psychology-image-choice').length >= 12,'image library');
  for (const image of document.querySelectorAll('.psychology-image-choice img')) { image.loading='eager'; }
  await wait();
  for (const image of document.querySelectorAll('.psychology-image-choice img')) ok(image.complete && image.naturalWidth>0,'offline image');
  Array.from(document.querySelectorAll('.psychology-image-choice')).slice(0,12).forEach(b=>b.click());
  q('.psychology-selection-action button').click();
  Array.from(document.querySelectorAll('.psychology-image-choice')).slice(0,6).forEach(b=>b.click());
  q('.psychology-selection-action button').click();
  for (let i=0;i<15;i++) q('.psychology-pair-choice').click();
  ok(JSON.parse(localStorage.getItem('lita-psychology-records')).length===1,'psychology result');
  await go('psychology'); q('#psychology-history .history-row').click(); ok(q('#psychology-report-dialog').open,'psychology card'); q('#psychology-report-dialog').close();
  await go('vision-test');
  for (let i=0;i<100 && !q('#vision-test-session').hidden;i++) {
   const rotation=q('#vision-optotype').style.transform;
   const direction={'rotate(0deg)':'right','rotate(90deg)':'down','rotate(180deg)':'left','rotate(270deg)':'up'}[rotation];
   q('[data-direction="'+direction+'"]').click();
  }
  ok(JSON.parse(localStorage.getItem('lita-vision-records'))[0].score===1,'vision result');
  await go('vision'); q('#vision-history .history-row').click(); ok(q('#vision-report-dialog').open,'vision card'); q('#vision-report-dialog').close();
  await go('certificate');
  ok(q('#certificate-name').value==='离线测试','cached nickname');
  ok(!q('#certificate-avatar-preview').hidden,'cached avatar');
  const avatarFile = new File([Uint8Array.from(atob(q('#certificate-avatar-preview').src.split(',')[1]), c=>c.charCodeAt(0))], 'avatar.png', {type:'image/png'});
  const transfer = new DataTransfer(); transfer.items.add(avatarFile);
  q('#certificate-avatar-input').files=transfer.files;
  q('#certificate-avatar-input').dispatchEvent(new Event('change'));
  for (let i=0;i<30 && !JSON.parse(localStorage.getItem('lita-certificate-profile')).avatar.startsWith('data:image/jpeg;');i++) await wait();
  ok(JSON.parse(localStorage.getItem('lita-certificate-profile')).avatar.startsWith('data:image/jpeg;'),'avatar selection and cache');
  for (const option of q('#certificate-color').options) {
   q('#certificate-color').value=option.value; q('#certificate-generate').click(); await wait();
   ok(q('#certificate-output').naturalWidth===1080,'report '+option.value);
  }
  q('input[value="forged"]').checked=true; q('input[value="forged"]').dispatchEvent(new Event('change'));
  ok(!q('#certificate-manual-panel').hidden,'editable report');
  q('#certificate-manual-panel input').value='自定义'; q('#certificate-generate').click(); await wait();
  q('#certificate-download').click(); await wait();
  ok(bridgeCalls.some(([kind,data])=>kind==='write' && data.data.startsWith('data:image/png;base64,')),'save data URI');
  ok(bridgeCalls.some(([kind,data])=>kind==='save' && data.filePath==='/native/report.png'),'save native path');
  ok(!q('#certificate-download').disabled,'save button reset');
  window.xhs.miniTool.saveImageToPhotosAlbum=async()=>{throw new Error('denied')};
  q('#certificate-download').click(); await wait();
  ok(!q('#certificate-download').disabled && q('.toast').textContent.includes('保存失败'),'permission failure');
  delete window.xhs; q('#certificate-download').click(); await wait();
  ok(q('.toast').textContent.includes('小红书'),'missing bridge');
  ok(failures.length===0,failures.join(';'));
  document.body.dataset.smoke='PASS';
 } catch (error) { document.body.dataset.smoke='FAIL: '+error.message; }
})();
`);
const chrome = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const output = execFileSync(chrome, ["--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--allow-file-access-from-files", "--autoplay-policy=no-user-gesture-required", `--user-data-dir=${path.join(work, "profile")}`, "--window-size=390,844", "--virtual-time-budget=10000", "--dump-dom", pathToFileURL(path.join(work,"index.html")).href], { encoding:"utf8", maxBuffer:8*1024*1024, stdio:["ignore","pipe","ignore"] });
await writeFile(path.join(work,"result.html"), output);
const status = output.match(/data-smoke="([^"]+)"/)?.[1];
console.log({status, artifacts:work});
assert.equal(status, "PASS");
