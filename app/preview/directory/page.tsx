import Link from "next/link";

const pages = [
  { href: "/preview/directory/search", label: "Главный поиск (initial / empty / cards)" },
  { href: "/preview/directory/cart", label: "Корзина назначений" },
  { href: "/preview/directory/access-error", label: "Ошибки доступа (404)" },
];

const popups = [
  "Сохранить как шаблон",
  "Выбрать шаблон",
  "Генерация документа",
  "Запись в карту",
  "Внесение комментария в назначение",
  "Информация о назначении",
  "Вы действительно хотите удалить всё из корзины?",
  "Добавить услугу/медикамент (вне КР)",
  "Связаться с нами (футер)",
  "Ожидание генерации документа → Документ загружен",
  "Приложение А3 (таблица)",
];

const components = [
  "Строка поиска",
  "Фильтры",
  "Список совпадений",
  "Карточка рекомендации",
  "Список одногруппников МКБ",
  "Оповещение, почему не работает фильтр",
  "Вкладки разделов",
  "Список назначений с чекбоксами",
  "Боковая корзина",
  "Панель с кнопками действий",
  "Попапы",
];

export default function DirectoryPreviewIndexPage() {
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Preview: Справочник</h1>

      <h2>Страницы</h2>
      <ul>
        {pages.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>

      <h2>Попапы</h2>
      <p>
        Структура файлов создана в <code>app/preview/directory/popups</code>.
      </p>
      <ul>
        {popups.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>Компоненты</h2>
      <p>
        Структура файлов создана в <code>app/preview/directory/components</code>.
      </p>
      <ul>
        {components.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </main>
  );
}