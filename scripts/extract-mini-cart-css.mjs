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
  "info-dialog",
  "info-backdrop",
  "info-close",
  "info-muted",
  "info-list",
  "scheme-layer",
  "scheme-dialog",
  "scheme-head",
  "scheme-work",
  "scheme-foot",
  "scheme-btn",
  "scheme-slot",
  "scheme-progress",
  "scheme-review",
  "scheme-empty",
  "note-layer",
  "note-dialog",
  "note-head",
  "note-body",
  "note-foot",
  "note-label",
  "note-text",
  "note-backdrop",
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
  "preparaty__card-",
  "card-head",
  "card-badge",
  "card-layout",
  "card-block",
  "card-field",
  "card-status",
  "card-cart",
  "card-assign",
  "card-preview",
  "card-slot",
  "is-selected",
  "is-checked",
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

/**
 * Tokens + base resets живут на `.emMiniCart`, не только на `.preparaty`.
 * Модалки/поповеры порталятся в `.emMiniCart` (PiP root / host) вне `.preparaty`.
 */
const foundation = `/* Auto-extracted compact mini-cart styles. Scoped under .emMiniCart */

/*
 * Tokens and element resets belong on \`.emMiniCart\` so portaled overlays
 * (trade popover, info/note/scheme modals) inherit them outside \`.preparaty\`.
 */
.emMiniCart {
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

.emMiniCart *,
.emMiniCart *::before,
.emMiniCart *::after {
  box-sizing: border-box;
}

.emMiniCart button,
.emMiniCart input,
.emMiniCart textarea,
.emMiniCart select {
  font-family: inherit;
}

.emMiniCart .preparaty {
  position: relative;
  box-sizing: border-box;
  color: var(--ink);
  font-family: var(--font);
  font-size: 13px;
  line-height: 1.25;
}`;

const portalPatches = `
/* Portaled overlays: above mini-panel (z-index 1200), without requiring .preparaty ancestor */
.emMiniCart .preparaty__popover,
.emMiniCart .preparaty__info-layer,
.emMiniCart .preparaty__note-layer,
.emMiniCart .preparaty__scheme-layer,
.emMiniCart .preparaty__cart-modal-layer {
  z-index: 1300;
}

.emMiniCart .preparaty__popover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.emMiniCart .preparaty__popover-head button {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.emMiniCart .preparaty__popover-head button:hover {
  background: rgba(255, 255, 255, 0.12);
}

.emMiniCart .preparaty__info-dialog h3 {
  margin: 14px 0 6px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
}

.emMiniCart .preparaty__info-dialog .preparaty__note-body > p,
.emMiniCart .preparaty__info-dialog .preparaty__note-body > ul {
  margin: 0 0 8px;
  color: #334155;
  font-size: 13px;
  line-height: 1.45;
}

.emMiniCart .preparaty__check input:checked + span,
.emMiniCart .preparaty__check.is-checked span {
  border-color: var(--blue, #0085ff);
  background: var(--blue, #0085ff) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 10'%3E%3Cpath d='M1 5.2 L4.2 8.3 L11 1.5' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 12px 10px no-repeat;
}

/* Preview: панель без шапки прототипа */
.emMiniCart.is-preview .preparaty__mini-panel {
  top: 24px;
  height: calc(100vh - 48px);
}

/* Document PiP mount */
.emMiniCart.emMiniCart--pip,
.emMiniCart.emMiniCart--pip .preparaty {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.emMiniCart.emMiniCart--pip .preparaty__mini-panel.is-pip {
  position: relative !important;
  inset: auto !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}`;

const out = [foundation, "", ...kept.map(scopeRule), portalPatches].join(
  "\n\n",
);

fs.mkdirSync("app/modules/miniCart/styles", { recursive: true });
fs.writeFileSync("app/modules/miniCart/styles/miniCartScope.css", out);
console.log({
  total: allRules.length,
  kept: kept.length,
  bytes: out.length,
  hasNoteHead: out.includes("preparaty__note-head"),
  hasCardHead: out.includes("preparaty__card-head"),
  hasOption: out.includes("preparaty__option"),
  tokensOnEmMiniCart: out.includes(".emMiniCart {\n  --blue"),
});
