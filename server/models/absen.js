"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Absen extends Model {
    static associate(models) {
      Absen.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      });
    }
  }

  Absen.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      foto: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tipe: {
        type: DataTypes.ENUM("Masuk", "Keberangkatan"),
        allowNull: false,
        defaultValue: "Masuk",
      },
    },
    {
      sequelize,
      modelName: "Absen",
      tableName: "Absens",
    }
  );

  return Absen;
};
