const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

type AttemptEntry = {
    timestamps: number[];
    cleanupTimer: ReturnType<typeof setTimeout> | null;
};

type LoginAttemptStore = {
    attempts: Map<string, AttemptEntry>;
    locks: Map<string, Promise<void>>;
};

const globalLoginAttemptStore = globalThis as typeof globalThis & {
    __loginAttemptStore?: LoginAttemptStore;
};

const store = globalLoginAttemptStore.__loginAttemptStore ??= {
    attempts: new Map<string, AttemptEntry>(),
    locks: new Map<string, Promise<void>>(),
};

export type RegisteredLoginAttempt = {
    limitReached: boolean;
    release: () => void;
};

export function normalizeLogin(login: string): string {
    return login.trim().toLowerCase();
}

function scheduleCleanup(login: string, entry: AttemptEntry): void {
    if (entry.cleanupTimer !== null) {
        clearTimeout(entry.cleanupTimer);
    }

    entry.cleanupTimer = setTimeout(() => {
        const currentEntry = store.attempts.get(login);

        if (currentEntry === entry) {
            store.attempts.delete(login);
        }
    }, LOGIN_ATTEMPT_WINDOW_MS);

    entry.cleanupTimer.unref?.();
}

/**
 * Registers an attempt and holds a per-login lock until the caller finishes
 * authentication. Holding the lock prevents concurrent successful requests
 * from racing past the tenth attempt before the user has been blocked.
 */
export async function registerLoginAttempt(
    login: string
): Promise<RegisteredLoginAttempt> {
    const normalizedLogin = normalizeLogin(login);
    const previousLock = store.locks.get(normalizedLogin) ?? Promise.resolve();
    let unlock!: () => void;
    const currentLock = new Promise<void>((resolve) => {
        unlock = resolve;
    });

    store.locks.set(normalizedLogin, currentLock);
    await previousLock;

    const now = Date.now();
    const windowStart = now - LOGIN_ATTEMPT_WINDOW_MS;
    const entry = store.attempts.get(normalizedLogin) ?? {
        timestamps: [],
        cleanupTimer: null,
    };

    entry.timestamps = entry.timestamps.filter((timestamp) => timestamp > windowStart);
    entry.timestamps.push(now);
    store.attempts.set(normalizedLogin, entry);
    scheduleCleanup(normalizedLogin, entry);

    let released = false;

    return {
        limitReached: entry.timestamps.length >= LOGIN_ATTEMPT_LIMIT,
        release: () => {
            if (released) {
                return;
            }

            released = true;
            if (store.locks.get(normalizedLogin) === currentLock) {
                store.locks.delete(normalizedLogin);
            }
            unlock();
        },
    };
}