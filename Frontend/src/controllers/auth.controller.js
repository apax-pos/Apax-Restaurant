import ApiClient from "../helpers/ApiClient";
import axios from "axios";
import { API } from "../config/config";
import { clearUserDetailsInLocalStorage } from "../helpers/UserDetails";
import { clearAccessToken } from "../helpers/accessToken";
import useSWR from "swr";
import Cookie from "js-cookie";

export async function signIn(username, password) {
    axios.defaults.withCredentials = true;
    try {
        const response = await axios.post(`${API}/auth/signin`, {
            username, password
        });

        Cookie.set("apaxpos__authenticated", "true", { sameSite: "none", secure: true, path: "/", expires: 7 });
        return response;
    } catch (error) {
        throw error;
    }
}

export async function signUp(biz_name, username, password) {
    axios.defaults.withCredentials = true;
    try {
        const response = await axios.post(`${API}/auth/signup`, {
            biz_name, username, password
        });

        return response;
    } catch (error) {
        throw error;
    }
}

export async function signOut() {
    axios.defaults.withCredentials = true;
    try {
        const response = await ApiClient.post(`${API}/auth/signout`);

        clearUserDetailsInLocalStorage();
        clearAccessToken();
        Cookie.remove("apaxpos__authenticated", { path: "/" });

        return response;
    } catch (error) {
        throw error;
    }
}

export async function forgotPassword(email) {
    axios.defaults.withCredentials = true;
    try {
        const response = await axios.post(`${API}/auth/forgot-password`, {
            username: email
        });

        return response;
    } catch (error) {
        throw error;
    }
}

export async function resetPassword(token, password) {
    axios.defaults.withCredentials = true;
    try {
        const response = await axios.post(`${API}/auth/reset-password/${token}`, {
            password
        });

        return response;
    } catch (error) {
        throw error;
    }
}

export async function getStripeSubscriptionURL(productLookupKey) {
    axios.defaults.withCredentials = true;
    try {
        const response = await ApiClient.post(`${API}/auth/stripe-product-lookup`, {
            id: productLookupKey
        });
        return response;
    } catch (error) {
        throw error;
    }
}


const fetcher = (url) => ApiClient.get(url).then((res) => res.data);

export function useSubscriptionDetails() {
  const APIURL = `/auth/subscription-details`;
  const { data, error, isLoading } = useSWR(APIURL, fetcher);
  return {
    data,
    error,
    isLoading,
    APIURL,
  };
}

export function useTenantSubscriptionOffer() {
  const APIURL = `/auth/subscription-offer`;
  const { data, error, isLoading } = useSWR(APIURL, fetcher);
  return {
    offer: data?.data,
    error,
    isLoading,
    APIURL,
  };
}

export async function cancelSubscription(subscriptionId) {
    axios.defaults.withCredentials = true;
    try {
        const response = await ApiClient.post(`${API}/auth/cancel-subscription`, {
            id: subscriptionId
        });
        return response;
    } catch (error) {
        throw error;
    }
}