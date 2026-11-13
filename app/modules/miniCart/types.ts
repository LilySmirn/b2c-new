import type {
  CombinationAssignmentView,
  MedicationIntake,
} from "@/app/(directory)/components/medications/assignmentScheme";
import type { CombinationDraft } from "@/app/(directory)/components/medications/combinationSelection";
import type { MedsCatalogComponent } from "@/app/(directory)/components/medications/medsCatalogTypes";
import type { MiniCartAssignmentOps } from "./assignmentOps";

export type {
  MiniCartAssignmentOps,
  MiniCartMedsField,
  MiniCartMedsPick,
} from "./assignmentOps";

/** Данные экрана редактирования лекарственного назначения (drug-details). */
export type MiniCartMedicationDetails = {
  description: string;
  infoComment: string;
  originalScheme: string;
  originalCourse: string;
  /** Сырой черновик схемы (не display fallback из КР). */
  schemeDraft: string;
  /** Сырой черновик курса. */
  courseDraft: string;
  intake: MedicationIntake;
  noteCustom: boolean;
  doseOptions: readonly string[];
  formOptions: readonly string[];
  combination: CombinationAssignmentView | null;
};

/** Внутренние экраны мини-корзинки (без смены URL). */
export type MiniCartView =
  | { type: "list" }
  | { type: "drug-details"; itemId: string }
  | { type: "custom-items" };

/** Пользовательская позиция (как StoredCustomCartItem / SideCart). */
export type MiniCartCustomItem = {
  id: string;
  name: string;
  comment: string;
};

/** Production-источник мастера схемы для directory-backed режима. */
export type MiniCartSchemeSource = {
  components: readonly MedsCatalogComponent[];
  confirmed: CombinationDraft | null;
};

export type MiniCartNav = "clinical-recs" | "easymed-ai" | "interactions";

export type MiniCartVisit = "primary" | "repeat" | "inpatient";
export type MiniCartAge = "adult" | "child";

export type MiniCartTab = {
  id: string;
  label: string;
  active?: boolean;
  enabled?: boolean;
};

export type MiniCartAlternative = {
  inn: string;
  label: string;
  composition?: string[];
};

export type MiniCartComponent = {
  id: string;
  kind: string;
  label: string;
  inn?: string;
  alternatives?: MiniCartAlternative[];
};

export type MiniCartComponentPick = {
  inn: string;
  trade?: string;
  dose?: string;
  form?: string;
};

export type MiniCartItemKind =
  | "plain"
  | "alternatives"
  | "trade"
  | "scheme"
  | "combo"
  | "extra-drug"
  | "classic"
  | "custom";

export type MiniCartCatalogItem = {
  id: string;
  kind: MiniCartItemKind;
  name: string;
  inn?: string;
  qc?: string;
  level?: string;
  hint?: string;
  scheme?: string;
  schemeShort?: string;
  course?: string;
  courseShort?: string;
  composition?: string[];
  alternatives?: MiniCartAlternative[];
  components?: MiniCartComponent[];
  componentPicks?: Record<string, MiniCartComponentPick>;
  selected?: boolean;
  selectedInn?: string;
  selectedTrade?: string;
  selectedDose?: string;
  selectedForm?: string;
  commentShort?: string;
  commentText?: string;
  tabId?: string;
  group?: string;
  /** Поля экрана препарата; есть у directory-backed лекарственных позиций. */
  medicationDetails?: MiniCartMedicationDetails;
};

export type MiniCartShellGroup = {
  /** Стабильный ключ группы (section.id); для фильтрации classicItems. */
  id?: string;
  title?: string;
  items?: Array<{
    id?: string;
    name?: string;
    qc?: string;
    level?: string;
    hint?: string;
    comment?: string;
    selected?: boolean;
  }>;
};

export type MiniCartShellTab = {
  enabled?: boolean;
  note?: string;
  selectAllLabel?: string;
  groups?: MiniCartShellGroup[];
};

export type MiniCartCatalog = {
  diagnosis: string;
  tabs: MiniCartTab[];
  items: MiniCartCatalogItem[];
};

export type MiniCartTradeVariant = {
  dose?: string;
  form?: string;
};

export type MiniCartTradeEntry = {
  trade: string;
  variants?: MiniCartTradeVariant[];
};

export type MiniCartTradesBook = Record<
  string,
  {
    trades?: MiniCartTradeEntry[];
  }
>;

export type MiniCartInteractionPair = {
  leftId?: string;
  rightId?: string;
  leftName?: string;
  rightName?: string;
  severity?: "block" | "warn" | "ok";
  text?: string;
  source?: string;
};

export type MiniCartAiMessage = {
  id: string;
  role: "doctor" | "ai";
  text: string;
  time?: string;
};

/** Режимы отображения (как в vanilla-прототипе). */
export type MiniCartDisplayMode = "full" | "compact" | "docked";

export type MiniCartProps = {
  diagnosis: string;
  tabs: MiniCartTab[];
  drugItems: MiniCartCatalogItem[];
  shellTabs: Record<string, MiniCartShellTab>;
  trades?: MiniCartTradesBook;
  interactions?: Record<string, unknown>;
  className?: string;
  /**
   * Preview / uncontrolled: стартовать сразу в compact.
   * Игнорируется при controlled `displayMode`.
   */
  initiallyOpen?: boolean;
  /** Controlled режим отображения. */
  displayMode?: MiniCartDisplayMode;
  onDisplayModeChange?: (mode: MiniCartDisplayMode) => void;
  /**
   * Общая рекомендация из внешнего источника (SideCart / storage).
   * Если задана — локальный state только зеркалит значение.
   */
  recommendationText?: string;
  /**
   * Пользовательские назначения из SideCart / cartStorage.
   * Отдельная коллекция — не входит в разделы КР.
   */
  customItems?: readonly MiniCartCustomItem[];
  /**
   * Операции поверх PrescriptionChecklist / SideCart.
   * Если заданы — локальные мутации назначений отключены; доступны только переданные ops (D1…).
   */
  assignmentOps?: MiniCartAssignmentOps;
  /**
   * D2: production-компоненты схем/комбинаций по itemId.
   * Нужны компактному мастеру для combinationSelection (не demo trades).
   */
  schemeByItemId?: Record<string, MiniCartSchemeSource>;
  /** Скрыть поиск МКБ (реальный `/cart`: диагноз только для чтения). */
  hideMkbSearch?: boolean;
};