import { redirect } from 'next/navigation';
import { getAuthenticatedLandingPage } from '@/app/lib/getAuthenticatedLandingPage';
import LoginClient from './LoginClient';

export default async function Page() {
    const landingPage = await getAuthenticatedLandingPage();

if (landingPage) {
        redirect(landingPage);
    }

    return <LoginClient />;
}
