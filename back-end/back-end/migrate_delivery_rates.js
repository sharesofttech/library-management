require("dotenv").config();
const { sequelize, DeliveryRateSettings } = require("./models");
const { defaults } = require("./controllers/deliveryRateController");

(async () => {
  try {
    await sequelize.authenticate();
    await DeliveryRateSettings.sync();
    await DeliveryRateSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1, rates: defaults } });
    console.log("Delivery rate settings migration complete.");
  } catch (error) {
    console.error("Delivery rate settings migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
