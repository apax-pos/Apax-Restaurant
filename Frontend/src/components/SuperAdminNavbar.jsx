import React, { useContext, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IconBuildingStore,
  IconChartArea,
  IconChevronLeft,
  IconChevronRight,
  IconCreditCard,
  IconLayoutDashboard,
  IconDatabaseExport,
  IconSettings,
} from "@tabler/icons-react";
import { clsx } from "clsx";
import AvatarImg from "../assets/avatar.svg";
import { BRAND_LOGO_URL } from "../config/config";
import { iconStroke } from "../config/config";
import { getUserDetailsInLocalStorage } from "../helpers/UserDetails";
import { NavbarContext } from "../contexts/NavbarContext";
import { toggleNavbar } from "../helpers/NavbarSettings";
import { useTheme } from "../contexts/ThemeContext";

function isNavActive(pathname, path) {
  if (path.endsWith("/home")) {
    return (
      pathname === "/superadmin/dashboard" ||
      pathname === "/superadmin/dashboard/" ||
      pathname === path
    );
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function SuperAdminNavbar() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { pathname } = useLocation();
  const user = getUserDetailsInLocalStorage();

  const [isNavbarCollapsed, setIsNavbarCollapsed] = useContext(NavbarContext);

  const navbarItems = useMemo(
    () => [
      {
        type: "link",
        text: t("superadmin_navbar.dashboard"),
        icon: <IconLayoutDashboard stroke={iconStroke} />,
        path: "/superadmin/dashboard/home",
      },
      {
        type: "link",
        text: t("superadmin_navbar.tenants"),
        icon: <IconBuildingStore stroke={iconStroke} />,
        path: "/superadmin/dashboard/tenants",
      },
      {
        type: "link",
        text: t("superadmin_navbar.subscription_offer"),
        icon: <IconCreditCard stroke={iconStroke} />,
        path: "/superadmin/dashboard/subscription-offer",
      },
      {
        type: "link",
        text: t("superadmin_navbar.reports"),
        icon: <IconChartArea stroke={iconStroke} />,
        path: "/superadmin/dashboard/reports",
      },
      {
        type: "link",
        text: t("superadmin_navbar.backup"),
        icon: <IconDatabaseExport stroke={iconStroke} />,
        path: "/superadmin/dashboard/backup",
      },
      {
        type: "link",
        text: t("superadmin_navbar.settings"),
        icon: <IconSettings stroke={iconStroke} />,
        path: "/superadmin/dashboard/settings",
      },
    ],
    [t, i18n.language]
  );

  const linkClass = (item, collapsed) =>
    function navClass({ isActive: navActive }) {
      const active = navActive || isNavActive(pathname, item.path);
      return clsx(
        "flex items-center transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-apax-green focus-visible:ring-offset-2 focus-visible:ring-offset-apax-card-bg",
        collapsed
          ? clsx(
              "w-12 h-12 justify-center rounded-xl",
              active
                ? theme === "black"
                  ? "bg-apax-bg-hover-dark-mode text-apax-green shadow-sm"
                  : "bg-apax-border-green-light text-apax-green shadow-sm"
                : theme === "black"
                ? "text-apax-text hover:bg-apax-bg-hover-dark-mode/70"
                : "text-apax-text hover:bg-apax-border-green-light/80"
            )
          : clsx(
              "w-12 h-12 md:w-full md:min-h-[3rem] justify-center md:justify-start gap-0 md:gap-3 rounded-xl md:rounded-2xl md:px-3.5 md:py-2.5",
              active
                ? theme === "black"
                  ? "md:bg-apax-bg-hover-dark-mode text-apax-green font-semibold md:shadow-inner"
                  : "md:bg-apax-border-green-light text-apax-green font-semibold md:shadow-sm"
                : theme === "black"
                ? "text-apax-text md:hover:bg-apax-bg-hover-dark-mode/50"
                : "text-apax-text md:hover:bg-apax-border-green-light/60"
            )
      );
    };

  const btnToggleNavbar = () => {
    const isNavCollapsed = toggleNavbar();
    if (isNavCollapsed) {
      setIsNavbarCollapsed(true);
    } else {
      setIsNavbarCollapsed(false);
    }
  };

  if (isNavbarCollapsed) {
    return (
      <div className="flex flex-col items-start gap-3 h-screen px-4 py-6 overflow-y-auto fixed left-0 top-0 bg-apax-green-light dark:bg-apax-gray border-r border-apax-border-green/30">
        <img
          src={BRAND_LOGO_URL}
          alt="logo"
          className="w-12 block mb-4"
        />
        {navbarItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            end={item.path.endsWith("/home")}
            className={linkClass(item, true)}
            title={item.text}
          >
            <span className="flex items-center justify-center [&>svg]:shrink-0">
              {item.icon}
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={btnToggleNavbar}
          className="w-12 h-12 flex items-center justify-center rounded-xl transition border border-apax-border-green/40 hover:bg-apax-border-green-light text-apax-text mt-auto"
          aria-label={t("superadmin_navbar.expand_menu")}
        >
          <IconChevronRight stroke={iconStroke} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <div className="md:w-72 flex flex-col items-stretch gap-1.5 h-screen px-4 py-6 overflow-y-auto fixed left-0 top-0 border-r border-apax-border-green bg-apax-card-bg shadow-[4px_0_24px_-8px_rgba(0,0,0,0.06)] dark:shadow-none">
        <img
          src={BRAND_LOGO_URL}
          alt="logo"
          className="w-12 md:w-auto md:h-14 block mb-2 md:mb-5"
        />

        <div className="hidden md:flex items-center gap-3 w-full mb-5 pb-5 border-b border-apax-border-green/50">
          <img
            src={AvatarImg}
            alt=""
            className="w-11 h-11 rounded-full ring-2 ring-apax-border-green-light object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-apax-text truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate uppercase tracking-wide">
              {user?.role}
              {user?.designation && (
                <span className="normal-case">, {user.designation}</span>
              )}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1" aria-label="Super admin">
          {navbarItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              end={item.path.endsWith("/home")}
              className={linkClass(item, false)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-apax-green-light/60 dark:bg-white/5 md:h-9 md:w-9">
                {item.icon}
              </span>
              <span className="hidden md:inline text-sm leading-tight text-left">
                {item.text}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={btnToggleNavbar}
        className="w-9 h-9 hidden md:flex items-center justify-center rounded-full border transition bg-apax-green-light dark:bg-apax-gray hover:bg-gray-200 dark:hover:bg-apax-button-hover text-gray-500 fixed bottom-4 left-[17.5rem] -translate-x-1/2 dark:border-apax-border-green shadow-sm"
        aria-label={t("superadmin_navbar.collapse_menu")}
      >
        <IconChevronLeft stroke={iconStroke} size={18} />
      </button>
    </div>
  );
}
