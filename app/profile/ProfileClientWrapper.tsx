'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const ProfileModalController = dynamic(() => import('./ProfileModalController'), {
    ssr: false,
});

export default function ProfileClientWrapper({ initialUser }: { initialUser: any }) {
    const [user, setUser] = useState(initialUser);

    useEffect(() => {
        const nameEls = document.querySelectorAll('[data-profile-name]');
        nameEls.forEach(el => (el.textContent = user?.name || ''));

        const loginEls = document.querySelectorAll('[data-profile-login]');
        const loginValue = user?.login || user?.email || '';
        loginEls.forEach(el => (el.textContent = loginValue));
    }, [user]);

    return <ProfileModalController onUserUpdate={setUser} />;
}
