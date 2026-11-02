const router = require("express").Router();
const controller = require("../controllers/rentalRequestController");
const { verifyToken, requireRole, requireApprovedRenter } = require("../middleware/authMiddleware");

router.post("/renter-listings/:listingId/requests", verifyToken, requireRole("user"), controller.create);
router.get("/rental-requests/mine", verifyToken, requireRole("user"), controller.mine);
router.get("/rental-requests/inbox", verifyToken, requireRole("user"), requireApprovedRenter, controller.inbox);
router.patch("/rental-requests/:id", verifyToken, requireRole("user"), requireApprovedRenter, controller.review);
router.patch("/admin/rental-checkout/:id/handover", verifyToken, requireRole("admin"), controller.updateHandover);
router.patch("/admin/rental-checkout/:id/library-receipt", verifyToken, requireRole("admin"), controller.confirmLibraryReceipt);
router.patch("/rental-requests/:id/confirm-receipt", verifyToken, requireRole("user"), controller.confirmReceipt);
router.get("/admin/rental-checkout", verifyToken, requireRole("admin"), controller.adminCheckoutQueue);
router.patch("/admin/rental-checkout/:id/quote", verifyToken, requireRole("admin"), controller.saveCheckoutQuote);
router.patch("/admin/rental-checkout/:id/return", verifyToken, requireRole("admin"), controller.recordReturn);
router.patch("/admin/rental-checkout/:id/commission/approve", verifyToken, requireRole("admin"), controller.approveCommission);
router.patch("/admin/rental-checkout/:id/commission/payout", verifyToken, requireRole("admin"), controller.recordCommissionPayout);
router.post("/rental-requests/:id/payment-order", verifyToken, requireRole("user"), controller.createPaymentOrder);
router.post("/rental-requests/:id/verify-payment", verifyToken, requireRole("user"), controller.verifyPayment);

module.exports = router;
