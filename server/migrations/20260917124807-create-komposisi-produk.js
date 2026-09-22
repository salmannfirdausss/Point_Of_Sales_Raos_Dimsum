'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('komposisi_produks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      parentProductId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'produks', // Sesuaikan nama tabel produk di database (biasanya 'produks' atau 'Produks')
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      childProductId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'produks', // Sesuaikan nama tabel produk di database
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      qtyPcs: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('komposisi_produks');
  }
};