var sessionStore = require('.././lib/sessionStore');
let config = require('.././config');
let cookie = require('cookie');
var cookieParser = require('cookie-parser');
var User = require('.././models/user').User;
var ChatMessage = require('.././models/chatMessage').ChatMessage;
const ServerIO = require('socket.io');

var async = require('async');
var HttpError = require('.././error').HttpError;

let timersId = {timerIdGetOnlineUsers: null, timerIdSendNews: null};

function getAllIoSocketsForNspAndUserId(nsp, user) {
  if (!user) return [];
  let userObjectID = user._id;

  let socketsResult = new Map();
  let sockets = nsp.connected;
  for (let socketId in sockets) {
    if (!sockets[socketId].handshake.user) continue;
    let {_id, username, id: userId} = sockets[socketId].handshake.user;
    if (_id.equals(userObjectID)) socketsResult.set(socketId, {socketId, username, userId});
  };
  return Array.from(socketsResult.values());
};

function loadSession(sid, callback) {
  sessionStore.get(sid, function(err, session) {
    if (err) return callback(err);
    if (arguments.length == 0) {// no arguments => no session
      return callback(null, null);
    } else {
      return callback(null, session);
    };
  });
};

function loadUser(session, callback) {
  //console.log("!!!!!!!!!!!!!!!!!!!!!!!!loadUser", User.findById);
  if (!session.userId) {
    //console.log("Session %s is anonymous", session.id);
    return callback(null, null);
  }

  //console.log("retrieving user ", session.userId);

  User.findById(session.userId, function(err, user) {
    if (err) return callback(err);

    if (!user) {
      return callback(null, null);
    }
    //console.log("user findbyId result: " + user);
    callback(null, user);
  });
}

module.exports = function (serverHttp) {
  const io = new ServerIO(serverHttp);
  //io.set('origins', 'localhost:*');
  //io.origins(['localhost:*', '192.168.150.100:*']);
  io.origins(['*:*']);
  //io.set('transports', ['websocket']); //почему-то не работает, polling все равно нужен
  //console.log("io.sockets = ", io.sockets);

  const secretchat = io.of((name, query, next) => {
    console.log('ENTER nsp function is: ' + name);

    if (!timersId.timerIdSendNews) require('./timers.js').sendNews(io, 10000, timersId, 'FIRST Text news1');
    if (!timersId.timerIdGetOnlineUsers) require('./timers.js').getUserOnTimeOut(io, 15000, timersId);

    // the checkToken method must return a boolean, indicating whether the client is able to connect or not.
    next(null, true);
  });

  secretchat.use(function(socket, next) {

    let handshake = socket.handshake;

    //-------------------------------------
    async.waterfall([
      function(callback) {
        let parsedCookie = cookie.parse(handshake.headers.cookie);
        var sid = cookieParser.signedCookie(parsedCookie['sid'], config.get("session:secret"));
        loadSession(sid, callback);
      },
      function(session, callback) {
        if (!session) {
          callback(new HttpError(401, "No session"));
        }
        handshake.session = session;
        loadUser(session, callback);
      },
      function(user, callback) {
        if (!user) {
          callback(new HttpError(403, "Anonymous session may not connect"));
        }
        handshake.user = user;
        callback(null);
      }
    ], function(err, result) {
      if (!err) {
        return next();
      }

      if (err instanceof HttpError) {
        return next(err);
      }

      next(err);
    });
  });

  secretchat.on('connection', function (socket) {

    socket.on('error', (error) => {
      console.log("in server socket.on -> ERROR!!!!!!!!!!!!!!!!", error);
    });

    if (!socket.handshake.user) {
      socket.emit('logout');
      //console.log('socket.id !!!!!!!!!!!!!!! = ', socket.id);
      //socket.emit('error', new Error('handshake unauthorized'));
      //socket.emit('error', 'handshake unauthorized');
      return;
    };

    let {username, id: userId} = socket.handshake.user;

    socket.broadcast.emit('join', username);

    socket.on('message', function (text, cb) {

      ChatMessage.writeMessage(socket.nsp.name, userId, username, text, function(err, messageModel) {
        if (err) return console.log(err);
        console.log('writenMessageModel = ', messageModel);
        socket.broadcast.emit('message', text, username, userId, messageModel.get('created'));
        cb && cb( username, userId, messageModel.get('created') );
        socket.broadcast.emit('sendNews', 'new messege on nsp: ' + text);
      });
    });

    socket.on('getAllOnLineUsersForNsp', function (anyData, cb) {
      let users = require('./timers.js').getAllOnLineUsersForNsp(socket.nsp);
      socket.nsp.emit('getAllOnLineUsersForNsp', users);
      cb && cb(users);
    });

    socket.on('getAllIoSocketsForNspAndUserId', function (anyData, cb) {
      let mySockets = getAllIoSocketsForNspAndUserId(socket.nsp, socket.handshake.user);
      socket.nsp.emit('getAllIoSocketsForNspAndUserId', mySockets);
      cb && cb(mySockets);
    });

    socket.on('getAllIoSocketsForUserId', function (anyData, cb) {
      let nsps = socket.server.nsps;
      let mySockets = [];
      for (let key in nsps) {
        if (key !== '/') mySockets = mySockets.concat(getAllIoSocketsForNspAndUserId(nsps[key], socket.handshake.user));
      };
      socket.nsp.emit('getAllIoSocketsForUserId', mySockets);
      cb && cb(mySockets);
    });

    socket.on('getUserInfo', function (userId, cb) {
      //find user from userId
      User.findById(userId, function(err, user) {
        let userInfo = {username: 'no find user', created: 'no find user', userId: 'no find user'};

        if (err) {
          //return next(err);
          userInfo = {username: 'ERR find user', created: 'ERR find user', userId: 'ERR find user'};
        } else if (user) {
          let {username, created, id: userId} = user;
          userInfo = {username, created, userId};
        };

        socket.emit('getUserInfo', userInfo);
        cb && cb(userInfo);
      });
    });

    socket.on('getAllMessageForNsp', function(cb) {
      console.log('- - - - - getAllMessageForNsp - - - - -');
      ChatMessage.find({nspName: socket.nsp.name}, function(err, messages) {
        if (err) return console.log(err);

        console.log("messages result: ", messages);
        socket.emit('getAllMessageForNsp', messages);
        cb && cb(messages)
      });
    });

    socket.on('getMyIoAndSession', function(cb) {
      console.log('- - - - - getMyIoAndSession - - - - -');
      console.log('socket = ', socket);
      console.log('socket.server = ', socket.server);
      console.log('socket.handshake = ', socket.handshake);
      let parsedCookie = cookie.parse(socket.handshake.headers.cookie);
      let sid = cookieParser.signedCookie(parsedCookie['sid'], config.get("session:secret"));
      console.log("sid (socket.handshake.headers.cookie -> parse) = ", sid);
      cb && cb({
        'socket.id': socket.id,
        'socket.nsp.name': socket.nsp.name,
        'socket.server.nsps': Object.entries(socket.server.nsps).map( ([nspName, nsp]) => {
          return {
                   nspName,
                   'clients connected': Object.keys(nsp.connected).length
                 }
        }),
        'socket.handshake': socket.handshake,
        sid})
    });

    socket.on('disconnect', function() {
      if (!Object.keys(socket.nsp.connected).length) {
        delete socket.server.nsps[socket.nsp.name];
      }
      socket.broadcast.emit('leave', username);
    });

  });

  return io;
}
