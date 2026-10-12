export const API = import.meta.env.VITE_BACKEND
export const VITE_BACKEND_SOCKET_IO = import.meta.env.VITE_BACKEND_SOCKET_IO
export const API_IMAGES_BASE_URL = import.meta.env.VITE_BACKEND_IMAGES_BASE_URL
export const FRONTEND_DOMAIN = import.meta.env.VITE_FRONTEND_DOMAIN

export const iconStroke = 1.5;

/** Brand mark in `public/` (replaces inline SVG logos). */
export const BRAND_LOGO_URL = "/theme-favicon-logo.png";

export const supportEmail = "apaxpos@gmail.com";
export const supportPhone = "0337 3300112";
export const supportPhoneTel = "+923373300112";
export const appVersion = "1.8.0";

export const subscriptionAmount = 5;
export const subscriptionPrice = "$" + subscriptionAmount;

export const stripeProductSubscriptionId = import.meta.env.VITE_STRIPE_PRODUCT_SUBSCRIPTION_KEY;