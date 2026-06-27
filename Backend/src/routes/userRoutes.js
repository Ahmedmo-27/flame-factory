const express = require("express");
const router = express.Router();
const {registerUser, loginUser, getSalesTarget} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

router.get("/profile", protect, (req,res)=> {
res.json({
message:"protected route accessed",
user:req.user
});
});

router.get("/sales-target", protect, getSalesTarget);

router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;