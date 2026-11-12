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
};

export type MiniCartShellGroup = {
  title?: string;
  items?: Array<{
    id?: string;
    name?: string;
    qc?: string;
    level?: string;
    hint?: string;
    comment?: string;
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

export type MiniCartProps = {
  diagnosis: string;
  tabs: MiniCartTab[];
  drugItems: MiniCartCatalogItem[];
  shellTabs: Record<string, MiniCartShellTab>;
  trades?: MiniCartTradesBook;
  interactions?: Record<string, unknown>;
  className?: string;
  /** Preview: start visible without host collapse flow */
  initiallyOpen?: boolean;
};