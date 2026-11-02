const { Op } = require("sequelize");
const { RentalRequest, RentalPayment, RenterListing, RenterListingCopy, DeliveryRateSettings, User, sequelize } = require("../models");
const razorpay = require("../utils/razorpay");
const { getListQuery, withPagination } = require("../utils/listQuery");
const { defaults: defaultDeliveryRates } = require("./deliveryRateController");

const includeDetails = [
  { model: RenterListing, as: "listing", attributes: ["id", "title", "authorName", "coverImage", "rentalPrice", "rentalPeriodDays", "copyCount", "weightKg"] },
  { model: User, as: "reader", attributes: ["id", "name", "email", "phone", "countryCode"] },
  { model: User, as: "owner", attributes: ["id", "name", "email"] },
];

exports.create = async (req, res) => {
  const listingId = Number(req.params.listingId);
  const handoverMethod = String(req.body.handoverMethod || "").toLowerCase();
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  const deliveryAddress = typeof req.body.deliveryAddress === "string" ? req.body.deliveryAddress.trim() : "";
  const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);
  if (!Number.isSafeInteger(listingId) || listingId < 1) return res.status(400).json({ message: "Choose a valid book listing" });
  if (!["pickup", "delivery"].includes(handoverMethod)) return res.status(400).json({ message: "Choose pickup or delivery" });
  if (message.length > 1000) return res.status(400).json({ message: "Message must be 1,000 characters or fewer" });
  if (deliveryAddress.length > 1000 || handoverMethod === "delivery" && !deliveryAddress) return res.status(400).json({ message: "Enter the delivery address for this request" });
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) return res.status(400).json({ message: "Choose a whole number of copies between 1 and 1,000" });

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const listing = await RenterListing.findOne({ where: { id: listingId, status: "approved" }, transaction, lock: transaction.LOCK.UPDATE });
      if (!listing) return { code: 404, message: "This approved listing is no longer available" };
      if (listing.ownerId === req.user.id) return { code: 400, message: "You cannot request your own listing" };
      if (handoverMethod === "pickup" && !listing.pickupAvailable) return { code: 400, message: "Pickup is not available for this listing" };
      if (handoverMethod === "delivery" && !listing.deliveryAvailable) return { code: 400, message: "Delivery is not available for this listing" };
      const availableCopies = await RenterListingCopy.count({ where: { listingId, status: "available" }, transaction });
      if (quantity > availableCopies) return { code: 409, message: `Only ${availableCopies} ${availableCopies === 1 ? "copy is" : "copies are"} currently available` };
      const active = await RentalRequest.findOne({ where: { listingId, readerId: req.user.id, status: { [Op.in]: ["pending", "approved", "active"] } }, transaction });
      if (active) return { code: 409, message: "You already have an active request for this book" };
      const request = await RentalRequest.create({ listingId, readerId: req.user.id, ownerId: listing.ownerId, quantity, handoverMethod, deliveryAddress: handoverMethod === "delivery" ? deliveryAddress : null, message: message || null, status: "pending" }, { transaction });
      return { request };
    });
    if (result.code) return res.status(result.code).json({ message: result.message });
    return res.status(201).json({ message: "Rental request sent to the Renter", request: result.request });
  } catch (error) {
    console.error("Create rental request error:", error);
    return res.status(500).json({ message: "Unable to send rental request" });
  }
};

exports.mine = async (req, res) => {
  try {
    const requests = await RentalRequest.findAll({ where: { readerId: req.user.id }, include: includeDetails.filter((item) => item.as !== "owner"), order: [["createdAt", "DESC"]], limit: 100 });
    return res.json({ requests });
  } catch (error) {
    console.error("Load reader rental requests error:", error);
    return res.status(500).json({ message: "Unable to load your rental requests" });
  }
};

exports.inbox = async (req, res) => {
  try {
    const requests = await RentalRequest.findAll({ where: { ownerId: req.user.id }, include: includeDetails.filter((item) => item.as !== "reader" && item.as !== "owner"), order: [["createdAt", "DESC"]], limit: 100 });
    return res.json({ requests });
  } catch (error) {
    console.error("Load renter inbox error:", error);
    return res.status(500).json({ message: "Unable to load rental requests" });
  }
};

