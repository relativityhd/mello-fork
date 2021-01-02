var express = require("express");
var app = express();
var router = express.Router();
var mongoose = require("mongoose");

var pathsimport = require("../../../scripts/paths.js");
var ensureAuthenticated = require("../../../scripts/standart_functions.js")
  .ensureAuthenticated;
var MongoUtil = require("../../../Mongoose/MongoUtil.js");
var User = require("../../../Mongoose/user.js");
var groupModel = require("./schema.js");

mongoose.connect(pathsimport.db_url);
var dbmon = mongoose.connection;
var group_dbcollection = dbmon.collection("groups");

var _db = MongoUtil.getDb();
var dbo = _db.db("Mello");

function createGlobal() {
  groupModel.find({ name: "global" }, function (err, group) {
    if (!group[0]) {
      var globalGroup = new groupModel({
        name: "global",
        password: "",
        members: { userzero: "007" },
        moduleVars: {},
      });
      globalGroup.save();
      console.log("Created new global group!");
    } else {
      if (group[0].moduleVars == undefined || group[0].moduleVars == null) {
        var myquery = { name: "global" };
        var arr = {};
        arr.moduleVars = { varZero: 007 };
        var newvalues = { $set: arr };
        dbo
          .collection("groups")
          .updateOne(myquery, newvalues, function (err, res) {
            if (err) throw err;
          });
        console.log(
          "Global group already exists, but moduleVars wasn't defined!"
        );
      }
    }
  });
}
function updateGroups() {
  groupModel.find({}, function (err, groups) {
    groups.forEach(function (group) {
      if (!group.moduleVars) {
        var myquery = { name: group.name };
        var arr = {};
        arr.moduleVars = { varZero: 007 };
        var newvalues = { $set: arr };
        dbo
          .collection("groups")
          .updateOne(myquery, newvalues, function (err, res) {
            if (err) throw err;
          });
        console.log("Updated group ", group.name);
      }
    });
  });
}
createGlobal();
updateGroups();

router.get("/yourgroups", function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    groupModel.find({ name: "global" }, function (err, global) {
      if (!user.uservars.groups.groups) {
        var myquery = { username: user.username };
        var obj = {};
        obj.uservars = user.uservars;
        obj.uservars.groups.groups = [];
        obj.uservars.groups.groups.push(global[0].name);
        var newvalues = { $set: obj };
        dbo
          .collection("users")
          .updateOne(myquery, newvalues, function (err, res) {
            if (err) throw err;
          });

        var myquery = { name: "global" };
        var arr = {};
        arr.members = global[0].members;
        arr.members[user.username] = req.session.passport.user;
        var newvalues = { $set: arr };
        dbo
          .collection("groups")
          .updateOne(myquery, newvalues, function (err, res) {
            if (err) throw err;
          });
      }
      groupModel.find(
        { name: { $in: user.uservars.groups.groups } },
        function (err, groups) {
          res.render("./../modules/modules/groups/usergroups", {
            paths: pathsimport,
            user: req.isAuthenticated(),
            theme: user.design_theme,
            groups: groups,
          });
        }
      );
    });
  });
});

router.get("/join-and-create", function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    res.render("./../modules/modules/groups/groups", {
      paths: pathsimport,
      user: req.isAuthenticated(),
      theme: user.design_theme,
      error: {},
    });
  });
});

router.get("/:groupname", (req, res) => {
  var groupname = req.params.groupname;
  groupModel.find({ name: groupname }, function (err, group) {
    if (err) return err;
    else {
      User.getUserById(req.session.passport.user, function (err, user) {
        var memberids = [];
        Object.keys(group[0].members).forEach(function (key) {
          if (group[0].members[key] != "007") {
            memberids.push(group[0].members[key]);
          }
        });
        User.find(
          { _id: { $in: memberids } },
          "username -_id",
          function (err, members) {
            res.render("./../modules/modules/groups/profile", {
              paths: pathsimport,
              user: req.isAuthenticated(),
              theme: user.design_theme,
              groupname: group[0].name,
              members: members,
            });
          }
        );
      });
    }
  });
});

