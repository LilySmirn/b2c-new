"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import {
  capitalizeCustomCartItemName,
  CUSTOM_ITEM_COMMENT_MAX_LENGTH,
  CUSTOM_ITEM_NAME_MAX_LENGTH,
  getCustomCartItemKind,
  type CustomCartItemKind,
  type CustomCartItemValues,
  type DrugSearchHit,
  type DrugTradeOption,
  type StoredCustomCartItem,
} from "@/app/(directory)/shared/cart";

export type CustomCartItemFormSubmit = CustomCartItemValues;

type DrugStage = "search" | "trades" | "ready";

export type CustomCartItemDrugSearch = {
  /**
   * `unavailable` — этап 1: поиск ещё не подключён (не мокать).
   * Остальные статусы — для будущего API.
   */
  status: "unavailable" | "idle" | "loading" | "ready" | "error";
  results?: readonly DrugSearchHit[];
  tradesForInn?: readonly DrugTradeOption[];
  onQueryChange?: (query: string) => void;
  onInnSelected?: (inn: string) => void;
};

export type CustomCartItemFormClassNames = {
  typeTabs: string;
  typeTab: string;
  typeTabActive: string;
  lead: string;
  picked: string;
  step: string;
  changeLink: string;
  results: string;
  result: string;
  empty: string;
  input: string;
  inputError: string;
  textarea: string;
  commentInput: string;
  helperRow: string;
  errorText: string;
  actions: string;
  button: string;
  buttonSecondary: string;
  buttonPrimary: string;
  /** Опционально: шапка диалога (заголовок + закрытие). */
  header?: string;
  /** Класс заголовка; пустая строка — без className (стили через родителя). */
  title?: string;
  closeButton?: string;
  /** Опционально: обёртка прокручиваемого тела (мини-корзинка). */
  scrollBody?: string;
};

export type CustomCartItemFormProps = {
  mode: "add" | "edit";
  initialItem?: StoredCustomCartItem | null;
  initialName?: string;
  initialComment?: string;
  /** Стартовая вкладка в режиме add; в edit берётся из initialItem.kind. */
  initialKind?: CustomCartItemKind;
  drugSearch?: CustomCartItemDrugSearch;
  classNames: CustomCartItemFormClassNames;
  /**
   * `flat` — как в полноразмерной корзине.
   * `scroll` — тело скроллится, кнопки остаются снизу (мини-корзинка).
   */
  layout?: "flat" | "scroll";
  showHeader?: boolean;
  onClose: () => void;
  onSubmit: (values: CustomCartItemFormSubmit) => void;
};

export const DEFAULT_CUSTOM_CART_ITEM_DRUG_SEARCH: CustomCartItemDrugSearch = {
  status: "unavailable",
  results: [],
};

const titleCaseInn = (inn: string) => {
  const lower = inn.toLocaleLowerCase("ru");
  return capitalizeCustomCartItemName(lower);
};

const prettyForm = (form: string) => {
  const lower = form.toLocaleLowerCase("ru");
  return capitalizeCustomCartItemName(lower);
};