exports.review = async (req, res) => {
  const decision = String(req.body.decision || "").toLowerCase();
  if (!["approved", "rejected"].includes(decision)) return res.status(400).json({ message: "Choose approve or reject" });
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const request = await RentalRequest.findOne({ where: { id: req.params.id, ownerId: req.user.id }, transaction, lock: transaction.LOCK.UPDATE });
      if (!request) return { code: 404, message: "Rental request not found" };
      if (request.status !== "pending") return { code: 409, message: "This request has already been reviewed" };
      if (decision === "approved") {
        const listing = await RenterListing.findOne({ where: { id: request.listingId, ownerId: req.user.id, status: "approved" }, transaction, lock: transaction.LOCK.UPDATE });
        if (!listing) return { code: 409, message: "This book listing is no longer available" };
        const copies = await RenterListingCopy.findAll({ where: { listingId: listing.id, status: "available" }, order: [["copyNumber", "ASC"]], limit: Number(request.quantity || 1), transaction, lock: transaction.LOCK.UPDATE });
        if (copies.length < Number(request.quantity || 1)) return { code: 409, message: `Only ${copies.length} copies are available now. Ask the Reader to submit a smaller request.` };
        for (const copy of copies) await copy.update({ status: "reserved", reservedRequestId: request.id }, { transaction });
      }
      request.status = decision;
      request.reviewedAt = new Date();
      await request.save({ transaction });
      return { request };
    });
    if (result.code) return res.status(result.code).json({ message: result.message });
    return res.json({ message: `Rental request ${decision}`, request: result.request });
  } catch (error) {
    console.error("Review rental request error:", error);
    return res.status(500).json({ message: "Unable to review rental request" });
  }
};

exports.updateHandover = async (req, res) => {
  try {
    const request = await RentalRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: "Rental request not found" });
    if (request.status !== "approved") return res.status(409).json({ message: "Only approved requests can have handover details" });
    if (request.receiptConfirmedAt) return res.status(409).json({ message: "Handover details cannot be changed after receipt is confirmed" });
    if (!request.libraryReceivedAt) return res.status(409).json({ message: "Mark the book received at the library before arranging Reader handover" });

    if (request.handoverMethod === "pickup") {
      const handoverPlace = typeof req.body.handoverPlace === "string" ? req.body.handoverPlace.trim() : "";
      const handoverDate = typeof req.body.handoverDate === "string" ? req.body.handoverDate.trim() : "";
      const handoverTime = typeof req.body.handoverTime === "string" ? req.body.handoverTime.trim() : "";
      const parsedDate = new Date(`${handoverDate}T00:00:00.000Z`);
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(handoverDate) && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === handoverDate;
      if (!handoverPlace || handoverPlace.length > 500 || !validDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(handoverTime)) {
        return res.status(400).json({ message: "Enter a pickup place, valid date, and time" });
      }
      await request.update({ handoverPlace, handoverDate, handoverTime });
    } else {
      const deliveryMethod = typeof req.body.deliveryMethod === "string" ? req.body.deliveryMethod.trim() : "";
      const deliveryChargePayer = String(req.body.deliveryChargePayer || "").toLowerCase();
      const deliveryDate = typeof req.body.deliveryDate === "string" ? req.body.deliveryDate.trim() : "";
      const deliveryTime = typeof req.body.deliveryTime === "string" ? req.body.deliveryTime.trim() : "";
      const trackingReference = typeof req.body.trackingReference === "string" ? req.body.trackingReference.trim() : "";
      const parsedDate = new Date(`${deliveryDate}T00:00:00.000Z`);
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(deliveryDate) && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === deliveryDate;
      if (!request.deliveryAddress || !deliveryMethod || deliveryMethod.length > 100 || !validDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(deliveryTime) || trackingReference.length > 120 || !["reader", "renter", "shared"].includes(deliveryChargePayer)) {
        return res.status(400).json({ message: "Enter delivery method, scheduled date/time, and who pays the delivery charge" });
      }
      await request.update({ deliveryMethod, deliveryDate, deliveryTime, trackingReference: trackingReference || null, deliveryChargePayer });
    }
    return res.json({ message: "Handover details saved", request });
  } catch (error) {
    console.error("Save rental handover details error:", error);
    return res.status(500).json({ message: "Unable to save handover details" });
  }
};

