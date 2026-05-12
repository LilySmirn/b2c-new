"use client";

import { useMemo, useState } from "react";

type SearchState = "initial" | "empty" | "results";

const mockCards = [
  { id: 1, title: "Карточка рекомендации #1", mkb: "J06.9" },
  { id: 2, title: "Карточка рекомендации #2", mkb: "E11.9" },
  { id: 3, title: "Карточка рекомендации #3", mkb: "I10" },
];

export default function SearchPreviewPage() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("initial");

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return mockCards;
    return mockCards.filter(
      (item) =>
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.mkb.toLowerCase().includes(normalizedQuery),
    );
  }, [normalizedQuery]);

  const onSearch = () => {
    if (!normalizedQuery) {
      setState("initial");
      return;
    }

    setState(results.length ? "results" : "empty");
  };

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Preview: Главный поиск</h1>
      <p>Одна страница для всех состояний: начальное, пустой результат, карточки.</p>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Введите запрос или МКБ..."
          style={{ minWidth: 320, padding: "8px 10px" }}
        />
        <button onClick={onSearch} style={{ padding: "8px 14px" }}>
          Найти
        </button>
      </div>

      {state === "initial" && (
        <section style={{ marginTop: 20 }}>
          <strong>Состояние:</strong> результаты скрыты до запуска поиска.
        </section>
      )}

      {state === "empty" && (
        <section style={{ marginTop: 20 }}>
          <strong>Совпадений не найдено.</strong>
        </section>
      )}

      {state === "results" && (
        <section style={{ marginTop: 20 }}>
          <strong>Найдено карточек:</strong> {results.length}
          <ul>
            {results.map((item) => (
              <li key={item.id}>
                {item.title} — МКБ: {item.mkb}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}