var express = require("express");
var app = express();
var router = express.Router();
var pathsimport = require("../scripts/paths.js");
var User = require("../Mongoose/user");
var ensureAuthenticated = require("../scripts/standart_functions.js")
  .ensureAuthenticated;
var fs = require("fs");

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

passport.use(
  new TwitterStrategy(
    {
      consumerKey: "nYFk6GStFSwHvTX7VpdaS8wMs",
      consumerSecret: "M08L8A8Yj8q1HPlVWgsnm67AyC11lhPfqswWcFq3O58y8vyLbL",
      callbackURL: "http://eoyp.info.tm/auth/twitter/callback",
    },
    function (token, tokenSecret, profile, done) {
      User.findOne({
        twitterId: profile.id,
      }).then((currentUser) => {
        if (currentUser) {
          console.log("User exists");
          done(null, currentUser);
        } else {
          //Fügt alle Module-Keys hinzu
          var modules = [];
          var folders = fs.readdirSync("./modules/modules");
          for (var i = 0; i < folders.length; i++) {
            var folder = folders[i];
            var router_temp = require("../modules/modules/" + folder + "/use");
            modules[modules.length] = router_temp.db_name;
          }
          var obj = {};
          var sec = {};
          var vars = {};
          for (var i = 0; i < modules.length; i++) {
            obj[modules[i]] = false;
            sec[modules[i]] = false;
            vars[modules[i]] = { module: modules[i] };
          }

          new User({
            email: profile.email,
            modules: obj,
            dashed: sec,
            uservars: vars,
            design_theme: "standart",
            username: profile.displayName,
            twitterId: profile.id,
          })
            .save()
            .then((newUser) => {
              console.log("new User created" + newUser);
              done(null, newUser);
            });
        }
      });
    }
  )
);

router.get("/auth/twitter", passport.authenticate("twitter"));

router.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", {
    successRedirect: pathsimport.dashboard,
    failureRedirect: pathsimport.LogIn,
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID:
        "36023594957-pat4kne03uvci48vblmjjprqbmnfprlb.apps.googleusercontent.com",
      clientSecret: "_SGza5HYx0ZR3z7N48AfwWYi",
      callbackURL: "http://" + pathsimport.url + ":6776/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      //User.findOrCreate({ googleId: profile.id }, function (err, user) {
      //done();
      // return done(err, user);
      // });

      User.findOne({
        googleId: profile.id,
      }).then((currentUser) => {
        if (currentUser) {
          console.log("User exists");
          done(null, currentUser);
        } else {
          //Fügt alle Module-Keys hinzu
          var modules = [];
          var folders = fs.readdirSync("./modules/modules");
          for (var i = 0; i < folders.length; i++) {
            var folder = folders[i];
            var router_temp = require("../modules/modules/" + folder + "/use");
            modules[modules.length] = router_temp.db_name;
          }
          var obj = {};
          var sec = {};
          var vars = {};
          for (var i = 0; i < modules.length; i++) {
            obj[modules[i]] = false;
            sec[modules[i]] = false;
            vars[modules[i]] = { module: modules[i] };
          }

          new User({
            email: profile.email,
            modules: obj,
            dashed: sec,
            uservars: vars,
            design_theme: "standart",
            username: profile.displayName,
            googleId: profile.id,
          })
            .save()
            .then((newUser) => {
              console.log("new User created" + newUser);
              done(null, newUser);
            });
        }
      });
    }
  )
);

router.get(pathsimport.main, function (req, res) {
  if (req.isAuthenticated()) {
    User.getUserById(req.session.passport.user, function (err, user) {
      res.render("html/Main", {
        user: req.isAuthenticated(),
        paths: pathsimport,
        theme: user.design_theme,
      });
    });
  } else {
    res.render("html/Main", {
      user: req.isAuthenticated(),
      paths: pathsimport,
      theme: "standart",
    });
  }
});

router.get(pathsimport.info, function (req, res) {
  if (req.isAuthenticated()) {
    User.getUserById(req.session.passport.user, function (err, user) {
      res.render("html/Info", {
        user: req.isAuthenticated(),
        paths: pathsimport,
        theme: user.design_theme,
      });
    });
  } else {
    res.render("html/Info", {
      user: req.isAuthenticated(),
      paths: pathsimport,
      theme: "standart",
    });
  }
});

router.get(pathsimport.agb, function (req, res) {
  if (req.isAuthenticated()) {
    User.getUserById(req.session.passport.user, function (err, user) {
      res.render("html/AGB", {
        user: req.isAuthenticated(),
        paths: pathsimport,
        theme: user.design_theme,
      });
    });
  } else {
    res.render("html/AGB", {
      user: req.isAuthenticated(),
      paths: pathsimport,
      theme: "standart",
    });
  }
});

router.get(pathsimport.impressum, function (req, res) {
  if (req.isAuthenticated()) {
    User.getUserById(req.session.passport.user, function (err, user) {
      res.render("html/Impressum", {
        user: req.isAuthenticated(),
        paths: pathsimport,
        theme: user.design_theme,
      });
    });
  } else {
    res.render("html/Impressum", {
      user: req.isAuthenticated(),
      paths: pathsimport,
      theme: "standart",
    });
  }
});

router.get(pathsimport.updateLog, function (req, res) {
  if (req.isAuthenticated()) {
    User.getUserById(req.session.passport.user, function (err, user) {
      res.render("html/Update", {
        user: req.isAuthenticated(),
        paths: pathsimport,
        theme: user.design_theme,
      });
    });
  } else {
    res.render("html/Update", {
      user: req.isAuthenticated(),
      paths: pathsimport,
      theme: "standart",
    });
  }
});

router.get(pathsimport.feedback, function (req, res) {
  if (req.isAuthenticated()) {
    User.getUserById(req.session.passport.user, function (err, user) {
      res.render("html/Feedback", {
        user: req.isAuthenticated(),
        paths: pathsimport,
        theme: user.design_theme,
      });
    });
  } else {
    res.render("html/Feedback", {
      user: req.isAuthenticated(),
      paths: pathsimport,
      theme: "standart",
    });
  }
});

router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile"],
  })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: pathsimport.login,
  }),
  function (req, res) {
    res.redirect(pathsimport.dashboard);
  }
);

router.post(pathsimport.info, function (req, res) {
  //maybe needed in future

  res.redirect(pathsimport.impressum);
});

router.post(pathsimport.agb, function (req, res) {
  //maybe needed in future

  res.redirect(pathsimport.agb);
});

router.post(pathsimport.impressum, function (req, res) {
  //maybe needed in future

  res.redirect(pathsimport.impressum);
});
//The´two examples below work just in the base.js but not here, don´t really know why

//router.get('/', function(req, res){
//  console.log("hello");
//  res.sendFile(path.join(__dirname, '../public_html/index.html'));
//});

//router.get('/007', function(req, res){
//    res.sendFile(path.join(__dirname, '../public_html/index2.html'));
//});

module.exports = router;

//MAYBE IMPROVEMENTS:
//-think of adding a view engine in base.js
//     -commands would be way shorter
// https://stackoverflow.com/questions/17911228/how-do-i-use-html-as-the-view-engine-in-express
