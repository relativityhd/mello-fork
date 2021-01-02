var express = require("express");
var app = express();
var router = express.Router();
var fs = require("fs");

var pathsimport = require("../scripts/paths.js");
var User = require("../Mongoose/user");
var mongoUtil = require("../Mongoose/MongoUtil.js");
var ensureAuthenticated = require("../scripts/standart_functions.js")
  .ensureAuthenticated;

router.get(pathsimport.changeTheme, ensureAuthenticated, function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    allThemes = [];
    var folders = fs.readdirSync("./public/themes");
    for (var i = 0; i < folders.length; i++) {
      allThemes.push(folders[i]);
    }
    res.render("html/ChangeTheme", {
      paths: pathsimport,
      user: req.isAuthenticated(),
      theme: user.design_theme,
      themes: allThemes,
    });
  });
});

router.post(pathsimport.changeTheme, ensureAuthenticated, function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    var selectedTheme = req.body.selectedTheme;
    var db = mongoUtil.getDb();
    var dbo = db.db("Mello");
    var myquery = { username: user.username };
    var obj = {};
    obj.design_theme = selectedTheme;
    var newvalues = { $set: obj };
    dbo.collection("users").updateOne(myquery, newvalues, function (err, res) {
      if (err) throw err;
    });

    res.redirect(pathsimport.changeTheme);
  });
});

module.exports = router;
