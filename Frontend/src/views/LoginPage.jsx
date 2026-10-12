import React, { useEffect } from "react";
import { clsx } from "clsx";
import { BRAND_LOGO_URL } from "../config/config";
import { toast } from "react-hot-toast";
import { signIn } from "../controllers/auth.controller";
import { Link, useNavigate } from "react-router-dom";
import { isUserAuthenticated } from "../helpers/AuthStatus";
import {
  getUserDetailsInLocalStorage,
  saveUserDetailsInLocalStorage,
} from "../helpers/UserDetails";
import { setAccessToken } from "../helpers/accessToken";
import { SCOPES } from "../config/scopes";
import { useTranslation } from "react-i18next";
import { emptyStateIllu } from "../config/emptyStateIllustrations";
export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const authenticated = isUserAuthenticated();
    if (authenticated) {
      const user = getUserDetailsInLocalStorage();
      if (!user) return;
      const { role, scope } = user;
      if (role == "superadmin") {
        navigate("/superadmin/dashboard/home", {
          replace: true,
        });
        return;
      }
      if (role == "admin") {
        navigate("/dashboard/home", {
          replace: true,
        });
        return;
      }
      const userScopes = scope.split(",");
      if (userScopes.includes(SCOPES.DASHBOARD)) {
        navigate("/dashboard/home", {
          replace: true,
        });
        return;
      } else {
        navigate("/dashboard/profile", {
          replace: true,
        });
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = e.target.username.value;
    const password = e.target.password.value;

    if (!username) {
      e.target.username.focus();
      toast.error(t("login.username_error"));
      return;
    }

    if (!password) {
      e.target.password.focus();
      toast.error(t("login.password_error"));
      return;
    }

    try {
      toast.loading(t("login.loading_message"));

      const res = await signIn(username, password);

      if (res.status == 200) {
        toast.dismiss();
        toast.success(t("login.success_message"));

        const user = res.data.user;
        saveUserDetailsInLocalStorage(user);
        if (res.data.accessToken) {
          setAccessToken(res.data.accessToken);
        }

        const { role, scope } = getUserDetailsInLocalStorage();
        if (role == "admin") {
          navigate("/dashboard/home", {
            replace: true,
          });
          return;
        }
        const userScopes = scope.split(",");
        if (userScopes.includes(SCOPES.DASHBOARD)) {
          navigate("/dashboard/home", {
            replace: true,
          });
          return;
        } else {
          navigate("/dashboard/profile", {
            replace: true,
          });
        }

        return;
      } else {
        const message = res.data.message;
        toast.dismiss();
        toast.error(message);
        return;
      }
    } catch (error) {
      console.error(error);
      const message = error?.response?.data?.message || t("login.error_message");

      toast.dismiss();
      toast.error(message);
      return;
    }
  };

  return (
    <div className='relative overflow-x-hidden md:overflow-hidden bg-apax-green-light dark:bg-apax-card-bg'>
      
      <img
        src={emptyStateIllu.circle}
        alt="illustration"
        className='absolute w-96 lg:w-[1024px] h-96 lg:h-[1024px] lg:-bottom-96 lg:-right-52 -right-36 black:opacity-80'
      />

      <div className="flex flex-col md:flex-row items-center justify-end md:justify-between gap-10 h-screen container mx-auto px-4 md:px-0 py-4 md:py-0 relative">
        <div className="lg:mx-12">
          <h3 className='text-2xl lg:text-6xl font-black text-apax-green-dark dark:text-apax-green-dark-mode'>
            {t("home.cafe_restaurant")}
          </h3>
          <h3 className='text-2xl lg:text-6xl font-black outline-text text-apax-green-light dark:text-apax-green'>
            {t("home.hotel_bar")}
          </h3>
        </div>

        <div className='sm:w-96 mx-8 sm:mx-0 shadow-2xl lg:mx-12 rounded-2xl px-8 py-8 w-full bg-white dark:bg-black border border-apax-green-light'>
          <div className="flex items-center justify-between">
            <div className='text-xl font-medium'>
              {t("login.title")}
            </div>
            <div>
              <img src={BRAND_LOGO_URL} alt="logo" className="h-16" />
            </div>
          </div>

          <form className="mt-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className='text-apax-text'
              >
                {t("login.email_label")}
              </label>
              <input
                type="email"
                id="username"
                name="username"
                required
                placeholder={t("login.email_placeholder")}
                className='mt-1 block w-full px-4 py-3 rounded-xl outline-none focus-visible:ring-1 bg-apax-gray focus-visible:ring-apax-ring'
                tabIndex={1}
              />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className= 'text-apax-text'
                >
                  {t("login.password_label")}
                </label>
                <Link
                  tabIndex={5}
                  className = 'block text-xs text-apax-text'
                  to="/forgot-password"
                >
                  {t("login.forgot_password")}
                </Link>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                required
                placeholder={t("login.password_placeholder")}
                className='mt-1 block w-full px-4 py-3 rounded-xl outline-none focus-visible:ring-1 bg-apax-gray focus-visible:ring-apax-ring'
                tabIndex={2}
              />
            </div>

            <button
              type="submit"
              className='block w-full mt-6 text-white rounded-xl px-4 py-3 transition hover:scale-105 active:scale-95 hover:shadow-md outline-none focus-visible:ring-1 bg-apax-green focus-visible:ring-apax-ring hover:bg-apax-green-button-hover'
              tabIndex={3}
            >
              {t("login.login_button")}
            </button>
          </form>
        </div>
      </div>
    </div>

  );
}
