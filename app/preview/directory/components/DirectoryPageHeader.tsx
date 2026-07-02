"use client";

import Image from 'next/image';
import Link from 'next/link';
import searchIcon from '@/assets/images/search.svg';
import styles from './DirectoryPageHeader.module.css';

type DirectoryPageHeaderProps = {
  variant: 'search' | 'cart';
  diagnosisTitle?: string;
};

const SEARCH_STATE_STORAGE_KEY = "directorySearchState";
const CART_RECOMMENDATION_STORAGE_KEY = "directoryCartRecommendation";

export default function DirectoryPageHeader({ variant, diagnosisTitle }: DirectoryPageHeaderProps) {
  const handleBackToSearch = () => {
    window.sessionStorage.removeItem(SEARCH_STATE_STORAGE_KEY);
    window.sessionStorage.removeItem(CART_RECOMMENDATION_STORAGE_KEY);
  };

  const action =
    variant === 'cart' ? (
      <Link
        href="/preview/directory/search"
        className={`${styles.action} ${styles.backAction}`}
        onClick={handleBackToSearch}
      >
        <Image src={searchIcon} alt="" width={18} height={18} className={styles.searchIcon} />
        Вернуться к поиску
      </Link>
    ) : (
      <Link href="/profile" className={styles.action}>
        В личный кабинет
      </Link>
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