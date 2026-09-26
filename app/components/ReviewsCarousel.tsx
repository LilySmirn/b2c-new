"use client";

import Image, { StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import people1 from "@/assets/images/landing/people1.png";
import people2 from "@/assets/images/landing/people2.png";
import people3 from "@/assets/images/landing/people3.png";

type Review = {
  name: string;
  role: string;
  text: string;
  clinic: string;
  image: StaticImageData;
};

const originalReviews: Review[] = [
  {
    name: "Ирина Александровна",
    role: "Терапевт, стаж 12 лет",
    text: "“EasyMed - это мастхев для врача. Экономит часы работы каждую неделю. Всё структурировано и по делу.”",
    clinic: "Медицинский центр «Медлайн»",
    image: people2,
  },
  {
    name: "Дмитрий Сергеевич",
    role: "Хирург, стаж 15 лет",
    text: "“Удобный поиск, актуальные рекомендации, ничего лишнего. использую каждый день в операционной и на приёме.”",
    clinic: "Клиника «Авиценна»",
    image: people1,
  },
  {
    name: "Мария Олеговна",
    role: "Стоматолог, стаж 9 лет",
    text: "“Отличный раздел по стоматологии! Наконец-то всё в одном месте и без бесконечных PDF-файлов.”",
    clinic: "Медицинский центр «МедПлюс»",
    image: people3,
  },
];

const reviews = [...originalReviews, ...originalReviews];

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
                      <p className="review-clinic">{review.clinic}</p>
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