const db = require("../models");

const KaryawanModel = db.Karyawan || db.karyawan;
const Penjualan = db.penjualan || db.Penjualan;
const UserModel = db.User || db.user || db.users;
const ProdukModel = db.produk || db.Produk || db.produks;
const HargaProdukModel = db.hargaProduk;
const OutletModel = db.Outlet;
const DetailSausModel = db.DetailSaus || db.detailSaus || db.detailsaus;
const AbsenModel = db.Absen || db.absen;
const sequelize = db.sequelize;

const getDateKeyInTimeZone = (dateValue, timeZone = "Asia/Jakarta") => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = parts.reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return `${values.year}-${values.month}-${values.day}`;
};

function parseSauces(value) {
  if (value === undefined || value === null) return [];

  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      value = [value];
    }
  }

  if (!Array.isArray(value)) value = [value];

  return value
    .map((sauce) => String(sauce).trim())
    .filter((sauce) => sauce && sauce.toLowerCase() !== "original");
}

const checkoutTransaksi = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { metodePembayaran, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Data keranjang kosong",
      });
    }

    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: "Sesi kasir tidak ditemukan. Silakan login kembali.",
      });
    }

    if (req.user.role !== "kasir") {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Hanya kasir yang dapat membuat transaksi.",
      });
    }

    const todayKey = getDateKeyInTimeZone(new Date());
    const hasTodayAttendance = await AbsenModel.findOne({
      where: { userId },
      order: [["createdAt", "DESC"]],
      transaction,
    });

    if (!hasTodayAttendance) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Karyawan belum melakukan absensi hari ini. Silakan absen terlebih dahulu sebelum transaksi.",
      });
    }

    const absensiDateKey = getDateKeyInTimeZone(hasTodayAttendance.createdAt);
    if (absensiDateKey !== todayKey) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Absensi hari ini belum valid untuk transaksi. Silakan lakukan absensi terlebih dahulu.",
      });
    }

    const karyawan = await KaryawanModel.findOne({
      where: { userId },
      transaction,
    });

    if (!karyawan?.outletId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Kasir belum terdaftar pada outlet.",
      });
    }

    const outletId = karyawan.outletId;
    const paymentMethod = String(metodePembayaran || "").toUpperCase();
    if (!["CASH", "QRIS"].includes(paymentMethod)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Metode pembayaran harus Cash atau QRIS.",
      });
    }

    const productIds = items.map((item) =>
      Number(item.productId || item.idProduk),
    );

    if (productIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Product ID tidak valid.",
      });
    }

    const products = await ProdukModel.findAll({
      where: { id: productIds },
      include: [
        { model: HargaProdukModel, as: "hargaproduks" },
        { model: db.topping, as: "toppings" },
      ],
      transaction,
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    if (products.length !== new Set(productIds).size) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Ada produk yang tidak ditemukan.",
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const invoice = `INV-${dateStr}-${randomNum}`;
    const dataPenjualan = [];
    let calculatedTotal = 0;

    for (const item of items) {
      const productId = Number(item.productId || item.idProduk);
      const product = productMap.get(productId);
      const pcs = Number(item.pcs);
      const pax = Number(item.pax);

      if (!Number.isInteger(pcs) || pcs <= 0 || !Number.isInteger(pax) || pax <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Jumlah pcs dan pax harus bilangan positif.",
        });
      }

      const packagePrice = product.hargaproduks.find(
        (option) => Number(option.qty) === pcs,
      );
      if (!packagePrice) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Paket ${pcs} pcs tidak tersedia untuk ${product.namaProduk}.`,
        });
      }

      const requestedSauces = item.saus || item.sauce;
      const sauces = parseSauces(requestedSauces);
      const availableSauceNames = product.toppings.map((topping) =>
        topping.namaTopping.toLowerCase(),
      );

      if (sauces.some((sauce) => !availableSauceNames.includes(sauce.toLowerCase()))) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Saus tidak tersedia untuk ${product.namaProduk}.`,
        });
      }

      const saucePricePerPax = sauces.reduce((total, sauce) => {
        const topping = product.toppings.find(
          (itemTopping) =>
            itemTopping.namaTopping.toLowerCase() === sauce.toLowerCase(),
        );
        return total + (Number(topping.harga) * pcs) / sauces.length;
      }, 0);
      const unitPrice = Number(packagePrice.harga) + saucePricePerPax;
      const subtotal = unitPrice * pax;
      calculatedTotal += subtotal;

      dataPenjualan.push({
        invoice,
        idProduk: productId,
        userId,
        outletId,
        namaProduk: product.namaProduk,
        pcs,
        pax,
        saus: sauces.length ? sauces : ["original"],
        subtotal,
        totalBayar: calculatedTotal,
        metodePembayaran: paymentMethod === "CASH" ? "Cash" : "QRIS",
      });
    }

    dataPenjualan.forEach((row) => {
      row.totalBayar = calculatedTotal;
    });

    // 3. Simpan semua baris barang sekaligus
    const result = await Penjualan.bulkCreate(dataPenjualan, { transaction });

    if (DetailSausModel) {
      const detailSausData = [];
      result.forEach((penjualanItem, index) => {
        const item = items[index];
        const sauceDetails = item.sauceDetails || item.detailSaus || [];

        if (!Array.isArray(sauceDetails)) return;

        sauceDetails.forEach((sauce) => {
          const namaSaus = sauce.namaSaus || sauce.name;
          const qty = Number(sauce.qty);
          if (namaSaus && Number.isFinite(qty) && qty >= 0) {
            detailSausData.push({
              penjualanId: penjualanItem.id,
              invoice,
              namaSaus,
              qty,
            });
          }
        });
      });

      if (detailSausData.length > 0) {
        await DetailSausModel.bulkCreate(detailSausData, { transaction });
      }
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: "Transaksi berhasil disimpan",
      data: {
        invoice,
        kasirId: userId,
        totalBayar: calculatedTotal,
        metodePembayaran: paymentMethod === "CASH" ? "Cash" : "QRIS",
        totalItems: result.length,
      },
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("CHECKOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memproses transaksi",
      error: error.message,
    });
  }
};

