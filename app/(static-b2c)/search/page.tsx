"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./search.module.css";

type ApiDiagnosis = {
  code: string;
  name: string;
};

const MIN_QUERY_LENGTH = 2;
const SEARCH_ENDPOINT = "/php/API/search.php";
const DEFAULT_EXAMPLES: ApiDiagnosis[] = [
  { code: "K26", name: "Язва двенадцатиперстной кишки" },
  { code: "K26.5", name: "Язва двенадцатиперстной кишки хроническая или неуточненная с прободением" },
  { code: "K21", name: "Гастроэзофагеальный рефлюкс" },
];

const buildSearchUrl = (query: string) =>
  `${SEARCH_ENDPOINT}?search=${encodeURIComponent(query.trim())}`;

export default function StaticB2cSearchPage() {
  const [query, setQuery] = useState("K26.5");
  const [submittedQuery, setSubmittedQuery] = useState("K26.5");
  const [results, setResults] = useState<ApiDiagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = query.trim().length >= MIN_QUERY_LENGTH;

  const resultTitle = useMemo(() => {
    if (!submittedQuery.trim()) return "Начните поиск по МКБ-10";
    return `Результаты поиска по «${submittedQuery.trim()}»`;
  }, [submittedQuery]);

  useEffect(() => {
    const trimmedQuery = submittedQuery.trim();

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const loadResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(buildSearchUrl(trimmedQuery), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`API вернул статус ${response.status}`);
        }

        const data = (await response.json()) as ApiDiagnosis[];
        setResults(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (controller.signal.aborted) return;

        setResults([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось получить данные от API",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadResults();

    return () => controller.abort();
  }, [submittedQuery]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (canSearch) {
      setSubmittedQuery(query);
    }
  };

  return (
    <main className={styles.pageShell}>
      <section className={styles.hero}>
        <a href="/b2c/search" className={styles.logoLink} aria-label="EasyMed B2C">
          EasyMed
        </a>
        <p className={styles.eyebrow}>Статическая B2C-версия</p>
        <h1 className={styles.title}>Поиск клинических рекомендаций по МКБ-10</h1>
        <p className={styles.description}>
          Эта страница не подключается к MySQL напрямую. Она отправляет GET-запрос в
          существующий PHP API хостинга и получает JSON с кодом и названием диагноза.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="search-title">
        <h2 id="search-title" className={styles.cardTitle}>
          Поиск диагноза
        </h2>
        <form className={styles.searchForm} onSubmit={handleSubmit}>
          <label className={styles.searchLabel} htmlFor="diagnosis-search">
            Код МКБ или фрагмент названия
          </label>
          <div className={styles.searchRow}>
            <input
              id="diagnosis-search"
              className={styles.searchInput}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например: K26.5 или язва"
              autoComplete="off"
            />
            <button className={styles.searchButton} type="submit" disabled={!canSearch || isLoading}>
              {isLoading ? "Ищем..." : "Найти"}
            </button>
          </div>
          <p className={styles.hint}>
            Запрос уходит на <code>{SEARCH_ENDPOINT}?search=...</code>. Для загрузки в папку
            <code> /b2c/</code> используется относительный путь к API от корня домена.
          </p>
        </form>
      </section>

      <section className={styles.resultsCard} aria-live="polite">
        <div className={styles.resultsHeader}>
          <h2 className={styles.cardTitle}>{resultTitle}</h2>
          <a className={styles.cartLink} href="/b2c/cart">
            Перейти в корзину
          </a>
        </div>

        {error && (
          <div className={styles.errorBox} role="alert">
            <strong>Не удалось выполнить поиск.</strong>
            <span>{error}</span>
            <small>
              Если страница открыта локально, API может быть недоступен из-за домена или CORS.
              На easymed.pro лучше использовать относительный путь.
            </small>
          </div>
        )}

        {!error && isLoading && <p className={styles.statusText}>Загружаем данные из API...</p>}

        {!error && !isLoading && results.length === 0 && (
          <div className={styles.emptyState}>
            <p>По текущему запросу ничего не найдено.</p>
            <span>Попробуйте один из примеров ниже.</span>
          </div>
        )}

        {!error && !isLoading && results.length > 0 && (
          <ul className={styles.resultsList}>
            {results.map((item) => (
              <li key={`${item.code}-${item.name}`} className={styles.resultItem}>
                <span className={styles.resultCode}>{item.code}</span>
                <span className={styles.resultName}>{item.name}</span>
                <a
                  className={styles.resultAction}
                  href={`/b2c/cart?code=${encodeURIComponent(item.code)}`}
                >
                  Открыть назначения
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.examplesCard} aria-labelledby="examples-title">
        <h2 id="examples-title" className={styles.cardTitle}>
          Быстрые примеры
        </h2>
        <div className={styles.examplesGrid}>
          {DEFAULT_EXAMPLES.map((item) => (
            <button
              key={item.code}
              className={styles.exampleButton}
              type="button"
              onClick={() => {
                setQuery(item.code);
                setSubmittedQuery(item.code);
              }}
            >
              <strong>{item.code}</strong>
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}