import type { ChecklistItem } from "../PrescriptionChecklist";
import checklistStyles from "../PrescriptionChecklist.module.css";
import DoseField from "./DoseField";
import DrugNameField from "./DrugNameField";
import DrugTextField from "./DrugTextField";
import type { MedsNameMenu } from "./medsCatalogTypes";
import styles from "./medications.module.css";

export type MedicationField = "dose" | "form" | "scheme" | "course";

type DrugRowProps = {
  item: ChecklistItem;
  dose: string;
  form: string;
  scheme: string;
  course: string;
  doseOptions?: readonly string[];
  formOptions?: readonly string[];
  nameMenu?: MedsNameMenu | null;
  schemeDrugCount?: number;
  schemeSummary?: string;
  schemeOpen?: boolean;
  onOpenScheme?: () => void;
  onToggle: (id: string) => void;
  onOpenInfo: (item: ChecklistItem) => void;
  onOpenComment: (id: string, comment: string) => void;
  onChangeField: (id: string, field: MedicationField, value: string) => void;
  onSelectInn?: (id: string, inn: string) => void;
  onSelectTrade?: (id: string, trade: string) => void;
};

export default function DrugRow({
  item,
  dose,
  form,
  scheme,
  course,
  doseOptions = [],
  formOptions = [],
  nameMenu = null,
  schemeDrugCount,
  schemeSummary,
  schemeOpen,
  onOpenScheme,
  onToggle,
  onOpenInfo,
  onOpenComment,
  onChangeField,
  onSelectInn,
  onSelectTrade,
}: DrugRowProps) {
  const isScheme = typeof schemeDrugCount === "number" && schemeDrugCount > 0;

  return (
    <article
      className={`${styles.row}${isScheme ? ` ${styles.schemeRow}` : ""}`}
      onClick={() => onToggle(item.id)}
    >
      <div className={checklistStyles.firstCol}>
        <button
          type="button"
          className={`${checklistStyles.checkbox} ${
            item.checked ? checklistStyles.checkboxChecked : ""
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(item.id);
          }}
          aria-label={`Выбрать ${item.title}`}
        >
          {item.checked ? "✓" : ""}
        </button>
        <span className={checklistStyles.qcValue}>
          {item.qualityControl ? "КК" : ""}
        </span>
        <span
          className={`${checklistStyles.codeValue} ${
            item.code ? "" : checklistStyles.codeValueEmpty
          }`}
          aria-hidden={!item.code}
        >
          {item.code}
        </span>
      </div>

      <DrugNameField
        title={item.title}
        checked={item.checked}
        menu={nameMenu}
        schemeDrugCount={schemeDrugCount}
        schemeSummary={schemeSummary}
        schemeOpen={schemeOpen}
        onOpenScheme={onOpenScheme}
        onToggle={() => onToggle(item.id)}
        onSelectInn={(inn) => onSelectInn?.(item.id, inn)}
        onSelectTrade={(trade) => onSelectTrade?.(item.id, trade)}
      />

      <DoseField
        label="Доза"
        value={dose}
        options={doseOptions}
        onChange={(value) => onChangeField(item.id, "dose", value)}
      />
      <DoseField
        label="Форма"
        value={form}
        options={formOptions}
        onChange={(value) => onChangeField(item.id, "form", value)}
      />
      <DrugTextField
        field="scheme"
        placeholder="Схема"
        value={scheme}
        onChange={(value) => onChangeField(item.id, "scheme", value)}
      />
      <DrugTextField
        field="course"
        placeholder="Курс"
        value={course}
        onChange={(value) => onChangeField(item.id, "course", value)}
      />

      <div className={styles.rowEnd}>
        <div className={checklistStyles.thirdCol}>
          <button
            type="button"
            className={checklistStyles.infoButton}
            onClick={(event) => {
              event.stopPropagation();
              onOpenInfo(item);
            }}
            aria-label={`Информация о назначении ${item.title}`}
          >
            i
          </button>
        </div>
        <button
          type="button"
          className={`${checklistStyles.commentCol} ${
            item.comment ? checklistStyles.commentColFilled : ""
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onOpenComment(item.id, item.comment);
          }}
        >
          {item.comment || "Комментарий..."}
        </button>
      </div>
    </article>
  );
}