router.post("/join", function (req, res) {
  var name = req.body.groupname;
  var password = req.body.grouppassword;
  groupModel.find({ name: name }, function (err, group) {
    if (err || !group[0]) {
      User.getUserById(req.session.passport.user, function (err, user) {
        res.render("./../modules/modules/groups/groups", {
          paths: pathsimport,
          user: req.isAuthenticated(),
          theme: user.design_theme,
          error: { join: "unknown group" },
        });
      });
    } else {
      User.getUserById(req.session.passport.user, function (err, user) {
        var isNotInGroup = true;
        Object.keys(group[0].members).forEach(function (key) {
          if (group[0].members[key] == req.session.passport.user) {
            isNotInGroup = false;
          }
        });
        if (group[0].password == password && isNotInGroup == true) {
          var myquery = { username: user.username };
          var obj = {};
          obj.uservars = user.uservars;
          obj.uservars.groups.groups.push(group[0].name);
          var newvalues = { $set: obj };
          dbo
            .collection("users")
            .updateOne(myquery, newvalues, function (err, res) {
              if (err) throw err;
            });
          var myquery = { name: group[0].name };
          var arr = {};
          arr.members = group[0].members;
          arr.members[user.username] = req.session.passport.user;
          var newvalues = { $set: arr };
          dbo
            .collection("groups")
            .updateOne(myquery, newvalues, function (err, res) {
              if (err) throw err;
            });
          res.redirect(pathsimport.Modules.Modules + "/groups/yourgroups");
        } else {
          if (isNotInGroup == false) {
            var msg = "You are already in that group";
          } else {
            var msg = "wrong password";
          }
          res.render("./../modules/modules/groups/groups", {
            paths: pathsimport,
            user: req.isAuthenticated(),
            theme: user.design_theme,
            error: { join: msg },
          });
        }
      });
    }
  });
});

router.post("/create", function (req, res) {
  if (req.body.groupname != "all" && req.body.grouppassword != "") {
    groupModel.find({ name: req.body.groupname }, function (err, group) {
      if (!group[0]) {
        User.getUserById(req.session.passport.user, function (err, user) {
          var obj = {};
          obj[user.username] = req.session.passport.user;
          var newGroup = new groupModel({
            name: req.body.groupname,
            password: req.body.grouppassword,
            members: obj,
            moduleVars: { varZro: 007 },
          });
          newGroup.save();
          var myquery = { username: user.username };
          var obj = {};
          obj.uservars = user.uservars;
          obj.uservars.groups.groups.push(req.body.groupname);
          var newvalues = { $set: obj };
          dbo
            .collection("users")
            .updateOne(myquery, newvalues, function (err, res) {
              if (err) throw err;
            });
        });
        res.redirect(pathsimport.Modules.Modules + "/groups/yourgroups");
      } else {
        User.getUserById(req.session.passport.user, function (err, user) {
          res.render("./../modules/modules/groups/groups", {
            paths: pathsimport,
            user: req.isAuthenticated(),
            theme: user.design_theme,
            error: { create: "groupname already exists!" },
          });
        });
      }
    });
  } else if (req.body.groupname == "all") {
    User.getUserById(req.session.passport.user, function (err, user) {
      res.render("./../modules/modules/groups/groups", {
        paths: pathsimport,
        user: req.isAuthenticated(),
        theme: user.design_theme,
        error: { create: "invalid groupname!" },
      });
    });
  } else if (req.body.grouppassword == "") {
    User.getUserById(req.session.passport.user, function (err, user) {
      res.render("./../modules/modules/groups/groups", {
        paths: pathsimport,
        user: req.isAuthenticated(),
        theme: user.design_theme,
        error: { create: "password is non-optional" },
      });
    });
  }
});

module.exports = {
  router: router,
  path_main: "/groups",
  name: "Groups",
  db_name: "groups",
  info: "Add this module to join groups for chats, games and much more!",
  path_site: "/yourgroups",
};
