const { CONFIG } = require("../config");
const {
  removeRefreshTokenDB,
  addRefreshTokenDB,
  verifyRefreshTokenDB,
} = require("../services/auth.service");

const { signInDB, getAdminUserDB, updateSuperAdminProfileDB, getActiveTenantsDB, getInActiveTenantsDB, getAllTenantsDB, getOrdersProcessedTodayDB, getSalesVolumeTodayDB, getMRRValueDB, getARRValueDB, getRestaurantsTotalCustomersDB, getSuperAdminTopSellingItemsDB, getSuperAdminSalesVolumeDB, getSuperAdminOrdersProcessedDB, getTenantsDB, addTenantDB, updateTenantDB, getTenantCntByIdDB, getTenantDetailsByIdDB, logoutAllUsersOfTenantDB, deleteTenantDB, getTenantsDataByStatusDB, getTenantSubscriptionHistoryDB, getTenantTotalUsersDB, getTenantDetailsDB, getTenantStoreDetailsDB, setTenantSubscriptionDB, getSubscriptionOfferSettingsDB, upsertSubscriptionOfferSettingsDB } = require("../services/superadmin.service")
const {
  authCookieOptions,
  clientAuthFlagOptions,
  clearAuthCookieOptions,
} = require("../utils/cookieOptions");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");
const { checkEmailExistsSuperadminDB } = require('../services/auth.service');

exports.signIn = async (req, res) => {
    try {

        const username = req.body.username;
        const password = req.body.password;

        if (!(username && password)) {
            return res.status(400).json({
                success: false,
                message: req.__("please_provide_required_details") // Translate message
            });
        }

        const result = await signInDB(username, password);

        if (result) {
            const cookieOptions = authCookieOptions(CONFIG.COOKIE_EXPIRY);
            const refreshTokenExpiry = new Date(
                Date.now() + parseInt(CONFIG.COOKIE_EXPIRY_REFRESH)
            );
            const cookieRefreshTokenOptions = authCookieOptions(
                CONFIG.COOKIE_EXPIRY_REFRESH
            );

            result.password = undefined;

            const payload = {
                username: result.email,
                name: result.name,
                role: "superadmin",
            }
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);

            const deviceDetails = req.useragent || {};
            const deviceIP =
                (req.socket && req.socket.remoteAddress) ||
                (req.connection && req.connection.remoteAddress) ||
                "";
            const deviceName = `${deviceDetails.platform || "unknown"}\nBrowser: ${deviceDetails.browser || "unknown"}`;
            const deviceLocation = null;
            await addRefreshTokenDB(username, refreshToken, refreshTokenExpiry, deviceIP, deviceName, deviceLocation, null);

            res.cookie("accessToken", accessToken, cookieOptions);
            res.cookie("refreshToken", refreshToken, cookieRefreshTokenOptions);
            res.cookie(
                "apaxpos__authenticated",
                true,
                clientAuthFlagOptions(CONFIG.COOKIE_EXPIRY_REFRESH)
            );
            res.clearCookie("restroprosaas__authenticated", {
                ...clientAuthFlagOptions(0),
                expires: new Date(0),
            });

            return res.status(200).json({
                success: true,
                message: req.__("login_successful"), // Translate message
                accessToken,
                user: payload
            })

        } else {
            return res.status(401).json({
                success: false,
                message: req.__("email_or_password_invalid") // Translate message
            });
        }


    } catch (error) {
        console.error("DEBUG LOGIN ERROR:", error);
        const detail =
            (error && typeof error.message === "string" && error.message.trim()) ||
            (typeof error === "string" && error.trim()) ||
            "";
        return res.status(500).json({
            success: false,
            message: detail || req.__("facing_issues_try_later"),
        });
    }
}
exports.getSuperAdminProfile = async (req, res) => {
  try {
    const admin = await getAdminUserDB(req.user.username);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: req.__("operation_not_allowed"),
      });
    }
    return res.status(200).json({
      success: true,
      data: {
        name: admin.name,
        email: admin.email,
        username: admin.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: req.__("something_went_wrong_try_later"),
    });
  }
};

