import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COPY_CLIPBOARD_ERROR_MESSAGE,
  COPY_NOTICE_DURATION_MS,
  buildClipboardContent,
  copyCartSelection,
  formatCopySuccessNotice,
  type ClipboardCustomItem,
  type ClipboardSelectionItem,
} from "./cartClipboard";

/**
 * Full и mini вызывают один buildClipboardContent / copyCartSelection.
 * Отдельного генератора у мини-корзинки нет: оба сценария ниже — два вызова
 * этой функции с одним входом.
 */
const copyAsFullCart = (
  selectedItems: ClipboardSelectionItem[],
  customItems: ClipboardCustomItem[],
  generalComment: string,
) => buildClipboardContent(selectedItems, customItems, generalComment);

const copyAsMiniCart = (
  selectedItems: ClipboardSelectionItem[],
  customItems: ClipboardCustomItem[],
  generalComment: string,
) => buildClipboardContent(selectedItems, customItems, generalComment);

const item = (
  partial: ClipboardSelectionItem & Record<string, unknown>,
): ClipboardSelectionItem => partial;

const mixedSelection: ClipboardSelectionItem[] = [
  item({
    categoryId: "required-diagnostics",
    categoryTitle: "Диагностика обязательная",
    groupTitle: "Диагностика",
    title: "ОАК",
    comment: "натощак",
  }),
  item({
    categoryId: "indicated-diagnostics",
    categoryTitle: "Диагностика по показаниям",
    groupTitle: "Диагностика",
    title: "УЗИ",
    comment: "",
  }),
  item({
    categoryId: "scales",
    categoryTitle: "Шкалы и опросники",
    groupTitle: "Диагностика",
    title: "Шкала боли",
    comment: "",
  }),
  item({
    categoryId: "treatment",
    categoryTitle: "Лечение",
    groupTitle: "Лечение",
    title: "ЛФК",
    comment: "ежедневно",
  }),
  item({
    categoryId: "medications",
    categoryTitle: "Препараты",
    groupTitle: "Препараты",
    title: "Омепразол",
    comment: "после еды",
    treatmentPlan: "20 мг утром",
    treatmentDuration: "14 дней",
    trade: "Омез",
    dose: "20 мг",
    form: "капсулы",
    scheme: "1 раз в день",
    intake: "после еды",
  }),
  item({
    categoryId: "medications",
    categoryTitle: "Препараты",
    groupTitle: "Препараты",
    title: "Ингибиторы протонного насоса",
    comment: "",
  }),
  item({
    categoryId: "medications",
    categoryTitle: "Препараты",
    groupTitle: "Препараты",
    title: "Стандартная тройная терапия",
    comment: "Кларитромицин 500 мг",
  }),
  item({
    categoryId: "lifestyle",
    categoryTitle: "Образ жизни",
    groupTitle: "Прочее",
    title: "Отказ от курения",
    comment: "",
  }),
  item({
    categoryId: "vaccination",
    categoryTitle: "Вакцинация",
    groupTitle: "Лечение",
    title: "Вакцина против гриппа",
    comment: "",
  }),
  item({
    categoryId: "appendix-a3",
    categoryTitle: "Приложение А3",
    groupTitle: "Приложение А3",
    title: "Таблица режимов",
    comment: "",
  }),
];

const mixedCustom: ClipboardCustomItem[] = [
  { id: "c1", name: "Массаж", comment: "10 сеансов" },
  { id: "c2", name: "Витамин D", comment: "" },
];

const mixedComment = "Контроль\nчерез 2 недели";

const mixedPlain = [
  "Диагностические мероприятия",
  "ОАК - натощак",
  "УЗИ",
  "Шкала боли",
  "",
  "Немедикаментозное лечение",
  "ЛФК - ежедневно",
  "",
  "Лекарственная терапия",
  "Омепразол - после еды",
  "Ингибиторы протонного насоса",
  "Стандартная тройная терапия - Кларитромицин 500 мг",
  "Вакцина против гриппа",
  "",
  "Общие рекомендации",
  "Отказ от курения",
  "",
  "Приложение А3",
  "Таблица режимов",
  "",
  "Дополнительно",
  "Массаж - 10 сеансов",
  "Витамин D",
  "",
  "Общая рекомендация:",
  "Контроль",
  "через 2 недели",
].join("\n");

