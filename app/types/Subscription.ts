export interface Subscription {
    id: string;
    user_id: string;
    title: string;
    duration?: number;
    expiration_date: string;
    is_auto_renewal: boolean;
}
