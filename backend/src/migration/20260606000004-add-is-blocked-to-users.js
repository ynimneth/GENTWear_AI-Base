'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('users');
    if (!tableDefinition.is_blocked) {
      await queryInterface.addColumn('users', 'is_blocked', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableDefinition = await queryInterface.describeTable('users');
    if (tableDefinition.is_blocked) {
      await queryInterface.removeColumn('users', 'is_blocked');
    }
  }
};