const mixedHtml =
  '<div style="text-align: left;">' +
  "<strong>Диагностические мероприятия</strong><br>ОАК - натощак<br>УЗИ<br>Шкала боли<br><br>" +
  "<strong>Немедикаментозное лечение</strong><br>ЛФК - ежедневно<br><br>" +
  "<strong>Лекарственная терапия</strong><br>Омепразол - после еды<br>Ингибиторы протонного насоса<br>Стандартная тройная терапия - Кларитромицин 500 мг<br>Вакцина против гриппа<br><br>" +
  "<strong>Общие рекомендации</strong><br>Отказ от курения<br><br>" +
  "<strong>Приложение А3</strong><br>Таблица режимов<br><br>" +
  "<strong>Дополнительно</strong><br>Массаж - 10 сеансов<br>Витамин D<br><br>" +
  "<strong>Общая рекомендация:</strong><br>Контроль\nчерез 2 недели" +
  "</div>";

describe("cart clipboard content", () => {
  it("matches full and mini character-for-character on a mixed cart", () => {
    const full = copyAsFullCart(mixedSelection, mixedCustom, mixedComment);
    const mini = copyAsMiniCart(mixedSelection, mixedCustom, mixedComment);

    assert.equal(full.plainText, mini.plainText);
    assert.equal(full.html, mini.html);
    assert.equal(full.plainText, mixedPlain);
    assert.equal(full.html, mixedHtml);
  });

  it("does not invent drug parameters that the full generator ignores", () => {
    const { plainText, html } = copyAsMiniCart(
      mixedSelection,
      mixedCustom,
      mixedComment,
    );

    for (const absent of [
      "20 мг утром",
      "14 дней",
      "Омез",
      "капсулы",
      "1 раз в день",
      "Диагностика обязательная",
      "Образ жизни",
      "Прочее",
    ]) {
      assert.equal(plainText.includes(absent), false, absent);
      assert.equal(html.includes(absent), false, absent);
    }

    assert.equal(/^\d+\./m.test(plainText), false);
    assert.equal(plainText.split("Массаж").length - 1, 1);
    assert.equal(plainText.split("Витамин D").length - 1, 1);
  });

  it("keeps an unchecked drug out of the text", () => {
    const selected = mixedSelection.filter((entry) => entry.title !== "Омепразол");
    const full = copyAsFullCart(selected, [], "");
    const mini = copyAsMiniCart(selected, [], "");

    assert.equal(full.plainText, mini.plainText);
    assert.equal(full.plainText.includes("Омепразол"), false);
    assert.equal(full.plainText.includes("после еды"), false);
  });

  it("copies one custom item, several, with and without a comment", () => {
    const one = copyAsFullCart(
      [],
      [{ id: "1", name: "Массаж", comment: "10 сеансов" }],
      "",
    );
    const several = copyAsMiniCart(
      [],
      [
        { id: "1", name: "Массаж", comment: "10 сеансов" },
        { id: "2", name: "Витамин D", comment: "" },
      ],
      "",
    );

    assert.equal(one.plainText, "Дополнительно\nМассаж - 10 сеансов");
    assert.equal(
      several.plainText,
      "Дополнительно\nМассаж - 10 сеансов\nВитамин D",
    );
    assert.equal(one.plainText.includes("Образ жизни"), false);
    assert.equal(several.html, copyAsFullCart(
      [],
      [
        { id: "1", name: "Массаж", comment: "10 сеансов" },
        { id: "2", name: "Витамин D", comment: "" },
      ],
      "",
    ).html);
  });

  it("uses the edited custom item and drops a deleted one", () => {
    const before = copyAsFullCart(
      [],
      [
        { id: "1", name: "Массаж", comment: "10 сеансов" },
        { id: "2", name: "Витамин D", comment: "утром" },
      ],
      "",
    );
    const afterEdit = copyAsMiniCart(
      [],
      [
        { id: "1", name: "Массаж шеи", comment: "" },
        { id: "2", name: "Витамин D", comment: "утром" },
      ],
      "",
    );
    const afterDelete = copyAsMiniCart(
      [],
      [{ id: "1", name: "Массаж шеи", comment: "" }],
      "",
    );

    assert.equal(before.plainText.includes("Массаж - 10 сеансов"), true);
    assert.equal(
      afterEdit.plainText,
      "Дополнительно\nМассаж шеи\nВитамин D - утром",
    );
    assert.equal(afterEdit.plainText.includes("10 сеансов"), false);
    assert.equal(afterDelete.plainText, "Дополнительно\nМассаж шеи");
    assert.equal(afterDelete.plainText.includes("Витамин D"), false);
    assert.equal(afterDelete.plainText.split("Массаж шеи").length - 1, 1);
  });

  it("appends custom items to an existing Дополнительно section once", () => {
    const text = copyAsFullCart(
      [
        item({
          categoryId: "extra",
          categoryTitle: "Дополнительно",
          groupTitle: "Дополнительно",
          title: "Из КР",
          comment: "",
        }),
      ],
      [{ id: "1", name: "Своё", comment: "" }],
      "",
    ).plainText;

    assert.equal(text, "Дополнительно\nИз КР\nСвоё");
    assert.equal(text.split("Дополнительно").length - 1, 1);
  });

  it("copies only the general recommendation, including line breaks", () => {
    const full = copyAsFullCart([], [], mixedComment);
    const mini = copyAsMiniCart([], [], mixedComment);

    assert.equal(full.plainText, mini.plainText);
    assert.equal(full.html, mini.html);
    assert.equal(full.plainText, "Общая рекомендация:\nКонтроль\nчерез 2 недели");
    assert.equal(
      full.html,
      '<div style="text-align: left;"><strong>Общая рекомендация:</strong><br>Контроль\nчерез 2 недели</div>',
    );
    assert.equal(full.html.includes("Контроль<br>через"), false);
  });

  it("omits a blank general recommendation and an empty cart", () => {
    const empty = copyAsFullCart([], [], "");
    const blank = copyAsMiniCart([], [], " \n\t ");

    assert.equal(empty.plainText, "");
    assert.equal(empty.html, '<div style="text-align: left;"></div>');
    assert.equal(blank.plainText, empty.plainText);
    assert.equal(blank.html, empty.html);
  });

  it("uses the comment edited immediately before copy", () => {
    let comment = "старый комментарий";
    const selected = () => [
      item({
        categoryId: "treatment",
        categoryTitle: "Лечение",
        groupTitle: "Лечение",
        title: "ЛФК",
        comment,
      }),
    ];

    const before = copyAsFullCart(selected(), [], "черновик");
    comment = "новый комментарий";
    const recommendation = "контроль завтра";
    const after = copyAsMiniCart(selected(), [], recommendation);

    assert.equal(before.plainText.includes("старый комментарий"), true);
    assert.equal(after.plainText.includes("старый комментарий"), false);
    assert.equal(after.plainText.includes("черновик"), false);
    assert.equal(
      after.plainText,
      "Немедикаментозное лечение\nЛФК - новый комментарий\n\nОбщая рекомендация:\nконтроль завтра",
    );
    assert.equal(after.plainText, copyAsFullCart(selected(), [], recommendation).plainText);
    assert.equal(after.html, copyAsFullCart(selected(), [], recommendation).html);
  });

  it("escapes html and keeps a non-empty spaced comment", () => {
    const content = buildClipboardContent(
      [
        item({
          categoryId: "treatment",
          categoryTitle: "Лечение",
          groupTitle: "Лечение",
          title: "A & B <C>",
          comment: "it's \"ok\"",
        }),
      ],
      [],
      "",
    );

    assert.equal(
      content.plainText,
      "Немедикаментозное лечение\nA & B <C> - it's \"ok\"",
    );
    assert.equal(
      content.html,
      '<div style="text-align: left;"><strong>Немедикаментозное лечение</strong><br>A &amp; B &lt;C&gt; - it&#39;s &quot;ok&quot;</div>',
    );

    const spaced = buildClipboardContent(
      [
        item({
          categoryId: "treatment",
          categoryTitle: "Лечение",
          groupTitle: "Лечение",
          title: "ЛФК",
          comment: " ",
        }),
      ],
      [],
      "",
    );
    assert.equal(spaced.plainText, "Немедикаментозное лечение\nЛФК -  ");
  });

  it("formats the same success notice the full cart shows", () => {
    assert.equal(COPY_NOTICE_DURATION_MS, 2400);
    assert.equal(formatCopySuccessNotice(0), "Скопировано 0 услуг");
    assert.equal(formatCopySuccessNotice(1), "Скопировано 1 услуг");
    assert.equal(formatCopySuccessNotice(3), "Скопировано 3 услуг");
    assert.equal(
      COPY_CLIPBOARD_ERROR_MESSAGE,
      "Не удалось скопировать выбранное в буфер обмена",
    );
  });
});

