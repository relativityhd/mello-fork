var MongoClient = require("mongodb").MongoClient;
var pathsimport = require("../scripts/paths.js");

var _db;
const url = pathsimport.db_url;

module.exports = {
  connectToServer: function (callback) {
    MongoClient.connect(url, function (err, db) {
      _db = db;
      return callback(err);
    });
  },

  getDb: function () {
    return _db;
  },
};