exports.updateSuperAdminProfile = async (req, res) => {
  try {
    const currentEmail = req.user.username;
    const { name, email, currentPassword, newPassword, confirmPassword } =
      req.body;

    if (
      newPassword &&
      String(newPassword) !== String(confirmPassword || "")
    ) {
      return res.status(400).json({
        success: false,
        message: req.__("passwords_do_not_match"),
      });
    }

    if (newPassword && String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: req.__("password_too_short"),
      });
    }

    const updated = await updateSuperAdminProfileDB(currentEmail, {
      name,
      email,
      currentPassword,
      newPassword,
    });

    const payload = {
      username: updated.email,
      name: updated.name,
      role: "superadmin",
    };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const refreshTokenExpiry = new Date(
      Date.now() + parseInt(CONFIG.COOKIE_EXPIRY_REFRESH)
    );

    await addRefreshTokenDB(
      updated.email,
      refreshToken,
      refreshTokenExpiry,
      req.ip,
      "Profile update",
      null,
      null
    );

    res.cookie("accessToken", accessToken, authCookieOptions(CONFIG.COOKIE_EXPIRY));
    res.cookie(
      "refreshToken",
      refreshToken,
      authCookieOptions(CONFIG.COOKIE_EXPIRY_REFRESH)
    );
    res.cookie(
      "apaxpos__authenticated",
      true,
      clientAuthFlagOptions(CONFIG.COOKIE_EXPIRY_REFRESH)
    );

    return res.status(200).json({
      success: true,
      message: req.__("details_saved_successfully"),
      accessToken,
      user: payload,
    });
  } catch (error) {
    if (error.message === "invalid_current_password") {
      return res.status(400).json({
        success: false,
        message: req.__("current_password_incorrect"),
      });
    }
    if (error.message === "current_password_required") {
      return res.status(400).json({
        success: false,
        message: req.__("please_provide_required_details"),
      });
    }
    if (error.message === "email_exists") {
      return res.status(409).json({
        success: false,
        message: req.__("account_exists_try_login"),
      });
    }
    if (error.message === "invalid_email") {
      return res.status(400).json({
        success: false,
        message: req.__("invalid_email"),
      });
    }
    console.error(error);
    return res.status(500).json({
      success: false,
      message: req.__("something_went_wrong_try_later"),
    });
  }
};

exports.signOut = async (req, res) => {
    try {
        const user = req.user;
        const refreshToken = req.cookies.refreshToken;

        const clearOpts = clearAuthCookieOptions();
        const clearClient = { ...clientAuthFlagOptions(0), expires: new Date(0) };

        res.clearCookie("accessToken", clearOpts);
        res.clearCookie("refreshToken", clearOpts);
        res.clearCookie("apaxpos__authenticated", clearClient);
        res.clearCookie("restroprosaas__authenticated", clearClient);

        // remove refreshToken in DB.
        await removeRefreshTokenDB(user.username, refreshToken);

        return res.status(200).json({
            success: true,
            message: req.__("logout_successful") // Translate message
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later") // Translate message
        });
    }
}

exports.getNewAccessToken = async (req, res) => {
    try {
        const user = req.user;
        const refreshToken = req.cookies.refreshToken;

        // verify the refresh token with the DB
        const isExist = await verifyRefreshTokenDB(refreshToken);

        if (isExist) {
            const u = await getAdminUserDB(user.username);
            const payload = {
                username: u.email,
                name: u.name,
                role: "superadmin",
            }
            const accessToken = generateAccessToken(payload);

            res.cookie("accessToken", accessToken, authCookieOptions(CONFIG.COOKIE_EXPIRY));
            res.cookie(
                "apaxpos__authenticated",
                true,
                clientAuthFlagOptions(CONFIG.COOKIE_EXPIRY_REFRESH)
            );

            return res.status(200).json({
                success: true,
                message: req.__("new_token_created_successfully"), // Translate message
                accessToken
            });
        } else {
            const clearOpts = clearAuthCookieOptions();
            const clearClient = { ...clientAuthFlagOptions(0), expires: new Date(0) };
            res.clearCookie("accessToken", clearOpts);
            res.clearCookie("refreshToken", clearOpts);
            res.clearCookie("apaxpos__authenticated", clearClient);
            res.clearCookie("restroprosaas__authenticated", clearClient);
            return res.status(401).json({
                success: false,
                loginNeeded: true,
                message: req.__("login_again_to_access") // Translate message
            });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later") // Translate message
        });
    }
};

