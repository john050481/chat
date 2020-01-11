module.exports = function(req, res, next) {

  res.sendHttpError = function(error) {
    res.status(error.status);
    if (res.req.headers['x-requested-with'] == 'XMLHttpRequest') {
      console.log('sendHttpError JSON error!');
      res.json(error);
    } else {
      console.log('sendHttpError EJS render error!');
      res.render("error", {error: error});
    }
  };

  next();

};
