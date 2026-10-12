import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  IconArmchair2,
  IconBuildingWarehouse,
  IconChartArea,
  IconChartLine,
  IconChefHat,
  IconClock,
  IconShoppingCart,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceIpadHorizontal,
  IconFileInvoice,
  IconFriends,
  IconLayoutDashboard,
  IconSettings2,
  IconStars,
  IconToolsKitchen3,
  IconUsersGroup,
  IconTruckDelivery,
} from "@tabler/icons-react";
import { clsx } from "clsx";
import { BRAND_LOGO_URL } from "../config/config";
import AvatarImg from "../assets/avatar.svg";
import { iconStroke } from "../config/config";
import { getUserDetailsInLocalStorage } from "../helpers/UserDetails";
import { NavbarContext } from "../contexts/NavbarContext";
import { toggleNavbar } from "../helpers/NavbarSettings";
import { SCOPES } from "../config/scopes";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";

export default function Navbar() {
  const { t } = useTranslation();
  const nt = (key, fallback) => t(key, { defaultValue: fallback });
  const { pathname } = useLocation();
  const user = getUserDetailsInLocalStorage();
  const { role: userRole, scope } = user;
  const userScopes = scope?.split(",");
  const { theme } = useTheme();
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useContext(NavbarContext);

  const navbarItems = [
    {
      type: "link",
      text: nt("navbar.dashboard", "Dashboard"),
      icon: <IconLayoutDashboard stroke={iconStroke} />,
      path: "/dashboard/home",
      scopes: [SCOPES.DASHBOARD]
    },
    {
      type: "link",
      text: nt("navbar.pos", "POS"),
      icon: <IconDeviceIpadHorizontal stroke={iconStroke} />,
      path: "/dashboard/pos",
      scopes: [SCOPES.POS]
    },
    {
      type: "link",
      text: nt("navbar.orders", "Orders"),
      icon: <IconToolsKitchen3 stroke={iconStroke} />,
      path: "/dashboard/orders",
      scopes: [SCOPES.POS, SCOPES.ORDERS, SCOPES.ORDER_STATUS, SCOPES.ORDER_STATUS_DISPLAY]
    },
    {
      type: "link",
      text: "Shifts",
      icon: <IconClock stroke={iconStroke} />,
      path: "/dashboard/shifts",
      scopes: [SCOPES.POS, SCOPES.SETTINGS]
    },
    {
      type: "link",
      text: nt("navbar.kitchen", "Kitchen"),
      icon: <IconChefHat stroke={iconStroke} />,
      path: "/dashboard/kitchen",
      scopes: [SCOPES.KITCHEN, SCOPES.KITCHEN_DISPLAY]
    },
    {
      type: "text",
      text: nt("navbar.offerings", "Offerings"),
    },
    {
      type: "link",
      text: nt("navbar.reservation", "Reservation"),
      icon: <IconArmchair2 stroke={iconStroke} />,
      path: "/dashboard/reservation",
      scopes: [SCOPES.RESERVATIONS, SCOPES.VIEW_RESERVATIONS, SCOPES.MANAGE_RESERVATIONS]
    },
    {
      type: "link",
      text: nt("navbar.customers", "Customers"),
      icon: <IconFriends stroke={iconStroke} />,
      path: "/dashboard/customers",
      scopes: [SCOPES.CUSTOMERS, SCOPES.VIEW_CUSTOMERS, SCOPES.MANAGE_CUSTOMERS]
    },
    {
      type: "link",
      text: nt("navbar.invoices", "Invoices"),
      icon: <IconFileInvoice stroke={iconStroke} />,
      path: "/dashboard/invoices",
      scopes: [SCOPES.INVOICES]
    },
    {
      type: "link",
      text: nt("navbar.inventory", "Inventory"),
      icon: <IconBuildingWarehouse stroke={iconStroke} />,
      path: "/dashboard/inventory",
      scopes: [SCOPES.INVENTORY]
    },
    {
      type: "link",
      text: nt("navbar.purchasing", "Purchasing"),
      icon: <IconShoppingCart stroke={iconStroke} />,
      path: "/dashboard/purchasing",
      scopes: [SCOPES.INVENTORY]
    },
    {
      type: "link",
      text: nt("navbar.supplier_ledger", "Supplier ledger (Udhaar)"),
      icon: <IconFileInvoice stroke={iconStroke} />,
      path: "/dashboard/supplier-ledger",
      scopes: [SCOPES.INVENTORY]
    },
    {
      type: "link",
      text: nt("navbar.branches", "Branches"),
      icon: <IconBuildingWarehouse stroke={iconStroke} />,
      path: "/dashboard/branches",
      scopes: [SCOPES.SETTINGS]
    },
    {
      type: "link",
      text: nt("navbar.combos", "Combos & deals"),
      icon: <IconChartLine stroke={iconStroke} />,
      path: "/dashboard/combos",
      scopes: [SCOPES.SETTINGS]
    },
    {
      type: "link",
      text: nt("navbar.promotions", "Promotions"),
      icon: <IconStars stroke={iconStroke} />,
      path: "/dashboard/promotions",
      scopes: [SCOPES.SETTINGS]
    },
    {
      type: "link",
      text: nt("navbar.staff", "Staff"),
      icon: <IconUsersGroup stroke={iconStroke} />,
      path: "/dashboard/staff",
      scopes: [SCOPES.SETTINGS]
    },
    {
      type: "link",
      text: nt("navbar.riders", "Riders & zones"),
      icon: <IconTruckDelivery stroke={iconStroke} />,
      path: "/dashboard/riders",
      scopes: [SCOPES.SETTINGS]
    },
    {
      type: "text",
      text: nt("navbar.back_office", "Back Office"),
    },
    {
      type: "link",
      text: nt("navbar.feedbacks", "Feedbacks"),
      icon: <IconStars stroke={iconStroke} />,
      path: "/dashboard/feedbacks",
      scopes: [SCOPES.FEEDBACK]
    },
    {
      type: "link",
      text: nt("navbar.users", "Users"),
      icon: <IconUsersGroup stroke={iconStroke} />,
      path: "/dashboard/users",
      scopes: []
    },
    {
      type: "link",
      text: nt("navbar.reports", "Reports"),
      icon: <IconChartArea stroke={iconStroke} />,
      path: "/dashboard/reports",
      scopes: [SCOPES.REPORTS]
    },
    {
      type: "link",
      text: "Profit & loss",
      icon: <IconChartLine stroke={iconStroke} />,
      path: "/dashboard/profit-loss",
      scopes: [SCOPES.REPORTS]
    },
    {
      type: "link",
      text: nt("navbar.settings", "Settings"),
      icon: <IconSettings2 stroke={iconStroke} />,
      path: "/dashboard/settings",
      scopes: [SCOPES.SETTINGS]
    },
  ];

  const btnToggleNavbar = () => {
    const isNavCollapsed = toggleNavbar();
    console.log(isNavCollapsed);
    if (isNavCollapsed) {
      setIsNavbarCollapsed(true);
    } else {
      setIsNavbarCollapsed(false);
    }
  };

  if (isNavbarCollapsed) {
    return (
       <div className ="flex flex-col items-start gap-4 h-screen px-5 py-6 overflow-y-auto fixed left-0 top-0 bg-apax-green-light">

      <img src={BRAND_LOGO_URL} alt="logo" className="w-12 block mb-6" />
        {navbarItems.filter((navItem)=>{
          const requiredScopes = navItem.scopes;
          if(navItem.type=="link") {
            if(userRole == "admin") {
              return true;
            }

            return requiredScopes.some((scope)=>userScopes.includes(scope));
          }
        }).map((item, index) => {
          if (item.type == "text") {
            return;
          }

          return (
            <Link
              key={index}
              className={clsx(
                `w-12 h-12 flex items-center justify-center rounded-full transition`,
                {
                  "bg-apax-bg-hover-dark-mode font-medium text-white": theme === 'black' && pathname.includes(item.path),
                  "bg-apax-border-green-light font-medium text-black": theme !== 'black' && pathname.includes(item.path),
                  "hover:bg-apax-bg-hover-dark-mode": theme === 'black' && !pathname.includes(item.path),
                  "hover:bg-apax-border-green-light": theme !== 'black' && !pathname.includes(item.path),
                }
              )}
              to={item.path}
            >
              {React.cloneElement(item.icon, {
                className: clsx(
                  "transition-colors text-current",
                  {
                    'text-white': theme === 'black' && pathname.includes(item.path),
                    'text-black': theme !== 'black' && pathname.includes(item.path),
                  }
                ),
              })}
            </Link>
          );
        })}

        <button
          onClick={btnToggleNavbar}
          className="w-12 h-12 flex items-center justify-center rounded-full transitionborder border-apax-green-light hover:bg-apax-border-green text-apax-text"
        >
          <IconChevronRight stroke={iconStroke} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen">
      <div className="flex flex-col items-start gap-2 md:w-72  md:gap-3 h-screen px-5 py-6 overflow-y-auto fixed left-0 top-0 bg-apax-green-light">
        <img src={BRAND_LOGO_URL} alt="logo" className="block w-12 md:w-auto md:h-14 mb-2 md:mb-6"/>

        <div className="hidden md:flex items-center gap-2 w-full md:mb-6">
          <img
            src={AvatarImg}
            alt="avatar"
            className="md:w-12 md:h-12 rounded-full block"
          />
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-gray-500">
              {new String(user.role).toUpperCase()}
              {user.designation && <span>, {user.designation}</span>}
            </p>
          </div>
        </div>

        {navbarItems.filter((navItem)=>{
          const requiredScopes = navItem.scopes;
          if(navItem.type=="text") {
            return true;
          }
          if(navItem.type=="link") {
            if(userRole == "admin") {
              return true;
            }

            return requiredScopes.some((scope)=>userScopes.includes(scope));
          }
        }).map((item, index) => {
          if (item.type == "text") {
            return (
              <p key={index} className="font-bold hidden md:block">
                {item.text}
              </p>
            );
          }

          return (

          <Link
            key={index}
            to={item.path}
            className={clsx(
              `w-12 h-12 md:w-full flex justify-center md:justify-normal items-center md:gap-1 md:px-4 md:py-3 rounded-full transition group`,
              {
                'bg-apax-border-green-light font-medium': theme !== 'black' && pathname.includes(item.path),
                'bg-apax-bg-hover-dark-mode font-medium text-white': theme === 'black' && pathname.includes(item.path),
                'hover:bg-apax-bg-hover-dark-mode hover:text-white': theme === 'black' && !pathname.includes(item.path),
                'hover:bg-apax-border-green-light': theme !== 'black' && !pathname.includes(item.path),
                'text-white': theme === 'black' && !pathname.includes(item.path),
                'text-black': theme === 'black' && pathname.includes(item.path),
                'text-apax-text-light-mode hover:text-black': theme !== 'black',
              }
            )}
          >
            {React.cloneElement(item.icon, {
              className: clsx(
                'transition-colors',
                {
                  'text-white group-hover:text-white hover:text-white': theme === 'black',
                  'text-black': theme !== 'black',
                }
              ),
            })}
            <p
              className={clsx(
                'hidden md:block transition-colors',
                {
                  'text-white group-hover:text-white hover:text-white': theme === 'black',
                  'text-gray-900 group-hover:text-black': theme !== 'black',
                  'text-black': theme !== 'black' && pathname.includes(item.path),
                }
              )}
            >
              {item.text}
            </p>
          </Link>

          );
        })}
      </div>

      <button
        onClick={btnToggleNavbar}
        className="w-9 h-9 hidden md:flex items-center justify-center rounded-full border transition bg-apax-green-light border-apax-border-green dark:bg-apax-gray hover:bg-gray-100 dark:hover:bg-apax-button-hover text-gray-500 fixed bottom-4 left-[17.5rem] -translate-x-1/2"
      >
        <IconChevronLeft stroke={iconStroke} size={18} />
      </button>
    </div>
  );
}
