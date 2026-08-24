export const MIN_PASSWORD_LENGTH = 6;

export function getPasswordValidationError(password: unknown): string | null {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return `Пароль должен содержать не менее ${MIN_PASSWORD_LENGTH} символов`;
    }

    return null;
}