exports.confirmReceipt = async (req, res) => {
  try {
    const request = await RentalRequest.findOne({ where: { id: req.params.id, readerId: req.user.id } });
    if (!request) return res.status(404).json({ message: "Rental request not found" });
    if (request.status !== "approved") return res.status(409).json({ message: "Only approved requests can confirm receipt" });
    if (request.receiptConfirmedAt) return res.status(409).json({ message: "Book receipt is already confirmed" });
    if (!request.libraryReceivedAt) return res.status(409).json({ message: "The book is not yet recorded as received at the library" });
    const hasHandoverDetails = request.handoverMethod === "pickup"
      ? Boolean(request.handoverPlace && request.handoverDate && request.handoverTime)
      : Boolean(request.deliveryAddress && request.deliveryMethod && request.deliveryDate && request.deliveryTime && request.deliveryChargePayer);
    if (!hasHandoverDetails) return res.status(409).json({ message: "Wait for Admin to arrange the library handover details" });
    request.receiptConfirmedAt = new Date();
    await request.save();
    return res.json({ message: "Book receipt confirmed", request });
  } catch (error) {
    console.error("Confirm rental book receipt error:", error);
    return res.status(500).json({ message: "Unable to confirm book receipt" });
  }
};

exports.confirmLibraryReceipt = async (req, res) => {
  try {
    const request = await RentalRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: "Rental request not found" });
    if (request.status !== "approved") return res.status(409).json({ message: "Only an approved rental can be received at the library" });
    if (request.receiptConfirmedAt) return res.status(409).json({ message: "Reader has already confirmed receipt" });
    if (request.libraryReceivedAt) return res.status(409).json({ message: "Book is already marked received at the library" });
    await request.update({ libraryReceivedAt: new Date() });
    return res.json({ message: "Book receipt at the library recorded", request });
  } catch (error) {
    console.error("Record library book receipt error:", error);
    return res.status(500).json({ message: "Unable to record library receipt" });
  }
};

exports.adminCheckoutQueue = async (req, res) => {
  try {
    const { page, limit, search, offset } = getListQuery(req.query);
    const renterId = req.query.renterId === "" || req.query.renterId === undefined ? null : Number(req.query.renterId);
    const status = typeof req.query.status === "string" ? req.query.status : "all";
    if (renterId !== null && (!Number.isSafeInteger(renterId) || renterId < 1)) return res.status(400).json({ message: "Choose a valid Renter filter" });
    if (!["all", "approved", "active", "returned"].includes(status)) return res.status(400).json({ message: "Choose a valid rental status filter" });
    const where = { status: status === "all" ? { [Op.in]: ["approved", "active", "returned"] } : status };
    if (renterId !== null) where.ownerId = renterId;
    if (search) where[Op.or] = [
      { "$listing.title$": { [Op.like]: `%${search}%` } },
      { "$reader.name$": { [Op.like]: `%${search}%` } },
      { "$reader.email$": { [Op.like]: `%${search}%` } },
      { "$owner.name$": { [Op.like]: `%${search}%` } },
      { "$owner.email$": { [Op.like]: `%${search}%` } },
    ];
    const [result, totalRequests, paidRentals, checkoutCollected, awaitingQuote, activeRentals, returnedRentals, renterRows] = await Promise.all([
      RentalRequest.findAndCountAll({
        where,
        include: includeDetails,
        order: [["receiptConfirmedAt", "DESC"]],
        limit,
        offset,
        distinct: true,
      }),
      RentalRequest.count(),
      RentalRequest.count({ where: { paymentStatus: "paid" } }),
      RentalPayment.sum("amount", { where: { purpose: "checkout", status: "paid" } }),
      RentalRequest.count({ where: { status: "approved", receiptConfirmedAt: { [Op.ne]: null }, paymentStatus: { [Op.ne]: "quoted" } } }),
      RentalRequest.count({ where: { status: "active" } }),
      RentalRequest.count({ where: { status: "returned" } }),
      RentalRequest.findAll({ attributes: ["ownerId"], group: ["ownerId"], raw: true }),
    ]);
    const renterIds = renterRows.map((row) => row.ownerId);
    const renters = renterIds.length ? await User.findAll({ where: { id: { [Op.in]: renterIds } }, attributes: ["id", "name", "email"], order: [["name", "ASC"]], raw: true }) : [];
    return res.json({ ...withPagination({ requests: result.rows, count: result.count }, page, limit), renters, stats: { totalRequests, paidRentals, checkoutCollected: checkoutCollected || 0, awaitingQuote, activeRentals, returnedRentals }, razorpayConfigured: razorpay.configured() });
  } catch (error) {
    console.error("Load admin rental checkout queue error:", error);
    return res.status(500).json({ message: "Unable to load rental checkout queue" });
  }
};

