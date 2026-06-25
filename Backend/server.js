const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const userRoutes = require("./src/routes/userRoutes")

dotenv.config();

const app = express();
connectDB();
app.use(express.json());

app.get("/", (req,res) =>{
res.send("Gym System API is running");
});

app.use("/api/users", userRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
});