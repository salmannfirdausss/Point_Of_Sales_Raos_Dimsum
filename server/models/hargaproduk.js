'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class hargaProduk extends Model {
    static associate(models) {
      hargaProduk.belongsTo(models.produk, {
        foreignKey: 'produkId',
        as: 'produk',
      });
    }
  }

  hargaProduk.init(
    {
      harga: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      qty: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      produkId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'hargaProduk',
      tableName: 'hargaProduks',
    }
  );

  return hargaProduk;
};