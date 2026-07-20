"use client";

import Image from 'next/image';
import Link from 'next/link';
import eagleWhiteIcon from '@/assets/images/eagle-white.png';
import starLogo from '@/assets/images/star_logo.png';
import searchIcon from '@/assets/images/search.svg';
import styles from './DirectoryPageHeader.module.css';

type DirectoryPageHeaderProps = {
  variant: 'search' | 'cart';
  diagnosisTitle?: string;
  recommendationId?: string;
  recommendationSource?: string;
};

const CART_RECOMMENDATION_STORAGE_KEY = "directoryCartRecommendation";
const CART_SELECTIONS_STORAGE_KEY = "directoryCartSelections";
const CART_CUSTOM_ITEMS_STORAGE_KEY = "directoryCartCustomItems";
const CART_GENERAL_COMMENT_STORAGE_KEY = "directoryCartGeneralComments";

const getRecommendationExternalUrl = (source: string, id?: string) => {
  const normalizedSource = source.trim().toLowerCase();
  const normalizedId = id?.trim();

  if (normalizedSource === "minzdrav" && normalizedId) {
    return `https://cr.minzdrav.gov.ru/view-cr/${encodeURIComponent(normalizedId)}`;
  }

  if (normalizedSource === "star") {
    return "https://e-stomatology.ru/director/protokols/";
  }

  return "https://cr.minzdrav.gov.ru/";
};

const getSourceMeta = (source?: string, id?: string) => {
  const normalizedSource = source?.trim().toLowerCase();

  if (!normalizedSource) return null;

  if (normalizedSource === "star") {
    return {
      icon: starLogo,
      iconType: "image" as const,
      label: "СтАР",
      title: "Открыть источник документа: СтАР",
      url: getRecommendationExternalUrl(source ?? "", id),
    };
  }

  if (normalizedSource === "minzdrav") {
    return {
      icon: eagleWhiteIcon,
      iconType: "image" as const,
      label: "Рубрикатор",
      title: "Открыть документ в рубрикаторе Минздрава",
      url: getRecommendationExternalUrl(source ?? "", id),
    };
  }

  return {
    icon: "↗",
    iconType: "text" as const,
    label: source?.trim() ?? "Источник",
    title: `Открыть источник документа: ${source}`,
    url: getRecommendationExternalUrl(source ?? "", id),
  };
};

const clearAuthCookies = () => {
  ['username', 'password'].forEach((cookieName) => {
    document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
  });
};

const clearCartState = () => {
  [
    CART_RECOMMENDATION_STORAGE_KEY,
    CART_SELECTIONS_STORAGE_KEY,
    CART_CUSTOM_ITEMS_STORAGE_KEY,
    CART_GENERAL_COMMENT_STORAGE_KEY,
  ].forEach((storageKey) => {
    window.sessionStorage.removeItem(storageKey);
    window.localStorage.removeItem(storageKey);
  });
};

export default function DirectoryPageHeader({
  variant,
  diagnosisTitle,
  recommendationId,
  recommendationSource,
}: DirectoryPageHeaderProps) {
  const sourceMeta = getSourceMeta(recommendationSource, recommendationId);

  const handleBackToSearch = () => {
    clearCartState();
  };

  const handleLogout = () => {
    clearAuthCookies();
    clearCartState();
  };
  
  const action =
    variant === 'cart' ? (
      <div className={styles.cartActions}>
        {sourceMeta ? (
          <a
            href={sourceMeta.url}
            className={`${styles.action} ${styles.sourceAction}`}
            title={sourceMeta.title}
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.sourceIcon} aria-hidden="true">
              {sourceMeta.iconType === "image" ? (
                <Image src={sourceMeta.icon} alt="" width={22} height={22} />
              ) : (
                sourceMeta.icon
              )}
            </span>
            <span className={styles.sourceLabel}>{sourceMeta.label}</span>
          </a>
        ) : null}
        <Link
          href="/directory/search"
          className={`${styles.action} ${styles.backAction}`}
          onClick={handleBackToSearch}
        >
          <Image src={searchIcon} alt="" width={18} height={18} className={styles.searchIcon} />
          Вернуться к поиску
        </Link>
      </div>
    ) : (
      <Link href="/auth" className={styles.action} onClick={handleLogout}>
        Выйти
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