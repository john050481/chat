var User = require('.././models/user').User;

module.exports = function(req, res, next) {
  req.user = res.locals.user = null;

  if (!req.session.userId) return next();

  User.findById(req.session.userId, function(err, user) {
    if (err) return next(err);

    req.user = res.locals.user = user;
    next();
  });
};
