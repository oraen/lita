// Only the small runtime fallbacks used by this app; all run offline.
if (!Object.fromEntries) {
  Object.fromEntries = function (entries) {
    const result = {};
    for (const [key, value] of entries) {
      Object.defineProperty(result, key, { value, enumerable: true, configurable: true, writable: true });
    }
    return result;
  };
}
if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, "at", { configurable: true, writable: true, value(index) {
    const offset = Math.trunc(Number(index)) || 0;
    return this[offset < 0 ? this.length + offset : offset];
  } });
}
if (!Element.prototype.replaceChildren) {
  Element.prototype.replaceChildren = function (...children) {
    while (this.firstChild) this.removeChild(this.firstChild);
    this.append(...children);
  };
}

const probe = document.createElement("div");
probe.style.cssText = "position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px";
probe.append(document.createElement("div"), document.createElement("div"));
document.body.append(probe);
document.documentElement.classList.toggle("no-flex-gap", probe.scrollHeight !== 1);
probe.remove();
