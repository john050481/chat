exports.post = function(req, res, next) {
  let mongoStore = require('.././lib/sessionStore');

  let logoutAll = req.body.logoutAll;

  var reqSessionId = req.session.id;
  let reqUserId = req.session.userId;
  let reqUser = req.user
  var ioServer = req.app.get('ioServer');

  if (!reqUserId) {
    req.session.destroy(); //обязательно разрушить текущую сессию!!! иначе опять вход будет!
    res.redirect('/');
    return;
  };

  var cookieParser = require('cookie-parser');
  let cookie = require('cookie');
  let config = require('.././config');

//1. find user sessions []
  function findUserSessions(userId) {
    let db = mongoStore.db;
    let regexp = new RegExp(`.*?\"userId\":\"${userId}\".*?`);
    let query = { "session": { $regex: regexp } };
    if (!logoutAll) query._id = reqSessionId;
    // - - - - - - - - console.log(' ===== query ===== \n', query);
    return new Promise((resolve, reject) => {
      db.collection('sessions').find(query).toArray( (err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
    })
  };
//2. forEach session -> destrioy
  function destroySessions(sessions) {

    let arrOfPromise = sessions.map( session => {
      return new Promise( (resolve, reject) => {
        mongoStore.destroy(session._id, function(err) {
          if (err) reject(err);
          resolve(true);
        });
      });
    });;

    return Promise.all(arrOfPromise);
  };

//3. find user sockets []
  function findUserSockets(ioServer, userId, sessionId, logoutAll) {
    let ioSockets = [];

    let nsps = ioServer.nsps;
      for (let key in nsps) {
        if (key === '/') continue;

        let sockets = nsps[key].connected;
        for (let key in sockets) {
          if (!sockets[key].handshake.user) continue;

          let parsedCookie = cookie.parse(sockets[key].handshake.headers.cookie);
          var sid = cookieParser.signedCookie(parsedCookie['sid'], config.get("session:secret"));
          if ( sockets[key].handshake.user._id.equals(reqUserId) && (reqSessionId === sid || logoutAll) ) {
            ioSockets.push(sockets[key]);
          };
        };
      };

      return new Promise((resolve, reject) => {
        return resolve(ioSockets);
      });
  };

//4.  forEach sockets -> emit('logout')
  function destroySockets(socketsIo) {

    let arrOfPromise = socketsIo.map( socket => {
      return new Promise( (resolve, reject) => {
        socket.emit('logout', reqSessionId, (data) => {resolve(data)});
      });
    });

    return Promise.all(arrOfPromise);
  };

//RUN all PROMISE!!!!
  findUserSessions(reqUserId)
  .then( sessions => {
    console.log(' ===== PROMISE ARRAY of sessions ===== \n', sessions);
    return destroySessions(sessions);
  })
  .then( result => {
    console.log(' ===== RESULT destroySessions ===== \n', result)
    return findUserSockets(ioServer, reqUserId, reqSessionId, logoutAll);
  })
  .then( socketsIo => {
    console.log(' ===== RESULT FIND socketsIo ===== \n', socketsIo)
    return destroySockets(socketsIo);
  })
  .then( result => {
    console.log(' ===== DESTROY Sockets result ===== \n', result);

    console.log('ENDENDENDENDENDENDEND уничтожаем текущую сессию, откуда вызвали logout');
    req.session.destroy(); //обязательно разрушить текущую сессию!!! иначе опять вход будет!
    res.redirect('/');
  })
  .catch( err => {
    next(err);
  });

///////////////////////////////////////////////////////
//db.sessions.find({ "session": { $regex: /.*5df774a788703b0e44d9ea23.*/ } }) //For SHELL mongo
//db.sessions.find({ "session": { $regex: /.*?\"userId\":\"5df774a788703b0e44d9ea23\".*?/ } }) //ленивый поиск с учетом названия свойства "user"
//db.sessions.find({ "session": { $regex: /.*user\":\".*/ } }) //For SHELL mongo
//db.sessions.find({ "session": { $regex: /.*user\":\".*/ } , "_id": "0k74e1XkgartVr6znOVknvjcHHM2qdaa"}) //For SHELL (несколько условий)
/*
/////////////////////////////////////////////////////// РАБОЧИЙ ВАРИАНТ без промисов!!!
let db = mongoStore.db;
let regexp = new RegExp(`.*${reqUserId}.*`);
console.log('regexp ===== ', regexp);
db.collection('sessions').find({ "session": { $regex: regexp } }).toArray( (err, res) => {
  if (err) return next(err);
  console.log('res ==========', res);
  res.forEach( (item) => {
    console.log('item._id = = = = = = ', item._id);
    mongoStore.destroy(item._id, function(err) {
      if (err) return next(err);
      console.log('SESSION DESTROYED FROM DB END!!!');
    });
  });
});
///////////////////////////////////////////////////////
*/

};
