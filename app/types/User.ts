export interface User {
    user_id: string;
    login: string;
    name: string;
    is_active?: boolean;
    password_hash?: string;
}
