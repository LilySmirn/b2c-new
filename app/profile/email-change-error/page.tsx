import Link from "next/link";
import styles from "../profile.module.css";

export default async function EmailChangeErrorPage({
    searchParams,
}: {
    searchParams: Promise<{ reason?: string }>;
}) {
    const { reason } = await searchParams;
    const message = reason === "occupied"
        ? "Новый email уже используется другим пользователем. Изменение не выполнено."
        : reason === "used"
            ? "Ссылка недействительна или уже была использована."
            : "Ссылка для изменения email недействительна или срок её действия истёк.";

    return (
        <main className={styles.resultPage}>
            <section className={styles.resultCard}>
                <h1>Не удалось изменить email</h1>
                <p>{message}</p>
                <Link className={styles.resultButton} href="/login">Перейти ко входу</Link>
            </section>
        </main>
    );
}