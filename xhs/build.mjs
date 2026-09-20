import { build } from "vite";
import postcss from "postcss";
import { readFile, writeFile, readdir, mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(here);
const out = path.join(here, "dist");
const read = (name) => readFile(path.join(root, name), "utf8");
function replaceRequired(source, pattern, replacement) {
  if (!source.match(pattern)) throw new Error(`Shared source changed; update mini-tool adapter: ${pattern}`);
  return source.replace(pattern, replacement);
}
const images = (await readdir(path.join(root, "source/psychology"))).filter(name => name.endsWith(".jpg")).sort();
const imageMap = Object.fromEntries(images.map((name, index) => [`./source/psychology/${name}`, `./assets/psychology-${index}.jpg`]));
await build({
  configFile: false,
  root,
  publicDir: false,
  plugins: [{
    name: "lita-mini-tool-adapter",
    enforce: "pre",
    async transform(code, id) {
      const file = id.replace(/\\/g, "/");
      if (file === path.join(root, "psychology.js").replace(/\\/g, "/")) {
        return replaceRequired(code, /import\.meta\.glob\([\s\S]*?\}\)/, JSON.stringify(imageMap));
      }
      if (file === path.join(root, "certificate.js").replace(/\\/g, "/")) {
        code = `import { bindReportSave } from "./xhs/save-report.js";\n${code}`;
        code = replaceRequired(code, /  let reportFile = null;\r?\n/, "");
        code = replaceRequired(code, /  downloadLink\.addEventListener\("click",[\s\S]*?\r?\n  function selectedType/, "  bindReportSave(downloadLink, outputImage, showToast);\n\n  function selectedType");
        code = replaceRequired(code, /    downloadLink\.href = dataUrl;[\s\S]*?    reportFile = new File\([^\n]*\);/, "");
        return code;
      }
      if (file === path.join(root, "index.js").replace(/\\/g, "/")) {
        // Stop all audio/capture when the native app backgrounds the mini-tool.
        return code + `\ndocument.addEventListener("visibilitychange", () => {
          if (document.hidden) { stopStepping(); stopSound(); resetProfessionalTest(); stopVoiceCapture(); }
        });\n`;
      }
    },
  }],
  build: {
    outDir: out, emptyOutDir: true, target: ["es2017", "chrome61"],
    minify: false, sourcemap: false,
    lib: { entry: path.join(here, "entry.js"), name: "LitaMiniTool", formats: ["iife"], fileName: () => "app.js" },
  },
});
await mkdir(path.join(out, "assets"), { recursive: true });
for (let index = 0; index < images.length; index++) {
  await copyFile(path.join(root, "source/psychology", images[index]), path.join(out, `assets/psychology-${index}.jpg`));
}
await copyFile(path.join(root, "source/author-avatar.jpg"), path.join(out, "assets/author-avatar.jpg"));
let html = await read("index.html");
html = replaceRequired(html, /<script type="module" src="\.\/index.js"><\/script>/, '<script src="./app.js"></script>');
html = html.replace('./source/author-avatar.jpg', './assets/author-avatar.jpg');
html = replaceRequired(html, /<a class="home-author-card"[^>]*>/, '<div class="home-author-card" id="home-author-card">');
html = replaceRequired(html, /<span class="menu-arrow" aria-hidden="true"><\/span>\s*<\/a>/, '</div>');
html = replaceRequired(html, /<a class="certificate-download"[^>]*>保存报告图片<\/a>/, '<button class="certificate-download" id="certificate-download" type="button">保存报告图片</button>');
html = replaceRequired(html, /(<p class="certificate-save-hint">)[\s\S]*?<\/p>/, '$1点击保存，将报告图片存入手机相册。</p>');
await writeFile(path.join(out, "index.html"), html);

// Preserve the shared stylesheet; add only the compatibility needed by it.
const css = postcss.parse(await read("styles.css"));
const flexSelectors = new Map();
css.walkRules(rule => {
  const declarations = Object.fromEntries((rule.nodes || []).filter(n => n.type === "decl").map(n => [n.prop, n.value]));
  if (declarations.display === "flex" || declarations.display === "inline-flex") {
    for (const selector of rule.selectors) flexSelectors.set(selector, declarations["flex-direction"] || "row");
  }
});
css.walkRules(rule => {
  const gap = rule.nodes.find(n => n.type === "decl" && n.prop === "gap");
  if (gap) {
    gap.cloneBefore({ prop: "grid-gap" });
    for (const selector of rule.selectors) {
      if (!flexSelectors.has(selector)) continue;
      const fallback = postcss.rule({ selector: `.no-flex-gap ${selector} > * + *` });
      fallback.append({ prop: flexSelectors.get(selector) === "column" ? "margin-top" : "margin-left", value: gap.value });
      rule.after(fallback);
    }
  }
  rule.walkDecls("place-items", decl => {
    decl.cloneBefore({ prop: "align-items" });
    decl.cloneBefore({ prop: "justify-items" });
  });
});
await writeFile(path.join(out, "styles.css"), css.toString() + "\n" + await readFile(path.join(here, "compat.css"), "utf8"));
execFileSync(process.execPath, [path.join(here, "verify.mjs")], { stdio: "inherit" });
const zipPath = path.join(here, "lita-xhs.zip");
execFileSync(process.env.PYTHON || (process.platform === "win32" ? "python" : "python3"),
  [path.join(here, "pack.py"), out, zipPath], { stdio: "inherit" });
execFileSync(process.execPath, [path.join(here, "audit_artifact.mjs"), out], { stdio: "inherit" });
execFileSync(process.execPath, [path.join(here, "audit_artifact.mjs"), zipPath], { stdio: "inherit" });