type ClipboardMock = {
  document: Document;
  writes: Array<Record<string, Blob>>;
  writeTextCalls: string[];
  execCalls: number;
  appended: number;
  failWrite: boolean;
  failWriteText: boolean;
  execCommandResult: boolean;
};

const createClipboardDocument = (name: string): ClipboardMock => {
  const writes: Array<Record<string, Blob>> = [];
  const writeTextCalls: string[] = [];
  const mock: ClipboardMock = {
    document: null as unknown as Document,
    writes,
    writeTextCalls,
    execCalls: 0,
    appended: 0,
    failWrite: false,
    failWriteText: false,
    execCommandResult: false,
  };

  const ClipboardItem = class {
    constructor(data: Record<string, Blob>) {
      writes.push(data);
    }
  };

  const view = {
    name,
    ClipboardItem,
    navigator: {
      clipboard: {
        write: async () => {
          if (mock.failWrite) throw new Error(`${name} write denied`);
        },
        writeText: async (value: string) => {
          writeTextCalls.push(value);
          if (mock.failWriteText) throw new Error(`${name} writeText denied`);
        },
      },
    },
    getSelection: () => ({
      removeAllRanges() {},
      addRange() {},
    }),
  };

  const doc = {
    body: {
      appendChild() {
        mock.appended += 1;
      },
      removeChild() {},
    },
    createElement() {
      return { innerHTML: "", style: {}, contentEditable: "" };
    },
    createRange() {
      return { selectNodeContents() {} };
    },
    execCommand() {
      mock.execCalls += 1;
      return mock.execCommandResult;
    },
    defaultView: view,
  };

  mock.document = doc as unknown as Document;
  return mock;
};

