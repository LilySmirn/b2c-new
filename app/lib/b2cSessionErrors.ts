export const DEVICE_LIMIT_REACHED = "DEVICE_LIMIT_REACHED";

export class DeviceLimitReachedError extends Error {
    constructor() {
        super(DEVICE_LIMIT_REACHED);
        this.name = "DeviceLimitReachedError";
    }
}