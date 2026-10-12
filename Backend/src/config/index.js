exports.CONFIG = {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRY: process.env.JWT_EXPIRY,
    JWT_EXPIRY_REFRESH: process.env.JWT_EXPIRY_REFRESH,
    COOKIE_EXPIRY: process.env.COOKIE_EXPIRY,
    COOKIE_EXPIRY_REFRESH: process.env.COOKIE_EXPIRY_REFRESH,
    FRONTEND_DOMAIN: process.env.FRONTEND_DOMAIN,
    FRONTEND_DOMAIN_COOKIE: process.env.FRONTEND_DOMAIN_COOKIE,
    /** Comma-separated allowed browser origins for CORS (e.g. https://apaxrestaurant.apaxpos.com) */
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    PASSWORD_SALT: parseInt(process.env.PASSWORD_SALT) || 10,
    STRIPE_SECRET: process.env.STRIPE_SECRET,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    /** Fallback Stripe Price IDs (price_...) if DB `subscription_offer_settings` is empty */
    STRIPE_DEFAULT_PRICE_MONTHLY: process.env.STRIPE_DEFAULT_PRICE_MONTHLY || null,
    STRIPE_DEFAULT_PRICE_YEARLY: process.env.STRIPE_DEFAULT_PRICE_YEARLY || null,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_EMAIL: process.env.SMTP_EMAIL,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
};

exports.LANGUAGES = [
    'ar',
    'en',
    'es',
    'fr',
    'hi',
    'ja',
    'ko'
]
