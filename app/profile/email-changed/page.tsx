import Link from "next/link";
import styles from "../profile.module.css";

export default function EmailChangedPage() {
    return (
        <main className={styles.resultPage}>
            <section className={styles.resultCard}>
                <h1>Вы поменяли email.</h1>
                <p>Для входа авторизуйтесь.</p>
                <Link className={styles.resultButton} href="/login">Войти</Link>
            </section>
        </main>
    );
}