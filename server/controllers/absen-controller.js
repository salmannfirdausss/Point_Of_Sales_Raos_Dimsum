const { Absen, User, Karyawan, Outlet } = require("../models");
const { Op } = require("sequelize");

const formatTimeInTimeZone = (dateValue, timeZone = "Asia/Jakarta") => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

module.exports = {
  submitAbsen: async (req, res) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          status: false,
          message: "Foto bukti absensi wajib diunggah",
        });
      }

      const fotoUrl = `/public/absen/${req.file.filename}`;

      const newAbsen = await Absen.create({
        userId,
        foto: fotoUrl,
      });

      res.status(201).json({
        status: true,
        message: "Absensi berhasil disimpan",
        data: newAbsen,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  },

  getHistoryAbsen: async (req, res) => {
    try {
      const userId = req.user.id;

      const history = await Absen.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]],
      });

      res.status(200).json({
        status: true,
        message: "Berhasil mengambil riwayat absensi",
        data: history,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  },

  getAllAbsensi: async (req, res) => {
    try {
      const dateParam = req.query.date;
      const targetDate = dateParam ? new Date(dateParam) : new Date();

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const outletFilter =
        req.user.role === "master" ? {} : { userId: req.user.id };

      const karyawanList = await Karyawan.findAll({
        where: { category: "Tenant" },
        include: [
          {
            model: Outlet,
            as: "outlet",
            where: outletFilter,
            attributes: ["id", "outletName"],
          },
          { model: User, as: "account", attributes: ["id"] },
        ],
      });

      const userIds = karyawanList
        .map((k) => k.account?.id)
        .filter((id) => id !== undefined);

      const absensiHariIni = await Absen.findAll({
        where: {
          userId: { [Op.in]: userIds },
          createdAt: { [Op.between]: [startOfDay, endOfDay] },
        },
        order: [["createdAt", "ASC"]],
      });

      const result = karyawanList.map((k) => {
        const record = absensiHariIni.find((a) => a.userId === k.account?.id);

        return {
          id: k.id,
          name: k.name,
          outletName: k.outlet?.outletName ?? null,
          jamAbsen: record ? formatTimeInTimeZone(record.createdAt) : "-",
          status: record ? "Hadir" : "Belum Absen",
          foto: record ? record.foto : null,
        };
      });

      res.status(200).json({
        status: true,
        message: "Berhasil mengambil data absensi",
        data: result,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        status: false,
        message: "Terjadi kesalahan pada server",
      });
    }
  },
};