describe("cart clipboard write target", () => {
  it("writes html and plain text through the document that received the click", async () => {
    const opener = createClipboardDocument("opener");
    const pip = createClipboardDocument("pip");
    let success = false;
    const result = await copyCartSelection({
      selectedItems: [
        item({
          categoryId: "required-diagnostics",
          categoryTitle: "Диагностика обязательная",
          groupTitle: "Диагностика",
          title: "ОАК",
          comment: "",
        }),
      ],
      customItems: [{ id: "c", name: "Массаж", comment: "" }],
      generalComment: "",
      targetDocument: pip.document,
    });
    success = true;

    assert.equal(success, true);
    assert.equal(result.itemsCount, 2);
    assert.equal(opener.writes.length, 0);
    assert.equal(opener.writeTextCalls.length, 0);
    assert.equal(pip.writes.length, 1);
    assert.equal(await pip.writes[0]?.["text/plain"]?.text(), result.plainText);
    assert.equal(await pip.writes[0]?.["text/html"]?.text(), result.html);
    assert.equal(
      result.plainText,
      "Диагностические мероприятия\nОАК\n\nДополнительно\nМассаж",
    );
  });

  it("does not resolve when clipboard write, writeText and the document fallback fail", async () => {
    const pip = createClipboardDocument("pip");
    pip.failWrite = true;
    pip.failWriteText = true;
    pip.execCommandResult = false;

    let success = false;
    await assert.rejects(
      copyCartSelection({
        selectedItems: [],
        customItems: [],
        generalComment: "текст",
        targetDocument: pip.document,
      }),
      new Error(COPY_CLIPBOARD_ERROR_MESSAGE),
    );
    assert.equal(success, false);
    assert.equal(pip.execCalls, 1);
    assert.equal(pip.appended, 1);
  });

  it("falls back to writeText on the same window", async () => {
    const pip = createClipboardDocument("pip");
    pip.failWrite = true;

    const result = await copyCartSelection({
      selectedItems: [],
      customItems: [],
      generalComment: "Контроль",
      targetDocument: pip.document,
    });

    assert.equal(result.itemsCount, 0);
    assert.deepEqual(pip.writeTextCalls, ["Общая рекомендация:\nКонтроль"]);
    assert.equal(pip.execCalls, 0);
    assert.equal(result.plainText, "Общая рекомендация:\nКонтроль");
  });

  it("uses execCommand on the gesture document, not another window", async () => {
    const opener = createClipboardDocument("opener");
    const pip = createClipboardDocument("pip");
    pip.failWrite = true;
    pip.failWriteText = true;
    pip.execCommandResult = true;
    opener.execCommandResult = true;

    const result = await copyCartSelection({
      selectedItems: [],
      customItems: [{ id: "1", name: "Услуга", comment: "комментарий" }],
      generalComment: "",
      targetDocument: pip.document,
    });

    assert.equal(result.plainText, "Дополнительно\nУслуга - комментарий");
    assert.equal(pip.execCalls, 1);
    assert.equal(pip.appended, 1);
    assert.equal(opener.execCalls, 0);
    assert.equal(opener.appended, 0);
    assert.equal(opener.writes.length, 0);
  });
});
