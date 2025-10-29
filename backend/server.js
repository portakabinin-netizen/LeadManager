// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const os = require("os");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// ✅ Mount routes

const allRoutes = require("./routes/MongoDBQueryController")(io);



app.use("/action", allRoutes);



// Optional middleware hook (currently unused)

app.use((req, res, next) => {
  if (["POST", "PUT"].includes(req.method)) {
    
    // Add validation / logging here if needed
  }
  next();
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("🔥 Uncaught error:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Get local IP for LAN testing
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

// ✅ Connect MongoDB & start server
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    const localIP = getLocalIP();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(
        "✅ MongoDB Connected",
        "⚡ Socket.IO Server Ready"
      );
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
