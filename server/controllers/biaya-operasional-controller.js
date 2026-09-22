const { biayaoperasional } = require("../models");

// ======================================================
// CREATE BIAYA OPERASIONAL
// ======================================================
const createBiayaOperasional = async (req, res) => {
  try {
    console.log("========================================");
    console.log("CREATE BIAYA OPERASIONAL");
    console.log("========================================");

    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const { deskripsi, biaya, tanggal } = req.body;

    // ------------------------------------------
    // VALIDASI BODY
    // ------------------------------------------
    if (!deskripsi || !deskripsi.trim()) {
      return res.status(400).json({
        success: false,
        message: "Deskripsi operasional wajib diisi",
      });
    }

    if (biaya === undefined || biaya === null || Number(biaya) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Biaya harus lebih dari 0",
      });
    }

    // ------------------------------------------
    // AMBIL USER & OUTLET
    // ------------------------------------------
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User belum terautentikasi",
      });
    }

    const outletId = user.outletId || user.outlet_id || user.idOutlet;
    if (!outletId) {
      return res.status(400).json({
        success: false,
        message: "Outlet user tidak ditemukan",
      });
    }

    // Utamakan userId jika req.user berisi objek Karyawan
    const userId = user.userId || user.id || user.id_user;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID tidak ditemukan",
      });
    }

    const tanggalOperasional = tanggal || new Date().toISOString().split("T")[0];

    // ------------------------------------------
    // CREATE RECORD
    // ------------------------------------------
    const data = await biayaoperasional.create({
      outletId: Number(outletId),
      userId: Number(userId),
      tanggal: tanggalOperasional,
      deskripsi: deskripsi.trim(),
      biaya: Number(biaya),
    });

    console.log("✅ BIAYA OPERASIONAL BERHASIL DIBUAT");

    return res.status(201).json({
      success: true,
      message: "Biaya operasional berhasil ditambahkan",
      data,
    });
  } catch (error) {
    console.error("❌ CREATE BIAYA OPERASIONAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan biaya operasional",
      error: error.message,
    });
  }
};
// ======================================================
// GET BIAYA OPERASIONAL HARI INI (PERBAIKAN)
// ======================================================
const getBiayaOperasionalHariIni = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User belum terautentikasi",
      });
    }

    const outletId = user.outletId || user.outlet_id || user.idOutlet;
    if (!outletId) {
      return res.status(400).json({
        success: false,
        message: "Outlet tidak ditemukan",
      });
    }

    // Ambil userId (utamakan user.userId dari token/session)
    const userId = user.userId || user.id || user.id_user;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID tidak ditemukan",
      });
    }

    const tanggal = req.query.tanggal || new Date().toISOString().split("T")[0];

    // Filter berdasarkan outletId, userId (milik karyawan login), dan tanggal
    const data = await biayaoperasional.findAll({
      where: {
        outletId: Number(outletId),
        userId: Number(userId),
        tanggal,
      },
      order: [["createdAt", "DESC"]],
    });

    const total = data.reduce((acc, item) => acc + Number(item.biaya || 0), 0);

    return res.status(200).json({
      success: true,
      data,
      total,
    });
  } catch (error) {
    console.error("❌ GET BIAYA OPERASIONAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil biaya operasional",
      error: error.message,
    });
  }
}
// ======================================================
// DELETE BIAYA OPERASIONAL
// ======================================================
const deleteBiayaOperasional = async (req, res) => {
  try {
    console.log("========================================");
    console.log("DELETE BIAYA OPERASIONAL");
    console.log("========================================");

    const { id } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User belum login",
      });
    }

    const outletId = user.outletId || user.outlet_id || user.idOutlet;
    const userId = user.userId || user.id || user.id_user;

    const data = await biayaoperasional.findOne({
      where: {
        id,
        outletId: Number(outletId),
        userId: Number(userId), // Memastikan hanya user pemilik yang dapat menghapus
      },
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Biaya operasional tidak ditemukan",
      });
    }

    await data.destroy();

    console.log("✅ Biaya operasional berhasil dihapus");

    return res.json({
      success: true,
      message: "Biaya operasional berhasil dihapus",
    });
  } catch (error) {
    console.error("❌ DELETE BIAYA OPERASIONAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus biaya operasional",
      error: error.message,
    });
  }
};

module.exports = {
  createBiayaOperasional,
  getBiayaOperasionalHariIni,
  deleteBiayaOperasional,
};