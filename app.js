var express = require('express');
let errorhandler = require('errorhandler');
var http = require('http');
var path = require('path');
var logger = require('morgan');
var config = require('./config');
var log = require('./lib/log')(module);
var HttpError = require('./error').HttpError;
let session = require('express-session');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

app.engine('ejs', require('ejs-locals'));
app.set('views', __dirname + '/template');
app.set('view engine', 'ejs');

app.use(logger('dev'));

app.use(express.static(path.join(__dirname, 'public')));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

app.use(cookieParser());

//--------------
app.use((req, res, next)=>{
  //console.log("!!1reQ.cookies = ", req.cookies);
  //console.log("!!1reS.cookies = ", res.cookies);
  res.cookie('rememberme', '1', {"maxAge": 300000});
  res.cookie('obj', {a: 1, b: "q", c: new Date()});
  next();
});

let mongoStore = require('./lib/sessionStore');
app.use(session({
  secret: config.get("session:secret"),
  key: config.get("session:key"),
  cookie: config.get("session:cookie"),
  store: mongoStore
}));

//--------------
app.use((req, res, next)=>{
  //console.log("!!2reQ.cookies = ", req.cookies);
  //console.log("!!2reS.cookies = ", res.cookies);
  console.log(' - - - req.session.id = ', req.session.id, req.cookies.sid);
  //console.log("!!2reQ.session = ", ' req.session = ', req.session, ' req.session.id = ', req.session.id);
  //console.log("!!2reS.session = ", res.session);
  next();
});

app.use(require('./middleware/sendHttpError'));
app.use(require('./middleware/loadUser'));

app.use('/', require('./routes'));

app.use(function(err, req, res, next) {
  //console.log('###ErrorIn');
  if (typeof err == 'number') { // next(404);
    //console.log('###ErrorNumHttp');
    err = new HttpError(err);
  }

  if (err instanceof HttpError) {
    //console.log('###ErrorHttp');
    res.sendHttpError(err);
  } else {
    //console.log('###ErrorElse');
    if (app.get('env') == 'development') {
      //console.log('###ErrorDevelopErrorhandler');
      errorhandler()(err, req, res, next);
      //app.use(errorhandler()) - так нельзя, браузер зависает
    } else {
      //console.log('###ErrorElseDevelop');
      log.error(err);
      err = new HttpError(500);
      res.sendHttpError(err);
    }
  }
});

let server = http.createServer(app);
server.listen(config.get('port'), function(){
  log.info('Express server listening on port ' + config.get('port'));
});

//require('./socket')(server, app);
let io = require('./socket')(server);
app.set('ioServer', io);
