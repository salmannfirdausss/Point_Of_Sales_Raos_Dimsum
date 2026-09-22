'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Produk extends Model {
    static associate(models) {
      // Relasi Category
      const CategoryModel = models.category || models.Category;
      if (CategoryModel) {
        Produk.belongsTo(CategoryModel, {
          foreignKey: 'categoryId',
          as: 'category',
        });
      }

      // Relasi Outlet
      const OutletModel = models.Outlet || models.outlet;
      if (OutletModel) {
        Produk.belongsTo(OutletModel, {
          foreignKey: 'outletId',
          as: 'outlet',
        });
      }

      // Relasi Topping
      const ToppingModel = models.topping || models.Topping;
      if (ToppingModel) {
        Produk.hasMany(ToppingModel, {
          foreignKey: 'produkId',
          as: 'toppings',
        });
      }

      // Relasi Harga
      const HargaProdukModel = models.hargaProduk || models.HargaProduk;
      if (HargaProdukModel) {
        Produk.hasMany(HargaProdukModel, {
          foreignKey: 'produkId',
          as: 'hargaproduks',
        });
      }

      // Tambahkan di dalam static associate(models) pada model Produk
      Produk.hasMany(models.KomposisiProduk, {
        foreignKey: 'parentProductId',
        as: 'komposisi'
      });
    }
  }

  Produk.init(
    {
      namaProduk: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      keterangan: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Categories',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },

      outletId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Diubah ke true agar mendukung produk umum/tanpa outlet
        references: {
          model: 'Outlets',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL', // Diubah ke SET NULL jika outlet dihapus
      },
      outletIds: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      produkImg: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'produk',
      tableName: 'produks',
    }
  );

  return Produk;
};