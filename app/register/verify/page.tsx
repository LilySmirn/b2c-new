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
            };
        case 'expired':
            return {
                title: 'Ссылка устарела',
                text: 'Срок действия ссылки подтверждения истёк. Зарегистрируйтесь заново или обратитесь в поддержку.',
                linkText: 'Зарегистрироваться',
                linkHref: '/register',
            };
        default:
            return {
                title: 'Ссылка недействительна',
                text: 'Мы не смогли найти подтверждение по этой ссылке.',
                linkText: 'На страницу регистрации',
                linkHref: '/register',
            };
    }
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
    const { token } = await searchParams;
    const status = token ? await new db().verifyUserEmail(token) : 'not_found';
    const message = getMessage(status);

    return (
        <div className={styles.pageWrapper}>
            <div id="header"></div>

            <div className={styles.mainReg}>
                <section className={styles.breadCrumbs}>
                    <Link href="/" className={`${styles.btn} ${styles.btnToMainPage}`}>
                        ← На главную страницу
                    </Link>
                </section>

                <section className={styles.regFormSection}>
                    <h2 className={styles.successRegTitle}>{message.title}</h2>
                    <p>{message.text}</p>
                    <Link className={styles.successReg} href={message.linkHref}>{message.linkText}</Link>
                </section>
                <div id="footer"></div>
            </div>
        </div>
    );
}