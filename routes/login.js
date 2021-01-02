var express = require("express");
var app = express();
var router = express.Router();
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var pathsimport = require("../scripts/paths.js");
var User = require("../Mongoose/user");
var pathsimport = require("../scripts/paths.js");
var ensureNotAuthenticated = require("../scripts/standart_functions.js")
  .ensureNotAuthenticated;
var fs = require("fs");
var mongoUtil = require("../Mongoose/MongoUtil.js");

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.getUserById(id, function (err, user) {
    done(err, user);
  });
});

router.get(pathsimport.log_in, ensureNotAuthenticated, function (req, res) {
  res.render("html/Login", {
    paths: pathsimport,
    credentials: "",
    usernameSpaceholder: req.body.username,
    passwordSpaceholder: req.body.password,
  });
});
/* Wenn man auf logout drückt gelangt 
man wieder zur main-Seite */
router.get(pathsimport.log_out, function (req, res) {
  req.logout();

  //  req.flash('success_msg', 'You are logged out');

  res.redirect(pathsimport.main);
});

// sucht den eingegebenen User in der Datenbank
passport.use(
  new LocalStrategy(function (username, password, done) {
    User.getUserByUsername(username, function (err, user) {
      if (err) throw err;
      if (!user) {
        return done(null, false, { message: "Unknown User" });
      }

      // vergleicht das eingebene Passwort mit dem in der Datenbank
      User.comparePassword(password, user.password, function (err, isMatch) {
        if (err) throw err;
        if (isMatch) {
          //Checkt ob alle Module-Keys vorhanden sind
          var modules = [];
          var folders = fs.readdirSync("./modules/modules");
          for (var i = 0; i < folders.length; i++) {
            var folder = folders[i];
            var router_temp = require("../modules/modules/" + folder + "/use");
            modules.push(router_temp.db_name);
          }
          var db = mongoUtil.getDb();
          var dbo = db.db("Mello");
          var myquery = { username: user.username };
          var obj = {};
          obj.modules = {};
          obj.dashed = {};
          obj.uservars = {};
          if (user.design_theme == undefined || user.design_theme == null) {
            obj.design_theme = "standart";
          }
          for (i = 0; i < modules.length; i++) {
            if (
              user.modules[modules[i]] == null ||
              user.modules[modules[i]] == undefined
            ) {
              obj.modules[modules[i]] = false;
            } else {
              obj.modules[modules[i]] = user.modules[modules[i]];
            }
            if (
              user.dashed[modules[i]] == null ||
              user.dashed[modules[i]] == undefined
            ) {
              obj.dashed[modules[i]] = false;
            } else {
              obj.dashed[modules[i]] = user.dashed[modules[i]];
            }
            if (
              user.uservars[modules[i]] == null ||
              user.uservars[modules[i]] == undefined
            ) {
              obj.uservars[modules[i]] = {};
            } else {
              obj.uservars[modules[i]] = user.uservars[modules[i]];
            }
          }
          var newvalues = { $set: obj };
          dbo
            .collection("users")
            .updateOne(myquery, newvalues, function (err, res) {
              if (err) throw err;
            });

          return done(null, user, { message: "Everything seems to be fine" });
        } else {
          return done(null, false, { message: "Invalid password" });
        }
      });
    });
  })
);

/*
router.post(pathsimport.log_in, 
  passport.authenticate('local', { successRedirect: pathsimport.dashboard, failureRedirect: pathsimport.login})
);
*/

router.post(pathsimport.log_in, function (req, res, next) {
  passport.authenticate(
    "local",
    {
      badRequestMessage: "Credentials are missing", // standard: Missing credentials.
    },
    function (err, user, info) {
      var credentialMessage = "Credentials are missing";
      console.log(credentialMessage);
      var UserExistsMessage = "User already exists";

      if (err) {
        //return next(err);

        var validationErrorObject0 = {
          paths: pathsimport,
          credentials: "Error",
          usernameSpaceholder: req.body.username,
          passwordSpaceholder: req.body.password,
        };

        return res.render("html/login", validationErrorObject0);
      }
      if (info.message == credentialMessage) {
        var validationErrorObject = {
          paths: pathsimport,
          credentials: "There are missing credentials.",
          usernameSpaceholder: req.body.username,
          passwordSpaceholder: req.body.password,
        };

        return res.render("html/login", validationErrorObject);
      }
      if (info.message == "Invalid password") {
        var validationErrorObject1 = {
          paths: pathsimport,
          credentials: "Invalid Password or Username!",
          usernameSpaceholder: req.body.username,
          passwordSpaceholder: req.body.password,
        };

        return res.render("html/login", validationErrorObject1);
      }
      if (info.message == "Unknown User") {
        var validationErrorObject2 = {
          paths: pathsimport,
          credentials: "Invalid Password or Username!",
          usernameSpaceholder: req.body.username,
          passwordSpaceholder: req.body.password,
        };

        return res.render("html/login", validationErrorObject2);
      } else {
        console.log("erfolgreich eingeloggt");
        req.logIn(user, function (err) {
          if (err) {
            return next(err);
          }
          return res.redirect(pathsimport.dashboard);
        });
      }
    }
  )(req, res, next);
});

module.exports = router;
