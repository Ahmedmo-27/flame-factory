const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const userRoutes = require("./src/routes/userRoutes");
const memberRoutes = require("./src/routes/memberRoutes");
const salesRequestRoutes = require("./src/routes/salesRequestRoutes");

dotenv.config();

const app = express();
connectDB();
app.use(cors());
app.use(express.json());

app.get("/", (req,res) =>{
res.send("Gym System API is running");
});

app.use("/api/users", userRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/sales-requests", salesRequestRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
});