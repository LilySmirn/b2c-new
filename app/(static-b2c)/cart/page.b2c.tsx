"use client";

import { useMemo, useState } from "react";
import styles from "./cart.module.css";

type Prescription = {
  id: string;
  group: string;
  section: string;
  title: string;
  required: boolean;
};

const STATIC_PRESCRIPTIONS: Prescription[] = [
  {
    id: "cbc",
    group: "Диагностика",
    section: "Лабораторные исследования",
    title: "Общий (клинический) анализ крови",
    required: true,
  },
  {
    id: "fecal-occult-blood",
    group: "Диагностика",
    section: "Лабораторные исследования",
    title: "Исследование кала на скрытую кровь",
    required: true,
  },
  {
    id: "urease-breath-test",
    group: "Диагностика по показаниям",
    section: "Дополнительные исследования",
    title: "13С-уреазный дыхательный тест на Helicobacter Pylori",
    required: false,
  },
  {
    id: "abdominal-ultrasound",
    group: "Диагностика по показаниям",
    section: "Инструментальные исследования",
    title: "Ультразвуковое исследование органов брюшной полости",
    required: false,
  },
  {
    id: "gastro-consult",
    group: "Консультации",
    section: "Специалисты",
    title: "Консультация врача-гастроэнтеролога",
    required: false,
  },
];

const DEFAULT_SELECTED_IDS = STATIC_PRESCRIPTIONS.filter((item) => item.required).map(
  (item) => item.id,
);

export default function StaticB2cCartPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED_IDS);

  const selectedItems = useMemo(
    () => STATIC_PRESCRIPTIONS.filter((item) => selectedIds.includes(item.id)),
    [selectedIds],
  );

  const groupedItems = useMemo(
    () =>
      selectedItems.reduce<Record<string, Prescription[]>>((acc, item) => {
        acc[item.group] = [...(acc[item.group] ?? []), item];
        return acc;
      }, {}),
    [selectedItems],
  );

  const togglePrescription = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id],
    );
  };

  const deleteItem = (id: string) => {
    setSelectedIds((current) => current.filter((itemId) => itemId !== id));
  };

  return (
    <main className={styles.pageShell}>
      <header className={styles.header}>
        <a href="/b2c/search" className={styles.backLink}>
          ← Вернуться к поиску
        </a>
        <p className={styles.eyebrow}>Статическая B2C-версия</p>
        <h1 className={styles.title}>Корзина назначений</h1>
        <p className={styles.description}>
          Эта страница готова для статического хостинга: выбранные назначения хранятся в
          браузере, без авторизации и без прямого подключения к базе данных.
        </p>
      </header>

      <section className={styles.layout}>
        <div className={styles.checklistCard}>
          <div className={styles.cardHeader}>
            <h2>Назначения по рекомендации</h2>
            <span>{STATIC_PRESCRIPTIONS.length} пунктов</span>
          </div>

          <div className={styles.checklist}>
            {STATIC_PRESCRIPTIONS.map((item) => {
              const isChecked = selectedIds.includes(item.id);

              return (
                <label key={item.id} className={styles.checklistItem}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => togglePrescription(item.id)}
                  />
                  <span className={styles.checkboxText}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemMeta}>
                      {item.section} · {item.required ? "обязательно" : "по показаниям"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <aside className={styles.cartCard} aria-label="Корзина выбранных назначений">
          <div className={styles.cardHeader}>
            <h2>Корзина</h2>
            <button className={styles.clearButton} type="button" onClick={() => setSelectedIds([])}>
              Очистить
            </button>
          </div>

          {selectedItems.length === 0 ? (
            <div className={styles.emptyCart}>
              <strong>Корзина пуста</strong>
              <span>Отметьте назначения слева, чтобы добавить их в корзину.</span>
            </div>
          ) : (
            <div className={styles.cartGroups}>
              {Object.entries(groupedItems).map(([group, items]) => (
                <section key={group} className={styles.cartGroup}>
                  <h3>{group}</h3>
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>
                        <span>{item.title}</span>
                        <button type="button" onClick={() => deleteItem(item.id)}>
                          Удалить
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <div className={styles.cartFooter}>
            <span>Выбрано: {selectedItems.length}</span>
            <button className={styles.primaryButton} type="button">
              Сформировать шаблон
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}