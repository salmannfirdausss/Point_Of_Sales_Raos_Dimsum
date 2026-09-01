const express = require("express");
const upload = require("../middlewares/upload");
const verifyToken = require("../middlewares/verify-token");
const verifyRole = require("../middlewares/verify-role");
const {
  getAllProdukAdmin,
  getProdukByCategory,
  getProdukById,
  createProduk,
  updateProduk,
  deleteProduk,
  getAllSauce,
  getAllQty,
  getHargaByPax,
} = require("../controllers/produk-controller");

const router = express.Router();
const adminAccess = [verifyToken, verifyRole(["admin", "master"])];

router.get("/detail/:id", getProdukById);
router.get("/:productId/sauces", getAllSauce);
router.get("/:productId/qty", getAllQty);
router.get("/:productId/harga", getHargaByPax);
router.get("/category/:categoryId", getProdukByCategory);
router.get("/all", ...adminAccess, getAllProdukAdmin);
router.post("/", ...adminAccess, upload.single("produkImg"), createProduk);
router.put("/:id", ...adminAccess, upload.single("produkImg"), updateProduk);
router.delete("/:id", ...adminAccess, deleteProduk);

module.exports = router;