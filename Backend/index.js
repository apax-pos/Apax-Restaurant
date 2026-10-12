const app = require("./src/app");
const {
  ensureSubscriptionOfferSettingsTable,
} = require("./src/bootstrap/ensureSubscriptionOfferSettings");
const { ensureOperationalTables } = require("./src/bootstrap/ensureOperationalTables");
const { validateSecurityConfig } = require("./src/bootstrap/validateSecurityConfig");
const { deactivateExpiredTenantsDB } = require("./src/services/auth.service");
const { verifyToken } = require("./src/utils/jwt");
const { parseCookieHeader } = require("./src/utils/parseCookie");

const { createServer } = require("http");
const { Server } = require("socket.io");
const { CONFIG } = require("./src/config");
const { getTenantIdFromQRCode } = require("./src/services/settings.service");

/** iisnode sets PORT (often a named pipe) before Node starts; do not override in .env when using IIS. */
const PORT = process.env.PORT || process.env.IISNODE_HTTP_PORT || 3000;
const isIIS = Boolean(process.env.IISNODE_VERSION);

const httpServer = createServer(app);
function buildSocketCorsOrigins() {
  const fromEnv = (CONFIG.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const list = [...fromEnv];
  if (CONFIG.FRONTEND_DOMAIN) {
    try {
      const u = new URL(CONFIG.FRONTEND_DOMAIN);
      list.push(u.origin);
    } catch {
      list.push(CONFIG.FRONTEND_DOMAIN);
    }
  }
  const unique = [...new Set(list)];
  return unique.length
    ? (origin, cb) => {
        if (!origin) return cb(null, true);
        if (unique.includes(origin)) return cb(null, true);
        try {
          if (new URL(origin).hostname.endsWith(".apaxpos.com")) {
            return cb(null, true);
          }
        } catch {
          /* ignore */
        }
        cb(null, false);
      }
    : true;
}

const io = new Server(httpServer, {
  cors: {
    credentials: true,
    origin: buildSocketCorsOrigins(),
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
});

io.use((socket, next) => {
  const auth = socket.handshake.auth || {};
  const header = socket.handshake.headers?.authorization;
  const cookieHeader = socket.handshake.headers?.cookie;
  const token =
    auth.token ||
    parseCookieHeader(cookieHeader, "accessToken") ||
    (typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7)
      : null);
  if (!token) {
    return next(new Error("unauthorized"));
  }
  try {
    socket.user = verifyToken(token);
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
    console.log(socket.id);

    socket.on("authenticate", () => {
        const tenantId = socket.user?.tenant_id;
        if (tenantId != null && tenantId !== "") {
          socket.join(String(tenantId));
        }
    });

    socket.on("new_order_backend", (payload, tenantId)=>{
        const room = String(socket.user?.tenant_id ?? "");
        if (!room || String(tenantId) !== room) return;
        socket.to(room).emit("new_order", payload);
    })

    socket.on("new_qrorder_backend", async (payload, qrcode)=>{

        try {
            const tenantId = await getTenantIdFromQRCode(qrcode);
            socket.to(tenantId).emit("new_qrorder", payload);
        } catch (error) {
            console.log(error);
        }
    })

    socket.on("order_update_backend", (payload, tenantId)=>{
        const room = String(socket.user?.tenant_id ?? "");
        if (!room || String(tenantId) !== room) return;
        socket.to(room).emit("order_update", payload);
    })
});

const SUBSCRIPTION_EXPIRY_SWEEP_MS = 60 * 60 * 1000;

async function sweepExpiredTenantSubscriptions() {
  try {
    const n = await deactivateExpiredTenantsDB();
    if (n > 0) {
      console.log(`subscription expiry: deactivated ${n} tenant(s)`);
    }
  } catch (err) {
    console.error("subscription expiry sweep:", err.message);
  }
}

async function startServer() {
  try {
    validateSecurityConfig();
    await ensureSubscriptionOfferSettingsTable();
    await ensureOperationalTables();
  } catch (err) {
    console.error("bootstrap failed:", err.message);
  }
  await sweepExpiredTenantSubscriptions();
  setInterval(sweepExpiredTenantSubscriptions, SUBSCRIPTION_EXPIRY_SWEEP_MS);
  httpServer.listen(PORT, () => {
    console.log(
      isIIS
        ? `Server listening (IIS/iisnode) on ${PORT}`
        : `Server listening on port ${PORT}`
    );
  });
}

startServer();