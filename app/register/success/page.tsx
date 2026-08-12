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
                        <h2 className={styles.successRegTitle}>Проверьте почту</h2>
                        <p>Мы отправили ссылку для подтверждения регистрации на указанный email. Перейдите по ней, чтобы активировать аккаунт.</p>
                        <Link className={styles.successReg} href="/login">Перейти ко входу</Link>
                    </section>
                </div>
                <div id="footer"></div>
            </div>
        </div>
    );
}
