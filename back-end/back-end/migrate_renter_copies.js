const { sequelize, RenterListing, RentalRequest, RenterListingCopy } = require("./models");

async function migrate() {
  await sequelize.authenticate();
  await RenterListing.sync();
  await RentalRequest.sync();

  const requestColumns = await sequelize.getQueryInterface().describeTable("rental_requests");
  if (!requestColumns.quantity) {
    const { DataTypes } = require("sequelize");
    await sequelize.getQueryInterface().addColumn("rental_requests", "quantity", { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 });
  }

  await RenterListingCopy.sync();
  const listings = await RenterListing.findAll({ attributes: ["id", "copyCount"] });
  for (const listing of listings) {
    const existing = await RenterListingCopy.findAll({ where: { listingId: listing.id }, attributes: ["copyNumber"] });
    const numbers = new Set(existing.map((copy) => copy.copyNumber));
    const missing = [];
    for (let copyNumber = 1; copyNumber <= Number(listing.copyCount); copyNumber += 1) {
      if (!numbers.has(copyNumber)) missing.push({ listingId: listing.id, copyNumber, status: "available" });
    }
    if (missing.length) await RenterListingCopy.bulkCreate(missing);
  }

  const approvedRequests = await RentalRequest.findAll({ where: { status: "approved" }, order: [["createdAt", "ASC"]] });
  for (const request of approvedRequests) {
    const alreadyReserved = await RenterListingCopy.count({ where: { reservedRequestId: request.id, status: "reserved" } });
    const needed = Math.max(0, Number(request.quantity || 1) - alreadyReserved);
    if (!needed) continue;
    await sequelize.transaction(async (transaction) => {
      const copies = await RenterListingCopy.findAll({
        where: { listingId: request.listingId, status: "available" },
        order: [["copyNumber", "ASC"]],
        limit: needed,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (copies.length < needed) {
        console.warn(`Could not reserve all copies for existing approved rental request ${request.id}.`);
        return;
      }
      for (const copy of copies) await copy.update({ status: "reserved", reservedRequestId: request.id }, { transaction });
    });
  }

  console.log("Renter copy inventory is ready; existing listings and approved requests were backfilled.");
}

if (require.main === module) {
  migrate()
    .catch((error) => { console.error("Renter copy migration failed:", error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = migrate;
