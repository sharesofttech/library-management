const router = require("express").Router();
const controller = require("../controllers/deliveryRateController");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");

router.get("/settings/delivery-rates", verifyToken, requireRole("admin", "user"), controller.get);
router.put("/settings/delivery-rates", verifyToken, requireRole("admin"), controller.save);

module.exports = router;
