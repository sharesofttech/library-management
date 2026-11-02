const { sequelize, RentalRequest, RentalPayment } = require("./models");
const { DataTypes } = require("sequelize");

async function migrate() {
  await sequelize.authenticate();
  await RentalRequest.sync();
  const columns = await sequelize.getQueryInterface().describeTable("rental_requests");
  const additions = {
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    handoverPlace: { type: DataTypes.STRING(500), allowNull: true },
    handoverDate: { type: DataTypes.DATEONLY, allowNull: true },
    handoverTime: { type: DataTypes.STRING(20), allowNull: true },
    deliveryAddress: { type: DataTypes.STRING(1000), allowNull: true },
    deliveryMethod: { type: DataTypes.STRING(100), allowNull: true },
    deliveryDate: { type: DataTypes.DATEONLY, allowNull: true },
    deliveryTime: { type: DataTypes.STRING(20), allowNull: true },
    trackingReference: { type: DataTypes.STRING(120), allowNull: true },
    deliveryChargePayer: { type: DataTypes.STRING(20), allowNull: true },
    libraryReceivedAt: { type: DataTypes.DATE, allowNull: true },
    receiptConfirmedAt: { type: DataTypes.DATE, allowNull: true },
    rentalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    deliveryCharge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    readerDeliveryCharge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    lateFeePerDay: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    checkoutAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    commissionRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    commissionAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    renterPayoutAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    commissionStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "held" },
    commissionApprovedAt: { type: DataTypes.DATE, allowNull: true },
    payoutAt: { type: DataTypes.DATE, allowNull: true },
    payoutReference: { type: DataTypes.STRING(120), allowNull: true },
    paymentStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "unquoted" },
    activeAt: { type: DataTypes.DATE, allowNull: true },
    dueAt: { type: DataTypes.DATE, allowNull: true },
    returnedAt: { type: DataTypes.DATE, allowNull: true },
    returnCondition: { type: DataTypes.STRING(20), allowNull: true },
    damageCharge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    lateFeeAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    finePaidAt: { type: DataTypes.DATE, allowNull: true },
  };
  for (const [column, definition] of Object.entries(additions)) {
    if (!columns[column]) await sequelize.getQueryInterface().addColumn("rental_requests", column, definition);
  }
  await RentalPayment.sync();
  console.log("Renter rental requests table is ready.");
}

if (require.main === module) {
  migrate()
    .catch((error) => { console.error("Rental requests migration failed:", error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = migrate;
