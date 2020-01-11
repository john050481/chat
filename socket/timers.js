function sendNews(serverIo, time, timersId, text) {
  serverIo.emit('sendNews', text);
  timersId.timerIdSendNews = setTimeout(() => {sendNews(serverIo, time, timersId, 'Текст новости! Через определенное время, сек.: ' + time/1000)}, time);
  return timersId.timerIdSendNews;
};

function getAllOnLineUsersForNsp(nsp) {
  let users = new Map();
  let sockets = nsp.connected;
  for (let key in sockets) {
    if (!sockets[key].handshake.user) continue;
    let {username, id: userId} = sockets[key].handshake.user;
    if (!users.has(userId)) users.set(userId, {username, userId});
  };
  return Array.from(users.values());
};

function getUserOnTimeOut(serverIo, time, timersId) {
  let nsps = serverIo.nsps;
  for (let key in nsps) {
    if (key === '/') continue;

    let usersInCurentNsp = getAllOnLineUsersForNsp(nsps[key]);
    nsps[key].emit('getAllOnLineUsersForNsp', usersInCurentNsp);
  };
  timersId.timerIdGetOnlineUsers = setTimeout(() => {getUserOnTimeOut(serverIo, time, timersId)}, time);
  return timersId.timerIdGetOnlineUsers;
};

module.exports.sendNews = sendNews;
module.exports.getUserOnTimeOut = getUserOnTimeOut;
module.exports.getAllOnLineUsersForNsp = getAllOnLineUsersForNsp;