exports.getTenants = async (req, res) => {
    try {
        const { page, perPage, search, status, type, from, to } = req.query;

        // if (!type) {
        //     return res.status(400).json({
        //       success: false,
        //       message: req.__("please_provide_required_details") // Translate message
        //     });
        //   }

        if (type == "custom") {
            if (!(from && to)) {
                return res.status(400).json({
                    success: false,
                    message: req.__("provide_from_to_dates") // Translate message
                });
            }
        }

        const result = await getTenantsDB(page, perPage, search, status, type, from, to);

        return res.status(200).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later") // Translate message
        });
    }
}

exports.getSuperAdminTenantsCntData = async (req, res) => {
    try {

        const [activeTenants, inactiveTenants, allTenants] = await Promise.all([
            getActiveTenantsDB(),
            getInActiveTenantsDB(),
            getAllTenantsDB(),
        ]);

        return res.status(200).json({
            activeTenants, inactiveTenants, allTenants
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later") // Translate message
        });
    }
}

exports.getSuperAdminDashboardData = async (req, res) => {
    try {

        const [activeTenants, ordersProcessedToday, salesVolumeToday, mrr, arr] = await Promise.all([
            getActiveTenantsDB(),
            getOrdersProcessedTodayDB(),
            getSalesVolumeTodayDB(),
            getMRRValueDB(),
            getARRValueDB()
        ]);

        return res.status(200).json({
            activeTenants, ordersProcessedToday, salesVolumeToday, mrr, arr
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later") // Translate message
        });
    }
};

exports.addTenant = async (req, res) => {
    try {
        const { name, email, password, isActive } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({
                message: req.__("please_provide_required_details") // Translate message
            });
        }

        const isAdmin = 1;

        const tenantData = await addTenantDB({ name, email, password, isAdmin, isActive });

        return res.status(200).json({ message: req.__("tenant_added_successfully"), tenant: tenantData }); // Translate message
    } catch (error) {
        console.error("Error adding tenant:", error);

        const dup =
            error?.code === "USER_EXISTS" ||
            error?.message === "User already exist! Try Different Email!" ||
            error === "User already exist! Try Different Email!";
        if (dup) {
            return res.status(409).json({ message: req.__("user_already_exist_try_different_email") }); // Translate message
        }

        const detail =
            (error && typeof error.message === "string" && error.message.trim()) ||
            "";
        return res.status(500).json({
            message: detail || req.__("error_adding_tenant"), // Translate message
        });
    }
};


exports.updateTenant = async (req, res) => {
    try {
        const tenantId = req.params.id;
        const { name, email, isActive } = req.body;

        if (!tenantId) {
            return res.status(400).json({ message: req.__("invalid_tenant") }); // Translate message
        }
        if (!name || !email || isActive === undefined) {
            return res.status(400).json({ message: req.__("missing_required_fields") }); // Translate message
        }

        const tenantCnt = await getTenantCntByIdDB(tenantId);

        if (tenantCnt != 1) {
            return res.status(404).json({ message: req.__("tenant_not_found") }); // Translate message
        }

        const currentTenant = await getTenantDetailsByIdDB(tenantId);

        if (currentTenant.username !== email) {
            // check if email exists
            const isEmailExists = await checkEmailExistsSuperadminDB(email, tenantId);

            if (isEmailExists) {
                return res.status(400).json({
                    success: false,
                    message: req.__("account_exists_try_login") // Translate message
                });
            }
        }

        await updateTenantDB(tenantId, name, email, isActive, currentTenant.username);

        if (
            currentTenant.username !== email ||
            isActive == 0 ||
            (isActive == 1 && currentTenant.is_active == 0)
        ) {
            await logoutAllUsersOfTenantDB(tenantId);
        }

        return res.status(200).json({ message: req.__("tenant_updated_successfully") }); // Translate message
    } catch (error) {
        console.error('Error updating tenant:', error);
        return res.status(500).json({ message: req.__("error_updating_tenant") }); // Translate message
    }
};