const tampilPenjualanByUserId = async (req, res) => {
  try {
    const requestedUserId = Number(req.params.userId || req.user?.id);
    const currentUserId = Number(req.user?.id);

    if (!Number.isInteger(requestedUserId) || requestedUserId <= 0) {
      return res.status(400).json({
        success: false,
        message: "User ID wajib diisi.",
      });
    }

    if (req.user.role !== "master" && requestedUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Kamu tidak memiliki akses ke riwayat user ini.",
      });
    }

    const includeOptions = [];

    if (UserModel) {
      includeOptions.push({
        model: UserModel,
        as: "kasir",
        attributes: ["id", "username"],
      });
    }

    if (ProdukModel) {
      includeOptions.push({
        model: ProdukModel,
        as: "produk",
        required: false,
      });
    }

    if (DetailSausModel) {
      includeOptions.push({
        model: DetailSausModel,
        as: "detailSaus",
        required: false,
      });
    }

    const dataPenjualan = await Penjualan.findAll({
      where: { userId: requestedUserId },
      include: includeOptions,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil data penjualan berdasarkan User ID",
      totalItem: dataPenjualan.length,
      data: dataPenjualan,
    });
  } catch (error) {
    console.error("Error pada tampilPenjualanByUserId:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server saat mengambil data penjualan.",
      error: error.message,
    });
  }
};

const tampilPenjualanByOutletId = async (req, res) => {
  try {
    const outletId = Number(req.params.outletId);

    if (!Number.isInteger(outletId) || outletId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Outlet Id wajib diisi",
      });
    }

    if (req.user.role !== "master") {
      const ownedOutlet = await OutletModel.findOne({
        where: { id: outletId, userId: req.user.id },
        attributes: ["id"],
      });

      const assignedEmployee = await KaryawanModel.findOne({
        where: { userId: req.user.id, outletId },
        attributes: ["id"],
      });

      if (!ownedOutlet && !assignedEmployee) {
        return res.status(403).json({
          success: false,
          message: "Kamu tidak memiliki akses ke outlet ini.",
        });
      }
    }

    const includeOptions = [];

    if (UserModel) {
      includeOptions.push({
        model: UserModel,
        as: "kasir",
        attributes: ["id", "username"],
      });
    }

    if (ProdukModel) {
      includeOptions.push({
        model: ProdukModel,
        as: "produk",
        required: false,
      });
    }

    if (DetailSausModel) {
      includeOptions.push({
        model: DetailSausModel,
        as: "detailSaus",
        required: false,
      });
    }

    const dataPenjualan = await Penjualan.findAll({
      where: { outletId },
      include: includeOptions,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Berhasil mengambil data penjualan berdasarkan Outlet ID",
      totalItem: dataPenjualan.length,
      data: dataPenjualan,
    });
  } catch (error) {
    console.error("Error pada tampilPenjualanByOutletId:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server saat mengambil data penjualan.",
      error: error.message,
    });
  }
};

module.exports = {
  checkoutTransaksi,
  tampilPenjualanByUserId,
  tampilPenjualanByOutletId,
};
