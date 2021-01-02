var express = require("express");
var app = express();
var router = express.Router();
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var pathsimport = require("../scripts/paths.js");
var User = require("../Mongoose/user");
var pathsimport = require("../scripts/paths.js");
var ensureAuthenticated = require("../scripts/standart_functions.js")
  .ensureAuthenticated;
var fs = require("fs");
var MongoClient = require("mongodb").MongoClient;

var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;

var GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;
var TwitterStrategy = require("passport-twitter").Strategy;

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.getUserById(id, function (err, user) {
    done(err, user);
  });
});

//=================================================================================
//=================START GET & POST================================================
//=================================================================================

router.get(pathsimport.dashboard, ensureAuthenticated, function (req, res) {
  //funktioniert nicht (Wieso auch immer)

  User.getUserById(req.session.passport.user, function (err, user) {
    //Modulelist und dashedmodules werden später durch user daten erstezt (Datenbank)
    var dashedModules = [];
    var subedModules = [];
    var view_paths = {};
    var variables = {};
    var uservariables = user.uservars;
    var folders = fs.readdirSync("./modules/modules");
    for (var i = 0; i < folders.length; i++) {
      var folder = folders[i];
      var router_temp = require("../modules/modules/" + folder + "/use");
      if (
        user.modules[router_temp.db_name] == true &&
        user.dashed[router_temp.db_name] == false &&
        (router_temp.path_view != null || router_temp.path_view != undefined)
      ) {
        subedModules.push([router_temp.name, router_temp.db_name]);
      }
      if (
        user.dashed[router_temp.db_name] == true &&
        (router_temp.path_view != null || router_temp.path_view != undefined)
      ) {
        dashedModules.push(router_temp.db_name);
        view_paths[router_temp.db_name] =
          "../../modules/modules/" + folder + router_temp.path_view;
      }
      if (
        user.dashed[router_temp.db_name] == true &&
        (router_temp.variables != null || router_temp.variables != undefined)
      ) {
        variables[router_temp.db_name] = router_temp.variables;
      }
    }
    return res.render("html/Dashboard", {
      paths: pathsimport,
      user: req.isAuthenticated(),
      name: user.username,
      dashed: dashedModules,
      subed: subedModules,
      views: view_paths,
      uservars: uservariables,
      vars: variables,
      theme: user.design_theme,
      _user: user,
    });
  });
});

router.post(pathsimport.dashboard, function (req, res) {
  //maybe needed in future

  res.redirect(pathsimport.dashboard);
});

module.exports = router;
