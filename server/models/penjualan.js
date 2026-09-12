'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class penjualan extends Model {
    static associate(models) {
      // Relasi idProduk ke tabel produks
      const ProdukModel = models.produk || models.Produk;
      if (ProdukModel) {
        penjualan.belongsTo(ProdukModel, {
          foreignKey: 'idProduk',
          as: 'produk'
        });
      }

      // Relasi userId ke tabel users (kasir)
      // Mengecek models.User maupun models.user agar tidak throw error
      const UserModel = models.User || models.user;
      if (UserModel) {
        penjualan.belongsTo(UserModel, {
          foreignKey: 'userId',
          as: 'kasir' 
        });
      }

      const OutletModel = models.outlet || models.Outlet;
      if (OutletModel) {
        penjualan.belongsTo(OutletModel, {
          foreignKey: 'outletId',
          as: 'outlet'
        });
      }

      const DetailSausModel = models.DetailSaus || models.detailSaus || models.detailsaus;
      if (DetailSausModel) {
        penjualan.hasMany(DetailSausModel, {
          foreignKey: 'penjualanId',
          as: 'detailSaus'
        });
      }

    }
  }

  penjualan.init({
    invoice: {
      type: DataTypes.STRING,
      allowNull: false
    },
    idProduk: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'produks', // Nama tabel produk di MySQL
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users', // Nama tabel user di MySQL
        key: 'id'
      }
    },
    outletId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Outlets',
        key: 'id'
      }
    },
    namaProduk: DataTypes.STRING,
    pcs: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    pax: DataTypes.INTEGER,
    saus: {
      type: DataTypes.JSON, // Array of String ["Saus Mentai"]
      allowNull: true,
      defaultValue: []
    },
    subtotal: DataTypes.INTEGER,
    totalBayar: DataTypes.INTEGER,
    metodePembayaran: {
      type: DataTypes.STRING, // "Cash" / "QRIS"
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'penjualan',
    tableName: 'penjualans' // Menyesuaikan nama tabel plural di MySQL Workbench
  });

  return penjualan;
};