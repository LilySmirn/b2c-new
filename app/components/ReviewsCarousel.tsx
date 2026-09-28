"use client";

import Image, { StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import people1 from "@/assets/images/landing/people1.png";
import people2 from "@/assets/images/landing/people2.png";
import people3 from "@/assets/images/landing/people3.png";
import people4 from "@/assets/images/landing/people4.png";
import people5 from "@/assets/images/landing/people5.png";
import people6 from "@/assets/images/landing/people6.png";
import people7 from "@/assets/images/landing/people7.png";
import people8 from "@/assets/images/landing/people8.png";
import people9 from "@/assets/images/landing/people9.png";

type Review = {
  name: string;
  role: string;
  text: string;
  clinic: string;
  image: StaticImageData;
};

const reviews: Review[] = [
  {
    name: "Ирина Александровна",
    role: "терапевт, стаж 12 лет",
    text: "«Экономит время на поиске клинических рекомендаций. Структурировано и без лишней информации».",
    clinic: "Демо-пример · Медицинский центр Medline",
    image: people1,
  },
  {
    name: "Алексей Викторович",
    role: "кардиолог, стаж 15 лет",
    text: "«Удобно, что рекомендации можно быстро найти в одном месте, не переключаясь между десятками документов».",
    clinic: "Демо-пример · Клиника «МедЭксперт»",
    image: people2,
  },
  {
    name: "Елена Сергеевна",
    role: "эндокринолог, стаж 11 лет",
    text: "«Хороший рабочий инструмент: нужная клиническая рекомендация находится быстро, структура понятная».",
    clinic: "Демо-пример · Медицинский центр «НоваМед»",
    image: people3,
  },
  {
    name: "Дмитрий Андреевич",
    role: "гастроэнтеролог, стаж 13 лет",
    text: "«Перестал тратить время на поиск нужного фрагмента в больших PDF. Всё необходимое собрано и структурировано».",
    clinic: "Демо-пример · Клиника «Диалог»",
    image: people4,
  },
  {
    name: "Наталья Олеговна",
    role: "пульмонолог, стаж 10 лет",
    text: "«Использую прямо во время работы с пациентом — нужные рекомендации находятся буквально за несколько секунд».",
    clinic: "Демо-пример · Медцентр «Здоровье»",
    image: people5,
  },
  {
    name: "Сергей Павлович",
    role: "ревматолог, стаж 17 лет",
    text: "«Ценность EasyMed — в нормальной структуре данных. Не нужно каждый раз разбирать длинный документ целиком».",
    clinic: "Демо-пример · Клиника «ПрофМед»",
    image: people6,
  },
  {
    name: "Мария Владимировна",
    role: "онколог, стаж 14 лет",
    text: "«Большой плюс — единый справочник актуальных КР. Для ежедневной работы это удобнее обычного поиска».",
    clinic: "Демо-пример · Медицинский центр «ОнкоМед»",
    image: people7,
  },
  {
    name: "Олег Игоревич",
    role: "инфекционист, стаж 12 лет",
    text: "«Удобно, когда КР представлены в единой понятной структуре. На поиск информации уходит гораздо меньше времени».",
    clinic: "Демо-пример · Клиника «МедСфера»",
    image: people8,
  },
  {
    name: "Мария Олеговна",
    role: "стоматолог, стаж 9 лет",
    text: "«Очень понравился раздел по стоматологии. Наконец-то всё собрано в одном месте, без поиска по PDF».",
    clinic: "Демо-пример · Медицинский центр Med+",
    image: people9,
  },
];

export default function ReviewsCarousel() {
  const [perPage, setPerPage] = useState(3);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const updatePerPage = () => {
      const nextPerPage = window.innerWidth <= 700 ? 1 : window.innerWidth <= 1080 ? 2 : 3;
      setPerPage(nextPerPage);
      setPage(0);
    };

    updatePerPage();
    window.addEventListener("resize", updatePerPage);
    return () => window.removeEventListener("resize", updatePerPage);
  }, []);

  const pages = Array.from(
    { length: Math.ceil(reviews.length / perPage) },
    (_, index) => reviews.slice(index * perPage, (index + 1) * perPage),
  );

  const changePage = (direction: number) => {
    setPage((current) => (current + direction + pages.length) % pages.length);
  };

  return (
    <section id="reviews" className="reviews-section" aria-labelledby="reviews-title">
      <div className="reviews-container">
        <h2 id="reviews-title">Что говорят врачи</h2>
        <div className="reviews-carousel">
          <button className="reviews-arrow reviews-arrow-left" type="button" onClick={() => changePage(-1)} aria-label="Предыдущие отзывы">
            ‹
          </button>
          <div className="reviews-viewport" aria-live="polite">
            <div className="reviews-track" style={{ transform: `translateX(-${page * 100}%)` }}>
              {pages.map((items, pageIndex) => (
                <div className="reviews-page" key={pageIndex} aria-hidden={pageIndex !== page}>
                  {items.map((review, reviewIndex) => (
                    <article className="review-card" key={`${pageIndex}-${reviewIndex}`}>
                      <div className="review-person">
                        <Image className="review-avatar" src={review.image} alt={`Фото: ${review.name}`} width={56} height={56} />
                        <div className="review-person-copy">
                          <h3>{review.name}</h3>
                          <p>{review.role}</p>
                        </div>
                      </div>
                      <p className="review-text">{review.text}</p>
                      <p className="review-clinic"><em>{review.clinic}</em></p>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <button className="reviews-arrow reviews-arrow-right" type="button" onClick={() => changePage(1)} aria-label="Следующие отзывы">
            ›
          </button>
        </div>
        <div className="reviews-pagination" aria-label="Страницы отзывов">
          {pages.map((_, index) => (
            <button
              key={index}
              type="button"
              className={index === page ? "active" : ""}
              onClick={() => setPage(index)}
              aria-label={`Страница ${index + 1}`}
              aria-current={index === page ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}