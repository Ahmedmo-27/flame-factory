const express = require("express");
const router = express.Router();
const {registerUser, loginUser, getSalesUsers} = require("../controllers/userController");
const protect = require("../middleware/authMiddleware")


router.get("/profile", protect, (req,res)=> {
res.json({
message:"protected route accessed",
user:req.user
});
});
router.post("/register", registerUser);
router.post("/login", loginUser);

// Returns all users with sales or Sales Manager role — used for dropdowns
router.get("/sales", protect, getSalesUsers);

module.exports = router;