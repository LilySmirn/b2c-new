import AuthClient from './AuthClient';
import { redirect } from 'next/navigation';
import { getAuthenticatedLandingPage } from '@/app/lib/getAuthenticatedLandingPage';

export default async function AuthPage() {
  const landingPage = await getAuthenticatedLandingPage();

  if (landingPage) {
    redirect(landingPage);
  }

  return <AuthClient />;
}