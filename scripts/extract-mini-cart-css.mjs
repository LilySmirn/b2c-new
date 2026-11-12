import fs from "fs";

const css = fs.readFileSync("mini-korzinka/styles.css", "utf8");
const keywords = [
  "mini-panel",
  "mini-nav",
  "mini-recs",
  "mini-ix",
  "mini-tabs",
  "mini-rec",
  "win-",
  "dock",
  "mkb-search",
  "ai-chat",
  "ai-thread",
  "ai-msg",
  "ai-bubble",
  "ai-chip",
  "ai-compose",
  "ai-input",
  "ai-send",
  "ai-numbered",
  "ai-group",
  "ai-suggest",
  "ai-add",
  "row--mini",
  "row--classic",
  "classic-",
  "preparaty__check",
  "preparaty__qc",
  "preparaty__level",
  "preparaty__name",
  "preparaty__info",
  "comment-pill",
  "classic-comment",
  "preparaty__empty",
  "section-row",
  "checkbox",
  "cart-note",
  "cart-btn",
  "mini-panel-foot",
  "mini-panel-add",
  "mini-panel-actions",
  "popover",
  "info-layer",
  "scheme-layer",
  "note-layer",
  "cart-modal",
  "preparaty__mark",
  "extra-badge",
  "tabs--mini",
  "preparaty__tab",
  "preparaty__row",
  "preparaty__first",
  "preparaty__field",
  "preparaty__dose",
  "preparaty__combo",
  "preparaty__scheme",
  "preparaty__option",
  "is-selected",
  "is-block",
  "is-warn",
  "is-open",
  "is-filled",
  "is-pip",
  "preparaty-pip",
  "pip-host",
  "is-docked",
  "is-collapsed",
  "preparaty__badge",
  "ix-badge",
];

function extractTopLevelRules(source) {
  const rules = [];
  let i = 0;
  const n = source.length;

  while (i < n) {
    while (i < n && /\s/.test(source[i])) i += 1;
    if (i >= n) break;

    if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }

    if (source[i] === "@") {
      const start = i;
      while (i < n && source[i] !== "{" && source[i] !== ";") i += 1;
      if (source[i] === ";") {
        rules.push(source.slice(start, i + 1).trim());
        i += 1;
        continue;
      }
      let depth = 0;
      while (i < n) {
        if (source[i] === "{") depth += 1;
        else if (source[i] === "}") {
          depth -= 1;
          if (depth === 0) {
            i += 1;
            break;
          }
        }
        i += 1;
      }
      rules.push(source.slice(start, i).trim());
      continue;
    }

    const start = i;
    while (i < n && source[i] !== "{") i += 1;
    if (i >= n) break;
    let depth = 0;
    while (i < n) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
      i += 1;
    }
    rules.push(source.slice(start, i).trim());
  }

  return rules.filter(Boolean);
}

function scopeSelectors(selectorText) {
  return selectorText
    .split(",")
    .map((s) => {
      const sel = s.trim();
      if (!sel) return "";
      if (sel.startsWith(".emMiniCart")) return sel;
      if (sel.startsWith("html") || sel.startsWith("body")) return sel;
      return `.emMiniCart ${sel}`;
    })
    .filter(Boolean)
    .join(",\n");
}

function scopeRule(rule) {
  if (rule.startsWith("@media") || rule.startsWith("@supports")) {
    const open = rule.indexOf("{");
    if (open < 0) return rule;
    const header = rule.slice(0, open + 1);
    const inner = rule.slice(open + 1, rule.lastIndexOf("}"));
    const scopedInner = extractTopLevelRules(inner)
      .filter((r) => keywords.some((k) => r.includes(k)))
      .map(scopeRule)
      .join("\n\n");
    return `${header}\n${scopedInner}\n}`;
  }

  if (rule.startsWith("@")) return rule;

  const open = rule.indexOf("{");
  if (open < 0) return rule;
  const selectors = rule.slice(0, open);
  const body = rule.slice(open);
  return `${scopeSelectors(selectors)}${body}`;
}

const allRules = extractTopLevelRules(css);
const kept = allRules.filter((rule) => keywords.some((k) => rule.includes(k)));
const foundation = `/* Auto-extracted compact mini-cart styles. Scoped under .emMiniCart */

.emMiniCart .preparaty {
  --blue: #0085ff;
  --blue-soft: #edf7ff;
  --blue-line: #b9d8f2;
  --ink: #10253f;
  --muted: #8a8a8a;
  --line: #e0e3e7;
  --code-bg: #f5f6f8;
  --code-bd: #d7dce3;
  --green: #178e43;
  --green-dark: #1d783f;
  --warn: #9a3412;
  --warn-bg: #fff7ed;
  --font: Arial, sans-serif;
  position: relative;
  box-sizing: border-box;
  color: var(--ink);
  font-family: var(--font);
  font-size: 13px;
  line-height: 1.25;
}

.emMiniCart .preparaty *,
.emMiniCart .preparaty *::before,
.emMiniCart .preparaty *::after {
  box-sizing: border-box;
}

.emMiniCart .preparaty button,
.emMiniCart .preparaty input,
.emMiniCart .preparaty textarea {
  font-family: inherit;
}`;

const popoverOverlay = `
/* Preview/React: popover без абсолютного якоря строки */
.emMiniCart .preparaty__popover {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1300;
}

/* Dev-preview: панель без шапки прототипа */
.emMiniCart.is-preview .preparaty__mini-panel {
  top: 24px;
  height: calc(100vh - 48px);
}`;

const out = [foundation, "", ...kept.map(scopeRule), popoverOverlay].join(
  "\n\n",
);

fs.mkdirSync("app/modules/miniCart/styles", { recursive: true });
fs.writeFileSync("app/modules/miniCart/styles/miniCartScope.css", out);
console.log({
  total: allRules.length,
  kept: kept.length,
  bytes: out.length,
  unscoped: (out.match(/^\.preparaty__/gm) || []).length,
});
