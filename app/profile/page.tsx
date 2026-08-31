import styles from './profile.module.css';
import Link from 'next/link';
import AutoRenewToggle from "@/app/profile/AutoRenewToggle";
import db from "@/app/lib/db";
import { requireActiveB2cSession } from "@/app/lib/requireActiveB2cSession";
import ProfileClientWrapper from "./ProfileClientWrapper";
import TariffModal from "./TariffModal";
import LogoutButton from "@/app/components/LogoutButton";
import SubscriptionExpirationPopup from "@/app/components/SubscriptionExpirationPopup";
import { getDaysUntilExpiration, type SubscriptionReminder } from "@/app/lib/subscriptionReminder";
import PaymentStateNotice from "./PaymentStateNotice";

export default async function AccountPage() {

    //ошибка для теста
    // throw new Error('Тестовая ошибка для проверки app/error.tsx');

    const session = await requireActiveB2cSession("page");

    const database = new db();
    const latestSubscription = await database.getLatestUserSubscription(session.user.id);
    const user = await database.getCurrentUser(session.user.id);
    const expirationReminder = await database.getSubscriptionExpirationReminder(session.user.id);
    const reminder: SubscriptionReminder | null = expirationReminder ? {
        subscriptionId: expirationReminder.subscriptionId,
        expirationDate: expirationReminder.expirationDate.toISOString(),
        daysLeft: getDaysUntilExpiration(expirationReminder.expirationDate),
        tariffTitle: expirationReminder.tariffTitle,
    } : null;

    const tariffTitle = latestSubscription?.title || "Демо";
    const tariffExpiration = latestSubscription
        ? new Intl.DateTimeFormat("ru-RU").format(new Date(latestSubscription.expiration_date))
        : "—";

    return (
        <div className={styles.pageWrapper}>
            <SubscriptionExpirationPopup reminder={reminder} />
            <div id="header"></div>

            <div className={styles.mainProfile}>
                <section className={styles.breadCrumbs}>
                    <Link href="/" className={`${styles.btn} ${styles.btnToMainPage}`}>
                        ← На главную страницу
                    </Link>
                </section>

                <section className={styles.profileSection}>
                    <div className={styles.profile}>
                        <div className={styles.profileTitle}>
                            <h2>Личный кабинет</h2>
                            <LogoutButton className={styles.logoutLink} />
                        </div>

                        <div className={styles.profileTable}>
                            <div className={styles.profileTableTitle} data-profile-name>
                                {user?.name}
                            </div>

                            <div className={styles.profileTableData}>
                                <div className={styles.personalInfo}>
                                    <div className={styles.personalInfoTitle}>
                                        Личные данные
                                    </div>

                                    <div className={styles.infoBox}>
                                        <div className={styles.infoBoxName}>
                                            <div className={styles.infoBoxTitle}>Имя:</div>
                                            <div className={styles.infoBoxValue}>
                                                <div className={styles.infoBoxText} data-profile-name>
                                                    {user?.name}
                                                </div>
                                                <div className={styles.infoBoxChange}>
                                                    <button className={styles.infoBoxChangeBtn} data-modal="name">
                                                        Редактировать
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.infoBoxMail}>
                                            <div className={styles.infoBoxTitle}>Логин:</div>
                                            <div className={styles.infoBoxValue}>
                                                <div className={styles.infoBoxText} data-profile-login>
                                                    {user?.login}
                                                </div>
                                                <div className={styles.infoBoxChange}>
                                                    <button className={styles.infoBoxChangeBtn} data-modal="login">
                                                        Изменить email
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.infoBoxPassword}>
                                            <div className={styles.infoBoxTitle}>Пароль:</div>
                                            <div className={styles.infoBoxValue}>
                                                <div className={styles.infoBoxText}>******</div>
                                                <div className={styles.infoBoxChange}>
                                                    <button className={styles.infoBoxChangeBtn} data-modal="password">
                                                        Изменить пароль
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.tariffInfo}>
                                    <div className={styles.personalInfoTitle}>Тариф</div>
                                    <div className={styles.infoBox}>
                                        <div className={styles.infoBoxTariff}>
                                            <div className={styles.infoBoxTitle}>Тариф:</div>
                                            <div className={styles.infoBoxValue}>
                                                <div
                                                    className={styles.infoBoxText}>
                                                    {tariffTitle}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.infoBoxDuration}>
                                            <div className={styles.infoBoxTitle}>Срок действия:</div>
                                            <div className={styles.infoBoxValue}>
                                                <div className={styles.infoBoxText}>
                                                    {tariffExpiration}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.infoBoxAuto}>
                                            <div
                                                className={`${styles.infoBoxTitle} ${styles.infoBoxTitleAuto}`}>Автопродление:
                                            </div>
                                            <div className={styles.infoBoxSwitch}>
                                                <AutoRenewToggle userId={session.user.id}
                                                                 subscriptionId={latestSubscription?.id ?? null}
                                                                 subscriptionRenewalStatus={latestSubscription?.is_auto_renewal ?? false}/>
                                            </div>
                                        </div>
                                    </div>

                                    <PaymentStateNotice />
                                    {/*<Link href="/" className={styles.tariffLink}>Продлить тариф</Link>*/}
                                    <TariffModal />
                                </div>
                            </div>

                            <div className={styles.warnings}>
                                <div className={styles.warningsTitle}>
                                    <em>Внимание! Без подписки доступно 5 запросов в день.</em>
                                </div>
                                <div className={styles.warningsText}>
                                    Для отмены ограничений приобретите <TariffModal triggerText="подписку" triggerClassName={styles.warningsLink} />
                                </div>
                            </div>

                            <div>
                                <Link href="http://klinicheskie-rekomendatsii.ru/" className={styles.open}>Открыть справочник</Link>
                            </div>

                            {/*<div className={styles.desktopIconDiv}>*/}
                            {/*    <Link href="#" className={styles.desktopIcon}>*/}
                            {/*        <Image*/}
                            {/*            src="/images/desktop-icon.png"*/}
                            {/*            alt="desktop-icon"*/}
                            {/*            width={32}*/}
                            {/*            height={32}*/}
                            {/*        />*/}
                            {/*        <p className={styles.desktopIconText}>Создать ярлык для рабочего стола</p>*/}
                            {/*    </Link>*/}
                            {/*</div>*/}
                        </div>
                    </div>
                </section>
            </div>

            <ProfileClientWrapper initialUser={{name: user?.name, login: user?.login}}/>

        </div>
    );
}


