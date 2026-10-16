/**
 * Страница «API и модули».
 * Тексты лежат в разметке. Логика переключает модули в макете надстройки
 * и сообщает о кнопках наружу.
 */
(function initApiModuli() {
  var TITLES = {
    clinical: "Клинические рекомендации",
    ai: "EasyMed AI",
    ix: "Проверка взаимодействий"
  };

  function emit(root, type, extra) {
    var detail = { type: type };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        detail[key] = extra[key];
      });
    }
    root.dispatchEvent(new CustomEvent("api-moduli:action", { bubbles: true, detail: detail }));
  }

  function selectedIds(root) {
    return Array.prototype.map.call(
      root.querySelectorAll("[data-module].is-on"),
      function (node) {
        return node.getAttribute("data-module");
      }
    );
  }

  function setPressed(root, id, on) {
    var button = root.querySelector('[data-module="' + id + '"]');
    if (!button) return;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function showPane(root, id) {
    root.querySelectorAll("[data-pane]").forEach(function (pane) {
      var on = pane.getAttribute("data-pane") === id;
      pane.hidden = !on;
      pane.classList.toggle("is-show", on);
    });
    root.querySelectorAll("[data-tab]").forEach(function (tab) {
      tab.setAttribute("aria-selected", tab.getAttribute("data-tab") === id ? "true" : "false");
    });
  }

  function pulseDiary(root, id) {
    root.querySelectorAll("[data-diary-item]").forEach(function (item) {
      item.classList.remove("is-pulse");
      if (id && item.getAttribute("data-diary-item") === id && !item.hidden) {
        void item.offsetWidth;
        item.classList.add("is-pulse");
      }
    });
  }

  function flashApi(root) {
    var code = root.querySelector("[data-api-code]");
    if (!code) return;
    code.classList.remove("is-flash");
    void code.offsetWidth;
    code.classList.add("is-flash");
    window.setTimeout(function () {
      code.classList.remove("is-flash");
    }, 1200);
  }

  function assembleOverlay(root) {
    var mis = root.querySelector("[data-mis]");
    ["clinical", "ai", "ix"].forEach(function (moduleId) {
      setPressed(root, moduleId, true);
    });
    showPane(root, "clinical");
    render(root);
    pulseDiary(root, "clinical");
    if (!mis) return;
    mis.classList.remove("is-assembling");
    void mis.offsetWidth;
    mis.classList.add("is-assembling");
    window.setTimeout(function () {
      mis.classList.remove("is-assembling");
    }, 900);
  }

  function render(root) {
    var ids = selectedIds(root);
    var badge = root.querySelector("[data-badge]");
    var title = root.querySelector("[data-panel-title]");
    var status = root.querySelector("[data-status]");
    var emptyPanel = root.querySelector("[data-panel-empty]");
    var emptyDiary = root.querySelector("[data-diary-empty]");

    root.querySelectorAll("[data-tab]").forEach(function (tab) {
      var id = tab.getAttribute("data-tab");
      var on = ids.indexOf(id) !== -1;
      tab.classList.toggle("is-off", !on);
      tab.disabled = !on;
    });

    root.querySelectorAll("[data-diary-item]").forEach(function (item) {
      item.hidden = ids.indexOf(item.getAttribute("data-diary-item")) === -1;
    });

    if (emptyDiary) emptyDiary.hidden = ids.length > 0;
    if (emptyPanel) emptyPanel.hidden = ids.length > 0;

    var current = root.querySelector('[data-tab][aria-selected="true"]');
    var currentId = current && current.getAttribute("data-tab");
    if (!currentId || ids.indexOf(currentId) === -1) {
      showPane(root, ids[0] || "");
    }

    root.querySelectorAll("[data-pane]").forEach(function (pane) {
      var id = pane.getAttribute("data-pane");
      if (ids.indexOf(id) === -1) pane.hidden = true;
    });

    if (ids.length === 3) {
      if (badge) badge.textContent = "Помощник врача";
      if (title) title.textContent = "Помощник врача";
      if (status) status.textContent = "Надстройка «Помощник врача»: три модуля в одной панели.";
    } else if (ids.length === 1) {
      if (badge) badge.textContent = TITLES[ids[0]];
      if (title) title.textContent = TITLES[ids[0]];
      if (status) status.textContent = "Модуль «" + TITLES[ids[0]] + "» подключён отдельно. Остальные можно добавить позже.";
    } else if (ids.length === 2) {
      if (badge) badge.textContent = "Два модуля";
      if (title) title.textContent = "Панель из двух модулей";
      if (status) status.textContent = "Два модуля уже в одной панели. Третий подключается так же.";
    } else {
      if (badge) badge.textContent = "Модуль не выбран";
      if (title) title.textContent = "Панель";
      if (status) status.textContent = "Выберите модуль — или соберите все три в надстройку.";
      root.querySelectorAll("[data-pane]").forEach(function (pane) {
        pane.hidden = true;
      });
    }
  }

  /**
   * @param {HTMLElement | Document} [mount]
   */
  function mountApiModuli(mount) {
    var root =
      mount && mount.classList && mount.classList.contains("api-moduli")
        ? mount
        : (mount && mount.querySelector && mount.querySelector(".api-moduli")) ||
          document.querySelector(".api-moduli");
    if (!root || root.__apiModuli) return root && root.__apiModuli;

    root.addEventListener("mousemove", function (event) {
      var art = root.querySelector(".api-moduli__hero-art");
      if (!art) return;
      var rect = art.getBoundingClientRect();
      if (event.clientY < rect.top || event.clientY > rect.bottom) return;
      if (event.clientX < rect.left || event.clientX > rect.right) return;
      var x = (event.clientX - rect.left) / rect.width - 0.5;
      var y = (event.clientY - rect.top) / rect.height - 0.5;
      art.style.setProperty("--am-px", (x * 10).toFixed(2) + "px");
      art.style.setProperty("--am-py", (y * 8).toFixed(2) + "px");
    });

    root.addEventListener("click", function (event) {
      var moduleButton = event.target.closest("[data-module]");
      if (moduleButton && root.contains(moduleButton)) {
        var id = moduleButton.getAttribute("data-module");
        var on = !moduleButton.classList.contains("is-on");
        setPressed(root, id, on);
        if (on) {
          showPane(root, id);
          render(root);
          pulseDiary(root, id);
        } else {
          render(root);
        }
        emit(root, "toggle-module", { module: id, selected: on, modules: selectedIds(root) });
        return;
      }

      var tab = event.target.closest("[data-tab]");
      if (tab && root.contains(tab) && !tab.disabled) {
        var tabId = tab.getAttribute("data-tab");
        showPane(root, tabId);
        pulseDiary(root, tabId);
        emit(root, "assistant-tab", { tab: tabId });
        return;
      }

      var actionNode = event.target.closest("[data-action]");
      if (!actionNode || !root.contains(actionNode)) return;
      var action = actionNode.getAttribute("data-action");

      if (action === "assemble" || action === "choose-overlay") {
        assembleOverlay(root);
        var moduli = root.querySelector("#moduli");
        if (moduli && action === "choose-overlay") {
          moduli.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      if (action === "choose-one") {
        var moduliBlock = root.querySelector("#moduli");
        if (moduliBlock) moduliBlock.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (action === "nav" || action === "look-api" || action === "to-modules" || action === "logo") {
        var href = actionNode.getAttribute("href");
        var target = href && root.querySelector(href);
        if (target) {
          event.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        if (action === "look-api") {
          window.setTimeout(function () {
            flashApi(root);
          }, 350);
        }
      }

      emit(root, action, { modules: selectedIds(root) });
    });

    render(root);
    root.__apiModuli = { getModules: function () { return selectedIds(root); } };
    return root.__apiModuli;
  }

  if (typeof window !== "undefined") window.mountApiModuli = mountApiModuli;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      mountApiModuli(document);
    });
  } else {
    mountApiModuli(document);
  }
})();
