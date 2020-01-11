let session = require('express-session');
var mongoose = require('./mongoose');

const MongoStore = require('connect-mongo')(session);
let mongoStore = new MongoStore({
  mongooseConnection: mongoose.connection,
  ttl: 7 * 24 * 60 * 60 // ttl: 14 * 24 * 60 * 60 = 14 days. Default (в базе mongo: "expires" : ISODate("2019-12-26T18:56:15.376Z"), если не задано "maxAge": в конфиге)
});

module.exports = mongoStore;
