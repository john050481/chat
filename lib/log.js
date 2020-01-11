let winston = require('winston');
var ENV = process.env.NODE_ENV || 'development';

winston.format.combine(
  winston.format.colorize(),
  winston.format.json()
);

function getLogger(module) {
  //console.log('module.filename = ', module.filename);
  //console.log('1 = ', module.filename.split('\\'));
  //console.log('2 = ', module.filename.split('\\').slice(-2));
  //console.log('3 = ', ENV);
  let path = module.filename.split('\\').slice(-2).join('\\');
  //console.log('path = ', path);

  return winston.createLogger({
    transports: [
      new winston.transports.Console({
        colorize: true,
        level: ENV == 'development' ? 'debug' : 'error',
        label: path
      })
    ]
  })
};

module.exports = getLogger;
