import { v4 as uuidv4 } from "uuid";

export const B2C_DEVICE_ID_STORAGE_KEY = "b2c_device_id";

export function getB2cDeviceId(): string {
    const existingDeviceId = localStorage.getItem(B2C_DEVICE_ID_STORAGE_KEY);

    if (existingDeviceId !== null && existingDeviceId.trim() !== "") {
        return existingDeviceId;
    }

    const deviceId = uuidv4();
    localStorage.setItem(B2C_DEVICE_ID_STORAGE_KEY, deviceId);

    return deviceId;
}