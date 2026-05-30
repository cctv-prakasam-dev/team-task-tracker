export const appConfig = {
    port: Number(process.env.PORT) || 3000,
    version: process.env.API_VERSION,
    cookie_domain: process.env.COOKIE_DOMAIN,
    app_url: process.env.APP_URL,
};
