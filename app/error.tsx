'use client';

import ErrorModal from './components/ErrorModal';

export default function Error({
                                  error,
                                  reset,
                              }: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return <ErrorModal message={error.message} />;
}
