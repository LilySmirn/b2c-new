'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TariffSuccessModal from './TariffSuccessModal';

const ProfileModalController = dynamic(() => import('./ProfileModalController'), {
    ssr: false,
});

export default function ProfileClientWrapper({ initialUser }: { initialUser: any }) {
    const [user, setUser] = useState(initialUser);
    const [showTariffModal, setShowTariffModal] = useState(false);
    const [subscription, setSubscription] = useState<{ title?: string | null; expiration_date?: string | null } | null>(null);

    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const nameEls = document.querySelectorAll('[data-profile-name]');
        nameEls.forEach(el => (el.textContent = user?.name || ''));

        const loginEls = document.querySelectorAll('[data-profile-login]');
        const loginValue = user?.login || user?.email || '';
        loginEls.forEach(el => (el.textContent = loginValue));
    }, [user]);

    useEffect(() => {
            if (!searchParams) {
            return;
        }
        const paymentStatus = searchParams.get('payment');
        if (paymentStatus === 'success') {
            const title = searchParams.get('tariff_title') || 'Неизвестный тариф';
            const expiration_date = searchParams.get('expiration_date') || null;
            setSubscription({ title, expiration_date });
            setShowTariffModal(true);

            try {
                router.replace(window.location.pathname, { scroll: false });
            } catch (e) {
            }
        }
    }, [searchParams, router]);

    return (
        <>
            <ProfileModalController onUserUpdate={setUser} />

            {showTariffModal && subscription && (
                <TariffSuccessModal
                    subscription={subscription}
                    onClose={() => setShowTariffModal(false)}
                />
            )}
        </>
    );
}
