import RecommendationCard from "../RecommendationCard";
import {
  newBookmarkRecommendationCardData,
  newBookmarkRecommendationTitles,
} from "./data";
import styles from "./NewBookmarkPopup.module.css";

type RecommendationPickerProps = {
  selectedTitle: string;
  onSelect: (title: string) => void;
};

export default function RecommendationPicker({
  selectedTitle,
  onSelect,
}: RecommendationPickerProps) {
  return (
    <section className={styles.cardsGrid} aria-label="Рекомендации для закладки">
      {newBookmarkRecommendationTitles.map((title) => (
        <RecommendationCard
          key={title}
          {...newBookmarkRecommendationCardData}
          title={title}
          selected={selectedTitle === title}
          onSelect={() => onSelect(title)}
        />
      ))}
    </section>
  );
}