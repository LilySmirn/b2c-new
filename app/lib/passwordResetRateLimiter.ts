export const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

const globalStore = globalThis as typeof globalThis & {
    __passwordResetRequests?: Map<string, number>;
};
const requests = globalStore.__passwordResetRequests ??= new Map<string, number>();

export function registerPasswordResetRequest(email: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const previous = requests.get(email);
    if (previous !== undefined && now - previous < PASSWORD_RESET_COOLDOWN_MS) {
        return { allowed: false, retryAfterSeconds: Math.ceil((PASSWORD_RESET_COOLDOWN_MS - (now - previous)) / 1000) };
    }
    requests.set(email, now);
    const timer = setTimeout(() => {
        if (requests.get(email) === now) requests.delete(email);
    }, PASSWORD_RESET_COOLDOWN_MS);
    timer.unref?.();
    return { allowed: true, retryAfterSeconds: 60 };
}