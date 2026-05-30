export function randomOTP() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return String(1000 + (array[0] % 9000)); // 4 digits, cryptographically secure
}
export function prepareOtpData(entity, action, expireInMin = 15) {
    const expiresAt = new Date(Date.now() + expireInMin * 60 * 1000);
    switch (action) {
        case "SIGNIN_WITH_PHONE":
        case "ORG_SIGNIN_WITH_PHONE":
            return {
                action,
                otp: "1234", // fixed OTP for phone sign-in (dev/test)
                expires_at: expiresAt,
                phone: entity.phone ?? null,
            };
        case "SIGNIN_WITH_EMAIL":
        case "ORG_SIGNIN_WITH_EMAIL":
            return {
                action,
                otp: randomOTP(),
                expires_at: expiresAt,
                email: entity.email ?? null,
            };
        default:
            throw new Error(`Invalid OTP action type: "${action}"`);
    }
}