exports.saveCheckoutQuote = async (req, res) => {
  const rentalAmount = Number(req.body.rentalAmount);
  let deliveryCharge = Number(req.body.deliveryCharge || 0);
  const lateFeePerDay = Number(req.body.lateFeePerDay || 0);
  if (req.body.commissionRate === undefined || req.body.commissionRate === null || String(req.body.commissionRate).trim() === "") {
    return res.status(400).json({ message: "Admin must enter the agreed commission rate (use 0 only if no commission was agreed)" });
  }
  const commissionRate = Number(req.body.commissionRate);
  if (![rentalAmount, deliveryCharge, lateFeePerDay, commissionRate].every(Number.isFinite) || rentalAmount < 0 || deliveryCharge < 0 || lateFeePerDay < 0 || commissionRate < 0 || commissionRate > 100 || [rentalAmount, deliveryCharge, lateFeePerDay, commissionRate].some((n) => Math.round(n * 100) !== n * 100) || rentalAmount + deliveryCharge <= 0 || rentalAmount + deliveryCharge > 99999999.99) {
    return res.status(400).json({ message: "Enter valid rental, delivery, late-fee amounts, and a commission rate from 0 to 100%" });
  }
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const request = await RentalRequest.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request) return { code: 404, message: "Rental request not found" };
      if (request.status !== "approved" || !request.receiptConfirmedAt) return { code: 409, message: "Checkout quote is available after the Reader confirms receipt" };
      if (request.paymentStatus === "paid" || request.status === "active") return { code: 409, message: "Checkout is already paid" };
      if (await RentalPayment.count({ where: { rentalRequestId: request.id, purpose: "checkout" }, transaction })) return { code: 409, message: "A payment attempt already exists for this quote. Keep the quote unchanged and let the Reader retry payment." };
      const listing = await RenterListing.findByPk(request.listingId, { transaction });
      if (!listing) return { code: 404, message: "Rental book listing not found" };
      const totalWeight = Number(listing.weightKg || 0) * Number(request.quantity || 1);
      if (request.handoverMethod !== "delivery") deliveryCharge = 0;
      else if (totalWeight > 0 && totalWeight <= 10) {
        const settings = await DeliveryRateSettings.findByPk(1, { transaction });
        const rates = settings?.rates || defaultDeliveryRates;
        const rate = rates.find((row) => totalWeight >= Number(row.minWeight) && totalWeight <= Number(row.maxWeight));
        if (!rate) return { code: 409, message: `No delivery rate is configured for ${totalWeight.toFixed(3)} kg. Ask Admin to update the delivery rate table.` };
        deliveryCharge = Math.round((Number(rate.rowCost) + Number(rate.itemCost) * Number(request.quantity || 1) + Number(rate.kgCost) * totalWeight + Number(rate.percentCost) * rentalAmount / 100) * 100) / 100;
      }
      const readerDeliveryCharge = request.handoverMethod !== "delivery" || request.deliveryChargePayer === "renter" ? 0 : request.deliveryChargePayer === "shared" ? Math.round(deliveryCharge * 50) / 100 : deliveryCharge;
      const checkoutAmount = rentalAmount + readerDeliveryCharge;
      const commissionAmount = Math.round(rentalAmount * commissionRate) / 100;
      const renterPayoutAmount = Math.round((rentalAmount - commissionAmount) * 100) / 100;
      if (checkoutAmount < 1) return { code: 400, message: "Reader checkout amount must be at least ₹1.00" };
      await request.update({ rentalAmount: rentalAmount.toFixed(2), deliveryCharge: deliveryCharge.toFixed(2), readerDeliveryCharge: readerDeliveryCharge.toFixed(2), lateFeePerDay: lateFeePerDay.toFixed(2), checkoutAmount: checkoutAmount.toFixed(2), commissionRate: commissionRate.toFixed(2), commissionAmount: commissionAmount.toFixed(2), renterPayoutAmount: renterPayoutAmount.toFixed(2), commissionStatus: "held", paymentStatus: "quoted" }, { transaction });
      return { request };
    });
    if (result.code) return res.status(result.code).json({ message: result.message });
    return res.json({ message: "Checkout quote saved. The Reader can now pay securely.", request: result.request });
  } catch (error) {
    console.error("Save rental checkout quote error:", error);
    return res.status(500).json({ message: "Unable to save checkout quote" });
  }
};

