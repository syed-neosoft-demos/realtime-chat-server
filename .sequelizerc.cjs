const path = require('node:path');

module.exports = {
  config: path.resolve(__dirname, 'config/sequelize.cjs'),
  'migrations-path': path.resolve(__dirname, 'migrations'),
};