export default function CustomCartItemForm({
  mode,
  initialItem = null,
  initialName = "",
  initialComment = "",
  initialKind = "drug",
  drugSearch = DEFAULT_CUSTOM_CART_ITEM_DRUG_SEARCH,
  classNames: styles,
  layout = "flat",
  showHeader = true,
  onClose,
  onSubmit,
}: CustomCartItemFormProps) {
  const titleId = useId();
  const nameInputId = useId();
  const searchInputId = useId();
  const commentInputId = useId();

  const editKind = initialItem
    ? getCustomCartItemKind(initialItem)
    : initialKind;
  const [itemKind, setItemKind] = useState<CustomCartItemKind>(
    mode === "edit" ? editKind : initialKind,
  );

  const seedName = initialItem?.name ?? initialName ?? "";
  const seedComment = initialItem?.comment ?? initialComment ?? "";

  const [name, setName] = useState(itemKind === "service" ? seedName : "");
  const [comment, setComment] = useState(seedComment);
  const [touched, setTouched] = useState(false);

  const catalogSeed =
    mode === "edit" &&
    editKind === "drug" &&
    initialItem?.source === "catalog" &&
    Boolean(initialItem.inn && initialItem.trade);

  const [drugStage, setDrugStage] = useState<DrugStage>(
    catalogSeed ? "ready" : "search",
  );
  const [query, setQuery] = useState(
    catalogSeed ? "" : editKind === "drug" ? seedName : "",
  );
  const [inn, setInn] = useState(catalogSeed ? initialItem?.inn ?? "" : "");
  const [trade, setTrade] = useState(
    catalogSeed ? initialItem?.trade ?? "" : "",
  );
  const [dose, setDose] = useState(catalogSeed ? initialItem?.dose ?? "" : "");
  const [form, setForm] = useState(catalogSeed ? initialItem?.form ?? "" : "");
  const [smnnCode, setSmnnCode] = useState(
    catalogSeed ? initialItem?.smnnCode ?? "" : "",
  );
  const [drugError, setDrugError] = useState("");

  const searchResults = drugSearch.results ?? [];
  const tradeOptions = drugSearch.tradesForInn ?? [];

  const serviceValidationError = useMemo(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return "Укажите название услуги или медикамента";
    if (trimmedName.length > CUSTOM_ITEM_NAME_MAX_LENGTH) {
      return `Название не должно быть длиннее ${CUSTOM_ITEM_NAME_MAX_LENGTH} символов`;
    }
    return "";
  }, [name]);

  const drugManualValidationError = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return "Укажите название медикамента";
    if (trimmed.length > CUSTOM_ITEM_NAME_MAX_LENGTH) {
      return `Название не должно быть длиннее ${CUSTOM_ITEM_NAME_MAX_LENGTH} символов`;
    }
    return "";
  }, [query]);

  const canSaveDrug =
    drugStage === "ready"
      ? Boolean(inn && trade)
      : drugStage === "search" && !drugManualValidationError;

  const canSave =
    itemKind === "service" ? !serviceValidationError : canSaveDrug;

  const visibleServiceError = touched ? serviceValidationError : "";
  const visibleDrugError =
    drugError ||
    (touched && drugStage === "search" ? drugManualValidationError : "");

  const resetDrugSelection = () => {
    setDrugStage("search");
    setInn("");
    setTrade("");
    setDose("");
    setForm("");
    setSmnnCode("");
    setDrugError("");
    setQuery("");
    drugSearch.onQueryChange?.("");
  };

  const switchKind = (next: CustomCartItemKind) => {
    if (mode === "edit" || next === itemKind) return;
    setItemKind(next);
    setTouched(false);
    setDrugError("");
    if (next === "drug") {
      setName("");
      resetDrugSelection();
    } else {
      setQuery("");
      setDrugStage("search");
      setInn("");
      setTrade("");
      setDose("");
      setForm("");
      setSmnnCode("");
    }
  };

  const applyTradeChoice = (
    nextInn: string,
    nextTrade: string,
    extras?: { dose?: string; form?: string; smnnCode?: string },
  ) => {
    setInn(nextInn);
    setTrade(nextTrade);
    setDose(extras?.dose ?? "");
    setForm(extras?.form ?? "");
    setSmnnCode(extras?.smnnCode ?? "");
    setDrugStage("ready");
    setQuery("");
    setDrugError("");
    drugSearch.onQueryChange?.("");
  };

  const handlePickHit = (hit: DrugSearchHit) => {
    if (hit.type === "inn") {
      setInn(hit.inn);
      setTrade("");
      setDose("");
      setForm("");
      setSmnnCode("");
      setDrugStage("trades");
      setDrugError("");
      drugSearch.onInnSelected?.(hit.inn);
      return;
    }

    applyTradeChoice(hit.inn, hit.trade, {
      dose: hit.dose,
      form: hit.form,
      smnnCode: hit.smnnCode,
    });
  };

  const handlePickTrade = (option: DrugTradeOption) => {
    if (!inn) return;
    applyTradeChoice(inn, option.trade, {
      dose: option.dose,
      form: option.form,
      smnnCode: option.smnnCode,
    });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setDrugError("");
    drugSearch.onQueryChange?.(value);
  };

  const handleSubmit = () => {
    setTouched(true);

    if (comment.trim().length > CUSTOM_ITEM_COMMENT_MAX_LENGTH) {
      setDrugError("Превышена длина поля");
      return;
    }

    if (itemKind === "service") {
      if (serviceValidationError) return;
      onSubmit({
        kind: "service",
        name: capitalizeCustomCartItemName(name.trim()),
        comment: comment.trim(),
      });
      return;
    }

    if (drugStage === "ready") {
      if (!inn || !trade) {
        setDrugError("Выберите препарат из базы");
        return;
      }
      onSubmit({
        kind: "drug",
        name: trade,
        comment: comment.trim(),
        inn,
        trade,
        dose: dose || undefined,
        form: form || undefined,
        smnnCode: smnnCode || undefined,
        source: "catalog",
      });
      return;
    }

    if (drugManualValidationError) return;

    onSubmit({
      kind: "drug",
      name: capitalizeCustomCartItemName(query.trim()),
      comment: comment.trim(),
      source: "manual",
    });
  };

  const title =
    mode === "add"
      ? "Добавить услугу/медикамент"
      : itemKind === "drug"
        ? "Редактировать медикамент"
        : "Редактировать услугу";
  const submitText = mode === "add" ? "Добавить" : "Сохранить";

  const searchHint =
    drugSearch.status === "unavailable"
      ? query.trim().length >= 2
        ? "Поиск по справочнику будет доступен после подключения API. Можно добавить название вручную."
        : "Начните вводить название, минимум 2 символа. Пока можно добавить медикамент вручную."
      : drugSearch.status === "loading"
        ? "Поиск…"
        : drugSearch.status === "error"
          ? "Не удалось выполнить поиск"
          : "Начните вводить название, минимум 2 символа";

  const showSearchResults =
    itemKind === "drug" &&
    drugStage === "search" &&
    query.trim().length >= 2 &&
    drugSearch.status !== "unavailable";

  const header =
    showHeader && styles.header && styles.closeButton ? (
      <div className={styles.header}>
        <h3
          className={styles.title || undefined}
          id={titleId}
        >
          {title}
        </h3>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Закрыть окно"
        >
          ×
        </button>
      </div>
    ) : null;

  const tabs =
    mode === "add" ? (
      <div
        className={styles.typeTabs}
        role="tablist"
        aria-label="Тип назначения"
      >
        <button
          type="button"
          role="tab"
          aria-selected={itemKind === "drug"}
          className={[
            styles.typeTab,
            itemKind === "drug" ? styles.typeTabActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => switchKind("drug")}
        >
          Медикамент
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={itemKind === "service"}
          className={[
            styles.typeTab,
            itemKind === "service" ? styles.typeTabActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => switchKind("service")}
        >
          Услуга
        </button>
      </div>
    ) : null;

  const fields: ReactNode =
    itemKind === "drug" ? (
      <>
        <p className={styles.lead}>
          Препарат сверх клинических рекомендаций: попадёт в корзину «Лечение»
          и в проверку взаимодействий, но не в список КР.
        </p>

        {drugStage === "ready" ? (
          <div className={styles.picked}>
            <strong>{trade}</strong>
            <span>
              {titleCaseInn(inn)}
              {dose || form
                ? ` · ${[dose, form ? prettyForm(form) : ""]
                    .filter(Boolean)
                    .join(", ")}`
                : ""}
            </span>
            <button
              type="button"
              className={styles.changeLink}
              onClick={resetDrugSelection}
            >
              Изменить
            </button>
          </div>
        ) : null}

        {drugStage === "trades" ? (
          <>
            <div className={styles.step}>
              <p>
                МНН: <strong>{titleCaseInn(inn)}</strong>
              </p>
              <button
                type="button"
                className={styles.changeLink}
                onClick={resetDrugSelection}
              >
                ← К поиску
              </button>
            </div>
            <div className={styles.results} role="listbox">
              {tradeOptions.length > 0 ? (
                tradeOptions.map((option) => (
                  <button
                    key={`${inn}:${option.trade}`}
                    type="button"
                    className={styles.result}
                    onClick={() => handlePickTrade(option)}
                  >
                    <strong>{option.trade}</strong>
                  </button>
                ))
              ) : (
                <p className={styles.empty}>
                  Нет торговых наименований для выбранного МНН.
                </p>
              )}
            </div>
          </>
        ) : null}

        {drugStage === "search" ? (
          <>
            <input
              id={searchInputId}
              className={[
                styles.input,
                visibleDrugError ? styles.inputError : "",
              ]
                .filter(Boolean)
                .join(" ")}
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Поиск по МНН или торговому имени*"
              maxLength={CUSTOM_ITEM_NAME_MAX_LENGTH}
              aria-label="Поиск препарата"
              aria-invalid={Boolean(visibleDrugError)}
              autoFocus
              autoComplete="off"
            />
            <div className={styles.helperRow}>
              <span className={visibleDrugError ? styles.errorText : undefined}>
                {visibleDrugError || searchHint}
              </span>
            </div>
            <div className={styles.results} role="listbox">
              {showSearchResults ? (
                searchResults.length > 0 ? (
                  searchResults.map((hit) => (
                    <button
                      key={
                        hit.type === "inn"
                          ? `inn:${hit.inn}`
                          : `trade:${hit.inn}|${hit.trade}`
                      }
                      type="button"
                      className={styles.result}
                      onClick={() => handlePickHit(hit)}
                    >
                      <strong>{hit.label}</strong>
                      {hit.hint ? <span>{hit.hint}</span> : null}
                    </button>
                  ))
                ) : drugSearch.status === "loading" ? null : (
                  <p className={styles.empty}>Ничего не найдено.</p>
                )
              ) : null}
            </div>
          </>
        ) : null}
      </>
    ) : (
      <>
        <p className={styles.lead}>
          Услуга или произвольная позиция без проверки взаимодействий — в группу
          «Прочее».
        </p>
        <input
          id={nameInputId}
          className={[
            styles.input,
            visibleServiceError ? styles.inputError : "",
          ]
            .filter(Boolean)
            .join(" ")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Введите название*"
          maxLength={CUSTOM_ITEM_NAME_MAX_LENGTH}
          aria-label="Название услуги"
          aria-invalid={Boolean(visibleServiceError)}
          aria-describedby={`${nameInputId}-hint`}
          autoFocus
        />
        <div className={styles.helperRow} id={`${nameInputId}-hint`}>
          <span className={visibleServiceError ? styles.errorText : undefined}>
            {visibleServiceError || "Обязательное поле"}
          </span>
          <span>
            {name.length}/{CUSTOM_ITEM_NAME_MAX_LENGTH}
          </span>
        </div>
      </>
    );

  const commentBlock = (
    <>
      <textarea
        id={commentInputId}
        className={[styles.input, styles.textarea, styles.commentInput]
          .filter(Boolean)
          .join(" ")}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Комментарий..."
        maxLength={CUSTOM_ITEM_COMMENT_MAX_LENGTH}
        aria-label="Комментарий"
      />
      <div className={styles.helperRow}>
        <span>Необязательное поле</span>
        <span>
          {comment.length}/{CUSTOM_ITEM_COMMENT_MAX_LENGTH}
        </span>
      </div>
    </>
  );

  const actions = (
    <div className={styles.actions}>
      <button
        type="button"
        className={[styles.button, styles.buttonSecondary]
          .filter(Boolean)
          .join(" ")}
        onClick={onClose}
      >
        Отмена
      </button>
      <button
        type="button"
        className={[styles.button, styles.buttonPrimary]
          .filter(Boolean)
          .join(" ")}
        onClick={handleSubmit}
        disabled={!canSave}
      >
        {submitText}
      </button>
    </div>
  );

  const body = (
    <>
      {tabs}
      {fields}
      {commentBlock}
    </>
  );

  if (layout === "scroll" && styles.scrollBody) {
    return (
      <>
        {header}
        <div className={styles.scrollBody}>{body}</div>
        {actions}
      </>
    );
  }

  return (
    <>
      {header}
      {body}
      {actions}
    </>
  );
}
