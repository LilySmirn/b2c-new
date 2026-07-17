import Image from "next/image";
import Link from "next/link";
import DirectoryPageHeader from "../components/DirectoryPageHeader";
import styles from "./access-error.module.css";

export default function AccessErrorPreviewPage() {
  return (
    <>
      <DirectoryPageHeader variant="search" />
      <section className={styles.notFound}>
        <div className={styles.content}>
          <div className={styles.textBlock}>
            <p className={styles.code}>404</p>
            <h1 className={styles.title}>Страница не найдена</h1>
            <p className={styles.text}>
              Похоже, вы заблудились в клинических рекомендациях.
            </p>
            <p className={`${styles.text} ${styles.textSpaced}`}>
              Но не переживайте, мы поможем вернуться на правильный путь.
            </p>
            <Link href="/directory/search" className={styles.button}>
              Вернуться
            </Link>
          </div>

          <div className={styles.imageBlock}>
            <Image
              src="/images/404.png"
              alt="Иллюстрация ошибки 404"
              width={638}
              height={442}
              className={styles.image}
              priority
            />
          </div>
        </div>
      </section>
    </>
  );
}