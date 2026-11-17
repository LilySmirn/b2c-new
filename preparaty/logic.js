/**
 * Страница назначений EasyMed: все вкладки и корзина как в исходнике,
 * вкладка «Препараты» — модернизированный блок (торговые имена, доза/форма, взаимодействия).
 */
(function initPreparaty() {
  var CHEVRON =
    '<svg class="preparaty__chevron" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 L6 6.5 L11 1.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readJsonScript(root, id) {
    var node = root.querySelector("#" + id);
    if (!node) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (error) {
      return null;
    }
  }

  function resolveDataUrls(root) {
    var base = "";
    var script = document.querySelector('script[src*="logic.js"]');
    if (script && script.src) {
      base = script.src.replace(/logic\.js(?:\?.*)?$/, "");
    }
    return {
      trades: base + "data/trades.json",
      interactions: base + "data/interactions.json",
      shellTabs: base + "data/shell-tabs.json"
    };
  }

  function fetchJson(url) {
    return fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .catch(function () {
        return null;
      });
  }

  function titleCaseInn(inn) {
    if (!inn) return "";
    return inn
      .toLowerCase()
      .split(" ")
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(" ");
  }

  /**
   * @param {HTMLElement | Document} mount
   * @param {Object} [options]
   */
  function mountPreparaty(mount, options) {
    var root =
      mount && mount.classList && mount.classList.contains("preparaty")
        ? mount
        : (mount && mount.querySelector && mount.querySelector(".preparaty")) ||
          document.querySelector(".preparaty");
    if (!root) return null;
    if (root.__preparaty) return root.__preparaty;

    var catalog = (options && options.catalog) || readJsonScript(root, "preparaty-catalog") || {};
    var activeFromCatalog = (catalog.tabs || []).find(function (tab) {
      return tab.active;
    });
    var state = {
      diagnosis: catalog.diagnosis || "Препараты",
      tabs: catalog.tabs || [],
      activeTab: (activeFromCatalog && activeFromCatalog.id) || "drugs",
      items: (catalog.items || []).map(normalizeItem),
      classicItems: [],
      shellTabs: {},
      trades: {},
      interactions: {},
      popover: null,
      wizard: null,
      comboWizard: null,
      infoTab: "general",
      infoFocus: "",
      infoCombo: null,
      ixIndex: 0,
      ixForceOpen: false,
      cartStatus: "",
      customItems: [],
      cartModal: null,
      customSeq: 1,
      extraSeq: 1,
      toggleLock: null
    };

    function normalizeItem(item) {
      var next = JSON.parse(JSON.stringify(item));
      next.selected = false;
      next.selectedInn = next.inn || "";
      next.selectedTrade = "";
      next.selectedDose = "";
      next.selectedForm = "";
      next.commentShort = next.commentShort || "";
      next.componentPicks = {};
      next.intake = next.intake || {
        morning: false,
        day: false,
        evening: false,
        night: false
      };
      next.intakeRelation = next.intakeRelation || "";
      return next;
    }

    function flattenShellTabs(shell) {
      var list = [];
      Object.keys(shell || {}).forEach(function (tabId) {
        var tab = shell[tabId] || {};
        (tab.groups || []).forEach(function (group) {
          (group.rows || []).forEach(function (row) {
            list.push({
              id: row.id,
              tabId: tabId,
              group: group.title || "",
              kind: "classic",
              name: row.name,
              qc: row.qc || "",
              level: row.level || "",
              hint: row.hint || "",
              commentText: row.comment || "",
              selected: false
            });
          });
        });
      });
      return list;
    }

    function emit(type, payload) {
      var detail = { type: type };
      var key;
      if (payload) {
        for (key in payload) {
          if (Object.prototype.hasOwnProperty.call(payload, key)) detail[key] = payload[key];
        }
      }
      root.dispatchEvent(
        new CustomEvent("preparaty:action", {
          bubbles: true,
          detail: detail
        })
      );
    }

    function findItem(id) {
      var index;
      for (index = 0; index < state.items.length; index += 1) {
        if (state.items[index].id === id) return state.items[index];
      }
      for (index = 0; index < state.classicItems.length; index += 1) {
        if (state.classicItems[index].id === id) return state.classicItems[index];
      }
      for (index = 0; index < state.customItems.length; index += 1) {
        if (state.customItems[index].id === id) return state.customItems[index];
      }
      return null;
    }

    function isDrugsTab() {
      return state.activeTab === "drugs";
    }

    function tradeBook(inn) {
      return state.trades[inn] || state.trades[(inn || "").toUpperCase()] || null;
    }

    function isSelectable(item) {
      if (item.kind === "trade" || item.kind === "extra-drug") {
        return !!tradeBook(item.inn || item.selectedInn);
      }
      if (item.kind === "alternatives" || item.kind === "combo") {
        return !!(item.alternatives && item.alternatives.length);
      }
      if (item.kind === "scheme") return !!(item.components && item.components.length);
      return false;
    }

    function compositionList(item) {
      if (item.composition && item.composition.length) return item.composition;
      var book = tradeBook(item.selectedInn || item.inn || "");
      if (book && book.composition && book.composition.length) return book.composition;
      var inn = item.selectedInn || item.inn || "";
      if (inn.indexOf("+") !== -1) {
        return inn
          .replace(/\s*\[НАБОР\]\s*/gi, "")
          .split("+")
          .map(function (part) {
            return titleCaseInn(part.replace(/[\[\]]/g, "").trim());
          })
          .filter(Boolean);
      }
      return [];
    }

    function compositionText(item) {
      var list = compositionList(item);
      return list.length ? list.join(" + ") : "";
    }

    function schemeProgress(item) {
      var total = (item.components || []).length;
      var ready = 0;
      (item.components || []).forEach(function (component) {
        if (item.componentPicks[component.id]) ready += 1;
      });
      return { ready: ready, total: total };
    }

    function schemeStepHint(item) {
      var progress = schemeProgress(item);
      if (!progress.total) return "";
      if (progress.ready >= progress.total) return "Все компоненты выбраны";
      var wizard = state.wizard && state.wizard.itemId === item.id ? state.wizard : null;
      var step = wizard ? wizard.step : progress.ready;
      var component = item.components[step];
      return (
        "Шаг " +
        (step + 1) +
        " из " +
        progress.total +
        (component ? " · " + component.label : "")
      );
    }

    function displayName(item) {
      if (item.kind === "scheme") return item.name;
      if (item.selectedTrade) return item.selectedTrade;
      if (item.selectedInn && item.kind === "combo") {
        var comboAlt = (item.alternatives || []).find(function (alt) {
          return alt.inn === item.selectedInn;
        });
        return comboAlt ? comboAlt.label : item.name;
      }
      if (item.selectedInn && item.kind === "alternatives") return titleCaseInn(item.selectedInn);
      return item.name;
    }

    function displaySub(item) {
      if (item.kind === "scheme") {
        var progress = schemeProgress(item);
        if (!progress.ready) return "Откройте и выберите 3 препарата";
        if (progress.ready < progress.total) {
          return schemeStepHint(item) || "Выбрано " + progress.ready + " из " + progress.total;
        }
        var picks = (item.components || [])
          .map(function (component) {
            var pick = item.componentPicks[component.id];
            return pick ? pick.trade || pick.label || titleCaseInn(pick.inn) : null;
          })
          .filter(Boolean);
        return picks.length ? picks.join(" + ") : "Схема заполнена";
      }
      if (item.kind === "combo") {
        var combo = compositionText(item);
        if (item.selectedTrade) return combo || "Комбинация · 3 действующих вещества";
        return combo ? "Комбинация · " + combo : "Выберите набор с несколькими ДВ";
      }
      if (item.selectedTrade && item.selectedInn) {
        var selectedCombo = compositionText(item);
        if (selectedCombo) return selectedCombo;
        return titleCaseInn(item.selectedInn);
      }
      if (item.kind === "trade" || item.kind === "alternatives" || item.kind === "extra-drug") {
        return "Выберите торговое наименование";
      }
      return "";
    }

    function tradeVariants(item) {
      var inn = item.selectedInn || item.inn || "";
      var book = tradeBook(inn);
      if (!book || !item.selectedTrade) return [];
      var entry = book.trades.find(function (row) {
        return row.trade === item.selectedTrade;
      });
      return entry && entry.variants ? entry.variants : [];
    }

    function uniqueField(variants, field) {
      var seen = {};
      var list = [];
      variants.forEach(function (variant) {
        var value = variant[field] || "";
        if (!value || seen[value]) return;
        seen[value] = true;
        list.push(value);
      });
      return list;
    }

    function prettyForm(form) {
      if (!form) return "";
      return form.charAt(0) + form.slice(1).toLowerCase();
    }

    function markCell(kind, text, itemId, expanded) {
      if (!text) return '<span class="preparaty__slot" aria-hidden="true"></span>';
      var slotClass = kind === "qc" ? "preparaty__qc" : "preparaty__level";
      var label = kind === "qc" ? "Критерий качества" : "Уровень достоверности";
      return (
        '<button type="button" class="' +
        slotClass +
        '" data-action="hint" data-item-id="' +
        escapeHtml(itemId) +
        '" data-popover-anchor="hint:' +
        escapeHtml(itemId) +
        '" aria-label="' +
        label +
        '" aria-expanded="' +
        (expanded ? "true" : "false") +
        '">' +
        escapeHtml(text) +
        "</button>"
      );
    }

    function fieldInput(item, field, value, placeholder) {
      var noteFields = { scheme: 1, course: 1, form: 1, comment: 1 };
      return (
        '<input type="text" class="preparaty__field" data-field="' +
        field +
        '" data-kind="' +
        field +
        '" data-item-id="' +
        escapeHtml(item.id) +
        '" value="' +
        escapeHtml(value || "") +
        '" placeholder="' +
        escapeHtml(placeholder) +
        '" aria-label="' +
        escapeHtml(placeholder) +
        '"' +
        (noteFields[field]
          ? ' title="Двойной клик — открыть карточку назначения" data-note-field="' + field + '"'
          : "") +
        " />"
      );
    }

    function itemComment(item) {
      if (item.kind === "classic") return item.commentText || "";
      return item.commentShort || "";
    }

    function setItemComment(item, value) {
      if (item.kind === "classic") item.commentText = value;
      else item.commentShort = value;
    }

    function noteFieldLabel(field) {
      if (field === "scheme") return "схема";
      if (field === "course") return "курс";
      if (field === "form") return "форма";
      return "назначение";
    }

    function doseOptions(item) {
      var fromTrade = uniqueField(tradeVariants(item), "dose");
      if (fromTrade.length) return fromTrade;
      var inn = item.selectedInn || item.inn || "";
      var book = tradeBook(inn);
      if (!book || !book.trades) return [];
      var all = [];
      book.trades.forEach(function (entry) {
        (entry.variants || []).forEach(function (variant) {
          all.push(variant);
        });
      });
      return uniqueField(all, "dose");
    }

    function formOptions(item) {
      var fromTrade = uniqueField(tradeVariants(item), "form").map(prettyForm);
      if (fromTrade.length) return fromTrade;
      var inn = item.selectedInn || item.inn || "";
      var book = tradeBook(inn);
      if (!book || !book.trades) return [];
      var all = [];
      book.trades.forEach(function (entry) {
        (entry.variants || []).forEach(function (variant) {
          all.push(variant);
        });
      });
      return uniqueField(all, "form").map(prettyForm);
    }

    function intakeLabels(item) {
      var intake = item.intake || {};
      var labels = [];
      if (intake.morning) labels.push("утром");
      if (intake.day) labels.push("днём");
      if (intake.evening) labels.push("вечером");
      if (intake.night) labels.push("на ночь");
      return labels;
    }

    function intakeRelationLabel(value) {
      if (value === "before") return "до еды";
      if (value === "with") return "во время еды";
      if (value === "after") return "после еды";
      return "";
    }

    function buildSchemeFromParts(item) {
      var parts = [];
      if (item.selectedDose) parts.push(item.selectedDose);
      var times = intakeLabels(item);
      if (times.length) {
        parts.push(times.length === 1 ? times[0] : times.join(" и "));
      }
      var rel = intakeRelationLabel(item.intakeRelation);
      if (rel) parts.push(rel);
      return parts.join(", ");
    }

    function assignmentPreview(item) {
      var bits = [];
      if (item.selectedTrade) bits.push(item.selectedTrade);
      else if (item.kind !== "scheme" && item.kind !== "combo") bits.push(displayName(item));
      else bits.push(item.name);
      if (item.selectedDose) bits.push(item.selectedDose);
      if (item.selectedForm) bits.push(prettyForm(item.selectedForm));
      var times = intakeLabels(item);
      if (times.length) bits.push(times.join("+"));
      if (item.courseShort) bits.push(item.courseShort);
      return bits.filter(Boolean).join(" · ");
    }

    function cartInteractionsFor(item) {
      var analysis = analyzeInteractions();
      return analysis.pairs.filter(function (pair) {
        return pair.leftId === item.id || pair.rightId === item.id;
      });
    }

    function itemTypeLabel(item) {
      if (item.kind === "scheme") return "Схема · 3 препарата";
      if (item.kind === "combo") return "Комбинация · 3 ДВ";
      if (item.kind === "alternatives") return "Группа препаратов";
      if (item.kind === "extra-drug") return "Сверх КР";
      return "Лекарственный препарат";
    }

    function selectOptionsHtml(values, current, emptyLabel) {
      var opts =
        '<option value="">' +
        escapeHtml(emptyLabel || "Не выбрано") +
        "</option>";
      values.forEach(function (value) {
        opts +=
          '<option value="' +
          escapeHtml(value) +
          '"' +
          (value === current ? " selected" : "") +
          ">" +
          escapeHtml(value) +
          "</option>";
      });
      return opts;
    }

    function doseFieldHtml(item, open) {
      var options = doseOptions(item);
      var doseOpen = open && state.popover && state.popover.type === "dose";
      var hasList = options.length > 0;
      return (
        '<div class="preparaty__dose' +
        (hasList ? " has-list" : "") +
        '">' +
        '<input type="text" class="preparaty__field preparaty__field--dose" data-field="dose" data-kind="dose" data-item-id="' +
        escapeHtml(item.id) +
        '" value="' +
        escapeHtml(item.selectedDose || "") +
        '" placeholder="Доза" aria-label="Доза" autocomplete="off" />' +
        (hasList
          ? '<button type="button" class="preparaty__dose-toggle" data-action="dose" data-item-id="' +
            escapeHtml(item.id) +
            '" data-popover-anchor="dose:' +
            escapeHtml(item.id) +
            '" aria-label="Варианты дозы из базы" aria-haspopup="listbox" aria-expanded="' +
            (doseOpen ? "true" : "false") +
            '">▾</button>'
          : "") +
        "</div>"
      );
    }

    function cardComboFieldHtml(item, field, options, value, label) {
      var hasList = options.length > 0;
      var listOpen = state.infoCombo === field;
      var pickAction = field === "dose" ? "info-pick-dose" : "info-pick-form";
      return (
        '<label class="preparaty__card-field"><span>' +
        escapeHtml(label) +
        "</span>" +
        '<div class="preparaty__card-combo' +
        (hasList ? " has-list" : "") +
        (listOpen ? " is-open" : "") +
        '">' +
        '<input type="text" data-info-field="' +
        escapeHtml(field) +
        '" data-item-id="' +
        escapeHtml(item.id) +
        '" value="' +
        escapeHtml(value || "") +
        '" placeholder="' +
        escapeHtml(label) +
        '" aria-label="' +
        escapeHtml(label) +
        '" autocomplete="off" />' +
        (hasList
          ? '<button type="button" class="preparaty__card-combo-toggle" data-action="info-combo" data-combo="' +
            escapeHtml(field) +
            '" data-item-id="' +
            escapeHtml(item.id) +
            '" aria-label="Варианты: ' +
            escapeHtml(label) +
            '" aria-haspopup="listbox" aria-expanded="' +
            (listOpen ? "true" : "false") +
            '">▾</button>'
          : "") +
        (hasList && listOpen
          ? '<div class="preparaty__card-combo-list" role="listbox">' +
            options
              .map(function (option) {
                return (
                  '<button type="button" class="preparaty__card-combo-option' +
                  (option === value ? " is-current" : "") +
                  '" data-action="' +
                  pickAction +
                  '" data-item-id="' +
                  escapeHtml(item.id) +
                  '" data-value="' +
                  escapeHtml(option) +
                  '">' +
                  escapeHtml(option) +
                  "</button>"
                );
              })
              .join("") +
            "</div>"
          : "") +
        "</div></label>"
      );
    }

    function comboNameHtml(item, open) {
      var wizardOpen =
        open && state.popover && state.popover.type === "combo-wizard";
      var combo = compositionText(item);
      var sub = item.selectedTrade
        ? combo || "3 действующих вещества в одном наборе"
        : combo
          ? combo
          : "Откройте и выберите набор";
      return (
        '<div class="preparaty__combo">' +
        '<span class="preparaty__mark preparaty__mark--combo">Комбинация · 3 ДВ</span>' +
        '<button type="button" class="preparaty__name is-selectable preparaty__name--combo" data-action="name" data-item-id="' +
        escapeHtml(item.id) +
        '" data-popover-anchor="name:' +
        escapeHtml(item.id) +
        '" aria-haspopup="dialog" aria-expanded="' +
        (wizardOpen ? "true" : "false") +
        '"><span class="preparaty__name-text">' +
        escapeHtml(displayName(item)) +
        '<span class="preparaty__name-sub">' +
        escapeHtml(sub) +
        "</span></span>" +
        CHEVRON +
        "</button></div>"
      );
    }

    function schemeNameHtml(item, open) {
      var wizardOpen =
        open && state.popover && state.popover.type === "scheme-wizard";
      return (
        '<div class="preparaty__scheme">' +
        '<span class="preparaty__mark preparaty__mark--scheme">Схема · 3 препарата</span>' +
        '<button type="button" class="preparaty__name is-selectable preparaty__name--scheme" data-action="name" data-item-id="' +
        escapeHtml(item.id) +
        '" data-popover-anchor="name:' +
        escapeHtml(item.id) +
        '" aria-haspopup="dialog" aria-expanded="' +
        (wizardOpen ? "true" : "false") +
        '"><span class="preparaty__name-text">' +
        escapeHtml(displayName(item)) +
        '<span class="preparaty__name-sub">' +
        escapeHtml(displaySub(item)) +
        "</span></span>" +
        CHEVRON +
        "</button></div>"
      );
    }

    function renderTabs() {
      var host = root.querySelector("[data-role='tabs']");
      host.innerHTML = (state.tabs || [])
        .map(function (tab) {
          var active = tab.id === state.activeTab;
          return (
            '<button type="button" class="preparaty__tab' +
            (active ? " is-active" : "") +
            '" role="tab" data-action="switch-tab" data-tab-id="' +
            escapeHtml(tab.id) +
            '" aria-selected="' +
            (active ? "true" : "false") +
            '"' +
            (tab.enabled ? "" : " disabled") +
            ">" +
            escapeHtml(tab.label) +
            "</button>"
          );
        })
        .join("");
    }

    function classicBadge(kind, text, itemId, expanded) {
      var isQc = kind === "qc";
      var slotClass = isQc ? "preparaty__qc" : "preparaty__level";
      if (!text) {
        return '<span class="' + slotClass + '" aria-hidden="true"></span>';
      }
      var label = isQc ? "Критерий качества" : "Уровень достоверности";
      return (
        '<button type="button" class="' +
        slotClass +
        '" data-action="hint" data-item-id="' +
        escapeHtml(itemId) +
        '" data-popover-anchor="hint:' +
        escapeHtml(itemId) +
        '" aria-label="' +
        label +
        '" aria-expanded="' +
        (expanded ? "true" : "false") +
        '">' +
        escapeHtml(text) +
        "</button>"
      );
    }

    function renderClassicList() {
      var host = root.querySelector("[data-role='list']");
      var toolbar = root.querySelector("[data-role='toolbar']");
      if (toolbar) {
        toolbar.hidden = true;
        toolbar.innerHTML = "";
      }
      var shell = state.shellTabs[state.activeTab];
      if (!shell || !shell.enabled) {
        host.innerHTML =
          '<p class="preparaty__empty">' +
          escapeHtml((shell && shell.note) || "Раздел недоступен для выбранной клинической рекомендации.") +
          "</p>";
        return;
      }
      var html = (shell.groups || [])
        .map(function (group, groupIndex) {
          var rows = state.classicItems.filter(function (item) {
            return item.tabId === state.activeTab && item.group === (group.title || "");
          });
          var showSelectAll = groupIndex === 0 && !!shell.selectAllLabel;
          return (
            '<section class="preparaty__section">' +
            '<div class="preparaty__section-row' +
            (showSelectAll ? "" : " preparaty__section-row--no-check") +
            '">' +
            (showSelectAll
              ? '<button type="button" class="preparaty__checkbox" data-action="select-all" data-tab-id="' +
                escapeHtml(state.activeTab) +
                '" aria-label="' +
                escapeHtml(shell.selectAllLabel) +
                '" aria-pressed="false"></button>'
              : "") +
            "<span>" +
            escapeHtml(group.title || "") +
            "</span></div>" +
            rows
              .map(function (item) {
                var open =
                  state.popover &&
                  state.popover.itemId === item.id &&
                  (state.popover.type === "hint" ||
                    state.popover.type === "info" ||
                    state.popover.type === "comment");
                var hintOpen = open && state.popover.type === "hint";
                var comment = item.commentText || "";
                return (
                  '<article class="preparaty__row preparaty__row--classic' +
                  (item.selected ? " is-selected" : "") +
                  (open ? " is-open" : "") +
                  '">' +
                  '<div class="preparaty__classic-first">' +
                  '<button type="button" class="preparaty__checkbox' +
                  (item.selected ? " is-checked" : "") +
                  '" data-action="toggle" data-item-id="' +
                  escapeHtml(item.id) +
                  '" aria-label="Выбрать ' +
                  escapeHtml(item.name) +
                  '"' +
                  (item.selected ? ' aria-pressed="true"' : ' aria-pressed="false"') +
                  ">" +
                  (item.selected ? "✓" : "") +
                  "</button>" +
                  classicBadge("qc", item.qc, item.id, hintOpen) +
                  classicBadge("level", item.level, item.id, hintOpen) +
                  "</div>" +
                  '<button type="button" class="preparaty__classic-name" data-action="toggle-name" data-item-id="' +
                  escapeHtml(item.id) +
                  '" aria-pressed="' +
                  (item.selected ? "true" : "false") +
                  '">' +
                  escapeHtml(item.name) +
                  "</button>" +
                  '<div class="preparaty__classic-info">' +
                  '<button type="button" class="preparaty__info" data-action="info" data-item-id="' +
                  escapeHtml(item.id) +
                  '" data-popover-anchor="info:' +
                  escapeHtml(item.id) +
                  '" aria-label="Информация о назначении ' +
                  escapeHtml(item.name) +
                  '">i</button></div>' +
                  '<button type="button" class="preparaty__classic-comment' +
                  (comment ? " is-filled" : "") +
                  '" data-action="comment" data-item-id="' +
                  escapeHtml(item.id) +
                  '">' +
                  escapeHtml(comment || "Комментарий...") +
                  "</button></article>"
                );
              })
              .join("") +
            "</section>"
          );
        })
        .join("");
      host.innerHTML = html || '<p class="preparaty__empty">Нет назначений в этом разделе.</p>';
    }

    function renderList() {
      if (!isDrugsTab()) {
        renderClassicList();
        return;
      }
      var toolbar = root.querySelector("[data-role='toolbar']");
      if (toolbar) {
        toolbar.hidden = true;
        toolbar.innerHTML = "";
      }
      var host = root.querySelector("[data-role='list']");
      var analysis = analyzeInteractions();
      host.innerHTML = state.items
        .map(function (item) {
          var open =
            state.popover &&
            state.popover.itemId === item.id &&
            (state.popover.type === "name" ||
              state.popover.type === "scheme-wizard" ||
              state.popover.type === "combo-wizard" ||
              state.popover.type === "hint" ||
              state.popover.type === "info" ||
              state.popover.type === "note-edit" ||
              state.popover.type === "dose" ||
              state.popover.type === "form" ||
              state.popover.type === "scheme" ||
              state.popover.type === "course");
          var selectable = isSelectable(item);
          var sub = displaySub(item);
          var hintOpen = open && state.popover.type === "hint";
          var ixStatus = item.selected ? analysis.statusById[item.id] || "ok" : "";
          var name;
          if (item.kind === "scheme") {
            name = schemeNameHtml(item, open);
          } else if (item.kind === "combo") {
            name = comboNameHtml(item, open);
          } else {
            var nameInner =
              '<span class="preparaty__name-text">' +
              escapeHtml(displayName(item)) +
              (item.kind === "extra-drug"
                ? '<span class="preparaty__extra-badge">сверх КР</span>'
                : "") +
              (sub ? '<span class="preparaty__name-sub">' + escapeHtml(sub) + "</span>" : "") +
              "</span>";
            name = selectable
              ? '<button type="button" class="preparaty__name is-selectable" data-action="name" data-item-id="' +
                escapeHtml(item.id) +
                '" data-popover-anchor="name:' +
                escapeHtml(item.id) +
                '" aria-haspopup="listbox" aria-expanded="' +
                (open && state.popover.type === "name" ? "true" : "false") +
                '">' +
                nameInner +
                CHEVRON +
                "</button>"
              : '<span class="preparaty__name">' + nameInner + "</span>";
          }

          return (
            '<article class="preparaty__row' +
            (item.kind === "combo" ? " preparaty__row--combo" : "") +
            (item.kind === "scheme" ? " preparaty__row--scheme" : "") +
            (item.kind === "extra-drug" ? " preparaty__row--extra" : "") +
            (item.selected ? " is-selected" : "") +
            (ixStatus ? " is-" + ixStatus : "") +
            (open ? " is-open" : "") +
            '">' +
            '<div class="preparaty__first">' +
            '<button type="button" class="preparaty__checkbox' +
            (item.selected ? " is-checked" : "") +
            '" data-action="toggle" data-item-id="' +
            escapeHtml(item.id) +
            '" aria-label="Выбрать ' +
            escapeHtml(item.name || displayName(item)) +
            '"' +
            (item.selected ? ' aria-pressed="true"' : ' aria-pressed="false"') +
            ">" +
            (item.selected ? "✓" : "") +
            "</button>" +
            markCell("qc", item.qc, item.id, hintOpen) +
            markCell("level", item.level, item.id, hintOpen) +
            "</div>" +
            name +
            doseFieldHtml(item, open) +
            fieldInput(
              item,
              "form",
              item.selectedForm ? prettyForm(item.selectedForm) : "",
              "Форма"
            ) +
            fieldInput(item, "scheme", item.schemeShort, "Схема") +
            fieldInput(item, "course", item.courseShort, "Курс") +
            '<div class="preparaty__row-end">' +
            '<button type="button" class="preparaty__info" data-action="info" data-item-id="' +
            escapeHtml(item.id) +
            '" data-popover-anchor="info:' +
            escapeHtml(item.id) +
            '" aria-label="Информация о назначении">i</button>' +
            '<button type="button" class="preparaty__comment-pill' +
            (item.commentShort ? " is-filled" : "") +
            '" data-action="comment" data-item-id="' +
            escapeHtml(item.id) +
            '" data-field="comment">' +
            escapeHtml(item.commentShort || "Комментарий...") +
            "</button></div>" +
            "</article>"
          );
        })
        .join("");
    }

    function selectedItems() {
      return state.items
        .concat(state.classicItems)
        .filter(function (item) {
          return item.selected;
        })
        .concat(state.customItems);
    }

    function selectedDrugItems() {
      return state.items.filter(function (item) {
        return item.selected;
      });
    }

    function tabLabel(tabId) {
      var tab = (state.tabs || []).find(function (row) {
        return row.id === tabId;
      });
      return tab ? tab.label : tabId;
    }

    function cartItemTitle(item) {
      if (item.kind === "classic" || item.kind === "custom") return item.name || "";
      return displayName(item);
    }

    function cartItemComment(item) {
      if (item.kind === "custom") return item.comment || "";
      return item.commentShort || "";
    }

    function cartGroupLabel(item) {
      if (item.kind === "custom") return "Прочее";
      if (item.kind === "extra-drug") return "Лечение";
      if (item.kind === "classic") {
        if (item.tabId === "diag-req" || item.tabId === "diag-opt") return "Диагностика";
        if (item.tabId === "treatment") return "Лечение";
        if (item.tabId === "scales") return "Шкалы и опросники";
        return "Прочее";
      }
      return "Лечение";
    }

    function renderCart() {
      var items = selectedItems();
      root.querySelector("[data-role='cart-count']").textContent = String(items.length);
      var host = root.querySelector("[data-role='cart-list']");
      var status = root.querySelector("[data-role='cart-status']");
      if (status) status.textContent = state.cartStatus || "";
      if (!items.length) {
        host.innerHTML = "";
        return;
      }
      var order = ["Диагностика", "Лечение", "Шкалы и опросники", "Прочее"];
      var groups = {};
      items.forEach(function (item) {
        var label = cartGroupLabel(item);
        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
      });
      host.innerHTML = order
        .filter(function (label) {
          return groups[label] && groups[label].length;
        })
        .map(function (label) {
          var rows = groups[label];
          return (
            "<div>" +
            '<div class="preparaty__cart-group">' +
            escapeHtml(label) +
            " (" +
            rows.length +
            ")</div>" +
            rows
              .map(function (item, index) {
                var title = cartItemTitle(item);
                var comment = cartItemComment(item);
                var canEdit = item.kind === "custom" || item.kind === "extra-drug";
                var actions = canEdit
                  ? '<span class="preparaty__cart-item-actions">' +
                    '<button type="button" class="preparaty__cart-edit" data-action="cart-edit" data-item-id="' +
                    escapeHtml(item.id) +
                    '" aria-label="Редактировать ' +
                    escapeHtml(title) +
                    '"><span aria-hidden="true">✎</span></button>' +
                    '<button type="button" class="preparaty__cart-remove" data-action="cart-remove" data-item-id="' +
                    escapeHtml(item.id) +
                    '" aria-label="Удалить ' +
                    escapeHtml(title) +
                    '">×</button></span>'
                  : '<button type="button" class="preparaty__cart-remove" data-action="cart-remove" data-item-id="' +
                    escapeHtml(item.id) +
                    '" aria-label="Удалить ' +
                    escapeHtml(title) +
                    '">×</button>';
                return (
                  '<div class="preparaty__cart-item' +
                  (index % 2 ? " preparaty__cart-item--alt" : "") +
                  (item.kind === "extra-drug" ? " preparaty__cart-item--extra" : "") +
                  '" data-item-id="' +
                  escapeHtml(item.id) +
                  '"><span class="preparaty__cart-item-title">' +
                  escapeHtml(title) +
                  (item.kind === "extra-drug"
                    ? '<span class="preparaty__cart-extra-badge">сверх КР</span>'
                    : "") +
                  (comment
                    ? '<span class="preparaty__cart-item-comment">' + escapeHtml(comment) + "</span>"
                    : "") +
                  "</span>" +
                  actions +
                  "</div>"
                );
              })
              .join("") +
            "</div>"
          );
        })
        .join("");
    }

    function searchDrugCatalog(query) {
      var q = String(query || "")
        .trim()
        .toLowerCase();
      if (q.length < 2) return [];
      var results = [];
      var seen = {};
      Object.keys(state.trades || {}).forEach(function (inn) {
        var book = state.trades[inn];
        if (!book) return;
        var innLabel = titleCaseInn(inn);
        var innHit =
          inn.toLowerCase().indexOf(q) !== -1 || innLabel.toLowerCase().indexOf(q) !== -1;
        if (innHit) {
          var innKey = "inn:" + inn;
          if (!seen[innKey]) {
            seen[innKey] = true;
            results.push({
              type: "inn",
              inn: inn,
              label: innLabel,
              hint: "МНН · выберите торговое"
            });
          }
        }
        (book.trades || []).forEach(function (row) {
          var trade = row.trade || "";
          if (!trade || trade.toLowerCase().indexOf(q) === -1) return;
          var tradeKey = "trade:" + inn + "|" + trade;
          if (seen[tradeKey]) return;
          seen[tradeKey] = true;
          results.push({
            type: "trade",
            inn: inn,
            trade: trade,
            label: trade,
            hint: innLabel
          });
        });
      });
      return results.slice(0, 24);
    }

    function cartModalCanSave(modal) {
      if (!modal) return false;
      var comment = String(modal.comment || "");
      if (comment.length > 500) return false;
      if (modal.itemKind === "drug") {
        return !!(modal.inn && modal.trade);
      }
      var name = String(modal.name || "").trim();
      return name.length > 0 && name.length <= 160;
    }

    function openCartModal(mode, item) {
      var isDrug = item && item.kind === "extra-drug";
      state.cartModal = {
        mode: mode || "add",
        itemKind: isDrug ? "drug" : item && item.kind === "custom" ? "service" : "drug",
        itemId: item ? item.id : "",
        name: item && !isDrug ? item.name || "" : "",
        comment: item
          ? isDrug
            ? item.commentShort || item.comment || ""
            : item.comment || ""
          : "",
        query: "",
        stage: isDrug && item.selectedInn ? "ready" : "search",
        inn: isDrug ? item.selectedInn || item.inn || "" : "",
        trade: isDrug ? item.selectedTrade || "" : "",
        dose: isDrug ? item.selectedDose || "" : "",
        form: isDrug ? item.selectedForm || "" : "",
        error: ""
      };
      emit(mode === "edit" ? "cart-edit" : "cart-add", {
        itemId: item && item.id,
        itemKind: state.cartModal.itemKind
      });
      render();
    }

    function closeCartModal() {
      state.cartModal = null;
      render();
    }

    function applyExtraTradeChoice(inn, trade) {
      var book = tradeBook(inn);
      var entry =
        book &&
        (book.trades || []).find(function (row) {
          return row.trade === trade;
        });
      var variant = entry && entry.variants && entry.variants[0];
      state.cartModal.inn = inn;
      state.cartModal.trade = trade;
      state.cartModal.dose = variant ? variant.dose || "" : "";
      state.cartModal.form = variant ? variant.form || "" : "";
      state.cartModal.stage = "ready";
      state.cartModal.query = "";
      state.cartModal.error = "";
    }

    function renderCartModal() {
      var layer = root.querySelector("[data-role='cart-modal']");
      if (!layer) return;
      var modal = state.cartModal;
      if (!modal) {
        layer.hidden = true;
        layer.innerHTML = "";
        return;
      }
      var isEdit = modal.mode === "edit";
      var isDrug = modal.itemKind === "drug";
      var comment = modal.comment || "";
      var canSave = cartModalCanSave(modal);
      var activeField =
        document.activeElement && layer.contains(document.activeElement)
          ? document.activeElement.getAttribute("data-role")
          : "";
      var selectionStart =
        document.activeElement && typeof document.activeElement.selectionStart === "number"
          ? document.activeElement.selectionStart
          : null;

      var typeSwitch =
        '<div class="preparaty__cart-modal-types" role="tablist" aria-label="Тип назначения">' +
        '<button type="button" class="preparaty__cart-modal-type' +
        (isDrug ? " is-active" : "") +
        '" data-action="cart-modal-kind" data-kind="drug" role="tab" aria-selected="' +
        (isDrug ? "true" : "false") +
        '">Медикамент</button>' +
        '<button type="button" class="preparaty__cart-modal-type' +
        (!isDrug ? " is-active" : "") +
        '" data-action="cart-modal-kind" data-kind="service" role="tab" aria-selected="' +
        (!isDrug ? "true" : "false") +
        '">Услуга</button></div>';

      var bodyHtml = "";
      if (isDrug) {
        var results = modal.stage === "search" ? searchDrugCatalog(modal.query) : [];
        var bookTrades =
          modal.stage === "trades" && modal.inn
            ? ((tradeBook(modal.inn) || {}).trades || []).map(function (row) {
                return row.trade;
              })
            : [];
        bodyHtml =
          '<p class="preparaty__cart-modal-lead">Препарат сверх клинических рекомендаций: попадёт в корзину «Лечение» и в проверку взаимодействий, но не в список КР.</p>' +
          (modal.stage === "ready"
            ? '<div class="preparaty__cart-modal-picked">' +
              "<strong>" +
              escapeHtml(modal.trade) +
              "</strong><span>" +
              escapeHtml(titleCaseInn(modal.inn)) +
              (modal.dose || modal.form
                ? " · " +
                  escapeHtml([modal.dose, modal.form ? prettyForm(modal.form) : ""].filter(Boolean).join(", "))
                : "") +
              "</span>" +
              '<button type="button" class="preparaty__cart-modal-change" data-action="cart-modal-drug-reset">Изменить</button></div>'
            : modal.stage === "trades"
              ? '<div class="preparaty__cart-modal-step">' +
                "<p>МНН: <strong>" +
                escapeHtml(titleCaseInn(modal.inn)) +
                '</strong></p><button type="button" class="preparaty__cart-modal-change" data-action="cart-modal-drug-reset">← К поиску</button></div>' +
                '<div class="preparaty__cart-modal-results" role="listbox">' +
                (bookTrades.length
                  ? bookTrades
                      .map(function (trade) {
                        return (
                          '<button type="button" class="preparaty__cart-modal-result" data-action="cart-modal-pick-trade" data-inn="' +
                          escapeHtml(modal.inn) +
                          '" data-trade="' +
                          escapeHtml(trade) +
                          '"><strong>' +
                          escapeHtml(trade) +
                          "</strong></button>"
                        );
                      })
                      .join("")
                  : '<p class="preparaty__cart-modal-empty">Нет торговых имён в текущей базе.</p>') +
                "</div>"
              : '<input type="text" class="preparaty__cart-modal-input' +
                (modal.error ? " is-error" : "") +
                '" data-role="cart-modal-search" maxlength="160" placeholder="Поиск по МНН или торговому имени*" aria-label="Поиск препарата" value="' +
                escapeHtml(modal.query || "") +
                '" autocomplete="off" />' +
                '<div class="preparaty__cart-modal-helper"><span class="' +
                (modal.error ? "is-error" : "") +
                '">' +
                (modal.error || "Начните вводить название, минимум 2 символа") +
                "</span></div>" +
                '<div class="preparaty__cart-modal-results" role="listbox">' +
                (String(modal.query || "").trim().length >= 2
                  ? results.length
                    ? results
                        .map(function (row) {
                          return (
                            '<button type="button" class="preparaty__cart-modal-result" data-action="' +
                            (row.type === "inn" ? "cart-modal-pick-inn" : "cart-modal-pick-trade") +
                            '" data-inn="' +
                            escapeHtml(row.inn) +
                            '"' +
                            (row.trade ? ' data-trade="' + escapeHtml(row.trade) + '"' : "") +
                            "><strong>" +
                            escapeHtml(row.label) +
                            "</strong><span>" +
                            escapeHtml(row.hint || "") +
                            "</span></button>"
                          );
                        })
                        .join("")
                    : '<p class="preparaty__cart-modal-empty">Ничего не найдено в базе trades.</p>'
                  : "") +
                "</div>");
      } else {
        var name = modal.name || "";
        bodyHtml =
          '<p class="preparaty__cart-modal-lead">Услуга или произвольная позиция без проверки взаимодействий — в группу «Прочее».</p>' +
          '<input type="text" class="preparaty__cart-modal-input' +
          (modal.error ? " is-error" : "") +
          '" data-role="cart-modal-name" maxlength="160" placeholder="Введите название*" aria-label="Название услуги" value="' +
          escapeHtml(name) +
          '" />' +
          '<div class="preparaty__cart-modal-helper"><span class="' +
          (modal.error ? "is-error" : "") +
          '">' +
          (modal.error || "Обязательное поле") +
          "</span><span>" +
          name.length +
          "/160</span></div>";
      }

      layer.hidden = false;
      layer.innerHTML =
        '<div class="preparaty__cart-modal" role="dialog" aria-modal="true" aria-labelledby="preparaty-cart-modal-title">' +
        '<div class="preparaty__cart-modal-head">' +
        '<h3 id="preparaty-cart-modal-title">' +
        (isEdit
          ? isDrug
            ? "Редактировать медикамент"
            : "Редактировать услугу"
          : "Добавить услугу/медикамент") +
        "</h3>" +
        '<button type="button" class="preparaty__cart-modal-close" data-action="cart-modal-close" aria-label="Закрыть окно">×</button>' +
        "</div>" +
        (isEdit ? "" : typeSwitch) +
        bodyHtml +
        '<textarea class="preparaty__cart-modal-textarea" data-role="cart-modal-comment" maxlength="500" placeholder="Комментарий..." aria-label="Комментарий" rows="3">' +
        escapeHtml(comment) +
        "</textarea>" +
        '<div class="preparaty__cart-modal-helper"><span>Необязательное поле</span><span>' +
        comment.length +
        "/500</span></div>" +
        '<div class="preparaty__cart-modal-actions">' +
        '<button type="button" class="preparaty__cart-modal-btn preparaty__cart-modal-btn--secondary" data-action="cart-modal-close">Отмена</button>' +
        '<button type="button" class="preparaty__cart-modal-btn preparaty__cart-modal-btn--primary" data-action="cart-modal-save"' +
        (canSave ? "" : " disabled") +
        ">" +
        (isEdit ? "Сохранить" : "Добавить") +
        "</button></div></div>";

      var focusRole =
        activeField ||
        (isDrug && modal.stage === "search" ? "cart-modal-search" : isDrug ? "" : "cart-modal-name");
      if (focusRole) {
        var focusEl = layer.querySelector('[data-role="' + focusRole + '"]');
        if (focusEl) {
          focusEl.focus();
          if (selectionStart != null && typeof focusEl.setSelectionRange === "function") {
            try {
              focusEl.setSelectionRange(selectionStart, selectionStart);
            } catch (error) {
              /* ignore */
            }
          }
        }
      }
    }

    function itemInn(item) {
      return (item.selectedInn || item.inn || "").toUpperCase();
    }

    function namesMatch(target, inn) {
      if (!target || !inn) return false;
      var t = target.toUpperCase();
      var n = inn.toUpperCase();
      if (t === n || t.indexOf(n) !== -1 || n.indexOf(t) !== -1) return true;
      if (t.indexOf("ТЕТРАЦИКЛИН") !== -1 && n.indexOf("ТЕТРАЦИКЛИН") !== -1) return true;
      if (t.indexOf("АМОКСИЦИЛЛИН") !== -1 && n.indexOf("АМОКСИЦИЛЛИН") !== -1) return true;
      if ((t.indexOf("ПРОТОНН") !== -1 || t.indexOf("ИПП") !== -1) &&
          /ОМЕПРАЗОЛ|ЭЗОМЕПРАЗОЛ|ПАНТОПРАЗОЛ|ЛАНСОПРАЗОЛ|РАБЕПРАЗОЛ/.test(n)) return true;
      return false;
    }

    function severityOf(row) {
      var comment = String(row.comment || "").toLowerCase();
      var level = Number(row.level || 3);
      if (
        level <= 1 ||
        /нельзя|противопоказ|избегать|не принимайте|не рекомендуется|антагонизм|снижает.*всасыван/.test(comment)
      ) {
        return "block";
      }
      if (/осторожн|ограничен|монитор|внимани/.test(comment) || level === 2 || level === 3) {
        return "warn";
      }
      return "warn";
    }

    function analyzeInteractions() {
      var selected = selectedDrugItems();
      var statusById = {};
      var pairs = [];
      var seen = {};
      var i;
      var j;
      var k;

      selected.forEach(function (item) {
        statusById[item.id] = "ok";
      });

      for (i = 0; i < selected.length; i += 1) {
        var left = selected[i];
        var leftInn = itemInn(left);
        if (!leftInn) continue;
        var list = state.interactions[leftInn] || [];
        for (j = 0; j < list.length; j += 1) {
          var row = list[j];
          for (k = 0; k < selected.length; k += 1) {
            if (k === i) continue;
            var right = selected[k];
            var rightInn = itemInn(right);
            if (!rightInn || !namesMatch(row.target, rightInn)) continue;
            var key = [leftInn, rightInn].sort().join("|") + "|" + (row.target || "");
            if (seen[key]) continue;
            seen[key] = true;
            var severity = severityOf(row);
            var pair = {
              leftId: left.id,
              rightId: right.id,
              leftName: displayName(left),
              rightName: displayName(right),
              leftInn: leftInn,
              rightInn: rightInn,
              target: row.target,
              comment: row.comment || "Есть сведения о взаимодействии.",
              severity: severity,
              alternative: row.alternative || null
            };
            pairs.push(pair);
            if (severity === "block") {
              statusById[left.id] = "block";
              statusById[right.id] = "block";
            } else {
              if (statusById[left.id] !== "block") statusById[left.id] = "warn";
              if (statusById[right.id] !== "block") statusById[right.id] = "warn";
            }
          }
        }
      }

      pairs.sort(function (a, b) {
        var rank = { block: 0, warn: 1 };
        return (rank[a.severity] || 9) - (rank[b.severity] || 9);
      });

      return { pairs: pairs, statusById: statusById, selectedCount: selected.length };
    }

    function renderInteractions() {
      var box = root.querySelector("[data-role='interactions']");
      if (!box) return;
      var analysis = analyzeInteractions();
      var pairs = analysis.pairs;
      var selectedCount = analysis.selectedCount;

      if (!selectedCount) {
        box.hidden = true;
        box.innerHTML = "";
        state.ixForceOpen = false;
        return;
      }

      if (!pairs.length) {
        box.hidden = false;
        box.className = "preparaty__ix preparaty__ix--ok preparaty__ix--single";
        box.innerHTML =
          '<div class="preparaty__ix-main">' +
          '<span class="preparaty__ix-icon">✓</span>' +
          "<div>" +
          '<p class="preparaty__ix-title">Межлекарственных взаимодействий не найдено (0)</p>' +
          '<p class="preparaty__ix-text">Среди выбранных препаратов в текущей выборке нет пар с предупреждением.</p>' +
          "</div></div>" +
          '<div class="preparaty__ix-foot"><span>i</span><div>Источник: ГРЛС / база взаимодействий. Результат справочный.</div></div>';
        return;
      }

      if (state.ixIndex >= pairs.length) state.ixIndex = 0;
      if (state.ixIndex < 0) state.ixIndex = pairs.length - 1;
      var pair = pairs[state.ixIndex];
      var isBlock = pair.severity === "block";
      var warnCount = 0;
      var blockCount = 0;
      pairs.forEach(function (row) {
        if (row.severity === "block") blockCount += 1;
        else warnCount += 1;
      });
      var summaryBits = [];
      if (blockCount) summaryBits.push(blockCount + " нельзя");
      if (warnCount) summaryBits.push(warnCount + " осторожно");
      var hasAlt = !!pair.alternative;
      box.hidden = false;
      box.className =
        "preparaty__ix" +
        (isBlock ? " preparaty__ix--block" : " preparaty__ix--warn") +
        (hasAlt ? "" : " preparaty__ix--single");
      var badge = isBlock ? "Нельзя" : "С осторожностью";
      var badgeClass = isBlock ? "block" : "warn";
      var navHtml =
        pairs.length > 1
          ? '<div class="preparaty__ix-nav" aria-label="Листание взаимодействий">' +
            '<button type="button" class="preparaty__ix-nav-btn" data-action="ix-prev" aria-label="Предыдущее">‹</button>' +
            '<span class="preparaty__ix-nav-count">' +
            (state.ixIndex + 1) +
            " из " +
            pairs.length +
            "</span>" +
            '<button type="button" class="preparaty__ix-nav-btn" data-action="ix-next" aria-label="Следующее">›</button>' +
            "</div>"
          : "";
      var altHtml = hasAlt
        ? '<div class="preparaty__ix-alt"><h3>Замена</h3>' +
          '<p class="preparaty__ix-alt-name">' +
          escapeHtml(pair.alternative.name) +
          (pair.alternative.badge
            ? ' <span class="preparaty__ix-badge preparaty__ix-badge--ok">' +
              escapeHtml(pair.alternative.badge) +
              "</span>"
            : "") +
          "</p>" +
          (pair.alternative.text
            ? '<p class="preparaty__ix-text">' + escapeHtml(pair.alternative.text) + "</p>"
            : "") +
          '<div class="preparaty__ix-alt-actions">' +
          '<button type="button" data-action="replace-alternative" data-item-id="' +
          escapeHtml(
            pair.leftInn.indexOf("ТЕТРАЦИКЛИН") !== -1 ? pair.leftId : pair.rightId
          ) +
          '" data-alt-name="' +
          escapeHtml(pair.alternative.name) +
          '">Заменить в списке</button>' +
          "</div></div>"
        : "";

      box.innerHTML =
        '<div class="preparaty__ix-main">' +
        '<span class="preparaty__ix-icon">!</span>' +
        "<div>" +
        '<div class="preparaty__ix-head">' +
        '<p class="preparaty__ix-title">Выявлено межлекарственное взаимодействие (' +
        pairs.length +
        ")</p>" +
        navHtml +
        "</div>" +
        (summaryBits.length
          ? '<p class="preparaty__ix-summary">' + escapeHtml(summaryBits.join(" · ")) + "</p>"
          : "") +
        '<p class="preparaty__ix-pair">' +
        '<button type="button" class="preparaty__ix-drug" data-action="ix-focus" data-item-id="' +
        escapeHtml(pair.leftId) +
        '">' +
        escapeHtml(pair.leftName) +
        "</button>" +
        "<span>+</span>" +
        '<button type="button" class="preparaty__ix-drug" data-action="ix-focus" data-item-id="' +
        escapeHtml(pair.rightId) +
        '">' +
        escapeHtml(pair.rightName) +
        "</button>" +
        ' <span class="preparaty__ix-badge preparaty__ix-badge--' +
        badgeClass +
        '">' +
        badge +
        "</span></p>" +
        '<p class="preparaty__ix-text">' +
        escapeHtml(pair.comment) +
        "</p>" +
        '<div class="preparaty__ix-actions">' +
        '<button type="button" data-action="ix-focus-both" data-left-id="' +
        escapeHtml(pair.leftId) +
        '" data-right-id="' +
        escapeHtml(pair.rightId) +
        '">К строкам препаратов</button>' +
        "</div></div></div>" +
        altHtml +
        '<div class="preparaty__ix-foot"><span>i</span><div>Источник: ГРЛС / база взаимодействий. Результат справочный, решение принимает врач.</div></div>';
    }

    function openPopover(type, itemId, extra) {
      if (state.popover && state.popover.type === type && state.popover.itemId === itemId && !extra) {
        state.popover = null;
        state.wizard = null;
        render();
        return;
      }
      state.popover = { type: type, itemId: itemId };
      if (extra) {
        var key;
        for (key in extra) {
          if (Object.prototype.hasOwnProperty.call(extra, key)) state.popover[key] = extra[key];
        }
      }
      render();
    }

    function placePopover() {
      var pop = root.querySelector("[data-role='popover']");
      var current = state.popover;
      if (!current || pop.hidden) return;
      var app = root.querySelector(".preparaty__app");
      var anchor = root.querySelector(
        '[data-popover-anchor="' + current.type + ":" + current.itemId + '"]'
      );
      if (!app || !anchor) return;
      var appBox = app.getBoundingClientRect();
      var anchorBox = anchor.getBoundingClientRect();
      var top = anchorBox.bottom - appBox.top + 4;
      var left = anchorBox.left - appBox.left;
      pop.style.top = top + "px";
      pop.style.left = "0px";
      var maxLeft = app.clientWidth - pop.offsetWidth - 12;
      if (left > maxLeft) left = Math.max(8, maxLeft);
      if (left < 8) left = 8;
      pop.style.left = left + "px";
    }

    function renderTradeOptions(inn, itemId, currentTrade) {
      var book = tradeBook(inn);
      if (!book || !book.trades || !book.trades.length) {
        return '<div class="preparaty__popover-body"><p>В выборке нет торговых наименований для ' + escapeHtml(titleCaseInn(inn)) + ".</p></div>";
      }
      var head = book.popular && book.popular.length
        ? "Популярные торговые наименования: " + book.popular.join(", ")
        : "Торговые наименования";
      return (
        '<div class="preparaty__popover-head">' +
        escapeHtml(head) +
        '</div><div role="listbox" aria-label="Торговые наименования">' +
        book.trades
          .map(function (entry) {
            var first = entry.variants && entry.variants[0];
            var meta = first
              ? [first.dose, (first.form || "").toLowerCase()].filter(Boolean).join(" · ")
              : "";
            return (
              '<button type="button" class="preparaty__option' +
              (entry.trade === currentTrade ? " is-current" : "") +
              '" data-action="pick-trade" data-item-id="' +
              escapeHtml(itemId) +
              '" data-inn="' +
              escapeHtml(inn) +
              '" data-trade="' +
              escapeHtml(entry.trade) +
              '">' +
              escapeHtml(entry.trade) +
              (meta ? "<small>" + escapeHtml(meta) + "</small>" : "") +
              "</button>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function renderNameMenu(item) {
      if (item.kind === "trade" || item.kind === "extra-drug") {
        return renderTradeOptions(
          item.selectedInn || item.inn,
          item.id,
          item.selectedTrade
        );
      }

      if (item.kind === "alternatives" || item.kind === "combo") {
        if (state.popover.stage === "trades" && state.popover.inn) {
          return (
            '<div class="preparaty__popover-step">' +
            (item.kind === "combo" ? "Набор" : "МНН") +
            ": " +
            escapeHtml(titleCaseInn(state.popover.inn)) +
            " · выберите торговое</div>" +
            renderTradeOptions(state.popover.inn, item.id, item.selectedTrade) +
            '<div class="preparaty__popover-actions"><button type="button" data-action="back-alternatives" data-item-id="' +
            escapeHtml(item.id) +
            '">← Назад</button></div>'
          );
        }
        return (
          '<div class="preparaty__popover-head">' +
          (item.kind === "combo"
            ? "Комбинации · несколько действующих веществ в одном наборе"
            : "Альтернативы · затем торговое наименование") +
          '</div><div role="listbox">' +
          item.alternatives
            .map(function (alt) {
              var book = tradeBook(alt.inn);
              var altComposition =
                (alt.composition && alt.composition.length
                  ? alt.composition
                  : book && book.composition) || [];
              var detail =
                item.kind === "combo"
                  ? altComposition.length
                    ? altComposition.join(" + ")
                    : "комбинация"
                  : book
                    ? "есть торговые имена"
                    : "нет в выборке";
              return (
                '<button type="button" class="preparaty__option' +
                (alt.inn === item.selectedInn ? " is-current" : "") +
                '" data-action="pick-alternative" data-item-id="' +
                escapeHtml(item.id) +
                '" data-inn="' +
                escapeHtml(alt.inn) +
                '">' +
                escapeHtml(alt.label) +
                "<small>" +
                escapeHtml(detail) +
                "</small></button>"
              );
            })
            .join("") +
          "</div>"
        );
      }

      return '<div class="preparaty__popover-body"><p>Для этой строки выбор торговых имён не подключён.</p></div>';
    }

    function schemeSlotDetail(pick) {
      if (!pick) return '<small>не выбрано</small>';
      if (pick.trade) {
        return (
          '<span class="preparaty__scheme-slot-trade">' +
          escapeHtml(pick.trade) +
          "</span>" +
          (pick.inn
            ? "<small>" + escapeHtml(titleCaseInn(pick.inn)) + "</small>"
            : "")
        );
      }
      return (
        "<span>" +
        escapeHtml(pick.label || titleCaseInn(pick.inn || "")) +
        "</span>"
      );
    }

    function renderSchemeWork(item, wizard) {
      if (wizard.stage === "review") {
        return (
          '<p class="preparaty__scheme-work-title">Проверьте три выбранных препарата</p>' +
          '<div class="preparaty__scheme-review">' +
          (item.components || [])
            .map(function (component, index) {
              var pick = item.componentPicks[component.id] || {};
              return (
                '<div class="preparaty__scheme-review-row">' +
                '<span class="preparaty__scheme-slot-num">' +
                (index + 1) +
                "</span><div><strong>" +
                escapeHtml(pick.trade || "—") +
                "</strong><small>" +
                escapeHtml(component.label) +
                (pick.inn ? " · " + titleCaseInn(pick.inn) : "") +
                "</small></div></div>"
              );
            })
            .join("") +
          "</div>"
        );
      }

      var component = item.components[wizard.step];
      if (!component) {
        return '<p class="preparaty__scheme-empty">Компоненты схемы не заданы.</p>';
      }

      if (component.kind === "alternatives" && (!wizard.inn || wizard.stage !== "trades")) {
        return (
          '<p class="preparaty__scheme-work-title">Компонент ' +
          (wizard.step + 1) +
          ": " +
          escapeHtml(component.label) +
          " · выберите действующее вещество (МНН)</p>" +
          '<div role="listbox">' +
          (component.alternatives || [])
            .map(function (alt) {
              return (
                '<button type="button" class="preparaty__option" data-action="wizard-alternative" data-item-id="' +
                escapeHtml(item.id) +
                '" data-inn="' +
                escapeHtml(alt.inn) +
                '">' +
                escapeHtml(alt.label) +
                "</button>"
              );
            })
            .join("") +
          "</div>"
        );
      }

      var inn = component.kind === "trade" ? component.inn : wizard.inn;
      var currentTrade = (item.componentPicks[component.id] || {}).trade || "";
      var book = tradeBook(inn);
      return (
        '<p class="preparaty__scheme-work-title">Компонент ' +
        (wizard.step + 1) +
        ": " +
        escapeHtml(component.label) +
        (inn ? " · " + escapeHtml(titleCaseInn(inn)) : "") +
        " · выберите торговое наименование</p>" +
        (book && book.trades && book.trades.length
          ? renderTradeOptions(inn, item.id, currentTrade)
          : '<p class="preparaty__scheme-empty">В текущей выборке нет торговых имён для этого МНН.</p>')
      );
    }

    function renderSchemeModal() {
      var layer = root.querySelector("[data-role='scheme-modal']");
      if (!layer) return;
      var current = state.popover;
      if (!current || current.type !== "scheme-wizard") {
        layer.hidden = true;
        layer.innerHTML = "";
        return;
      }
      var item = findItem(current.itemId);
      if (!item || item.kind !== "scheme") {
        layer.hidden = true;
        layer.innerHTML = "";
        return;
      }

      var components = item.components || [];
      var progress = schemeProgress(item);
      var wizard = state.wizard && state.wizard.itemId === item.id
        ? state.wizard
        : { itemId: item.id, step: 0 };
      state.wizard = wizard;
      if (wizard.stage !== "review") {
        wizard.step = Math.max(0, Math.min(wizard.step || 0, Math.max(0, components.length - 1)));
      }

      var isReview = wizard.stage === "review";
      var stepLabel = isReview
        ? "Итог · все компоненты выбраны"
        : "Шаг " + (wizard.step + 1) + " из " + components.length;
      var currentPick =
        !isReview && components[wizard.step]
          ? item.componentPicks[components[wizard.step].id]
          : null;
      var canNext = !isReview && !!currentPick && wizard.step < components.length - 1;
      var canDone = progress.ready >= progress.total && progress.total > 0;
      var canPrev =
        isReview ||
        wizard.step > 0 ||
        (wizard.stage === "trades" && components[wizard.step] && components[wizard.step].kind === "alternatives");

      var slotsHtml = components
        .map(function (component, index) {
          var pick = item.componentPicks[component.id];
          var isActive = !isReview && wizard.step === index;
          var isDone = !!pick;
          return (
            '<button type="button" class="preparaty__scheme-slot' +
            (isActive ? " is-active" : "") +
            (isDone ? " is-done" : "") +
            '" data-action="wizard-slot" data-item-id="' +
            escapeHtml(item.id) +
            '" data-step="' +
            index +
            '"><span class="preparaty__scheme-slot-num">' +
            (index + 1) +
            '</span><span class="preparaty__scheme-slot-body"><strong>' +
            escapeHtml(component.label) +
            "</strong>" +
            schemeSlotDetail(pick) +
            "</span></button>"
          );
        })
        .join("");

      layer.hidden = false;
      layer.innerHTML =
        '<div class="preparaty__scheme-backdrop" data-action="close-scheme" aria-hidden="true"></div>' +
        '<div class="preparaty__scheme-dialog" role="dialog" aria-modal="true" aria-label="Настройка схемы">' +
        '<div class="preparaty__scheme-head">' +
        "<div><h2>" +
        escapeHtml(item.name) +
        "</h2><p>Выберите 3 отдельных препарата: сначала действующее вещество, затем торговое наименование.</p>" +
        '<div class="preparaty__scheme-progress">' +
        escapeHtml(stepLabel) +
        " · выбрано " +
        progress.ready +
        " из " +
        progress.total +
        "</div></div>" +
        '<button type="button" class="preparaty__info-close" data-action="close-scheme" aria-label="Закрыть">×</button>' +
        "</div>" +
        '<div class="preparaty__scheme-slots">' +
        slotsHtml +
        "</div>" +
        '<div class="preparaty__scheme-work">' +
        renderSchemeWork(item, wizard) +
        "</div>" +
        '<div class="preparaty__scheme-foot">' +
        '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--ghost" data-action="close-scheme">Отмена</button>' +
        '<div class="preparaty__scheme-foot-actions">' +
        '<button type="button" class="preparaty__scheme-btn" data-action="wizard-prev" data-item-id="' +
        escapeHtml(item.id) +
        '"' +
        (canPrev ? "" : " disabled") +
        ">" +
        (isReview ? "К началу" : "Назад") +
        "</button>" +
        (isReview || canDone
          ? '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--primary" data-action="wizard-done" data-item-id="' +
            escapeHtml(item.id) +
            '"' +
            (canDone ? "" : " disabled") +
            ">Готово</button>"
          : '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--primary" data-action="wizard-next" data-item-id="' +
            escapeHtml(item.id) +
            '"' +
            (canNext ? "" : " disabled") +
            ">Далее</button>") +
        "</div></div></div>";
    }

    function comboActiveComposition(item) {
      var wizard = state.comboWizard;
      var inn =
        (wizard && wizard.itemId === item.id && wizard.inn) ||
        item.selectedInn ||
        "";
      if (inn) {
        var chosen = (item.alternatives || []).find(function (alt) {
          return alt.inn === inn;
        });
        var book = tradeBook(inn);
        var list =
          (chosen && chosen.composition) ||
          (book && book.composition) ||
          [];
        if (list.length) return list.slice();
      }
      return compositionList(item);
    }

    function comboKitLabel(item, inn) {
      var chosen = (item.alternatives || []).find(function (alt) {
        return alt.inn === inn;
      });
      return chosen ? chosen.label : titleCaseInn(inn || "");
    }

    function renderComboWork(item, wizard) {
      if (wizard.stage === "review") {
        var reviewComp = comboActiveComposition(item);
        return (
          '<p class="preparaty__scheme-work-title">Проверьте выбранный набор</p>' +
          '<div class="preparaty__scheme-review">' +
          '<div class="preparaty__scheme-review-row">' +
          '<span class="preparaty__scheme-slot-num">✓</span><div><strong>' +
          escapeHtml(item.selectedTrade || "—") +
          "</strong><small>" +
          escapeHtml(comboKitLabel(item, item.selectedInn || wizard.inn)) +
          (reviewComp.length ? " · " + reviewComp.join(" + ") : "") +
          "</small></div></div></div>"
        );
      }

      if (wizard.stage === "trades" && wizard.inn) {
        var book = tradeBook(wizard.inn);
        return (
          '<p class="preparaty__scheme-work-title">Шаг 2 · выберите торговое наименование набора «' +
          escapeHtml(comboKitLabel(item, wizard.inn)) +
          '»</p>' +
          (book && book.trades && book.trades.length
            ? renderTradeOptions(wizard.inn, item.id, item.selectedTrade)
            : '<p class="preparaty__scheme-empty">В текущей выборке нет торговых имён для этого набора.</p>')
        );
      }

      return (
        '<p class="preparaty__scheme-work-title">Шаг 1 · выберите комбинированный набор (3 действующих вещества в одной упаковке)</p>' +
        '<div role="listbox">' +
        (item.alternatives || [])
          .map(function (alt) {
            var bookAlt = tradeBook(alt.inn);
            var altComp =
              (alt.composition && alt.composition.length
                ? alt.composition
                : bookAlt && bookAlt.composition) || [];
            return (
              '<button type="button" class="preparaty__option' +
              (alt.inn === (wizard.inn || item.selectedInn) ? " is-current" : "") +
              '" data-action="combo-pick-kit" data-item-id="' +
              escapeHtml(item.id) +
              '" data-inn="' +
              escapeHtml(alt.inn) +
              '">' +
              escapeHtml(alt.label) +
              "<small>" +
              escapeHtml(altComp.length ? altComp.join(" + ") : "комбинация · 3 ДВ") +
              "</small></button>"
            );
          })
          .join("") +
        "</div>"
      );
    }

    function renderComboModal() {
      var layer = root.querySelector("[data-role='combo-modal']");
      if (!layer) return;
      var current = state.popover;
      if (!current || current.type !== "combo-wizard") {
        layer.hidden = true;
        layer.innerHTML = "";
        return;
      }
      var item = findItem(current.itemId);
      if (!item || item.kind !== "combo") {
        layer.hidden = true;
        layer.innerHTML = "";
        return;
      }

      var wizard =
        state.comboWizard && state.comboWizard.itemId === item.id
          ? state.comboWizard
          : { itemId: item.id, stage: "kits" };
      state.comboWizard = wizard;

      var composition = comboActiveComposition(item);
      while (composition.length < 3) composition.push("ДВ " + (composition.length + 1));
      composition = composition.slice(0, 3);

      var isReview = wizard.stage === "review";
      var kitReady = !!(wizard.inn || item.selectedInn);
      var tradeReady = !!item.selectedTrade;
      var stepLabel = isReview
        ? "Итог · набор выбран"
        : wizard.stage === "trades"
          ? "Шаг 2 из 2 · торговое наименование"
          : "Шаг 1 из 2 · набор";
      var canPrev = isReview || wizard.stage === "trades";
      var canNext =
        !isReview &&
        ((wizard.stage !== "trades" && kitReady) ||
          (wizard.stage === "trades" && tradeReady));
      var canDone = kitReady && tradeReady;

      var slotsHtml = composition
        .map(function (name, index) {
          var isActive = !isReview && wizard.stage === "kits" && !kitReady && index === 0;
          var isDone = kitReady;
          return (
            '<button type="button" class="preparaty__scheme-slot' +
            (isActive ? " is-active" : "") +
            (isDone ? " is-done" : "") +
            '" data-action="combo-slot" data-item-id="' +
            escapeHtml(item.id) +
            '"><span class="preparaty__scheme-slot-num">' +
            (index + 1) +
            '</span><span class="preparaty__scheme-slot-body"><strong>' +
            escapeHtml(name) +
            "</strong>" +
            (kitReady
              ? '<span class="preparaty__scheme-slot-trade">в одном наборе</span>'
              : "<small>выберите набор</small>") +
            "</span></button>"
          );
        })
        .join("");

      layer.hidden = false;
      layer.innerHTML =
        '<div class="preparaty__scheme-backdrop" data-action="close-combo" aria-hidden="true"></div>' +
        '<div class="preparaty__scheme-dialog" role="dialog" aria-modal="true" aria-label="Настройка комбинации">' +
        '<div class="preparaty__scheme-head">' +
        "<div><h2>" +
        escapeHtml(item.name) +
        "</h2><p>Это один комбинированный набор: 3 действующих вещества в одной упаковке, а не три отдельных препарата.</p>" +
        '<div class="preparaty__scheme-progress">' +
        escapeHtml(stepLabel) +
        "</div></div>" +
        '<button type="button" class="preparaty__info-close" data-action="close-combo" aria-label="Закрыть">×</button>' +
        "</div>" +
        '<div class="preparaty__scheme-slots">' +
        slotsHtml +
        "</div>" +
        '<div class="preparaty__scheme-work">' +
        renderComboWork(item, wizard) +
        "</div>" +
        '<div class="preparaty__scheme-foot">' +
        '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--ghost" data-action="close-combo">Отмена</button>' +
        '<div class="preparaty__scheme-foot-actions">' +
        '<button type="button" class="preparaty__scheme-btn" data-action="combo-prev" data-item-id="' +
        escapeHtml(item.id) +
        '"' +
        (canPrev ? "" : " disabled") +
        ">" +
        (isReview ? "К началу" : "Назад") +
        "</button>" +
        (isReview || canDone
          ? '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--primary" data-action="combo-done" data-item-id="' +
            escapeHtml(item.id) +
            '"' +
            (canDone ? "" : " disabled") +
            ">Готово</button>"
          : '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--primary" data-action="combo-next" data-item-id="' +
            escapeHtml(item.id) +
            '"' +
            (canNext ? "" : " disabled") +
            ">Далее</button>") +
        "</div></div></div>";
    }

    function openComboWizard(item) {
      if (
        state.popover &&
        state.popover.type === "combo-wizard" &&
        state.popover.itemId === item.id
      ) {
        state.popover = null;
        state.comboWizard = null;
        render();
        return;
      }
      if (item.selectedTrade && item.selectedInn) {
        state.comboWizard = {
          itemId: item.id,
          stage: "review",
          inn: item.selectedInn
        };
      } else if (item.selectedInn) {
        state.comboWizard = {
          itemId: item.id,
          stage: "trades",
          inn: item.selectedInn
        };
      } else {
        state.comboWizard = { itemId: item.id, stage: "kits" };
      }
      state.popover = { type: "combo-wizard", itemId: item.id };
      emit("open-combo-wizard", { itemId: item.id, name: item.name });
      render();
    }

    function completeCombo(item) {
      if (!item.selectedInn || !item.selectedTrade) return false;
      item.selected = true;
      state.comboWizard = null;
      state.popover = null;
      state.ixForceOpen = true;
      state.ixIndex = 0;
      emit("combo-complete", {
        itemId: item.id,
        inn: item.selectedInn,
        trade: item.selectedTrade,
        composition: item.composition || []
      });
      return true;
    }

    function drugInfoFacts(item) {
      var inn = item.selectedInn || item.inn || "";
      var book = tradeBook(inn);
      var trades = [];
      var forms = {};
      var atc = "";
      if (book && book.trades) {
        book.trades.forEach(function (entry) {
          if (entry.trade) trades.push(entry.trade);
          (entry.variants || []).forEach(function (variant) {
            if (variant.form) forms[prettyForm(variant.form)] = true;
            if (!atc && variant.atc) atc = variant.atc;
          });
        });
      }
      if (item.kind === "alternatives" || item.kind === "combo") {
        (item.alternatives || []).forEach(function (alt) {
          if (alt.label) trades.push(alt.label);
        });
      }
      if (item.selectedTrade && trades.indexOf(item.selectedTrade) === -1) {
        trades.unshift(item.selectedTrade);
      }
      var uniqueTrades = [];
      var seen = {};
      trades.forEach(function (name) {
        if (!name || seen[name]) return;
        seen[name] = true;
        uniqueTrades.push(name);
      });
      var group =
        item.kind === "scheme"
          ? "Схема лечения"
          : item.kind === "combo"
            ? "Комбинированный набор"
            : item.kind === "alternatives"
              ? "Группа препаратов"
              : "Лекарственный препарат";
      return {
        title: (item.selectedTrade || item.name || "Препарат").toUpperCase(),
        subtitle: inn ? titleCaseInn(inn.split("+")[0].replace(/\s*\[НАБОР\]\s*/i, "").trim()) : item.name,
        groupLabel: group,
        inn: inn ? titleCaseInn(inn.replace(/\s*\[НАБОР\]\s*/gi, " ").replace(/\s+/g, " ").trim()) : "—",
        trades: uniqueTrades.length ? uniqueTrades.slice(0, 8).join(", ") + (uniqueTrades.length > 8 ? " и др." : "") : "—",
        pharma: group,
        atc: atc || "—",
        forms: Object.keys(forms).length ? Object.keys(forms).join(", ") : item.selectedForm ? prettyForm(item.selectedForm) : "—",
        description:
          item.hint ||
          item.scheme ||
          "Справочная карточка препарата. Полные сведения — в официальной инструкции и клинических рекомендациях.",
        interactions: state.interactions[inn] || []
      };
    }

    function renderInfoModal() {
      var layer = root.querySelector("[data-role='info-modal']");
      if (!layer) return;
      var current = state.popover;
      if (!current || current.type !== "info") {
        layer.hidden = true;
        layer.innerHTML = "";
        return;
      }
      var item = findItem(current.itemId);
      if (!item) {
        layer.hidden = true;
        layer.innerHTML = "";
        return;
      }
      if (!item.intake) {
        item.intake = { morning: false, day: false, evening: false, night: false };
      }
      var facts = drugInfoFacts(item);
      var analysis = analyzeInteractions();
      var ixStatus = item.selected ? analysis.statusById[item.id] || "ok" : "";
      var cartIx = cartInteractionsFor(item);
      var doses = doseOptions(item);
      var forms = formOptions(item);
      var preview = assignmentPreview(item);
      var focus = state.infoFocus || "";
      var isScheme = item.kind === "scheme";
      var isCombo = item.kind === "combo";
      var slotsHtml = "";
      if (isScheme && item.components) {
        slotsHtml =
          '<div class="preparaty__card-slots">' +
          item.components
            .map(function (component, index) {
              var pick = item.componentPicks[component.id];
              return (
                '<div class="preparaty__card-slot' +
                (pick ? " is-done" : "") +
                '"><span>' +
                (index + 1) +
                "</span><div><strong>" +
                escapeHtml(component.label) +
                "</strong><small>" +
                escapeHtml(pick ? pick.trade || pick.label || "выбрано" : "не выбрано") +
                "</small></div></div>"
              );
            })
            .join("") +
          "</div>";
      } else if (isCombo) {
        var comp = compositionList(item);
        slotsHtml =
          '<div class="preparaty__card-slots">' +
          comp
            .slice(0, 3)
            .map(function (name, index) {
              return (
                '<div class="preparaty__card-slot' +
                (item.selectedTrade ? " is-done" : "") +
                '"><span>' +
                (index + 1) +
                "</span><div><strong>" +
                escapeHtml(name) +
                "</strong><small>" +
                (item.selectedTrade ? "в одном наборе" : "выберите набор") +
                "</small></div></div>"
              );
            })
            .join("") +
          "</div>";
      }

      var intakeKeys = [
        { id: "morning", label: "Утро" },
        { id: "day", label: "День" },
        { id: "evening", label: "Вечер" },
        { id: "night", label: "Ночь" }
      ];
      var relationKeys = [
        { id: "", label: "Не важно" },
        { id: "before", label: "До еды" },
        { id: "with", label: "Во время еды" },
        { id: "after", label: "После еды" }
      ];
      var coursePresets = ["7 дней", "10 дней", "14 дней"];

      var refHtml =
        '<section class="preparaty__card-ref">' +
        '<h3 class="preparaty__card-col-title">Справка</h3>' +
        '<div class="preparaty__card-block"><h4>Суть</h4><p>' +
        escapeHtml(facts.description) +
        "</p>" +
        '<dl class="preparaty__card-dl">' +
        "<div><dt>МНН</dt><dd>" +
        escapeHtml(facts.inn) +
        "</dd></div>" +
        "<div><dt>АТХ</dt><dd>" +
        escapeHtml(facts.atc) +
        "</dd></div>" +
        "<div><dt>Формы</dt><dd>" +
        escapeHtml(facts.forms) +
        "</dd></div></dl></div>" +
        '<div class="preparaty__card-block"><h4>Как обычно дают</h4><p>' +
        escapeHtml(item.scheme || item.schemeShort || "Схема в рекомендации не заполнена.") +
        "</p><p class=\"preparaty__info-muted\">Курс: " +
        escapeHtml(item.course || item.courseShort || "—") +
        '</p><button type="button" class="preparaty__scheme-btn" data-action="info-recommend" data-item-id="' +
        escapeHtml(item.id) +
        '">Подставить в назначение</button></div>' +
        '<div class="preparaty__card-block' +
        (cartIx.length ? " is-warn" : "") +
        '"><h4>Осторожно</h4>' +
        (cartIx.length
          ? "<ul class=\"preparaty__info-list\">" +
            cartIx
              .slice(0, 5)
              .map(function (pair) {
                var other = pair.leftId === item.id ? pair.rightName : pair.leftName;
                return (
                  "<li><strong>" +
                  escapeHtml(other) +
                  "</strong> — " +
                  escapeHtml(pair.comment) +
                  "</li>"
                );
              })
              .join("") +
            '</ul><button type="button" class="preparaty__scheme-btn" data-action="check-interactions">К проверке взаимодействий</button>'
          : item.selected
            ? "<p>С выбранными сейчас препаратами конфликтов в выборке нет.</p>"
            : "<p>Отметьте препарат в корзине, чтобы увидеть конфликты с другими назначениями.</p>") +
        "</div>" +
        '<p class="preparaty__card-foot-note">Полная инструкция подключается в основном проекте EasyMed.</p>' +
        "</section>";

      var assignHtml =
        '<section class="preparaty__card-assign">' +
        '<h3 class="preparaty__card-col-title">Назначение</h3>' +
        (isScheme || isCombo
          ? '<div class="preparaty__card-block"><h4>' +
            (isScheme ? "Состав схемы" : "Состав набора") +
            "</h4>" +
            slotsHtml +
            '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--primary" data-action="' +
            (isScheme ? "info-open-scheme" : "info-open-combo") +
            '" data-item-id="' +
            escapeHtml(item.id) +
            '">' +
            (isScheme ? "Открыть мастер схемы" : "Открыть мастер комбинации") +
            "</button></div>"
          : "") +
        '<div class="preparaty__card-fields">' +
        cardComboFieldHtml(item, "dose", doses, item.selectedDose || "", "Доза") +
        cardComboFieldHtml(
          item,
          "form",
          forms,
          item.selectedForm ? prettyForm(item.selectedForm) : "",
          "Форма"
        ) +
        '<div class="preparaty__card-field preparaty__card-field--wide"><span>Приём</span>' +
        '<div class="preparaty__card-checks">' +
        intakeKeys
          .map(function (row) {
            return (
              '<label class="preparaty__card-check" data-action="info-intake" data-item-id="' +
              escapeHtml(item.id) +
              '" data-intake="' +
              row.id +
              '"><input type="checkbox"' +
              (item.intake[row.id] ? " checked" : "") +
              " /><span>" +
              row.label +
              "</span></label>"
            );
          })
          .join("") +
        "</div>" +
        '<div class="preparaty__card-rels">' +
        relationKeys
          .map(function (row) {
            return (
              '<button type="button" class="preparaty__card-rel' +
              ((item.intakeRelation || "") === row.id ? " is-active" : "") +
              '" data-action="info-relation" data-item-id="' +
              escapeHtml(item.id) +
              '" data-relation="' +
              escapeHtml(row.id) +
              '">' +
              escapeHtml(row.label) +
              "</button>"
            );
          })
          .join("") +
        "</div></div>" +
        '<label class="preparaty__card-field preparaty__card-field--wide' +
        (focus === "scheme" ? " is-focus" : "") +
        '"><span>Схема</span><input type="text" data-info-field="scheme" data-item-id="' +
        escapeHtml(item.id) +
        '" value="' +
        escapeHtml(item.schemeShort || "") +
        '" placeholder="Например: 20 мг утром и вечером" /></label>' +
        '<div class="preparaty__card-field"><span>Курс</span>' +
        '<div class="preparaty__card-rels">' +
        coursePresets
          .map(function (preset) {
            return (
              '<button type="button" class="preparaty__card-rel' +
              (item.courseShort === preset ? " is-active" : "") +
              '" data-action="info-course-preset" data-item-id="' +
              escapeHtml(item.id) +
              '" data-value="' +
              escapeHtml(preset) +
              '">' +
              escapeHtml(preset) +
              "</button>"
            );
          })
          .join("") +
        '</div><input type="text" data-info-field="course" data-item-id="' +
        escapeHtml(item.id) +
        '" value="' +
        escapeHtml(item.courseShort || "") +
        '" placeholder="Свой курс" /></div>' +
        '<label class="preparaty__card-field preparaty__card-field--wide' +
        (focus === "comment" ? " is-focus" : "") +
        '"><span>Комментарий</span><textarea data-info-field="comment" data-item-id="' +
        escapeHtml(item.id) +
        '" rows="3" placeholder="Комментарий к назначению...">' +
        escapeHtml(itemComment(item)) +
        "</textarea></label>" +
        "</div>" +
        '<div class="preparaty__card-preview"><span>Для пациента / корзины</span><strong>' +
        escapeHtml(preview || "Заполните назначение") +
        "</strong></div>" +
        '<div class="preparaty__card-assign-actions">' +
        '<button type="button" class="preparaty__scheme-btn" data-action="info-reset" data-item-id="' +
        escapeHtml(item.id) +
        '">Сбросить</button>' +
        '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--primary" data-action="close-info">Готово</button>' +
        "</div></section>";

      layer.hidden = false;
      layer.innerHTML =
        '<div class="preparaty__info-backdrop" data-action="close-info" aria-hidden="true"></div>' +
        '<div class="preparaty__info-dialog preparaty__info-dialog--card" role="dialog" aria-modal="true" aria-label="Карточка назначения">' +
        '<div class="preparaty__card-head">' +
        '<div class="preparaty__card-head-main">' +
        "<div><h2>" +
        escapeHtml(item.selectedTrade || item.name || "Препарат") +
        "</h2><p>" +
        escapeHtml(facts.inn !== "—" ? facts.inn : facts.subtitle) +
        '</p></div>' +
        '<div class="preparaty__card-badges">' +
        (item.qc ? '<span class="preparaty__card-badge">' + escapeHtml(item.qc) + "</span>" : "") +
        (item.level ? '<span class="preparaty__card-badge">' + escapeHtml(item.level) + "</span>" : "") +
        '<span class="preparaty__card-badge">' +
        escapeHtml(itemTypeLabel(item)) +
        "</span>" +
        (ixStatus
          ? '<span class="preparaty__card-badge preparaty__card-badge--' +
            ixStatus +
            '">' +
            (ixStatus === "block" ? "Нельзя" : ixStatus === "warn" ? "Внимание" : "Совместимо") +
            "</span>"
          : "") +
        "</div>" +
        '<p class="preparaty__card-status">' +
        escapeHtml(preview || "Назначение ещё не настроено") +
        "</p></div>" +
        '<div class="preparaty__card-head-actions">' +
        '<button type="button" class="preparaty__card-cart' +
        (item.selected ? " is-on" : "") +
        '" data-action="info-toggle" data-item-id="' +
        escapeHtml(item.id) +
        '" aria-pressed="' +
        (item.selected ? "true" : "false") +
        '"><span class="preparaty__card-cart-box" aria-hidden="true">' +
        (item.selected ? "✓" : "") +
        "</span><span>В корзину</span></button>" +
        '<button type="button" class="preparaty__info-close" data-action="close-info" aria-label="Закрыть">×</button>' +
        "</div></div>" +
        '<div class="preparaty__card-layout">' +
        assignHtml +
        refHtml +
        "</div></div>";

      if (focus) {
        var focusEl = layer.querySelector('[data-info-field="' + focus + '"]');
        if (focusEl) {
          setTimeout(function () {
            focusEl.focus();
          }, 0);
        }
        state.infoFocus = "";
      }
    }

    function renderPopover() {
      var pop = root.querySelector("[data-role='popover']");
      var current = state.popover;
      if (
        !current ||
        current.type === "info" ||
        current.type === "scheme-wizard" ||
        current.type === "combo-wizard" ||
        current.type === "note-edit"
      ) {
        pop.hidden = true;
        pop.innerHTML = "";
        return;
      }
      var item = findItem(current.itemId);
      if (!item) {
        pop.hidden = true;
        pop.innerHTML = "";
        return;
      }
      var html = "";
      if (current.type === "name") {
        html = renderNameMenu(item);
      } else if (current.type === "hint") {
        var inn = item.selectedInn || item.inn || "";
        var inter = (state.interactions[inn] || []).slice(0, 3);
        html =
          '<div class="preparaty__popover-body"><p class="preparaty__popover-kicker">Подсказка' +
          (item.qc || item.level ? " · " + escapeHtml([item.qc, item.level].filter(Boolean).join(" ")) : "") +
          "</p><p>" +
          escapeHtml(item.hint || "Подсказка не заполнена.") +
          "</p>" +
          (inter.length
            ? "<p style=\"margin-top:10px\"><strong>Из базы взаимодействий:</strong><br>" +
              inter
                .map(function (row) {
                  return escapeHtml(row.target) + (row.comment ? " — " + escapeHtml(row.comment) : "");
                })
                .join("<br>") +
              "</p>"
            : "") +
          "</div>";
      } else if (current.type === "scheme" || current.type === "course") {
        var isScheme = current.type === "scheme";
        html =
          '<div class="preparaty__popover-body"><p class="preparaty__popover-kicker">Комментарий · ' +
          (isScheme ? "схема" : "курс") +
          "</p><p>" +
          escapeHtml((isScheme ? item.scheme : item.course) || "Комментарий не заполнен.") +
          "</p></div>";
      } else if (current.type === "comment") {
        html =
          '<div class="preparaty__popover-body"><p class="preparaty__popover-kicker">Комментарий</p><p>' +
          escapeHtml(item.commentText || item.hint || "Комментарий не заполнен.") +
          "</p></div>";
      } else if (current.type === "dose") {
        var doses = doseOptions(item);
        html =
          '<div class="preparaty__popover-head">Доза · выберите из базы или впишите свою в поле</div>' +
          (doses.length
            ? '<div role="listbox">' +
              doses
                .map(function (dose) {
                  return (
                    '<button type="button" class="preparaty__option' +
                    (dose === item.selectedDose ? " is-current" : "") +
                    '" data-action="pick-dose" data-item-id="' +
                    escapeHtml(item.id) +
                    '" data-value="' +
                    escapeHtml(dose) +
                    '">' +
                    escapeHtml(dose) +
                    "</button>"
                  );
                })
                .join("") +
              "</div>"
            : '<div class="preparaty__popover-body"><p>В базе нет вариантов дозы — впишите значение в поле.</p></div>');
      } else if (current.type === "form") {
        state.popover = null;
        html = "";
      }
      pop.innerHTML = html;
      pop.hidden = !html;
      if (html) placePopover();
    }

    function render() {
      root.querySelector("[data-role='diagnosis']").textContent = state.diagnosis;
      renderTabs();
      renderList();
      renderCart();
      renderInteractions();
      renderPopover();
      renderInfoModal();
      renderSchemeModal();
      renderComboModal();
      renderNoteModal();
      renderCartModal();
    }

    function openNoteEditor(item, sourceField) {
      state.popover = {
        type: "note-edit",
        itemId: item.id,
        sourceField: sourceField || "comment"
      };
      emit("open-note", {
        itemId: item.id,
        field: sourceField || "comment",
        name: item.name || displayName(item)
      });
      render();
    }

    function renderNoteModal() {
      var layer = root.querySelector("[data-role='note-modal']");
      if (!layer) return;
      var current = state.popover;
      if (!current || current.type !== "note-edit") {
        layer.hidden = true;
        layer.innerHTML = "";
        return;
      }
      var item = findItem(current.itemId);
      if (!item) {
        layer.hidden = true;
        layer.innerHTML = "";
        return;
      }
      var source = current.sourceField || "comment";
      var title =
        source === "comment"
          ? "Комментарий"
          : "Комментарий · " + noteFieldLabel(source);
      layer.hidden = false;
      layer.innerHTML =
        '<div class="preparaty__note-backdrop" data-action="close-note" aria-hidden="true"></div>' +
        '<div class="preparaty__note-dialog" role="dialog" aria-modal="true" aria-label="Комментарий">' +
        '<div class="preparaty__note-head">' +
        "<div><h2>" +
        escapeHtml(title) +
        "</h2><p>" +
        escapeHtml(displayName(item)) +
        "</p></div>" +
        '<button type="button" class="preparaty__info-close" data-action="close-note" aria-label="Закрыть">×</button>' +
        "</div>" +
        '<div class="preparaty__note-body">' +
        '<label class="preparaty__note-label" for="preparaty-note-text">Текст комментария</label>' +
        '<textarea id="preparaty-note-text" class="preparaty__note-text" data-role="note-text" rows="6" placeholder="Напишите комментарий к назначению...">' +
        escapeHtml(itemComment(item)) +
        "</textarea></div>" +
        '<div class="preparaty__note-foot">' +
        '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--ghost" data-action="close-note">Отмена</button>' +
        '<button type="button" class="preparaty__scheme-btn preparaty__scheme-btn--primary" data-action="save-note" data-item-id="' +
        escapeHtml(item.id) +
        '">Сохранить</button>' +
        "</div></div>";
      var area = layer.querySelector("[data-role='note-text']");
      if (area) {
        setTimeout(function () {
          area.focus();
          area.setSelectionRange(area.value.length, area.value.length);
        }, 0);
      }
    }

    function applyTrade(item, inn, trade) {
      var book = tradeBook(inn);
      var entry =
        book &&
        book.trades.find(function (row) {
          return row.trade === trade;
        });
      var variant = entry && entry.variants && entry.variants[0];
      item.selectedInn = inn;
      item.selectedTrade = trade;
      item.selectedDose = variant ? variant.dose : "";
      item.selectedForm = variant ? variant.form : "";
      if (item.kind === "extra-drug") {
        item.inn = inn;
        item.name = trade;
      }
    }

    function applyWizardTrade(item, trade) {
      var wizard = state.wizard;
      if (!wizard) return;
      var component = item.components[wizard.step];
      if (!component) return;
      var inn = component.kind === "trade" ? component.inn : wizard.inn;
      var book = tradeBook(inn);
      var entry =
        book &&
        book.trades.find(function (row) {
          return row.trade === trade;
        });
      var variant = entry && entry.variants && entry.variants[0];
      item.componentPicks[component.id] = {
        inn: inn,
        label: component.label,
        trade: trade,
        dose: variant ? variant.dose : "",
        form: variant ? variant.form : ""
      };
      advanceSchemeWizard(item, wizard.step);
      state.popover = { type: "scheme-wizard", itemId: item.id };
      emit("pick-scheme-trade", {
        itemId: item.id,
        componentId: component.id,
        inn: inn,
        trade: trade
      });
    }

    function clearSchemePicksFrom(item, fromStep) {
      var index;
      for (index = fromStep; index < (item.components || []).length; index += 1) {
        delete item.componentPicks[item.components[index].id];
      }
    }

    function clearSchemePickAt(item, step) {
      var component = (item.components || [])[step];
      if (!component) return;
      delete item.componentPicks[component.id];
    }

    function firstEmptySchemeStep(item) {
      var index;
      for (index = 0; index < (item.components || []).length; index += 1) {
        if (!item.componentPicks[item.components[index].id]) return index;
      }
      return -1;
    }

    function advanceSchemeWizard(item, fromStep) {
      var empty = firstEmptySchemeStep(item);
      if (empty < 0) {
        state.wizard = {
          itemId: item.id,
          step: typeof fromStep === "number" ? fromStep : 0,
          stage: "review"
        };
        return;
      }
      state.wizard = { itemId: item.id, step: empty };
    }

    function resetComboChoice(item) {
      item.selectedInn = "";
      item.selectedTrade = "";
      item.selectedDose = "";
      item.selectedForm = "";
      item.composition = compositionList(item);
    }

    function completeScheme(item) {
      var progress = schemeProgress(item);
      if (progress.ready < progress.total || !progress.total) return false;
      item.selected = true;
      state.wizard = null;
      state.popover = null;
      state.ixForceOpen = true;
      state.ixIndex = 0;
      emit("scheme-complete", { itemId: item.id, picks: item.componentPicks });
      return true;
    }

    function openSchemeWizard(item) {
      if (
        state.popover &&
        state.popover.type === "scheme-wizard" &&
        state.popover.itemId === item.id
      ) {
        state.popover = null;
        state.wizard = null;
        render();
        return;
      }
      var progress = schemeProgress(item);
      var startStep = 0;
      var index;
      if (progress.ready >= progress.total && progress.total) {
        state.wizard = { itemId: item.id, step: 0, stage: "review" };
      } else {
        for (index = 0; index < item.components.length; index += 1) {
          if (!item.componentPicks[item.components[index].id]) {
            startStep = index;
            break;
          }
        }
        state.wizard = { itemId: item.id, step: startStep };
      }
      state.popover = { type: "scheme-wizard", itemId: item.id };
      emit("open-scheme-wizard", { itemId: item.id, name: item.name });
      render();
    }

    root.addEventListener("click", function (event) {
      var el = event.target.closest("[data-action]");
      if (!el || !root.contains(el)) return;
      var action = el.getAttribute("data-action");
      var itemId = el.getAttribute("data-item-id");
      var item = itemId ? findItem(itemId) : null;

      if (action === "switch-tab") {
        var tabId = el.getAttribute("data-tab-id");
        if (!tabId || tabId === state.activeTab) return;
        state.activeTab = tabId;
        state.popover = null;
        state.wizard = null;
        state.comboWizard = null;
        state.tabs.forEach(function (tab) {
          tab.active = tab.id === tabId;
        });
        emit("switch-tab", { tabId: tabId });
        render();
        return;
      }
      if (action === "select-all") {
        var selectTab = el.getAttribute("data-tab-id") || state.activeTab;
        state.classicItems.forEach(function (item) {
          if (item.tabId === selectTab) item.selected = true;
        });
        emit("select-all", { tabId: selectTab });
        render();
        return;
      }
      if (action === "cart-remove" && item) {
        if (item.kind === "custom") {
          state.customItems = state.customItems.filter(function (row) {
            return row.id !== item.id;
          });
        } else if (item.kind === "extra-drug") {
          state.items = state.items.filter(function (row) {
            return row.id !== item.id;
          });
          state.ixIndex = 0;
        } else {
          item.selected = false;
        }
        emit("cart-remove", { itemId: item.id, kind: item.kind });
        render();
        return;
      }
      if (action === "cart-clear") {
        state.items = state.items.filter(function (row) {
          return row.kind !== "extra-drug";
        });
        state.items.forEach(function (row) {
          row.selected = false;
        });
        state.classicItems.forEach(function (row) {
          row.selected = false;
        });
        state.customItems = [];
        state.ixIndex = 0;
        state.cartStatus = "Корзина очищена";
        emit("cart-clear", {});
        render();
        return;
      }
      if (action === "cart-template" || action === "cart-save-template") {
        state.cartStatus = "Шаблоны подключены в основном проекте EasyMed";
        emit(action, {});
        renderCart();
        return;
      }
      if (action === "cart-add") {
        openCartModal("add");
        return;
      }
      if (action === "cart-edit" && item && (item.kind === "custom" || item.kind === "extra-drug")) {
        openCartModal("edit", item);
        return;
      }
      if (action === "cart-modal-close") {
        emit("cart-modal-close", {});
        closeCartModal();
        return;
      }
      if (action === "cart-modal-kind") {
        if (!state.cartModal || state.cartModal.mode === "edit") return;
        var nextKind = el.getAttribute("data-kind") === "service" ? "service" : "drug";
        state.cartModal.itemKind = nextKind;
        state.cartModal.error = "";
        state.cartModal.query = "";
        state.cartModal.stage = "search";
        state.cartModal.inn = "";
        state.cartModal.trade = "";
        state.cartModal.dose = "";
        state.cartModal.form = "";
        if (nextKind === "service") state.cartModal.name = state.cartModal.name || "";
        emit("cart-modal-kind", { itemKind: nextKind });
        renderCartModal();
        return;
      }
      if (action === "cart-modal-drug-reset") {
        if (!state.cartModal) return;
        state.cartModal.stage = "search";
        state.cartModal.inn = "";
        state.cartModal.trade = "";
        state.cartModal.dose = "";
        state.cartModal.form = "";
        state.cartModal.query = "";
        state.cartModal.error = "";
        renderCartModal();
        return;
      }
      if (action === "cart-modal-pick-inn") {
        if (!state.cartModal) return;
        var pickInn = el.getAttribute("data-inn") || "";
        if (!pickInn) return;
        state.cartModal.inn = pickInn;
        state.cartModal.trade = "";
        state.cartModal.dose = "";
        state.cartModal.form = "";
        state.cartModal.stage = "trades";
        state.cartModal.error = "";
        emit("cart-modal-pick-inn", { inn: pickInn });
        renderCartModal();
        return;
      }
      if (action === "cart-modal-pick-trade") {
        if (!state.cartModal) return;
        var pickTradeInn = el.getAttribute("data-inn") || "";
        var pickTrade = el.getAttribute("data-trade") || "";
        if (!pickTradeInn || !pickTrade) return;
        applyExtraTradeChoice(pickTradeInn, pickTrade);
        emit("cart-modal-pick-trade", { inn: pickTradeInn, trade: pickTrade });
        renderCartModal();
        return;
      }
      if (action === "cart-modal-save") {
        if (!state.cartModal) return;
        var saveComment = String(state.cartModal.comment || "");
        if (saveComment.length > 500) {
          state.cartModal.error = "Превышена длина поля";
          renderCartModal();
          return;
        }
        if (state.cartModal.itemKind === "drug") {
          if (!state.cartModal.inn || !state.cartModal.trade) {
            state.cartModal.error = "Выберите препарат из базы";
            renderCartModal();
            return;
          }
          if (state.cartModal.mode === "edit" && state.cartModal.itemId) {
            var editedDrug = findItem(state.cartModal.itemId);
            if (editedDrug && editedDrug.kind === "extra-drug") {
              editedDrug.inn = state.cartModal.inn;
              editedDrug.selectedInn = state.cartModal.inn;
              editedDrug.selectedTrade = state.cartModal.trade;
              editedDrug.selectedDose = state.cartModal.dose || "";
              editedDrug.selectedForm = state.cartModal.form || "";
              editedDrug.name = state.cartModal.trade;
              editedDrug.commentShort = saveComment;
              editedDrug.selected = true;
            }
            emit("cart-extra-save", {
              itemId: state.cartModal.itemId,
              inn: state.cartModal.inn,
              trade: state.cartModal.trade
            });
          } else {
            var extraId = "extra-" + state.extraSeq;
            state.extraSeq += 1;
            state.items.push({
              id: extraId,
              kind: "extra-drug",
              name: state.cartModal.trade,
              inn: state.cartModal.inn,
              selectedInn: state.cartModal.inn,
              selectedTrade: state.cartModal.trade,
              selectedDose: state.cartModal.dose || "",
              selectedForm: state.cartModal.form || "",
              schemeShort: "",
              courseShort: "",
              commentShort: saveComment,
              qc: "",
              level: "",
              hint: "Препарат сверх клинических рекомендаций",
              selected: true,
              componentPicks: {},
              intake: {
                morning: false,
                day: false,
                evening: false,
                night: false
              },
              intakeRelation: ""
            });
            state.activeTab = "drugs";
            state.tabs.forEach(function (tab) {
              tab.active = tab.id === "drugs";
            });
            state.ixForceOpen = true;
            state.ixIndex = 0;
            emit("cart-extra-add", {
              itemId: extraId,
              inn: state.cartModal.inn,
              trade: state.cartModal.trade
            });
            state.cartModal = null;
            state.cartStatus = "";
            render();
            var extraRow = root.querySelector(
              '[data-action="toggle"][data-item-id="' + extraId + '"]'
            );
            if (extraRow) {
              var extraArticle = extraRow.closest(".preparaty__row");
              if (extraArticle) {
                extraArticle.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }
            return;
          }
        } else {
          var saveName = String(state.cartModal.name || "").trim();
          if (!saveName) {
            state.cartModal.error = "Обязательное поле";
            renderCartModal();
            return;
          }
          if (saveName.length > 160) {
            state.cartModal.error = "Превышена длина поля";
            renderCartModal();
            return;
          }
          if (state.cartModal.mode === "edit" && state.cartModal.itemId) {
            var edited = findItem(state.cartModal.itemId);
            if (edited && edited.kind === "custom") {
              edited.name = saveName;
              edited.comment = saveComment;
            }
            emit("cart-custom-save", { itemId: state.cartModal.itemId, name: saveName });
          } else {
            var customId = "custom-" + state.customSeq;
            state.customSeq += 1;
            state.customItems.push({
              id: customId,
              kind: "custom",
              name: saveName,
              comment: saveComment,
              selected: true
            });
            emit("cart-custom-add", { itemId: customId, name: saveName });
          }
        }
        state.cartModal = null;
        state.cartStatus = "";
        render();
        return;
      }
      if (action === "cart-write") {
        var chosen = selectedItems();
        state.cartStatus = chosen.length
          ? "В карту передано назначений: " + chosen.length
          : "Сначала отметьте назначения";
        emit("cart-write", { items: chosen });
        renderCart();
        return;
      }
      if (action === "cart-copy") {
        var lines = selectedItems().map(function (row) {
          return row.kind === "classic" ? row.name : displayName(row);
        });
        var rec = root.querySelector("[data-role='recommendation']");
        var text = lines.join("\n");
        if (rec && rec.value) text += (text ? "\n\n" : "") + rec.value;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text || "").then(
            function () {
              state.cartStatus = "Скопировано в буфер обмена";
              renderCart();
            },
            function () {
              state.cartStatus = text ? "Скопируйте вручную из корзины" : "Нечего копировать";
              renderCart();
            }
          );
        } else {
          state.cartStatus = text ? "Скопируйте вручную из корзины" : "Нечего копировать";
          renderCart();
        }
        emit("cart-copy", { text: text });
        return;
      }
      if ((action === "toggle" || action === "toggle-name") && item) {
        event.preventDefault();
        event.stopPropagation();
        if (
          state.toggleLock &&
          state.toggleLock.id === item.id &&
          Date.now() - state.toggleLock.at < 350
        ) {
          return;
        }
        state.toggleLock = { id: item.id, at: Date.now() };
        item.selected = !item.selected;
        state.ixIndex = 0;
        if (item.selected) state.ixForceOpen = true;
        if (state.popover && state.popover.type !== "info") {
          state.popover = null;
          state.wizard = null;
          state.comboWizard = null;
        }
        emit("toggle", {
          itemId: item.id,
          selected: item.selected,
          name: item.kind === "classic" ? item.name : displayName(item)
        });
        render();
        return;
      }
      if (action === "comment" && item) {
        if (item.kind === "classic") {
          if (
            state.popover &&
            state.popover.type === "note-edit" &&
            state.popover.itemId === item.id
          ) {
            state.popover = null;
            emit("close-note", { itemId: item.id });
            render();
            return;
          }
          openNoteEditor(item, "comment");
          return;
        }
        if (
          state.popover &&
          state.popover.type === "info" &&
          state.popover.itemId === item.id &&
          state.infoFocus === "comment"
        ) {
          state.popover = null;
          state.infoFocus = "";
          state.infoCombo = null;
          emit("close-info", { itemId: item.id });
          render();
          return;
        }
        state.infoFocus = "comment";
        state.infoCombo = null;
        openPopover("info", item.id);
        emit("open-info", {
          itemId: item.id,
          name: item.name || displayName(item),
          focus: "comment"
        });
        return;
      }
      if (action === "close-info") {
        state.popover = null;
        state.infoTab = "general";
        state.infoFocus = "";
        state.infoCombo = null;
        emit("close-info", {});
        render();
        return;
      }
      if (action === "info-combo" && item) {
        var comboField = el.getAttribute("data-combo");
        state.infoCombo = state.infoCombo === comboField ? null : comboField;
        render();
        return;
      }
      if ((action === "info-pick-dose" || action === "info-pick-form") && item) {
        applyInfoField(
          item,
          action === "info-pick-dose" ? "dose" : "form",
          el.getAttribute("data-value") || ""
        );
        state.infoCombo = null;
        render();
        return;
      }
      if (action === "info-toggle" && item) {
        event.preventDefault();
        event.stopPropagation();
        if (
          state.toggleLock &&
          state.toggleLock.id === item.id &&
          Date.now() - state.toggleLock.at < 350
        ) {
          return;
        }
        state.toggleLock = { id: item.id, at: Date.now() };
        item.selected = !item.selected;
        if (item.selected) state.ixForceOpen = true;
        state.ixIndex = 0;
        emit("toggle", { itemId: item.id, selected: item.selected, name: displayName(item) });
        render();
        return;
      }
      if (action === "info-intake" && item) {
        var intakeKey = el.getAttribute("data-intake");
        var intakeBox = el.matches("input") ? el : el.querySelector("input[type='checkbox']");
        if (!item.intake) item.intake = { morning: false, day: false, evening: false, night: false };
        item.intake[intakeKey] = intakeBox ? !!intakeBox.checked : !item.intake[intakeKey];
        item.schemeShort = buildSchemeFromParts(item) || item.schemeShort;
        emit("edit-intake", { itemId: item.id, intake: item.intake, scheme: item.schemeShort });
        render();
        return;
      }
      if (action === "info-relation" && item) {
        item.intakeRelation = el.getAttribute("data-relation") || "";
        item.schemeShort = buildSchemeFromParts(item) || item.schemeShort;
        emit("edit-intake-relation", {
          itemId: item.id,
          relation: item.intakeRelation,
          scheme: item.schemeShort
        });
        render();
        return;
      }
      if (action === "info-course-preset" && item) {
        item.courseShort = el.getAttribute("data-value") || "";
        emit("edit-course", { itemId: item.id, course: item.courseShort });
        render();
        return;
      }
      if (action === "info-recommend" && item) {
        if (item.scheme) {
          item.schemeShort =
            item.scheme.length > 90 ? item.scheme.slice(0, 90) : item.scheme;
        }
        if (item.course) item.courseShort = item.course;
        var recDoses = doseOptions(item);
        if (!item.selectedDose && recDoses.length) item.selectedDose = recDoses[0];
        var recForms = formOptions(item);
        if (!item.selectedForm && recForms.length) item.selectedForm = recForms[0];
        if (!item.schemeShort) item.schemeShort = buildSchemeFromParts(item);
        emit("info-recommend", {
          itemId: item.id,
          dose: item.selectedDose,
          form: item.selectedForm,
          scheme: item.schemeShort,
          course: item.courseShort
        });
        render();
        return;
      }
      if (action === "info-reset" && item) {
        item.selectedDose = "";
        item.selectedForm = "";
        item.schemeShort = "";
        item.courseShort = "";
        setItemComment(item, "");
        item.intake = { morning: false, day: false, evening: false, night: false };
        item.intakeRelation = "";
        emit("info-reset", { itemId: item.id });
        render();
        return;
      }
      if (action === "info-open-scheme" && item) {
        state.popover = null;
        openSchemeWizard(item);
        return;
      }
      if (action === "info-open-combo" && item) {
        state.popover = null;
        openComboWizard(item);
        return;
      }
      if (action === "close-scheme") {
        state.popover = null;
        state.wizard = null;
        emit("close-scheme-wizard", { itemId: itemId || "" });
        render();
        return;
      }
      if (action === "close-combo") {
        state.popover = null;
        state.comboWizard = null;
        emit("close-combo-wizard", { itemId: itemId || "" });
        render();
        return;
      }
      if (action === "close-note") {
        state.popover = null;
        emit("close-note", { itemId: itemId || "" });
        render();
        return;
      }
      if (action === "save-note" && item) {
        var noteLayer = root.querySelector("[data-role='note-modal']");
        var noteText = noteLayer && noteLayer.querySelector("[data-role='note-text']");
        var value = noteText ? noteText.value : "";
        var sourceField =
          (state.popover && state.popover.sourceField) || "comment";
        setItemComment(item, value);
        state.popover = null;
        emit("edit-comment", {
          itemId: item.id,
          comment: value,
          field: sourceField
        });
        render();
        return;
      }
      if (action === "check-interactions") {
        state.popover = null;
        state.infoTab = "general";
        state.activeTab = "drugs";
        state.tabs.forEach(function (tab) {
          tab.active = tab.id === "drugs";
        });
        state.ixForceOpen = true;
        state.ixIndex = 0;
        emit("check-interactions", { pairs: analyzeInteractions().pairs.length });
        render();
        var panel = root.querySelector("[data-role='interactions']");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
      if (action === "ix-next") {
        var pairsNext = analyzeInteractions().pairs;
        if (pairsNext.length) state.ixIndex = (state.ixIndex + 1) % pairsNext.length;
        state.ixForceOpen = true;
        emit("ix-next", { index: state.ixIndex, total: pairsNext.length });
        renderInteractions();
        return;
      }
      if (action === "ix-prev") {
        var pairsPrev = analyzeInteractions().pairs;
        if (pairsPrev.length) {
          state.ixIndex = (state.ixIndex - 1 + pairsPrev.length) % pairsPrev.length;
        }
        state.ixForceOpen = true;
        emit("ix-prev", { index: state.ixIndex, total: pairsPrev.length });
        renderInteractions();
        return;
      }
      if (action === "ix-focus" && item) {
        var focusRow = root.querySelector(
          '[data-action="toggle"][data-item-id="' + item.id + '"]'
        );
        if (focusRow) {
          var focusArticle = focusRow.closest(".preparaty__row");
          if (focusArticle) {
            focusArticle.scrollIntoView({ behavior: "smooth", block: "center" });
            focusArticle.classList.add("is-ix-flash");
            setTimeout(function () {
              focusArticle.classList.remove("is-ix-flash");
            }, 1200);
          }
        } else if (item.kind === "extra-drug") {
          var focusCart = root.querySelector(
            '.preparaty__cart-item[data-item-id="' + item.id + '"]'
          );
          if (focusCart) {
            focusCart.scrollIntoView({ behavior: "smooth", block: "center" });
            focusCart.classList.add("is-ix-flash");
            setTimeout(function () {
              focusCart.classList.remove("is-ix-flash");
            }, 1200);
          }
        }
        emit("ix-focus", { itemId: item.id, kind: item.kind });
        return;
      }
      if (action === "ix-focus-both") {
        var leftId = el.getAttribute("data-left-id");
        var rightId = el.getAttribute("data-right-id");
        [leftId, rightId].forEach(function (id, index) {
          if (!id) return;
          var bothRow = root.querySelector('[data-action="toggle"][data-item-id="' + id + '"]');
          var bothArticle = bothRow ? bothRow.closest(".preparaty__row") : null;
          if (!bothArticle) {
            bothArticle = root.querySelector('.preparaty__cart-item[data-item-id="' + id + '"]');
          }
          if (!bothArticle) return;
          if (index === 0) {
            bothArticle.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          bothArticle.classList.add("is-ix-flash");
          setTimeout(function () {
            bothArticle.classList.remove("is-ix-flash");
          }, 1200);
        });
        emit("ix-focus-both", { leftId: leftId, rightId: rightId });
        return;
      }
      if (action === "replace-alternative" && item) {
        var altName = el.getAttribute("data-alt-name") || "Доксициклин";
        item.inn = "ДОКСИЦИКЛИН";
        item.selectedInn = "ДОКСИЦИКЛИН";
        item.selectedTrade = altName;
        item.selectedDose = "";
        item.selectedForm = "";
        item.name = altName;
        var book = tradeBook("ДОКСИЦИКЛИН");
        if (book && book.trades && book.trades[0]) {
          applyTrade(item, "ДОКСИЦИКЛИН", book.trades[0].trade);
        }
        state.ixIndex = 0;
        emit("replace-alternative", { itemId: item.id, name: altName });
        render();
        return;
      }

      if (action === "name" && item) {
        if (item.kind === "scheme") {
          openSchemeWizard(item);
          return;
        }
        if (item.kind === "combo") {
          openComboWizard(item);
          return;
        }
        openPopover("name", item.id);
        emit("open-name", { itemId: item.id, name: item.name });
        return;
      }
      if (action === "info" && item) {
        state.infoFocus = "";
        state.infoCombo = null;
        openPopover("info", item.id);
        emit("open-info", { itemId: item.id, name: item.name || displayName(item) });
        return;
      }
      if ((action === "hint" || action === "scheme" || action === "course" || action === "dose" || action === "form") && item) {
        openPopover(action, item.id);
        emit("open-" + action, { itemId: item.id, name: item.name || displayName(item) });
        return;
      }
      if (action === "pick-dose" && item) {
        item.selectedDose = el.getAttribute("data-value") || "";
        var doseVariants = tradeVariants(item).filter(function (variant) {
          return variant.dose === item.selectedDose;
        });
        if (doseVariants.length && !doseVariants.some(function (variant) { return variant.form === item.selectedForm; })) {
          item.selectedForm = doseVariants[0].form || item.selectedForm;
        }
        state.popover = null;
        emit("pick-dose", { itemId: item.id, dose: item.selectedDose, form: item.selectedForm });
        render();
        return;
      }
      if (action === "pick-form" && item) {
        item.selectedForm = el.getAttribute("data-value") || "";
        var formVariants = tradeVariants(item).filter(function (variant) {
          return variant.form === item.selectedForm;
        });
        if (formVariants.length && !formVariants.some(function (variant) { return variant.dose === item.selectedDose; })) {
          item.selectedDose = formVariants[0].dose || item.selectedDose;
        }
        state.popover = null;
        emit("pick-form", { itemId: item.id, form: item.selectedForm, dose: item.selectedDose });
        render();
        return;
      }
      if (action === "pick-alternative" && item) {
        state.popover = { type: "name", itemId: item.id, stage: "trades", inn: el.getAttribute("data-inn") };
        item.selectedInn = el.getAttribute("data-inn");
        item.selectedTrade = "";
        if (item.kind === "combo") {
          var chosen = (item.alternatives || []).find(function (alt) {
            return alt.inn === item.selectedInn;
          });
          var bookComp = tradeBook(item.selectedInn);
          item.composition =
            (chosen && chosen.composition) ||
            (bookComp && bookComp.composition) ||
            item.composition ||
            [];
        }
        emit("pick-alternative", { itemId: item.id, inn: item.selectedInn });
        render();
        return;
      }
      if (action === "back-alternatives" && item) {
        state.popover = { type: "name", itemId: item.id, stage: "alternatives" };
        render();
        return;
      }
      if (action === "pick-trade" && item) {
        var trade = el.getAttribute("data-trade");
        var inn = el.getAttribute("data-inn");
        if (item.kind === "scheme") {
          applyWizardTrade(item, trade);
        } else if (
          item.kind === "combo" &&
          state.popover &&
          state.popover.type === "combo-wizard"
        ) {
          applyTrade(item, inn, trade);
          var bookPick = tradeBook(inn);
          var chosenPick = (item.alternatives || []).find(function (alt) {
            return alt.inn === inn;
          });
          item.composition =
            (chosenPick && chosenPick.composition) ||
            (bookPick && bookPick.composition) ||
            item.composition ||
            [];
          state.comboWizard = { itemId: item.id, stage: "review", inn: inn };
          state.popover = { type: "combo-wizard", itemId: item.id };
          emit("pick-combo-trade", {
            itemId: item.id,
            inn: inn,
            trade: trade
          });
        } else {
          applyTrade(item, inn, trade);
          item.selected = true;
          state.ixForceOpen = true;
          state.ixIndex = 0;
          state.popover = null;
          emit("pick-trade", {
            itemId: item.id,
            inn: inn,
            trade: trade,
            dose: item.selectedDose,
            form: item.selectedForm
          });
        }
        render();
        return;
      }
      if (action === "combo-slot" && item) {
        var keepInn = item.selectedInn || (state.comboWizard && state.comboWizard.inn) || "";
        if (keepInn) {
          state.comboWizard = { itemId: item.id, stage: "trades", inn: keepInn };
        } else {
          state.comboWizard = { itemId: item.id, stage: "kits" };
        }
        state.popover = { type: "combo-wizard", itemId: item.id };
        emit("combo-edit-slot", { itemId: item.id, inn: keepInn });
        render();
        return;
      }
      if (action === "combo-pick-kit" && item) {
        var kitInn = el.getAttribute("data-inn") || "";
        item.selectedInn = kitInn;
        item.selectedTrade = "";
        item.selectedDose = "";
        item.selectedForm = "";
        var kitAlt = (item.alternatives || []).find(function (alt) {
          return alt.inn === kitInn;
        });
        var kitBook = tradeBook(kitInn);
        item.composition =
          (kitAlt && kitAlt.composition) ||
          (kitBook && kitBook.composition) ||
          item.composition ||
          [];
        state.comboWizard = { itemId: item.id, stage: "trades", inn: kitInn };
        state.popover = { type: "combo-wizard", itemId: item.id };
        emit("pick-combo-kit", { itemId: item.id, inn: kitInn });
        render();
        return;
      }
      if (action === "combo-next" && item) {
        var cwNext = state.comboWizard || { itemId: item.id, stage: "kits" };
        if (cwNext.stage !== "trades" && (cwNext.inn || item.selectedInn)) {
          state.comboWizard = {
            itemId: item.id,
            stage: "trades",
            inn: cwNext.inn || item.selectedInn
          };
        } else if (cwNext.stage === "trades" && item.selectedTrade) {
          state.comboWizard = {
            itemId: item.id,
            stage: "review",
            inn: cwNext.inn || item.selectedInn
          };
        } else {
          return;
        }
        state.popover = { type: "combo-wizard", itemId: item.id };
        render();
        return;
      }
      if (action === "combo-prev" && item) {
        var cwPrev = state.comboWizard || { itemId: item.id, stage: "kits" };
        if (cwPrev.stage === "review") {
          resetComboChoice(item);
          state.comboWizard = { itemId: item.id, stage: "kits" };
          emit("combo-restart", { itemId: item.id });
        } else if (cwPrev.stage === "trades") {
          item.selectedTrade = "";
          item.selectedDose = "";
          item.selectedForm = "";
          state.comboWizard = { itemId: item.id, stage: "kits" };
          emit("combo-back-kits", { itemId: item.id });
        } else {
          return;
        }
        state.popover = { type: "combo-wizard", itemId: item.id };
        render();
        return;
      }
      if (action === "combo-done" && item) {
        if (!completeCombo(item)) return;
        render();
        return;
      }
      if (action === "wizard-alternative" && item) {
        state.wizard = {
          itemId: item.id,
          step: state.wizard ? state.wizard.step : 0,
          stage: "trades",
          inn: el.getAttribute("data-inn")
        };
        state.popover = { type: "scheme-wizard", itemId: item.id };
        emit("pick-scheme-inn", {
          itemId: item.id,
          inn: el.getAttribute("data-inn"),
          step: state.wizard.step
        });
        render();
        return;
      }
      if (action === "wizard-slot" && item) {
        var targetStep = Number(el.getAttribute("data-step"));
        if (isNaN(targetStep) || targetStep < 0 || targetStep >= item.components.length) return;
        var allowed = true;
        var prev;
        for (prev = 0; prev < targetStep; prev += 1) {
          if (!item.componentPicks[item.components[prev].id]) {
            allowed = false;
            break;
          }
        }
        if (!allowed) return;
        clearSchemePickAt(item, targetStep);
        state.wizard = { itemId: item.id, step: targetStep };
        state.popover = { type: "scheme-wizard", itemId: item.id };
        emit("scheme-edit-slot", { itemId: item.id, step: targetStep });
        render();
        return;
      }
      if (action === "wizard-next" && item) {
        var nextWizard = state.wizard || { itemId: item.id, step: 0 };
        var nextComponent = item.components[nextWizard.step];
        if (!nextComponent || !item.componentPicks[nextComponent.id]) return;
        advanceSchemeWizard(item, nextWizard.step);
        state.popover = { type: "scheme-wizard", itemId: item.id };
        render();
        return;
      }
      if (action === "wizard-done" && item) {
        if (!completeScheme(item)) return;
        render();
        return;
      }
      if (action === "wizard-prev" && item) {
        var prevWizard = state.wizard || { itemId: item.id, step: 0 };
        if (prevWizard.stage === "review") {
          clearSchemePicksFrom(item, 0);
          state.wizard = { itemId: item.id, step: 0 };
          emit("scheme-restart-from", { itemId: item.id, step: 0 });
        } else if (
          prevWizard.stage === "trades" &&
          item.components[prevWizard.step] &&
          item.components[prevWizard.step].kind === "alternatives"
        ) {
          clearSchemePickAt(item, prevWizard.step);
          state.wizard = { itemId: item.id, step: prevWizard.step };
        } else if (prevWizard.step > 0) {
          state.wizard = { itemId: item.id, step: prevWizard.step - 1 };
        } else {
          clearSchemePickAt(item, 0);
          state.wizard = { itemId: item.id, step: 0 };
        }
        state.popover = { type: "scheme-wizard", itemId: item.id };
        render();
        return;
      }
    });

    root.addEventListener("dblclick", function (event) {
      var field = event.target.closest(
        "[data-field='scheme'], [data-field='course'], [data-field='form'], [data-field='comment']"
      );
      if (!field || !root.contains(field)) return;
      var noteItem = findItem(field.getAttribute("data-item-id"));
      if (!noteItem) return;
      event.preventDefault();
      state.infoFocus = field.getAttribute("data-field") || "comment";
      openPopover("info", noteItem.id);
      emit("open-info", {
        itemId: noteItem.id,
        name: noteItem.name || displayName(noteItem),
        focus: state.infoFocus
      });
    });

    function applyInfoField(edited, key, value) {
      if (key === "dose" || key === "dose-text") {
        edited.selectedDose = value;
        var doseVariants = tradeVariants(edited).filter(function (variant) {
          return variant.dose === edited.selectedDose;
        });
        if (
          doseVariants.length &&
          !doseVariants.some(function (variant) {
            return prettyForm(variant.form) === prettyForm(edited.selectedForm) || variant.form === edited.selectedForm;
          })
        ) {
          edited.selectedForm = doseVariants[0].form || edited.selectedForm;
        }
        if (intakeLabels(edited).length) {
          edited.schemeShort = buildSchemeFromParts(edited) || edited.schemeShort;
        }
      } else if (key === "form" || key === "form-text") {
        edited.selectedForm = value;
      } else if (key === "scheme") {
        edited.schemeShort = value;
      } else if (key === "course") {
        edited.courseShort = value;
      } else if (key === "comment") {
        setItemComment(edited, value);
      }
      emit("edit-" + (key.indexOf("dose") === 0 ? "dose" : key.indexOf("form") === 0 ? "form" : key), {
        itemId: edited.id,
        scheme: edited.schemeShort || "",
        course: edited.courseShort || "",
        dose: edited.selectedDose || "",
        form: edited.selectedForm || "",
        comment: itemComment(edited)
      });
    }

    root.addEventListener("input", function (event) {
      var field = event.target;
      if (
        field.matches &&
        field.matches(
          "[data-role='cart-modal-name'], [data-role='cart-modal-comment'], [data-role='cart-modal-search']"
        )
      ) {
        if (!state.cartModal) return;
        var role = field.getAttribute("data-role");
        if (role === "cart-modal-name") {
          state.cartModal.name = field.value;
          state.cartModal.error = "";
        } else if (role === "cart-modal-search") {
          state.cartModal.query = field.value;
          state.cartModal.error = "";
          state.cartModal.stage = "search";
          renderCartModal();
          return;
        } else {
          state.cartModal.comment = field.value;
        }
        var modalBox = field.closest(".preparaty__cart-modal");
        if (modalBox) {
          var helpers = modalBox.querySelectorAll(".preparaty__cart-modal-helper");
          if (state.cartModal.itemKind === "service" && helpers[0]) {
            helpers[0].innerHTML =
              '<span class="' +
              (state.cartModal.error ? "is-error" : "") +
              '">' +
              (state.cartModal.error || "Обязательное поле") +
              "</span><span>" +
              String(state.cartModal.name || "").length +
              "/160</span>";
          }
          if (helpers[helpers.length - 1] && helpers.length > 1) {
            helpers[helpers.length - 1].innerHTML =
              "<span>Необязательное поле</span><span>" +
              String(state.cartModal.comment || "").length +
              "/500</span>";
          }
          var saveBtn = modalBox.querySelector("[data-action='cart-modal-save']");
          if (saveBtn) saveBtn.disabled = !cartModalCanSave(state.cartModal);
        }
        return;
      }
      if (field.matches && field.matches("[data-info-field]")) {
        var infoEdited = findItem(field.getAttribute("data-item-id"));
        if (!infoEdited) return;
        if (state.infoCombo) {
          state.infoCombo = null;
          var openList = field.closest(".preparaty__card-combo");
          if (openList) {
            openList.classList.remove("is-open");
            var list = openList.querySelector(".preparaty__card-combo-list");
            if (list) list.remove();
            var toggle = openList.querySelector(".preparaty__card-combo-toggle");
            if (toggle) toggle.setAttribute("aria-expanded", "false");
          }
        }
        applyInfoField(infoEdited, field.getAttribute("data-info-field"), field.value);
        var preview = root.querySelector(".preparaty__card-preview strong");
        var status = root.querySelector(".preparaty__card-status");
        var line = assignmentPreview(infoEdited) || "Заполните назначение";
        if (preview) preview.textContent = line;
        if (status) status.textContent = line;
        return;
      }
      if (
        !field.matches ||
        !field.matches(
          "[data-field='scheme'], [data-field='course'], [data-field='dose'], [data-field='form'], [data-field='comment']"
        )
      ) {
        return;
      }
      var edited = findItem(field.getAttribute("data-item-id"));
      if (!edited) return;
      var key = field.getAttribute("data-field");
      if (key === "scheme") edited.schemeShort = field.value;
      else if (key === "course") edited.courseShort = field.value;
      else if (key === "dose") edited.selectedDose = field.value;
      else if (key === "form") edited.selectedForm = field.value;
      else if (key === "comment") {
        if (edited.kind === "classic") edited.commentText = field.value;
        else edited.commentShort = field.value;
      }
      emit("edit-" + key, {
        itemId: edited.id,
        scheme: edited.schemeShort || "",
        course: edited.courseShort || "",
        dose: edited.selectedDose || "",
        form: edited.selectedForm || "",
        comment: edited.kind === "classic" ? edited.commentText || "" : edited.commentShort || ""
      });
    });

    root.addEventListener("change", function (event) {
      var field = event.target;
      if (field.matches && field.matches("select[data-info-field]")) {
        var infoEdited = findItem(field.getAttribute("data-item-id"));
        if (!infoEdited) return;
        applyInfoField(infoEdited, field.getAttribute("data-info-field"), field.value);
        render();
      }
    });

    root.addEventListener("mousedown", function (event) {
      if (!state.popover) return;
      if (state.popover.type === "info") {
        if (event.target.closest("[data-role='info-modal'] .preparaty__info-dialog")) return;
        return;
      }
      if (state.popover.type === "scheme-wizard") {
        if (event.target.closest("[data-role='scheme-modal'] .preparaty__scheme-dialog")) return;
        return;
      }
      if (state.popover.type === "combo-wizard") {
        if (event.target.closest("[data-role='combo-modal'] .preparaty__scheme-dialog")) return;
        return;
      }
      if (state.popover.type === "note-edit") {
        if (event.target.closest("[data-role='note-modal'] .preparaty__note-dialog")) return;
        return;
      }
      if (event.target.closest("[data-role='popover']")) return;
      if (
        event.target.closest(
          "[data-action='toggle'], [data-action='toggle-name'], [data-action='select-all'], [data-action='info-toggle'], [data-action='name'], [data-action='hint'], [data-action='info'], [data-action='scheme'], [data-action='course'], [data-action='dose'], [data-action='form'], [data-action='comment'], [data-action='info-combo'], [data-action='info-pick-dose'], [data-action='info-pick-form']"
        )
      ) {
        return;
      }
      state.popover = null;
      state.wizard = null;
      state.comboWizard = null;
      renderPopover();
      renderSchemeModal();
      renderComboModal();
      renderNoteModal();
      var expanded = root.querySelectorAll("[aria-expanded='true']");
      var index;
      for (index = 0; index < expanded.length; index += 1) {
        expanded[index].setAttribute("aria-expanded", "false");
      }
      var openRows = root.querySelectorAll(".preparaty__row.is-open");
      for (index = 0; index < openRows.length; index += 1) {
        openRows[index].classList.remove("is-open");
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !state.popover || !root.isConnected) return;
      state.popover = null;
      render();
    });

    function applyExternalData(trades, interactions, shellTabs) {
      var boot =
        (typeof window !== "undefined" && window.__PREPARATY_DATA__) || null;
      state.trades =
        trades ||
        readJsonScript(root, "preparaty-trades") ||
        (boot && boot.trades) ||
        {};
      state.interactions =
        interactions ||
        readJsonScript(root, "preparaty-interactions") ||
        (boot && boot.interactions) ||
        {};
      state.shellTabs =
        shellTabs ||
        readJsonScript(root, "preparaty-shell-tabs") ||
        (boot && boot.shellTabs) ||
        {};
      state.classicItems = flattenShellTabs(state.shellTabs);
      state.tabs.forEach(function (tab) {
        if (tab.id === "drugs") return;
        var shell = state.shellTabs[tab.id];
        if (shell && typeof shell.enabled === "boolean") tab.enabled = shell.enabled;
      });
      render();
    }

    var urls = resolveDataUrls(root);
    Promise.all([fetchJson(urls.trades), fetchJson(urls.interactions), fetchJson(urls.shellTabs)]).then(
      function (pack) {
        applyExternalData(pack[0], pack[1], pack[2]);
      }
    );

    render();

    var api = {
      setTrades: function (data) {
        state.trades = data || {};
        render();
      },
      setInteractions: function (data) {
        state.interactions = data || {};
        render();
      },
      getSelected: selectedItems
    };
    root.__preparaty = api;
    return api;
  }

  if (typeof window !== "undefined") {
    window.mountPreparaty = mountPreparaty;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      mountPreparaty(document);
    });
  } else {
    mountPreparaty(document);
  }
})();
