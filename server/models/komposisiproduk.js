'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KomposisiProduk extends Model {
    static associate(models) {
      const ProdukModel = models.Produk || models.produk;

      // Relasi ke Produk Induk (misal: Dimsum Mix)
      KomposisiProduk.belongsTo(ProdukModel, {
        foreignKey: 'parentProductId',
        as: 'parentProduct'
      });

      // Relasi ke Produk Anak (misal: Dimsum Original)
      KomposisiProduk.belongsTo(ProdukModel, {
        foreignKey: 'childProductId',
        as: 'childProduct'
      });
    }
  }

  KomposisiProduk.init(
    {
      parentProductId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      childProductId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      qtyPcs: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
      }
    },
    {
      sequelize,
      modelName: 'KomposisiProduk',
      tableName: 'komposisi_produks'
    }
  );

  return KomposisiProduk;
};