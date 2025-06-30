'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add partial unique index for registrationAddressChange tickets
    await queryInterface.addIndex('tickets', {
      fields: ['companyId', 'type'],
      unique: true,
      where: {
        type: 'registrationAddressChange'
      },
      name: 'idx_unique_registration_address_change'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the unique index
    await queryInterface.removeIndex('tickets', 'idx_unique_registration_address_change');
  }
};
