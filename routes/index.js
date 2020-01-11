var express = require('express');
var router = express.Router();

var checkAuth = require('.././middleware/checkAuth');

router.get('/', require('./frontpage').get);

router.get('/login', require('./login').get);
router.post('/login', require('./login').post);

router.post('/logout', require('./logout').post);

router.get('/chat', checkAuth, require('./chat').get);

router.get('/secretchat/:idChat', checkAuth, require('./secretchat').get);

router.get('/error', require('./error').get);

module.exports = router;
