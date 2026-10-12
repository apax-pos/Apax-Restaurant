const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
  /** Keep PORT and other vars that IIS/iisnode injects before the process starts */
  override: false,
});

const express = require("express");
const fs = require("fs");
const i18n = require('i18n');
const morgan = require("morgan");
const {rateLimit} = require("express-rate-limit");
const cors = require("cors");
// const path = require("path")
// const rfs = require("rotating-file-stream");
const cookieParser = require("cookie-parser");
const userAgent = require('express-useragent');
const { CONFIG, LANGUAGES } = require("./config");
const fileUpload = require("express-fileupload")

// routes import
const authRoutes = require("./routes/auth.routes");
const settingsRoutes = require("./routes/settings.routes");
const customerRoutes = require("./routes/customer.routes");
const reservationRoutes = require("./routes/reservation.routes");
const userRoutes = require("./routes/user.routes");
const menuItemRoutes = require("./routes/menu_item.routes");
const posRoutes = require("./routes/pos.routes");
const kitchenRoutes = require("./routes/kitchen.routes")
const ordersRoutes = require("./routes/orders.routes")
const invoiceRoutes = require("./routes/invoice.routes")
const dashboardRoutes = require("./routes/dashboard.routes")
const reportsRoutes = require("./routes/reports.routes")
const qrMenuRoutes = require("./routes/qrmenu.routes")
const feedbackRoutes = require("./routes/feedback.routes")
const superAdminRoutes = require("./routes/superadmin.routes")
const inventoryRoutes = require("./routes/inventory.routes");
const backupRoutes = require("./routes/backup.routes");
const shiftRoutes = require("./routes/shift.routes");
const purchasingRoutes = require("./routes/purchasing.routes");
const expenseRoutes = require("./routes/expense.routes");
// routes import


const app = express();
app.set('trust proxy', 1);

/**
 * Middlewares
 * */
// create write stream for logs
// const accessLogStream = rfs.createStream("access.log", {
//   interval: '1d',
//   path: path.join(__dirname, '../log')
// })

// const limiter = rateLimit({
//   max: 1000,
//   windowMs: 60000,
//   legacyHeaders: false,
//   standardHeaders: true,
//   message: "You exceeded limits! hold on",
// });


function buildCorsWhitelist() {
  const fromEnv = (CONFIG.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const list = [...fromEnv];
  if (CONFIG.FRONTEND_DOMAIN && !list.includes(CONFIG.FRONTEND_DOMAIN)) {
    list.push(CONFIG.FRONTEND_DOMAIN);
  }
  return list;
}

const corsWhitelist = buildCorsWhitelist();

var corsOptions = {
  credentials: true,
  origin: function (origin, callback) {
    if (!origin || corsWhitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn("CORS blocked origin:", origin, "allowed:", corsWhitelist);
      callback(new Error("Not allowed by CORS"));
    }
  },
};

i18n.configure({
  locales: LANGUAGES,
  directory: path.join(__dirname, '../translations' , 'locales'),
  defaultLocale: 'en',
  cookie: 'lang',
  queryParameter: 'lang',
});

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(i18n.init);
app.use(userAgent.express());
app.use('/api/v1/auth/stripe-webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
// app.use(morgan("combined", {stream: accessLogStream}));
const uploadTmpDir = path.join(__dirname, "../tmp");
const publicDir = path.join(__dirname, "../public");
for (const dir of [uploadTmpDir, publicDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
// In-memory uploads (images are compressed client-side); avoids temp-folder permission issues on Windows
app.use(fileUpload({
  preserveExtension: true,
  safeFileNames: true,
  useTempFiles: false,
  limits: { fileSize: 5 * 1024 * 1024 },
}))
app.use("/public", express.static(publicDir))
app.use(morgan("tiny"));
// app.use(limiter);
/**
 * Middlewares
 * */


// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/reservations", reservationRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/menu-items", menuItemRoutes);
app.use("/api/v1/pos", posRoutes);
app.use("/api/v1/kitchen", kitchenRoutes);
app.use("/api/v1/orders", ordersRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/qrmenu", qrMenuRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/superadmin", superAdminRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/backup", backupRoutes);
app.use("/api/v1/shifts", shiftRoutes);
app.use("/api/v1/purchasing", purchasingRoutes);
app.use("/api/v1/expenses", expenseRoutes);
// routes

app.get("/", (req, res)=>{
  res.send("⚡️");
});


app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR HANDLER:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

module.exports = app;
