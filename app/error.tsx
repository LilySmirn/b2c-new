'use client';

import ErrorModal from './components/ErrorModal';
import { useRouter } from 'next/navigation';

export default function Error({
                                  error,
                                  reset,
                              }: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    const handleClose = () => {
        reset();
        router.push('/');
    };

    return <ErrorModal message={error.message} onClose={handleClose} />;
}