exports.createPaymentOrder = async (req, res) => {
  const purpose = String(req.body.purpose || "checkout");
  if (!["checkout", "fine"].includes(purpose)) return res.status(400).json({ message: "Invalid payment purpose" });
  try {
    const request = await RentalRequest.findOne({ where: { id: req.params.id, readerId: req.user.id } });
    if (!request) return res.status(404).json({ message: "Rental request not found" });
    let amount;
    if (purpose === "checkout") {
      if (request.status !== "approved" || !request.receiptConfirmedAt || request.paymentStatus !== "quoted" || !request.checkoutAmount) return res.status(409).json({ message: "Admin checkout quote is not ready yet" });
      amount = Number(request.checkoutAmount);
    } else {
      if (request.status !== "returned" || request.finePaidAt || Number(request.lateFeeAmount || 0) + Number(request.damageCharge || 0) <= 0) return res.status(409).json({ message: "There is no unpaid rental fine" });
      amount = Number(request.lateFeeAmount || 0) + Number(request.damageCharge || 0);
    }
    const paiseAmount = Math.round(amount * 100);
    if (!Number.isSafeInteger(paiseAmount) || paiseAmount < 100) return res.status(400).json({ message: "Payment amount must be at least ₹1.00" });
    const order = await razorpay.createOrder({ amount: paiseAmount, currency: "INR", receipt: `rent-${request.id}-${purpose}-${Date.now()}`, notes: { rentalRequestId: String(request.id), purpose } });
    await RentalPayment.create({ rentalRequestId: request.id, purpose, amount: amount.toFixed(2), status: "created", razorpayOrderId: order.id });
    return res.status(201).json({ keyId: razorpay.keyId(), order: { id: order.id, amount: order.amount, currency: order.currency }, reader: { name: req.user.name, email: req.user.email } });
  } catch (error) {
    console.error("Create rental payment order error:", error.message);
    const message = error.status === 503
      ? error.message
      : error.status === 502
        ? `Razorpay error (${String(error.gatewayCode || "UNKNOWN").slice(0, 40)}): ${String(error.message || "Order request rejected").slice(0, 180)}`
        : "Unable to start secure checkout. Check the backend console and try again.";
    return res.status(error.status || 500).json({ message });
  }
};

exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (![orderId, paymentId, signature].every((value) => typeof value === "string" && value.length < 200)) return res.status(400).json({ message: "Payment verification details are incomplete" });
  try {
    const payment = await RentalPayment.findOne({ where: { razorpayOrderId: orderId } });
    if (!payment) return res.status(404).json({ message: "Payment order not found" });
    const request = await RentalRequest.findOne({ where: { id: payment.rentalRequestId, readerId: req.user.id } });
    if (!request) return res.status(404).json({ message: "Rental request not found" });
    if (payment.status === "paid") return res.json({ message: "Payment was already verified", request });
    if (payment.purpose === "checkout" && (request.paymentStatus !== "quoted" || Math.round(Number(request.checkoutAmount) * 100) !== Math.round(Number(payment.amount) * 100))) return res.status(409).json({ message: "The checkout quote changed after this order was created. Contact Admin before retrying." });
    if (!razorpay.verifyCheckoutSignature({ orderId, paymentId, signature })) return res.status(400).json({ message: "Razorpay payment signature is invalid" });
    const gatewayPayment = await razorpay.getPayment(paymentId);
    if (gatewayPayment.order_id !== orderId || gatewayPayment.currency !== "INR" || gatewayPayment.amount !== Math.round(Number(payment.amount) * 100) || gatewayPayment.status !== "captured") return res.status(409).json({ message: "Payment is not captured yet. Refresh in a moment or contact Admin." });

    const result = await sequelize.transaction(async (transaction) => {
      const lockedPayment = await RentalPayment.findByPk(payment.id, { transaction, lock: transaction.LOCK.UPDATE });
      const lockedRequest = await RentalRequest.findByPk(request.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (lockedPayment.status === "paid") return { request: lockedRequest };
      await lockedPayment.update({ status: "paid", razorpayPaymentId: paymentId, paidAt: new Date() }, { transaction });
      if (lockedPayment.purpose === "checkout") {
        if (lockedRequest.status !== "approved" || lockedRequest.paymentStatus !== "quoted") throw Object.assign(new Error("Rental checkout state changed; ask Admin to review the payment"), { status: 409 });
        const copies = await RenterListingCopy.findAll({ where: { reservedRequestId: lockedRequest.id, status: "reserved" }, transaction, lock: transaction.LOCK.UPDATE });
        if (copies.length !== Number(lockedRequest.quantity || 1)) throw Object.assign(new Error("Reserved copy inventory is inconsistent; ask Admin to reconcile this request"), { status: 409 });
        for (const copy of copies) await copy.update({ status: "rented" }, { transaction });
        const activeAt = new Date();
        const dueAt = new Date(activeAt.getTime() + Number((await RenterListing.findByPk(lockedRequest.listingId, { transaction })).rentalPeriodDays) * 86400000);
        await lockedRequest.update({ status: "active", paymentStatus: "paid", activeAt, dueAt }, { transaction });
      } else {
        const finePaidAt = new Date();
        await lockedRequest.update({ finePaidAt, commissionStatus: lockedRequest.status === "returned" ? "pending" : lockedRequest.commissionStatus }, { transaction });
      }
      return { request: lockedRequest };
    });
    return res.json({ message: payment.purpose === "checkout" ? "Payment confirmed. Rental is now active." : "Rental fine payment confirmed.", request: result.request });
  } catch (error) {
    console.error("Verify rental payment error:", error.message);
    return res.status(error.status || 500).json({ message: error.status ? error.message : "Unable to verify payment" });
  }
};

