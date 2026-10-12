const KEY = "apaxpos_user";
const LEGACY_KEY = "restroprosaas_user";

export function saveUserDetailsInLocalStorage(user) {
    localStorage.setItem(KEY, JSON.stringify(user));
    localStorage.removeItem(LEGACY_KEY);
}

export function getUserDetailsInLocalStorage() {
    let userStr = localStorage.getItem(KEY);
    if (!userStr) {
        userStr = localStorage.getItem(LEGACY_KEY);
        if (userStr) {
            try {
                const parsed = JSON.parse(userStr);
                saveUserDetailsInLocalStorage(parsed);
                return parsed;
            } catch {
                return null;
            }
        }
        return null;
    }
    try {
        return JSON.parse(userStr);
    } catch {
        return null;
    }
}

export function clearUserDetailsInLocalStorage() {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
}