// import { redirect } from 'next/navigation';
// import styles from './profile.module.css';
// import Link from 'next/link';
// import Image from 'next/image';
// import { getServerSession } from "next-auth";
// import {authOptions} from "@/app/lib/auth";
// import AutoRenewToggle from "@/app/profile/AutoRenewToggle";
// import db from "@/app/lib/db";
// import ProfileClientWrapper from "./ProfileClientWrapper";
//
// export default async function AccountPage() {
//     const session = await getServerSession(authOptions);
//
//     if (!session?.user) {
//         redirect("/login");
//     }
//
//     const subscription = await new db().getUserSubscription(session.user.id);
//
//     return (
//         <div className={styles.pageWrapper}>
//             <div id="header"></div>
//
//             <div className={styles.mainProfile}>
//                 <section className={styles.breadCrumbs}>
//                     <Link href="/" className={`${styles.btn} ${styles.btnToMainPage}`}>
//                         ← На главную страницу
//                     </Link>
//                 </section>
//
//                 <section className={styles.profileSection}>
//                     <div className={styles.profile}>
//                         <div className={styles.profileTitle}>
//                             <h2>Личный кабинет</h2>
//                             <Link href="/login" className={styles.logoutLink}>Выйти из аккаунта</Link>
//                         </div>
//
//                         <div className={styles.profileTable}>
//                             <div className={styles.profileTableTitle}>
//                                 <span data-profile-name>{session.user.name}</span>
//                             </div>
//
//                             <div className={styles.profileTableData}>
//                                 <div className={styles.personalInfo}>
//                                     <div className={styles.personalInfoTitle}>
//                                         Личные данные
//                                     </div>
//
//                                     <div className={styles.infoBox}>
//                                         <div className={styles.infoBoxName}>
//                                             <div className={styles.infoBoxTitle}>Имя:</div>
//                                             <div className={styles.infoBoxValue}>
//                                                 <div className={styles.infoBoxText}>{session.user.name}</div>
//                                                 <div className={styles.infoBoxChange}>
//                                                     <button className={styles.infoBoxChangeBtn} data-modal="name">
//                                                         Изменить имя или фамилию
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         </div>
//
//                                         <div className={styles.infoBoxMail}>
//                                             <div className={styles.infoBoxTitle}>Логин:</div>
//                                             <div className={styles.infoBoxValue}>
//                                                 <div className={styles.infoBoxText}><span data-profile-login>{session.user.email}</span></div>
//                                                 <div className={styles.infoBoxChange}>
//                                                     <button className={styles.infoBoxChangeBtn} data-modal="login">
//                                                         Изменить почту
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         </div>
//
//                                         <div className={styles.infoBoxPassword}>
//                                             <div className={styles.infoBoxTitle}>Пароль:</div>
//                                             <div className={styles.infoBoxValue}>
//                                                 <div className={styles.infoBoxText}>******</div>
//                                                 <div className={styles.infoBoxChange}>
//                                                     <button className={styles.infoBoxChangeBtn} data-modal="password">
//                                                         Изменить пароль
//                                                     </button>
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//
//                                 <div className={styles.tariffInfo}>
//                                     <div className={styles.personalInfoTitle}>Тариф</div>
//                                     <div className={styles.infoBox}>
//                                         <div className={styles.infoBoxTariff}>
//                                             <div className={styles.infoBoxTitle}>Тариф:</div>
//                                             <div className={styles.infoBoxValue}>
//                                                 <div className={styles.infoBoxText}>{subscription?.title}</div>
//                                             </div>
//                                         </div>
//
//                                         <div className={styles.infoBoxDuration}>
//                                             <div className={styles.infoBoxTitle}>Срок действия:</div>
//                                             <div className={styles.infoBoxValue}>
//                                                 <div className={styles.infoBoxText}>
//                                                     {subscription?.expiration_date}
//                                                 </div>
//                                             </div>
//                                         </div>
//
//                                         <div className={styles.infoBoxAuto}>
//                                             <div className={`${styles.infoBoxTitle} ${styles.infoBoxTitleAuto}`}>Автопродление:</div>
//                                             <div className={styles.infoBoxSwitch}>
//                                                 <AutoRenewToggle userId={session.user.id} subscriptionRenewalStatus = {subscription?.is_auto_renewal ?? false} />
//                                             </div>
//                                         </div>
//                                     </div>
//
//                                     <Link href="/" className={styles.tariffLink}>Продлить тариф</Link>
//                                 </div>
//                             </div>
//
//                             <div>
//                                 <Link href="#" className={styles.open}>Открыть справочник</Link>
//                             </div>
//
//                             <div className={styles.desktopIconDiv}>
//                                 <Link href="#" className={styles.desktopIcon}>
//                                     <Image
//                                         src="/images/desktop-icon.png"
//                                         alt="desktop-icon"
//                                         width={32}
//                                         height={32}
//                                     />
//                                     <p className={styles.desktopIconText}>Создать ярлык для рабочего стола</p>
//                                 </Link>
//                             </div>
//                         </div>
//                     </div>
//                 </section>
//             </div>
//             <ProfileClientWrapper initialUser={session.user} />
//         </div>
//     );
// }