exports.paymentWebhook = async (req, res) => {
  const rawBody = req.body;
  if (!razorpay.verifyWebhookSignature(rawBody, req.headers["x-razorpay-signature"])) return res.status(400).send("Invalid webhook signature");
  let event;
  try { event = JSON.parse(rawBody.toString("utf8")); }
  catch { return res.status(400).send("Invalid webhook body"); }
  if (event.event !== "payment.captured") return res.status(200).json({ received: true, ignored: true });
  const captured = event.payload?.payment?.entity;
  if (!captured?.order_id || !captured?.id) return res.status(400).send("Captured payment details are missing");
  try {
    const payment = await RentalPayment.findOne({ where: { razorpayOrderId: captured.order_id } });
    if (!payment) return res.status(200).json({ received: true, ignored: true });
    if (captured.amount !== Math.round(Number(payment.amount) * 100) || captured.currency !== "INR" || captured.status !== "captured") return res.status(409).json({ message: "Captured payment does not match saved rental order" });
    if (payment.status === "paid") return res.status(200).json({ received: true, duplicate: true });
    await sequelize.transaction(async (transaction) => {
      const lockedPayment = await RentalPayment.findByPk(payment.id, { transaction, lock: transaction.LOCK.UPDATE });
      const lockedRequest = await RentalRequest.findByPk(payment.rentalRequestId, { transaction, lock: transaction.LOCK.UPDATE });
      if (lockedPayment.status === "paid") return;
      if (lockedPayment.purpose === "checkout") {
        if (lockedRequest.status !== "approved" || lockedRequest.paymentStatus !== "quoted" || Math.round(Number(lockedRequest.checkoutAmount) * 100) !== captured.amount) throw new Error("Captured checkout no longer matches its quote");
        const copies = await RenterListingCopy.findAll({ where: { reservedRequestId: lockedRequest.id, status: "reserved" }, transaction, lock: transaction.LOCK.UPDATE });
        if (copies.length !== Number(lockedRequest.quantity || 1)) throw new Error("Reserved copies do not match the rental request");
        for (const copy of copies) await copy.update({ status: "rented" }, { transaction });
        const listing = await RenterListing.findByPk(lockedRequest.listingId, { transaction });
        if (!listing) throw new Error("Rental listing no longer exists");
        const activeAt = new Date();
        const dueAt = new Date(activeAt.getTime() + Number(listing.rentalPeriodDays) * 86400000);
        await lockedRequest.update({ status: "active", paymentStatus: "paid", activeAt, dueAt }, { transaction });
      } else {
        if (lockedRequest.status !== "returned") throw new Error("Fine payment does not match a completed rental return");
        await lockedRequest.update({ finePaidAt: new Date(), commissionStatus: "pending" }, { transaction });
      }
      await lockedPayment.update({ status: "paid", razorpayPaymentId: captured.id, paidAt: new Date(captured.created_at * 1000) }, { transaction });
    });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Process Razorpay rental webhook error:", error.message);
    return res.status(500).json({ message: "Unable to process captured rental payment" });
  }
};

