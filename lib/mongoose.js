var mongoose = require('mongoose');
let config = require('.././config');

mongoose.connect(config.get('mongoose:uri'), config.get('mongoose:options'));

module.exports = mongoose;