exports.deleteTenant = async (req, res) => {
    try {
        const tenantId = req.params.id;

        if (!tenantId) {
            return res.status(400).json({ message: req.__("invalid_tenant") }); // Translate message
        }

        const tenantCnt = await getTenantCntByIdDB(tenantId);

        if (tenantCnt != 1) {
            return res.status(404).json({ message: req.__("tenant_not_found") }); // Translate message
        }

        await logoutAllUsersOfTenantDB(tenantId);
        await deleteTenantDB(tenantId);

        return res.status(200).json({
            success: true,
            message: req.__("tenant_deleted_successfully") // Translate message
        });

    } catch (error) {
        if (error.message === "tenant_not_found") {
            return res.status(404).json({
                success: false,
                message: req.__("tenant_not_found"),
            });
        }
        console.error(error);
        const detail =
            (error && typeof error.message === "string" && error.message.trim()) ||
            "";
        return res.status(500).json({
            success: false,
            message: detail || req.__("something_went_wrong_try_later"),
        });
    }
}

exports.getTenantsDataByStatus = async (req, res) => {
    try {
        const status = req.params.status;

        if (status != 'active' && status != 'inactive' && status != 'all') {
            return res.status(400).json({
                success: false,
                message: req.__("invalid_status_try_again_later") // Translate message
            });
        }

        let data;

        if (status == 'active') {
            data = await getTenantsDataByStatusDB(1);
        } else if (status == 'inactive') {
            data = await getTenantsDataByStatusDB(0);
        } else if (status == 'all') {
            data = await getTenantsDataByStatusDB(null);

        }

        return res.status(200).json(data);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later") // Translate message
        });
    }
}

exports.setTenantSubscription = async (req, res) => {
    try {
        const tenantId = parseInt(req.params.id, 10);
        const { subscriptionStart, subscriptionEnd, isActive } = req.body;

        if (!tenantId) {
            return res.status(400).json({
                success: false,
                message: req.__("invalid_tenant"),
            });
        }

        if (
            subscriptionStart === undefined &&
            subscriptionEnd === undefined &&
            isActive === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: req.__("please_provide_required_details"),
            });
        }

        await setTenantSubscriptionDB(
            tenantId,
            subscriptionStart,
            subscriptionEnd,
            isActive
        );

        await logoutAllUsersOfTenantDB(tenantId);

        const tenantInfo = await getTenantDetailsDB(tenantId);

        return res.status(200).json({
            success: true,
            message: req.__("details_saved_successfully"),
            tenantInfo,
        });
    } catch (error) {
        if (error.message === "tenant_not_found") {
            return res.status(404).json({
                success: false,
                message: req.__("tenant_not_found"),
            });
        }
        console.error(error);
        const detail =
            (error && typeof error.message === "string" && error.message.trim()) ||
            "";
        return res.status(500).json({
            success: false,
            message: detail || req.__("something_went_wrong_try_later"),
        });
    }
};

