import styles from '../../styles/auth.module.css';
import Link from 'next/link';

export default function Result() {
    return (
        <div className={styles.pageWrapper}>
            <div id="header"></div>

            <div className={styles.mainReg}>
                <section className={styles.breadCrumbs}>
                    <Link href="/" className={`${styles.btn} ${styles.btnToMainPage}`}>
                        ← На главную страницу
                    </Link>
                </section>

                <div className={styles.mainReg}>
                    <section className={styles.regFormSection}>
                        <h2 className={styles.successRegTitle}>Регистрация выполнена успешно!</h2>
                        <Link className={styles.successReg} href="/login">Войти</Link>
                    </section>
                </div>
                <div id="footer"></div>
            </div>
        </div>
    );
}
