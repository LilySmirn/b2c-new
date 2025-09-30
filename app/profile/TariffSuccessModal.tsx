"use client";

import styles from "./TariffSuccessModal.module.css";

type Tariff = {
    title?: string | null;
    expiration_date?: string | null;
};

export default function TariffSuccessModal({
                                               subscription,
                                               onClose,
                                           }: {
    subscription: Tariff | null;
    onClose: () => void;
}) {
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.modal}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.modalPopupClose} onClick={onClose}>
                    <img src="/images/popup-exit.png" alt="close" />
                </div>

                <h2>Спасибо за покупку!</h2>

                <div className={styles.modalText}>
                    Вы приобрели тариф:{" "}
                    <b>{subscription?.title ?? "Неизвестный тариф"}</b>
                </div>
                <div className={styles.modalText}>
                    Срок действия до:{" "}
                    <b>{subscription?.expiration_date ?? "Неизвестная дата"}</b>
                </div>
                <div className={styles.modalText}>
                    Справочник:{" "}
                    <a
                        href="https://easymed.pro/kr/"
                        target="_blank"
                        rel="noreferrer"
                        className={styles.link}
                    >
                        открыть
                    </a>
                </div>

                <div className={styles.buttons}>
                    <button onClick={onClose} className={styles.buyBtn}>
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}
