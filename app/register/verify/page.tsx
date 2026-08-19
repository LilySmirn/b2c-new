import styles from '../../styles/auth.module.css';
import Link from 'next/link';
import db from '@/app/lib/db';

type VerifyEmailPageProps = {
    searchParams: Promise<{
        token?: string;
    }>;
};

function getMessage(status: Awaited<ReturnType<db['verifyUserEmail']>>) {
    switch (status) {
        case 'ok':
            return {
                title: 'Email подтверждён!',
                text: 'Теперь вы можете войти в личный кабинет.',
                linkText: 'Войти',
                linkHref: '/login',
                isSuccess: true,
            };
        case 'expired':
            return {
                title: 'Ссылка устарела',
                text: 'Срок действия ссылки подтверждения истёк. Зарегистрируйтесь заново или обратитесь в поддержку.',
                linkText: 'Зарегистрироваться',
                linkHref: '/register',
                isSuccess: false,
            };
        default:
            return {
                title: 'Ссылка недействительна',
                text: 'Мы не смогли найти подтверждение по этой ссылке.',
                linkText: 'На страницу регистрации',
                linkHref: '/register',
                isSuccess: false,
            };
    }
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
    const { token } = await searchParams;
    const status = token ? await new db().verifyUserEmail(token) : 'not_found';
    const message = getMessage(status);
    const isSuccess = status === 'ok';

    return (
        <div className={styles.pageWrapper}>
            <div id="header"></div>

            <div className={styles.mainReg}>
                <section className={styles.breadCrumbs}>
                    <Link href="/" className={`${styles.btn} ${styles.btnToMainPage}`}>
                        ← На главную страницу
                    </Link>
                </section>

                <section className={styles.verifySection} aria-labelledby="verify-title">
                    <div
                        className={`${styles.verifyIcon} ${message.isSuccess ? styles.verifyIconSuccess : styles.verifyIconError}`}
                        aria-hidden="true"
                    >
                        {message.isSuccess ? (
                            <svg viewBox="0 0 24 24">
                                <path d="m7 12.5 3.2 3.2L17.5 8.5" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24">
                                <path d="M12 7.5v5.5M12 16.5h.01" />
                            </svg>
                        )}
                    </div>
                    <h1 id="verify-title" className={styles.verifyTitle}>{message.title}</h1>
                    <p className={styles.verifyText}>{message.text}</p>
                    <Link className={styles.verifyButton} href={message.linkHref}>{message.linkText}</Link>
                </section>
                <div id="footer"></div>
            </div>
        </div>
    );
}