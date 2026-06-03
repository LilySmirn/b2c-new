import Image from 'next/image';
import Link from 'next/link';
import styles from './DirectoryPageHeader.module.css';

type DirectoryPageHeaderProps = {
  variant: 'search' | 'cart';
};

export default function DirectoryPageHeader({ variant }: DirectoryPageHeaderProps) {
  const action =
    variant === 'cart' ? (
      <Link href="/preview/directory/search" className={`${styles.action} ${styles.backAction}`}>
        ←Назад
      </Link>
    ) : (
      <button type="button" className={styles.action}>
        Выйти
      </button>
    );

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoLink}>
          <Image
            src="/images/logo-white.png"
            alt="Клинические рекомендации Минздрава — логотип"
            width={101}
            height={43}
            loading="eager"
          />
        </Link>
        {action}
      </div>
    </header>
  );
}