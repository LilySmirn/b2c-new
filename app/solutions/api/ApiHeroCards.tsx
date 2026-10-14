import Image from "next/image";
import recommendationsCard from "@/assets/images/api-page/main1.png";
import jsonCard from "@/assets/images/api-page/main2.png";
import sourcesCard from "@/assets/images/api-page/main3.png";
import styles from "./ApiHeroCards.module.css";

const cards = [
  { name: "left", image: recommendationsCard },
  { name: "center", image: jsonCard },
  { name: "right", image: sourcesCard },
] as const;

export default function ApiHeroCards() {
  return (
    <div className={styles.scene}>
      {cards.map((card) => (
        <div key={card.name} className={`${styles.slot} ${styles[card.name]}`}>
          <div className={styles.enter}>
            <div className={styles.flip}>
              <div className={styles.card}>
                <Image
                  src={card.image}
                  alt=""
                  sizes="(max-width: 1023px) 40vw, 380px"
                  priority
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
