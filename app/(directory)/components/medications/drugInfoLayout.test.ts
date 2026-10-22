import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(directory, "DrugInfoModal.module.css"), "utf8");
const view = readFileSync(join(directory, "DrugInfoModal.tsx"), "utf8");
const interactions = readFileSync(join(directory, "InteractionsPanel.tsx"), "utf8");
const checklist = readFileSync(join(directory, "../PrescriptionChecklist.tsx"), "utf8");

const guideBody = css.match(/\.guideBody\s*\{([^}]+)\}/)?.[1] ?? "";

const referenceSection = (name: string) => {
  const marker = `data-reference-section="${name}"`;
  const start = view.indexOf(marker);
  assert.ok(start >= 0, name);
  const next = view.indexOf("data-reference-section=", start + marker.length);
  return view.slice(start, next === -1 ? undefined : next);
};

describe("правая колонка попапа назначения", () => {
  it("короткая справка складывается подряд, длинная ограничена низом «Схемы»", () => {
    assert.match(guideBody, /height:\s*auto/);
    assert.match(guideBody, /overflow-y:\s*auto/);
    assert.match(guideBody, /flex:\s*0\s+1\s+auto/);
    assert.doesNotMatch(guideBody, /max-height:\s*min\(320px,\s*46vh\)/);
    assert.doesNotMatch(guideBody, /height:\s*100%/);
    assert.doesNotMatch(guideBody, /flex:\s*1\b/);
    assert.match(css, /\.side\s*\{[^}]*display:\s*flex/);
    assert.match(css, /\.side\s*\{[^}]*flex-direction:\s*column/);
    assert.match(css, /\.side\s*\{[^}]*justify-content:\s*flex-start/);
    assert.match(css, /\.side\s*\{[^}]*gap:\s*12px/);
    assert.doesNotMatch(css, /\.side\s*\{[^}]*justify-content:\s*space-between/);
    assert.match(view, /data-guide-layout=\{guideOverflow \? "aligned" : "compact"\}/);
    assert.match(
      css,
      /\.side\[data-guide-layout="aligned"\] \.guideSection\s*\{[^}]*grid-row:\s*1\s*\/\s*4/,
    );
    assert.match(
      css,
      /\.side\[data-guide-layout="aligned"\] \.guideSection\s*\{[^}]*height:\s*0/,
    );
    assert.match(
      css,
      /\.side\[data-guide-layout="aligned"\] \.guideSection\s*\{[^}]*min-height:\s*100%/,
    );
    assert.match(
      css,
      /\.side\[data-guide-layout="aligned"\] \.usualSection\s*\{[^}]*grid-row:\s*4/,
    );
    assert.match(
      css,
      /\.side\[data-guide-layout="aligned"\] \.cautionSection\s*\{[^}]*grid-row:\s*5/,
    );
    assert.match(css, /@media\s*\(max-width:\s*860px\)\s*\{[\s\S]*?\.guideBody\s*\{[^}]*max-height:\s*min\(320px,\s*46vh\)/);
    assert.doesNotMatch(css, /\.dialog\s*\{[^}]*overflow-x:\s*hidden/);
    assert.doesNotMatch(css, /\.guide\s*\{[^}]*position:\s*absolute/);
    assert.match(view, /Как указано в КР/);
    assert.doesNotMatch(view, /Как обычно дают/);
  });

  it("состав схемы стоит над колонками и делится на равные сжимаемые карточки", () => {
    const compositionAt = view.indexOf('aria-label="Состав схемы"');
    const layoutAt = view.indexOf("styles.layout");
    assert.ok(compositionAt >= 0 && compositionAt < layoutAt);

    assert.match(view, /--components-count/);
    assert.match(css, /grid-template-columns:\s*repeat\(var\(--components-count\),\s*minmax\(0,\s*1fr\)\)/);
    assert.match(css, /\.slots\[data-count="4"\]\s*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    assert.doesNotMatch(css, /\.slotText\s*\{[^}]*text-overflow:\s*ellipsis/);
    assert.doesNotMatch(css, /\.slotText\s*\{[^}]*white-space:\s*nowrap/);
  });

  it("заголовки и кнопки правой колонки находятся вне рамок", () => {
    for (const name of ["guide", "usual", "caution"]) {
      const block = referenceSection(name);
      const heading = block.indexOf("data-reference-heading");
      const frame = block.indexOf("data-reference-frame");

      assert.ok(heading >= 0, name);
      assert.ok(frame > heading, name);
    }

    const guide = referenceSection("guide");
    const guideFrame = guide.indexOf("data-reference-frame");
    assert.match(guide.slice(0, guideFrame), /Полный комментарий из КР/);
    assert.doesNotMatch(guide.slice(guideFrame), /Полный комментарий из КР/);

    const usual = referenceSection("usual");
    const usualFrame = usual.indexOf("data-reference-frame");
    assert.match(usual.slice(0, usualFrame), /Подставить в назначение/);
    assert.doesNotMatch(usual.slice(usualFrame), /Подставить в назначение/);
  });

  it("короткая справка не показывает полосу, пока текст не выше края «Схемы»", () => {
    assert.match(css, /\.guideBody:not\(\[data-overflow="true"\]\)\s*\{[^}]*overflow-y:\s*hidden/);
    assert.match(view, /guideNeedsScroll/);
    assert.match(view, /data-overflow=\{guideOverflow \? "true" : undefined\}/);
    assert.doesNotMatch(guideBody, /overflow-y:\s*scroll/);
  });

  it("поле схемы не показывает placeholder «Схема»", () => {
    assert.match(view, /schemeInputPlaceholder\(chips\.length\)/);
    assert.doesNotMatch(view, /placeholder="Схема"/);
    assert.doesNotMatch(view, /value="Схема"/);
  });
});

describe("блок межлекарственных взаимодействий", () => {
  it("скрыт флагом и не удаляет реализацию панели", () => {
    assert.match(interactions, /export const SHOW_MEDICATION_INTERACTIONS = false/);
    assert.match(interactions, /function InteractionsPanel/);
    assert.match(
      checklist,
      /SHOW_MEDICATION_INTERACTIONS && activeCategoryId === "medications" \?/,
    );
    assert.match(checklist, /<InteractionsPanel \/>/);
  });
});
