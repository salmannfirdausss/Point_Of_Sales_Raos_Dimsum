const { Absen, User, Karyawan, Outlet } = require("../models");
const { Op } = require("sequelize");

const getJakartaDayRange = (dateValue = new Date()) => {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(dateValue);

  return {
    start: new Date(`${dateKey}T00:00:00+07:00`),
    end: new Date(`${dateKey}T23:59:59.999+07:00`),
  };
};

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

      const tipe = req.body.tipe === "Keberangkatan" ? "Keberangkatan" : "Masuk";
      const { start: startOfDay, end: endOfDay } = getJakartaDayRange();

      if (tipe === "Masuk") {
        const departureAttendance = await Absen.findOne({
          where: {
            userId,
            tipe: "Keberangkatan",
            createdAt: { [Op.between]: [startOfDay, endOfDay] },
          },
        });

        if (!departureAttendance) {
          return res.status(400).json({
            status: false,
            message: "Absensi keberangkatan harus dilakukan terlebih dahulu.",
          });
        }
      }

      const existingAttendance = await Absen.findOne({
        where: {
          userId,
          tipe,
          createdAt: { [Op.between]: [startOfDay, endOfDay] },
        },
      });

      if (existingAttendance) {
        return res.status(409).json({
          status: false,
          message: `Absensi ${tipe.toLowerCase()} hari ini sudah tercatat.`,
        });
      }

      const fotoUrl = `/public/absen/${req.file.filename}`;

      const newAbsen = await Absen.create({
        userId,
        foto: fotoUrl,
        tipe,
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
      const targetDate = dateParam ? new Date(`${dateParam}T12:00:00+07:00`) : new Date();
      const { start: startOfDay, end: endOfDay } = getJakartaDayRange(targetDate);

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
        const records = absensiHariIni.filter((a) => a.userId === k.account?.id);
        const masuk = records.find((record) => (record.tipe || "Masuk") === "Masuk");
        const keberangkatan = records.find((record) => record.tipe === "Keberangkatan");

        return {
          id: k.id,
          name: k.name,
          outletName: k.outlet?.outletName ?? null,
          jamMasuk: masuk ? formatTimeInTimeZone(masuk.createdAt) : "-",
          fotoMasuk: masuk ? masuk.foto : null,
          jamKeberangkatan: keberangkatan ? formatTimeInTimeZone(keberangkatan.createdAt) : "-",
          fotoKeberangkatan: keberangkatan ? keberangkatan.foto : null,
          status: masuk || keberangkatan ? "Hadir" : "Belum Absen",
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
