import { useEffect, useId, useMemo, useState } from "react";
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
import styles from "./SideCart.module.css";

export type CustomCartItemModalSubmit = CustomCartItemValues;

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

type CustomCartItemModalProps = {
  mode: "add" | "edit";
  initialItem?: StoredCustomCartItem | null;
  initialName?: string;
  initialComment?: string;
  /** Стартовая вкладка в режиме add; в edit берётся из initialItem.kind. */
  initialKind?: CustomCartItemKind;
  drugSearch?: CustomCartItemDrugSearch;
  onClose: () => void;
  onSubmit: (values: CustomCartItemModalSubmit) => void;
};

const DEFAULT_DRUG_SEARCH: CustomCartItemDrugSearch = {
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

export default function CustomCartItemModal({
  mode,
  initialItem = null,
  initialName = "",
  initialComment = "",
  initialKind = "drug",
  drugSearch = DEFAULT_DRUG_SEARCH,
  onClose,
  onSubmit,
}: CustomCartItemModalProps) {
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

  const seedName =
    initialItem?.name ??
    initialName ??
    "";
  const seedComment =
    initialItem?.comment ??
    initialComment ??
    "";

  const [name, setName] = useState(
    itemKind === "service" ? seedName : "",
  );
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle} id={titleId}>
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

        {mode === "add" ? (
          <div
            className={styles.modalTypeTabs}
            role="tablist"
            aria-label="Тип назначения"
          >
            <button
              type="button"
              role="tab"
              aria-selected={itemKind === "drug"}
              className={`${styles.modalTypeTab} ${
                itemKind === "drug" ? styles.modalTypeTabActive : ""
              }`}
              onClick={() => switchKind("drug")}
            >
              Медикамент
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={itemKind === "service"}
              className={`${styles.modalTypeTab} ${
                itemKind === "service" ? styles.modalTypeTabActive : ""
              }`}
              onClick={() => switchKind("service")}
            >
              Услуга
            </button>
          </div>
        ) : null}

        {itemKind === "drug" ? (
          <>
            <p className={styles.modalLead}>
              Препарат сверх клинических рекомендаций: попадёт в корзину
              «Лечение» и в проверку взаимодействий, но не в список КР.
            </p>

            {drugStage === "ready" ? (
              <div className={styles.modalPicked}>
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
                  className={styles.modalChangeLink}
                  onClick={resetDrugSelection}
                >
                  Изменить
                </button>
              </div>
            ) : null}

            {drugStage === "trades" ? (
              <>
                <div className={styles.modalStep}>
                  <p>
                    МНН: <strong>{titleCaseInn(inn)}</strong>
                  </p>
                  <button
                    type="button"
                    className={styles.modalChangeLink}
                    onClick={resetDrugSelection}
                  >
                    ← К поиску
                  </button>
                </div>
                <div className={styles.modalResults} role="listbox">
                  {tradeOptions.length > 0 ? (
                    tradeOptions.map((option) => (
                      <button
                        key={`${inn}:${option.trade}`}
                        type="button"
                        className={styles.modalResult}
                        onClick={() => handlePickTrade(option)}
                      >
                        <strong>{option.trade}</strong>
                      </button>
                    ))
                  ) : (
                    <p className={styles.modalEmpty}>
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
                  className={`${styles.input} ${
                    visibleDrugError ? styles.inputError : ""
                  }`}
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
                  <span className={visibleDrugError ? styles.errorText : ""}>
                    {visibleDrugError || searchHint}
                  </span>
                </div>
                <div className={styles.modalResults} role="listbox">
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
                          className={styles.modalResult}
                          onClick={() => handlePickHit(hit)}
                        >
                          <strong>{hit.label}</strong>
                          {hit.hint ? <span>{hit.hint}</span> : null}
                        </button>
                      ))
                    ) : drugSearch.status === "loading" ? null : (
                      <p className={styles.modalEmpty}>Ничего не найдено.</p>
                    )
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <>
            <p className={styles.modalLead}>
              Услуга или произвольная позиция без проверки взаимодействий — в
              группу «Прочее».
            </p>
            <input
              id={nameInputId}
              className={`${styles.input} ${
                visibleServiceError ? styles.inputError : ""
              }`}
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
              <span className={visibleServiceError ? styles.errorText : ""}>
                {visibleServiceError || "Обязательное поле"}
              </span>
              <span>
                {name.length}/{CUSTOM_ITEM_NAME_MAX_LENGTH}
              </span>
            </div>
          </>
        )}

        <textarea
          id={commentInputId}
          className={`${styles.input} ${styles.textarea} ${styles.commentInput}`}
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

        <div className={styles.modalActions}>
          <button
            type="button"
            className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
            onClick={handleSubmit}
            disabled={!canSave}
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
}
