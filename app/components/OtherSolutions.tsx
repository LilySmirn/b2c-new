import Image from "next/image";
import analyticsIcon from "@/assets/images/about/product-analytics.png";
import apiIcon from "@/assets/images/about/product-api.png";
import analyticsArt from "@/assets/images/landing/posibilities1.png";
import apiArt from "@/assets/images/landing/posibilities2.png";

const solutions = [
  {
    href: "https://easymed.pro/analytics/",
    icon: analyticsIcon,
    iconAlt: "Иконка аналитики",
    title: "Аналитика для медицинских организаций",
    text: "Инструменты для контроля качества медицинской помощи, оценки эффективности и управления клиникой на основе данных.",
    art: analyticsArt,
    artAlt: "Иллюстрация аналитики",
  },
  {
    href: "https://easymed.pro/api-modules/",
    icon: apiIcon,
    iconAlt: "Иконка API",
    title: "API и модули для МИС",
    text: "Структурированные медицинские данные и готовые программные модули для интеграции в МИС.",
    art: apiArt,
    artAlt: "Иллюстрация API",
  },
] as const;

export default function OtherSolutions() {
  return (
    <section
      id="other-solutions"
      className="other-solutions-section"
      aria-labelledby="other-solutions-title"
    >
      <div className="other-solutions-container">
        <div className="other-solutions-header">
          <p className="other-solutions-eyebrow">Возможности платформы KlinRec</p>
          <h2 id="other-solutions-title">Другие цифровые решения для медицины</h2>
          <p className="other-solutions-lead">
            Помимо KlinRec, доступны другие цифровые решения компании EasyMed
            для медицинских организаций и разработчиков медицинских систем.
          </p>
        </div>

        <div className="other-solutions-grid">
          {solutions.map((solution) => (
            <a
              key={solution.href}
              className="other-solutions-card"
              href={solution.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="other-solutions-card-copy">
                <span className="other-solutions-card-icon">
                  <Image
                    src={solution.icon}
                    alt={solution.iconAlt}
                    width={48}
                    height={48}
                  />
                </span>
                <h3>{solution.title}</h3>
                <p>{solution.text}</p>
                <span className="other-solutions-more">
                  Узнать больше <span aria-hidden="true">→</span>
                </span>
              </div>
              <div className="other-solutions-card-art">
                <Image
                  className="other-solutions-art"
                  src={solution.art}
                  alt={solution.artAlt}
                />
              </div>
            </a>
          ))}
        </div>

        <p className="other-solutions-credit">
          Разработчик решений —{" "}
          <a href="https://easymed.pro/" target="_blank" rel="noopener noreferrer">
            EasyMed
          </a>
        </p>
      </div>
    </section>
  );
}
