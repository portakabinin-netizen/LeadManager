const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
require("dotenv").config();
const cloudinary = require('cloudinary').v2;
const bodyParser = require('body-parser');
// Routers
const serviceRouter = require("./routes/serviceRouter");
const authRouter = require("./routes/authRouter");
const productsRouter = require("./routes/productsRouter"); 

const app = express();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// ---------- Middleware ----------
app.use(cors());
//app.use(express.json());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));


// ---------- Create HTTP + Socket Server ----------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// ---------- MongoDB Connection ----------
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------- Socket.IO Setup (optional broadcast) ----------
io.on("connection", (socket) => {
  console.log(`⚡ User connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// ---------- Mount Routes ----------
app.use("/api/auth", authRouter); 
app.use("/api/service", serviceRouter);
app.use("/api/product", productsRouter); 

// ---------- Default Route ----------
app.get("/", (req, res) => {
  res.send("🚀 LeadManager API is running successfully...");
});

// ---------- Error Handling ----------
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Server running on port ${PORT}`)
);

