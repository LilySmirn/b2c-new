"use client";

import { useMemo, useState } from "react";
import SearchBar from "../components/SearchBar";
import Filters from "../components/Filters";
import MatchesList from "../components/MatchesList";
import styles from "./search.module.css";
import Image from "next/image";
import logoBig from "@/assets/images/logo-big.svg";

const matches = [
  "K26: Язва двенадцатиперстной кишки",
  "K26.0: Язва двенадцатиперстной кишки острая с кровотечением",
  "P10: Разрыв внутричерепных тканей и кровоизлияние вследствие родовой травмы",
  "K20: Эзофагит",
  "K21: Гастроэзофагеальный рефлюкс",
  "K21.0: Гастроэзофагеальный рефлюкс с эзофагитом",
];

const visitOptions = [
  { id: "primary", label: "Первичный" },
  { id: "repeat", label: "Повторный" },
  { id: "inpatient", label: "Стационар" },
];

const ageOptions = [
  { id: "adult", label: "Взрослый" },
  { id: "child", label: "Ребёнок" },
];

export default function SearchPreviewPage() {
  const [query, setQuery] = useState("");
  const [visitType, setVisitType] = useState("primary");
  const [ageGroup, setAgeGroup] = useState("adult");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter((item) => item.toLowerCase().includes(q));
  }, [query]);

  return (
    <main className={styles.wrapper}>
      <section className={styles.content}>
        <Image
        src={logoBig}
        alt="EasyMed"
        className={styles.logo}
        priority
/>

        <SearchBar value={query} onChange={setQuery} />

        <Filters
          visitOptions={visitOptions}
          visitValue={visitType}
          onVisitChange={setVisitType}
          ageOptions={ageOptions}
          ageValue={ageGroup}
          onAgeChange={setAgeGroup}
        />

        <MatchesList items={filtered} />
      </section>
    </main>
  );
}