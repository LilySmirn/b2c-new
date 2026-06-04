import Image from 'next/image';
import Link from 'next/link';
import searchIcon from '@/assets/images/search.svg';
import styles from './DirectoryPageHeader.module.css';

type DirectoryPageHeaderProps = {
  variant: 'search' | 'cart';
  diagnosisTitle?: string;
};

export default function DirectoryPageHeader({ variant, diagnosisTitle }: DirectoryPageHeaderProps) {
  const action =
    variant === 'cart' ? (
      <Link href="/preview/directory/search" className={`${styles.action} ${styles.backAction}`}>
        <Image src={searchIcon} alt="" width={18} height={18} className={styles.searchIcon} />
        Вернуться к поиску
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
        {variant === 'cart' && diagnosisTitle ? (
          <p className={styles.diagnosisTitle}>{diagnosisTitle}</p>
        ) : null}
        {action}
      </div>
    </header>
  );
}