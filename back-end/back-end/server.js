const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { sequelize } = require("./models");
const seedRolesAndAdmin = require("./utils/seed");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const userRoutes = require("./routes/userRoutes");
const authorRoutes = require("./routes/authorRoutes");
const bookRoutes = require("./routes/bookRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const bookRequestRoutes = require("./routes/bookRequestRoutes");
const bookIssueRoutes = require("./routes/bookIssueRoutes")
const fineRoutes = require("./routes/fineRoutes");
const renterListingRoutes = require("./routes/renterListingRoutes");
const rentalRequestRoutes = require("./routes/rentalRequestRoutes");
const deliveryRateRoutes = require("./routes/deliveryRateRoutes");
const rentalRequestController = require("./controllers/rentalRequestController");
const { startScheduler } = require("./utils/fineService");
const app = express();

app.use(cors());
app.post("/api/rental-payments/webhook", express.raw({ type: "application/json" }), rentalRequestController.paymentWebhook);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", authRoutes);
app.use("/api", categoryRoutes);
app.use("/api", userRoutes);
app.use("/api", authorRoutes);
app.use("/api", bookRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", catalogRoutes);
app.use("/api", bookIssueRoutes);


app.use("/api", bookRequestRoutes);
app.use("/api", fineRoutes);
app.use("/api", renterListingRoutes);
app.use("/api", rentalRequestRoutes);
app.use("/api", deliveryRateRoutes);

const PORT = process.env.PORT || 5000;

sequelize
  .authenticate()
  .then(async () => {
    console.log("Database connected successfully. Apply schema changes with npm run migrate.");
    await seedRolesAndAdmin();
    startScheduler();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection or sync failed:", err);
  });