exports.approveCommission = async (req, res) => {
  try {
    const request = await RentalRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: "Rental request not found" });
    if (request.status !== "returned" || !request.finePaidAt) {
      return res.status(409).json({ message: "Commission can be approved after the book is returned and assessed charges are settled" });
    }
    if (request.commissionStatus !== "pending") return res.status(409).json({ message: "This commission is not awaiting Admin approval" });
    await request.update({ commissionStatus: "approved", commissionApprovedAt: new Date() });
    return res.json({ message: "Renter commission approved for manual payout", request });
  } catch (error) {
    console.error("Approve renter commission error:", error);
    return res.status(500).json({ message: "Unable to approve commission" });
  }
};

exports.recordCommissionPayout = async (req, res) => {
  const payoutReference = typeof req.body.reference === "string" ? req.body.reference.trim() : "";
  if (!payoutReference || payoutReference.length > 120) return res.status(400).json({ message: "Enter the manual transfer reference (up to 120 characters)" });
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const request = await RentalRequest.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request) return { code: 404, message: "Rental request not found" };
      if (request.status !== "returned" || request.commissionStatus !== "approved") return { code: 409, message: "Approve the commission after return before recording payout" };
      await request.update({ commissionStatus: "paid", payoutAt: new Date(), payoutReference }, { transaction });
      return { request };
    });
    if (result.code) return res.status(result.code).json({ message: result.message });
    return res.json({ message: "Manual renter payout recorded", request: result.request });
  } catch (error) {
    console.error("Record renter commission payout error:", error);
    return res.status(500).json({ message: "Unable to record commission payout" });
  }
};

exports.recordReturn = async (req, res) => {
  const condition = String(req.body.condition || "").toLowerCase();
  const damageCharge = Number(req.body.damageCharge || 0);
  if (!["good", "damaged", "lost"].includes(condition)) return res.status(400).json({ message: "Choose good, damaged, or lost book condition" });
  if (!Number.isFinite(damageCharge) || damageCharge < 0 || damageCharge > 99999999.99 || Math.round(damageCharge * 100) !== damageCharge * 100 || (condition === "good" && damageCharge !== 0)) return res.status(400).json({ message: "Enter a valid damage/loss charge" });
  try {
    const result = await sequelize.transaction(async (transaction) => {
      const request = await RentalRequest.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request) return { code: 404, message: "Rental request not found" };
      if (request.status !== "active" || !request.dueAt) return { code: 409, message: "Only an active rental can be returned" };
      const copies = await RenterListingCopy.findAll({ where: { reservedRequestId: request.id, status: "rented" }, transaction, lock: transaction.LOCK.UPDATE });
      if (copies.length !== Number(request.quantity || 1)) return { code: 409, message: "Rented copy inventory is inconsistent; reconcile before recording return" };
      const returnedAt = new Date();
      const lateDays = Math.max(0, Math.ceil((returnedAt.getTime() - new Date(request.dueAt).getTime()) / 86400000));
      const lateFeeAmount = Math.round(lateDays * Number(request.lateFeePerDay || 0) * 100) / 100;
      for (const copy of copies) await copy.update({ status: condition === "good" ? "available" : condition }, { transaction });
      const chargesOutstanding = lateFeeAmount + damageCharge > 0;
      await request.update({ status: "returned", returnedAt, returnCondition: condition, damageCharge: damageCharge.toFixed(2), lateFeeAmount: lateFeeAmount.toFixed(2), finePaidAt: chargesOutstanding ? null : returnedAt, commissionStatus: chargesOutstanding ? "held" : "pending" }, { transaction });
      return { request, lateDays };
    });
    if (result.code) return res.status(result.code).json({ message: result.message });
    return res.json({ message: "Return recorded", lateDays: result.lateDays, request: result.request });
  } catch (error) {
    console.error("Record renter book return error:", error);
    return res.status(500).json({ message: "Unable to record book return" });
  }
};
