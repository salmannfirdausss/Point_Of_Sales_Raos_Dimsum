'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) =>
      typeof table === 'string' ? table : table.tableName,
    );
    const findTable = (name) =>
      tableNames.find((tableName) => tableName.toLowerCase() === name.toLowerCase());
    const addColumns = async (tableName, columns) => {
      if (!tableName) return;
      const existingColumns = await queryInterface.describeTable(tableName);
      for (const [columnName, definition] of Object.entries(columns)) {
        if (!existingColumns[columnName]) {
          await queryInterface.addColumn(tableName, columnName, definition);
        }
      }
    };

    const categoriesTable = findTable('Categories');
    await addColumns(categoriesTable, {
      name: { type: Sequelize.STRING, allowNull: true },
    });
    if (categoriesTable) {
      await queryInterface.sequelize.query(
        `UPDATE ${queryInterface.quoteIdentifier(categoriesTable)} SET name = categoryName WHERE name IS NULL AND categoryName IS NOT NULL`,
      );
    }

    const productsTable = findTable('produks');
    await addColumns(productsTable, {
      categoryId: { type: Sequelize.INTEGER, allowNull: true },
      produkImg: { type: Sequelize.STRING, allowNull: true },
    });

    let pricesTable = findTable('hargaproduks');
    const legacyPricesTable = findTable('hargaProduks');
    if (!pricesTable && legacyPricesTable) {
      await queryInterface.renameTable(legacyPricesTable, 'hargaproduks');
      pricesTable = 'hargaproduks';
    }
    await addColumns(pricesTable, {
      produkId: { type: Sequelize.INTEGER, allowNull: true },
    });

    await addColumns(findTable('toppings'), {
      produkId: { type: Sequelize.INTEGER, allowNull: true },
    });

    const salesTable = findTable('penjualans');
    await addColumns(salesTable, {
      invoice: { type: Sequelize.STRING, allowNull: true },
      idProduk: { type: Sequelize.INTEGER, allowNull: true },
      userId: { type: Sequelize.INTEGER, allowNull: true },
      outletId: { type: Sequelize.INTEGER, allowNull: true },
      namaProduk: { type: Sequelize.STRING, allowNull: true },
      pcs: { type: Sequelize.INTEGER, allowNull: true },
      pax: { type: Sequelize.INTEGER, allowNull: true },
      saus: { type: Sequelize.JSON, allowNull: true },
      subtotal: { type: Sequelize.INTEGER, allowNull: true },
      totalBayar: { type: Sequelize.INTEGER, allowNull: true },
      metodePembayaran: { type: Sequelize.STRING, allowNull: true },
    });

    const detailSausTable = findTable('DetailSaus');
    await addColumns(detailSausTable, {
      penjualanId: { type: Sequelize.INTEGER, allowNull: true },
      invoice: { type: Sequelize.STRING, allowNull: true },
    });

    if (!findTable('Absens')) {
      await queryInterface.createTable('Absens', {
        id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
        userId: { type: Sequelize.INTEGER, allowNull: false },
        foto: { type: Sequelize.STRING, allowNull: false },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE },
      });
    }
  },

  async down() {
    // This migration only adds compatibility columns and must not remove production data.
  },
};
