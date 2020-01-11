exports.get = function(req, res) {
  console.log('req.params.idChat = ', req.params.idChat);
  res.locals.idChat = req.params.idChat;
  res.render('secretchat');
};