exports.getSubscriptionOfferSettings = async (req, res) => {
    try {
        const row = await getSubscriptionOfferSettingsDB();
        return res.status(200).json({
            success: true,
            data: row || {
                stripe_price_id_monthly: null,
                stripe_price_id_yearly: null,
                display_amount_monthly: null,
                display_amount_yearly: null,
                currency_symbol: "$",
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later"),
        });
    }
};

const stripePriceIdPattern = /^price_[a-zA-Z0-9]+$/;

exports.patchSubscriptionOfferSettings = async (req, res) => {
    try {
        const b = req.body || {};
        const existing = (await getSubscriptionOfferSettingsDB()) || {};

        const normStripe = (v, fallback) => {
            if (v === undefined) return fallback || null;
            if (v === null) return null;
            const s = typeof v === "string" ? v.trim() : v;
            return s === "" ? null : s;
        };

        const stripe_price_id_monthly = normStripe(b.stripe_price_id_monthly, existing.stripe_price_id_monthly);
        const stripe_price_id_yearly = normStripe(b.stripe_price_id_yearly, existing.stripe_price_id_yearly);

        if (stripe_price_id_monthly && !stripePriceIdPattern.test(stripe_price_id_monthly)) {
            return res.status(400).json({
                success: false,
                message: req.__("invalid_request"),
            });
        }
        if (stripe_price_id_yearly && !stripePriceIdPattern.test(stripe_price_id_yearly)) {
            return res.status(400).json({
                success: false,
                message: req.__("invalid_request"),
            });
        }

        const parseAmount = (v, fallback) => {
            if (v === undefined) return fallback != null ? Number(fallback) : null;
            if (v === null || v === "") return null;
            const n = Number(v);
            if (Number.isNaN(n) || n < 0) return "invalid";
            return n;
        };

        const dm = parseAmount(b.display_amount_monthly, existing.display_amount_monthly);
        const dy = parseAmount(b.display_amount_yearly, existing.display_amount_yearly);
        if (dm === "invalid" || dy === "invalid") {
            return res.status(400).json({
                success: false,
                message: req.__("invalid_request"),
            });
        }

        const currency_symbol =
            b.currency_symbol !== undefined
                ? (String(b.currency_symbol).trim().slice(0, 8) || "$")
                : existing.currency_symbol || "$";

        const payload = {
            stripe_price_id_monthly,
            stripe_price_id_yearly,
            display_amount_monthly: dm,
            display_amount_yearly: dy,
            currency_symbol,
        };

        const row = await upsertSubscriptionOfferSettingsDB(payload);
        return res.status(200).json({
            success: true,
            message: req.__("details_saved_successfully"),
            data: row,
        });
    } catch (error) {
        if (error.message === "subscription_offer_table_missing" || error.code === "ER_NO_SUCH_TABLE") {
            return res.status(503).json({
                success: false,
                message: req.__("subscription_offer_table_missing"),
            });
        }
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later"),
        });
    }
};

exports.getTenantSubscriptionHistory = async (req, res) => {
    try {
        const tenantId = req.params.id;

        const subscriptionHistory = await getTenantSubscriptionHistoryDB(tenantId);

        // tenant info
        const tenantDetails = await getTenantDetailsDB(tenantId);

        // store details
        const storeDetails = await getTenantStoreDetailsDB(tenantId);

        // tenant users
        const tenantTotalUsers = await getTenantTotalUsersDB(tenantId);

        return res.status(200).json({
            tenantInfo: tenantDetails,
            storeDetails: storeDetails,
            totalUsers: tenantTotalUsers,
            subscriptionHistory: subscriptionHistory
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later") // Translate message
        });
    }
}

exports.getSuperAdminReportsData = async (req, res) => {
    try {
        const from = req.query.from || null;
        const to = req.query.to || null;
        const type = req.query.type;

        if (!type) {
            return res.status(400).json({
                success: false,
                message: req.__("please_provide_required_details") // Translate message
            });
        }

        if (type == 'custom') {
            if (!(from && to)) {
                return res.status(400).json({
                    success: false,
                    message: req.__("provide_from_to_dates") // Translate message
                });
            }
        }

        const [activeTenants, mrr, arr, totalCustomers, topSellingItems, salesVolume, ordersProcessed] = await Promise.all([
            getActiveTenantsDB(),
            getMRRValueDB(),
            getARRValueDB(),
            getRestaurantsTotalCustomersDB(),
            getSuperAdminTopSellingItemsDB(type, from, to),
            getSuperAdminSalesVolumeDB(type, from, to),
            getSuperAdminOrdersProcessedDB(type, from, to)
        ]);

        return res.status(200).json({
            activeTenants, mrr, arr, totalCustomers, topSellingItems,
            salesVolume, ordersProcessed
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: req.__("something_went_wrong_try_later") // Translate message
        });
    }
};
