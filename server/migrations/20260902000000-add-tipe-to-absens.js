'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Absens', 'tipe', {
      type: Sequelize.ENUM('Masuk', 'Keberangkatan'),
      allowNull: false,
      defaultValue: 'Masuk',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Absens', 'tipe');
  },
};