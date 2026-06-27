const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const userRoutes = require("./src/routes/userRoutes");
const memberRoutes = require("./src/routes/memberRoutes");
const salesRequestRoutes = require("./src/routes/salesRequestRoutes");
const packageRoutes = require("./src/routes/packageRoutes");

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

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Allow Vercel production and preview deployments
  if (/^https:\/\/[\w.-]+\.vercel\.app$/.test(origin)) return true;
  return false;
}

const app = express();
connectDB();
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        // Never pass an Error here — that becomes a 500 in Express
        callback(null, false);
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
app.use("/api/packages", packageRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
});