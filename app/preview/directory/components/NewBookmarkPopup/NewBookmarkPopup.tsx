"use client";

import { useEffect, useRef, useState } from "react";
import SearchBar from "../SearchBar";
import Filters from "../Filters";
import NosologyNameField from "./NosologyNameField";
import PopupShell from "./PopupShell";
import RecommendationPicker from "./RecommendationPicker";
import { newBookmarkAgeOptions, newBookmarkVisitOptions } from "./data";
import styles from "./NewBookmarkPopup.module.css";

type NewBookmarkPopupProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function NewBookmarkPopup({ isOpen, onClose }: NewBookmarkPopupProps) {
  const [query, setQuery] = useState("");
  const [visitType, setVisitType] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [selectedRecommendationTitle, setSelectedRecommendationTitle] = useState("");
  const [nosologyTitle, setNosologyTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const canAddBookmark = selectedRecommendationTitle.trim().length > 0;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    setQuery("");
    setVisitType("");
    setAgeGroup("");
    setSelectedRecommendationTitle("");
    setNosologyTitle("");
  }, [isOpen]);

  const handleRecommendationSelect = (title: string) => {
    setSelectedRecommendationTitle(title);
    setNosologyTitle(title);
    requestAnimationFrame(() => titleInputRef.current?.focus());
  };

  if (!isOpen) return null;

  return (
    <PopupShell onClose={onClose}>
      <h2 id="new-bookmark-title" className={styles.title}>
        Новая закладка
      </h2>

      <div className={styles.searchBlock}>
        <SearchBar value={query} onChange={setQuery} placeholder="Введите код МКБ..." />
      </div>

      <div className={styles.filtersArea}>

        <Filters
          visitOptions={newBookmarkVisitOptions}
          visitValue={visitType}
          onVisitChange={setVisitType}
          ageOptions={newBookmarkAgeOptions}
          ageValue={ageGroup}
          onAgeChange={setAgeGroup}
        />
      </div>

      <RecommendationPicker
        selectedTitle={selectedRecommendationTitle}
        onSelect={handleRecommendationSelect}
      />

      <NosologyNameField
        inputRef={titleInputRef}
        value={nosologyTitle}
        onChange={setNosologyTitle}
      />

      <button type="button" className={styles.submitButton} disabled={!canAddBookmark}>
        Добавить закладку
      </button>
    </PopupShell>
  );
}