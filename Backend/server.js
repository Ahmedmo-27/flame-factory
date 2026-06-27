const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const userRoutes = require("./src/routes/userRoutes");
const memberRoutes = require("./src/routes/memberRoutes");
const salesRequestRoutes = require("./src/routes/salesRequestRoutes");

dotenv.config();

const allowedOrigins = [
  "https://flame-factory.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

if (process.env.CORS_ORIGINS) {
  allowedOrigins.push(
    ...process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  );
}

const app = express();
connectDB();
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
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