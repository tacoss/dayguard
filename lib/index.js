'use strict';

const path = require('path');

module.exports = {
  custom_commands_path: path.join(__dirname, 'commands'),
  custom_assertions_path: path.join(__dirname, 'assertions'),
};
