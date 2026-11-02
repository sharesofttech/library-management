const router = require("express").Router();
const controller = require("../controllers/renterListingController");
const upload = require("../utils/bookUpload");
const { verifyToken, requireRole, requireApprovedRenter } = require("../middleware/authMiddleware");

router.get("/catalog/renter-listings", verifyToken, requireRole("user"), controller.getApprovedListings);
router.get("/catalog/renter-listings/:id", verifyToken, requireRole("user"), controller.getApprovedListing);
router.get("/renter/listings", verifyToken, requireRole("user"), requireApprovedRenter, controller.getMyListings);
router.post("/renter/listings", verifyToken, requireRole("user"), requireApprovedRenter, upload, controller.createListing);
router.patch("/renter/listings/:id/highlights", verifyToken, requireRole("user"), requireApprovedRenter, controller.updateHighlights);
router.patch("/renter/listings/:id/weight", verifyToken, requireRole("user"), requireApprovedRenter, controller.updateWeight);
router.get("/admin/renter-listings", verifyToken, requireRole("admin"), controller.getPendingListings);
router.patch("/admin/renter-listings/:id", verifyToken, requireRole("admin"), controller.reviewListing);

module.exports = router;
