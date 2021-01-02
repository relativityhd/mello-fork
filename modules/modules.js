var express = require("express");
var app = express();
var router = express.Router();
var path = require("path");
var pathsimport = require("../scripts/paths.js");
var User = require("../Mongoose/user");
var fs = require("fs");
var mongoUtil = require("../Mongoose/MongoUtil.js");
var ensureAuthenticated = require("../scripts/standart_functions.js")
  .ensureAuthenticated;

//Hier wird für jeden Ordner, der sich in modules/modules befindet eine route hinzugefügt
//Außerdem wird hier das Array Modules erstellt. Dieses enthällt alle Module
var modules = [];
var folders = fs.readdirSync("./modules/modules");
for (var i = 0; i < folders.length; i++) {
  var folder = folders[i];
  var router_temp = require("./modules/" + folder + "/use");
  router.use(router_temp.path_main, router_temp.router);
  modules.push([router_temp.name, router_temp.db_name]);
}

router.get(pathsimport.store, ensureAuthenticated, function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    var storeModules = [];
    var userModules = [];
    for (var i = 0; i < modules.length; i++) {
      if (user.modules[modules[i][1]] == false) {
        storeModules.push(modules[i]);
      } else {
        userModules.push(modules[i]);
      }
    }
    var infos = {};
    var folders = fs.readdirSync("./modules/modules");
    for (var i = 0; i < folders.length; i++) {
      var folder = folders[i];
      var router_temp = require("./modules/" + folder + "/use");
      infos[router_temp.name] = router_temp.info;
    }
    return res.render("html/ModuleStore", {
      storeModules: storeModules,
      userModules: userModules,
      user: req.isAuthenticated(),
      paths: pathsimport,
      infos: infos,
      theme: user.design_theme,
    });
  });
});

router.get(pathsimport.main, ensureAuthenticated, function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    var userModules = [];
    var module_paths = {};
    var folders = fs.readdirSync("./modules/modules");
    for (var i = 0; i < folders.length; i++) {
      var folder = folders[i];
      var router_temp = require("./modules/" + folder + "/use");
      if (
        user.modules[router_temp.db_name] == true &&
        (router_temp.path_site != null || router_temp.path_site != undefined)
      ) {
        userModules.push(router_temp.name);
        module_paths[router_temp.name] =
          pathsimport.Modules.Modules +
          router_temp.path_main +
          router_temp.path_site;
      }
    }
    return res.render("html/SubModule", {
      userModules: userModules,
      module_paths: module_paths,
      user: req.isAuthenticated(),
      paths: pathsimport,
      theme: user.design_theme,
    });
  });
});

router.post(
  pathsimport.Modules.add_Module,
  ensureAuthenticated,
  function (req, res) {
    User.getUserById(req.session.passport.user, function (err, user) {
      var db = mongoUtil.getDb();

      var ticked_modules = [];
      for (var i = 0; i < modules.length; i++) {
        if (req.body[modules[i][1]] == "on") {
          ticked_modules.push(modules[i][1]);
        }
      }

      var dbo = db.db("Mello");
      var myquery = { username: user.username };
      var obj = {};
      obj.modules = user.modules;
      obj.dashed = user.dashed;
      for (i = 0; i < ticked_modules.length; i++) {
        obj.modules[ticked_modules[i]] = true;
      }
      var newvalues = { $set: obj };
      dbo
        .collection("users")
        .updateOne(myquery, newvalues, function (err, res) {
          if (err) throw err;
        });
      res.redirect(pathsimport.submodule);
    });
  }
);

router.post(
  pathsimport.Modules.remove_Module,
  ensureAuthenticated,
  function (req, res) {
    User.getUserById(req.session.passport.user, function (err, user) {
      var db = mongoUtil.getDb();

      var ticked_modules = [];
      for (var i = 0; i < modules.length; i++) {
        if (req.body[modules[i][1]] == "on") {
          ticked_modules.push(modules[i][1]);
        }
      }
      var dbo = db.db("Mello");
      var myquery = { username: user.username };
      var obj = {};
      obj.modules = user.modules;
      obj.dashed = user.dashed;
      for (i = 0; i < ticked_modules.length; i++) {
        obj.modules[ticked_modules[i]] = false;
        obj.dashed[ticked_modules[i]] = false;
      }
      var newvalues = { $set: obj };
      dbo
        .collection("users")
        .updateOne(myquery, newvalues, function (err, res) {
          if (err) throw err;
        });
      res.redirect(pathsimport.submodule);
    });
  }
);

router.post(
  pathsimport.Modules.add_Dashed,
  ensureAuthenticated,
  function (req, res) {
    User.getUserById(req.session.passport.user, function (err, user) {
      var ticked_module = req.body.addInput;
      var db = mongoUtil.getDb();
      var dbo = db.db("Mello");
      var myquery = { username: user.username };
      var obj = {};
      obj.dashed = user.dashed;
      obj.dashed[ticked_module] = true;
      var newvalues = { $set: obj };
      dbo
        .collection("users")
        .updateOne(myquery, newvalues, function (err, res) {
          if (err) throw err;
        });
      res.redirect(pathsimport.dashboard);
    });
  }
);

router.post(
  pathsimport.Modules.remove_Dashed,
  ensureAuthenticated,
  function (req, res) {
    User.getUserById(req.session.passport.user, function (err, user) {
      var ticked_module = req.body.removeInput;
      var db = mongoUtil.getDb();
      var dbo = db.db("Mello");
      var myquery = { username: user.username };
      var obj = {};
      obj.dashed = user.dashed;
      obj.dashed[ticked_module] = false;
      var newvalues = { $set: obj };
      dbo
        .collection("users")
        .updateOne(myquery, newvalues, function (err, res) {
          if (err) throw err;
        });
      res.redirect(pathsimport.dashboard);
    });
  }
);

module.exports = router;
