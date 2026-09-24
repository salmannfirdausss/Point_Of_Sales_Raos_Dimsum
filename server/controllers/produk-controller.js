const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const db = require("../models");

const produk = db.produk || db.Produk;
const category = db.category || db.Category;
const topping = db.topping || db.Topping;
const hargaProduk = db.hargaProduk || db.hargaproduks || db.HargaProduk;
const outlet = db.outlet || db.Outlet;
const sequelize = db.sequelize;

const parseSafeNumber = (val) => {
  if (val === null || val === undefined || val === "" || val === "null" || val === "undefined") return null;
  const parsed = Number(val);
  return isNaN(parsed) ? null : parsed;
};

const parseArrayField = (field) => {
  if (!field) return [];
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(field) ? field : [];
};

// ==========================================
// 1. GET PRODUK KASIR (FILTER ARRAY OUTLET)
// ==========================================
const getProdukKasir = async (req, res) => {
  try {
    const { outletId, categoryId } = req.query;
    const whereClause = {};

    if (outletId) {
      const targetId = Number(outletId);
      whereClause[Op.or] = [
        { outletIds: null },
        { outletIds: "" },
        { outletIds: { [Op.like]: `%"${targetId}"%` } },
        { outletIds: { [Op.like]: `%${targetId}%` } },
      ];
    }

    if (categoryId) {
      whereClause.categoryId = Number(categoryId);
    }

    const products = await produk.findAll({
      where: whereClause,
      include: [
        { model: category, as: "category", attributes: ["id", "name"] },
        { model: topping, as: "toppings" },
        { model: hargaProduk, as: "hargaproduks" },
        { model: outlet, as: "outlet", attributes: ["id", "outletName"] },
      ],
      order: [["id", "ASC"]],
    });

    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Error pada getProdukKasir:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getProdukByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const targetOutletId = req.user?.outletId ?? req.query.outletId;

    const whereClause = { categoryId: Number(categoryId) };

    if (targetOutletId !== undefined && targetOutletId !== null && targetOutletId !== "") {
      const tId = Number(targetOutletId);
      whereClause[Op.or] = [
        { outletIds: null },
        { outletIds: "" },
        { outletIds: { [Op.like]: `%"${tId}"%` } },
        { outletIds: { [Op.like]: `%${tId}%` } },
      ];
    }

    const products = await produk.findAll({
      where: whereClause,
      include: [
        { model: category, as: "category", attributes: ["id", "name"] },
        { model: topping, as: "toppings" },
        { model: hargaProduk, as: "hargaproduks" },
      ],
      order: [["id", "ASC"]],
    });

    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Error pada getProdukByCategory:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// CREATE produk (DENGAN SUPPORT OUTLET IDS ARRAY - TANPA PROSES FOTO PRODUK)
const createProduk = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { namaProduk, keterangan, categoryId, tenantId } = req.body;

    if (!namaProduk || !namaProduk.trim()) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Nama produk wajib diisi" });
    }

    const validCategoryId = parseSafeNumber(categoryId);
    if (!validCategoryId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Kategori wajib dipilih" });
    }

    const rawOutletIds = parseArrayField(req.body.outletId || req.body.outletIds);
    const outletArray = rawOutletIds.map((id) => String(id)).filter(Boolean);
    const outletIdsVal = outletArray.length > 0 ? JSON.stringify(outletArray) : null;

    const toppings = parseArrayField(req.body.toppings);
    const hargaproduks = parseArrayField(req.body.hargaproduks);

    // Pengelolaan foto produk dihilangkan sepenuhnya
    const newProduk = await produk.create(
      {
        namaProduk: namaProduk.trim(),
        keterangan: keterangan || null,
        categoryId: validCategoryId,
        tenantId: parseSafeNumber(tenantId),
        outletIds: outletIdsVal,
        produkImg: null,
      },
      { transaction: t }
    );

    if (Array.isArray(toppings) && toppings.length > 0) {
      const toppingData = toppings
        .filter((item) => item.namaTopping && item.namaTopping.trim() !== "")
        .map((item) => ({
          namaTopping: item.namaTopping.trim(),
          harga: parseSafeNumber(item.harga) || 0,
          produkId: newProduk.id,
        }));

      if (toppingData.length > 0) {
        await topping.bulkCreate(toppingData, { transaction: t });
      }
    }

    if (Array.isArray(hargaproduks) && hargaproduks.length > 0) {
      const hargaData = hargaproduks
        .filter((item) => item.qty !== undefined && item.qty !== null)
        .map((item) => ({
          qty: parseSafeNumber(item.qty) || 1,
          harga: parseSafeNumber(item.harga) || 0,
          produkId: newProduk.id,
        }));

      if (hargaData.length > 0) {
        await hargaProduk.bulkCreate(hargaData, { transaction: t });
      }
    }

    await t.commit();
    return res.status(201).json({
      success: true,
      message: "Produk berhasil dibuat",
      data: newProduk,
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ Error pada createProduk:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE produk
const updateProduk = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { namaProduk, keterangan, categoryId, tenantId } = req.body;

    const item = await produk.findByPk(id);
    if (!item) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    const validCategoryId = categoryId !== undefined ? parseSafeNumber(categoryId) : item.categoryId;

    const rawOutletIds = parseArrayField(req.body.outletId || req.body.outletIds);
    const outletArray = rawOutletIds.map((id) => String(id)).filter(Boolean);
    const outletIdsVal = outletArray.length > 0 ? JSON.stringify(outletArray) : null;

    // Foto produk dikosongkan/diabaikan
    await item.update(
      {
        namaProduk: namaProduk ? namaProduk.trim() : item.namaProduk,
        keterangan: keterangan !== undefined ? keterangan : item.keterangan,
        categoryId: validCategoryId,
        tenantId: tenantId !== undefined ? parseSafeNumber(tenantId) : item.tenantId,
        outletIds: outletIdsVal,
        produkImg: null,
      },
      { transaction: t }
    );

    const toppings = parseArrayField(req.body.toppings);
    const hargaproduks = parseArrayField(req.body.hargaproduks);

    const existingHargaList = await hargaProduk.findAll({
      where: { produkId: id },
      transaction: t,
    });

    const existingHargaIds = existingHargaList.map((h) => h.id);
    const incomingHargaIds = hargaproduks.map((h) => parseSafeNumber(h.id)).filter(Boolean);

    const hargaIdsToDelete = existingHargaIds.filter((hId) => !incomingHargaIds.includes(hId));

    if (hargaIdsToDelete.length > 0) {
      try {
        await hargaProduk.destroy({
          where: { id: hargaIdsToDelete, produkId: id },
          transaction: t,
        });
      } catch (fkErr) {
        console.warn("⚠️ Harga terikat riwayat pesanan:", fkErr.message);
      }
    }

    if (Array.isArray(hargaproduks) && hargaproduks.length > 0) {
      for (const hItem of hargaproduks) {
        const hId = parseSafeNumber(hItem.id);
        const qty = parseSafeNumber(hItem.qty) || 1;
        const hargaVal = parseSafeNumber(hItem.harga) || 0;

        if (hId && existingHargaIds.includes(hId)) {
          await hargaProduk.update(
            { qty, harga: hargaVal },
            { where: { id: hId, produkId: id }, transaction: t }
          );
        } else {
          await hargaProduk.create(
            { qty, harga: hargaVal, produkId: Number(id) },
            { transaction: t }
          );
        }
      }
    }

    await topping.destroy({ where: { produkId: id }, transaction: t });

    if (Array.isArray(toppings) && toppings.length > 0) {
      const toppingData = toppings
        .filter((tItem) => tItem.namaTopping && tItem.namaTopping.trim() !== "")
        .map((tItem) => ({
          namaTopping: tItem.namaTopping.trim(),
          harga: parseSafeNumber(tItem.harga) || 0,
          produkId: Number(id),
        }));

      if (toppingData.length > 0) {
        await topping.bulkCreate(toppingData, { transaction: t });
      }
    }

    await t.commit();
    return res.status(200).json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: item,
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ Error pada updateProduk:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllProdukAdmin = async (req, res) => {
  try {
    const products = await produk.findAll({
      include: [
        { model: category, as: "category", attributes: ["id", "name"] },
        { model: topping, as: "toppings" },
        { model: hargaProduk, as: "hargaproduks" },
      ],
      order: [["id", "ASC"]],
    });
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Error pada getAllProdukAdmin:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getProdukById = async (req, res) => {
  try {
    const product = await produk.findByPk(req.params.id, {
      include: [
        { model: category, as: "category", attributes: ["id", "name"] },
        { model: topping, as: "toppings" },
        { model: hargaProduk, as: "hargaproduks" },
      ],
    });
    if (!product) return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("Error pada getProdukById:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteProduk = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const item = await produk.findByPk(id);

    if (!item) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    await topping.destroy({ where: { produkId: id }, transaction: t });
    await hargaProduk.destroy({ where: { produkId: id }, transaction: t });
    await item.destroy({ transaction: t });

    await t.commit();
    return res.status(200).json({ success: true, message: "Produk berhasil dihapus" });
  } catch (error) {
    await t.rollback();
    console.error("Error pada deleteProduk:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllSauce = async (req, res) => {
  try {
    const sauces = await topping.findAll({ where: { produkId: req.params.productId } });
    return res.status(200).json({ success: true, data: sauces });
  } catch (error) {
    console.error("Error pada getAllSauce:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllQty = async (req, res) => {
  try {
    const qtyOptions = await hargaProduk.findAll({
      where: { produkId: req.params.productId },
      order: [["qty", "ASC"]],
    });
    return res.status(200).json({ success: true, data: qtyOptions });
  } catch (error) {
    console.error("Error pada getAllQty:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getHargaByPax = async (req, res) => {
  try {
    const hargaItem = await hargaProduk.findOne({
      where: { produkId: req.params.productId, qty: Number(req.query.qty) },
    });
    if (!hargaItem) return res.status(404).json({ success: false, message: "Harga tidak ditemukan" });
    return res.status(200).json({ success: true, data: hargaItem });
  } catch (error) {
    console.error("Error pada getHargaByPax:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProdukKasir,
  getAllProdukAdmin,
  getProdukByCategory,
  getProdukById,
  createProduk,
  updateProduk,
  deleteProduk,
  getAllQty,
  getAllSauce,
  getHargaByPax,
};