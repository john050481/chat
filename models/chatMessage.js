var crypto = require('crypto');
var async = require('async');
var util = require('util');
let errorhandler = require('errorhandler');

var mongoose = require('.././lib/mongoose'),
  Schema = mongoose.Schema;

var schema = new Schema({
  nspName: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  }
});

schema.statics.writeMessage = function(nspName, userId, username, message, created, callback) {
  var ChatMessage = this;

  var chatMessage = new ChatMessage({nspName, userId, username, message, created});
  chatMessage.save(function(err) {
    if (err) return callback(err);
    callback(null, chatMessage.get('id') )
  });
};

exports.ChatMessage = mongoose.model('ChatMessage', schema);
