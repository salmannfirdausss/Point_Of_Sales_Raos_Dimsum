require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./models");
const authRoutes = require("./routers/auth-router");
const categoryRoutes = require("./routers/category-router");
const produkRoutes = require("./routers/produk-router");
const penjualanRoutes = require("./routers/penjualan-router");
const karyawanRoutes = require("./routers/karyawan-router");
const outletRoutes = require("./routers/outlet-router");
const absenRoutes = require("./routers/absen-router");
const dashboardRoutes = require("./routers/dashboard-router");
const analisaRoutes = require("./routers/analisa-router");

const server = express();
const PORT = process.env.PORT;

server.use(cors());
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use("/public", express.static(path.join(__dirname, "public")));

server.use("/api/auth", authRoutes);
server.use("/api/categories", categoryRoutes);
server.use("/api/products", produkRoutes);
server.use("/api/penjualan", penjualanRoutes);
server.use("/api/karyawan", karyawanRoutes);
server.use("/api/outlets", outletRoutes);
server.use("/api/absen", absenRoutes);
server.use("/api/dashboard", dashboardRoutes);
server.use("/api/analisa", analisaRoutes);

server.get("/", (req, res) => {
  res.json({
    message: "POS Raos Dimsum API is running",
  });
});

server.listen(PORT, () => {
  // db.sequelize.sync({ alter: true });
  console.log(`Server is running at port : ${PORT}`);
});
