var express = require("express");
var app = express();
var router = express.Router();
var pathsimport = require("../scripts/paths.js");
var User = require("../Mongoose/user");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var multer = require("multer");
var path = require("path");
var GridFsStorage = require("multer-gridfs-storage");
var Grid = require("gridfs-stream");
var mongoose = require("mongoose");
var MongoClient = require("mongodb").MongoClient;
var fs = require("fs");
var mongoUtil = require("../Mongoose/MongoUtil.js");
var ensureAuthenticated = require("../scripts/standart_functions.js")
  .ensureAuthenticated;
var ensureNotAuthenticated = require("../scripts/standart_functions.js")
  .ensureNotAuthenticated;

let gfs;

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    //req.flash('error_msg','You are not logged in');
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return next(err);
  }
}

function ensureNotAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  } else {
    //req.flash('error_msg','You are not logged in');
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return next(err);
  }
}

////// GET ********** GET ********** GET ********** GET ********** GET ********** GET ********** GET //////

////////// GET Register 1 //////////
router.get(pathsimport.register1, ensureNotAuthenticated, function (req, res) {
  res.render("html/RegisterStep1", {
    credentials: "",
    errName: "",
    errMail: "",
    errPassword: "",
    errConfirm: "",
    usernameSpaceholder: "",
    emailSpaceholder: "",
    passwordSpaceholder: "",
    passwordConfirmSpaceholder: "",
    paths: pathsimport,
  });
});
////////// GET Register 1 END //////////

////////// GET Register 2 //////////
router.get(pathsimport.register2, ensureAuthenticated, function (req, res) {
  res.render("html/RegisterStep2", {
    paths: pathsimport,
    user: req.isAuthenticated(),
  });
});
////////// GET Register 2 END //////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////s

////////// GET Register 3 //////////
router.get(pathsimport.register3, ensureAuthenticated, function (req, res) {
  res.render("html/RegisterStep3", {
    paths: pathsimport,
    user: req.isAuthenticated(),
  });
});
////////// GET Register 3 END //////////

////// GET END ********** GET END ********** GET END ********** GET END ********** GET END ********** GET END //////

////// POST ********** POST ********** POST ********** POST ********** POST ********** POST ********** POST //////

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
passport.use(
  "local-signup",
  new LocalStrategy(
    {
      // by default, local strategy uses username and password, we will override with email
      usernameField: "username",
      passwordField: "password",
      passReqToCallback: true, // allows us to pass back the entire request to the callback
    },
    function (req, username, password, done) {
      console.log("Email:");
      console.log(req.body.email);

      // asynchronous
      // User.findOne wont fire unless data is sent back
      process.nextTick(function () {
        // find a user whose email is the same as the forms email
        // we are checking to see if the user trying to login already exists
        User.findOne({ username: req.body.username }, function (err, user) {
          // if there are any errors, return the error
          if (err) return done(err);

          // check to see if theres already a user with that email
          if (user) {
            console.log("User already exists!");
            var err = new Error("User already exists!");
            err.status = 400;
            return done(null, false, "User already exists");
          } else {
            var message;

            var reg_name = req.body.username;
            var reg_email = req.body.email;
            var reg_password = req.body.password;
            var reg_password_confirm = req.body.password_confirm;

            req.checkBody("username", "Name is required").notEmpty();
            req.checkBody("email", "Email is required").notEmpty();
            req.checkBody("email", "Email is not valid").isEmail();
            req.checkBody("password", "Password is required").notEmpty();
            req
              .checkBody(
                "password",
                "Must be at least 6 characters long with at least one number"
              )
              .isLength({ min: 6 })
              .matches(/\d/);
            //req.checkBody('password', 'Should not contain space').matches(/!\f/);
            req
              .checkBody("password_confirm", "Passwords do not match")
              .equals(req.body.password);

            var validation_errors = req.validationErrors();
            console.log("Validation Errors");
            console.log(validation_errors);

            if (validation_errors) {
              message =
                "Mama, kannst du mich abholen? Denn ich habe scheiße gebaut.";
              console.log(message);

              var errName = "",
                errMail = "",
                errPassword = "",
                errConfirm = "";
              for (var i = 0; i < validation_errors.length; i++) {
                switch (validation_errors[i].param) {
                  case "username":
                    errName = validation_errors[i].msg;
                    break;
                  case "email":
                    errMail = validation_errors[i].msg;
                    break;
                  case "password":
                    errPassword = validation_errors[i].msg;
                    break;
                  case "password_confirm":
                    errConfirm = validation_errors[i].msg;
                    break;
                  default:
                    break;
                }
              }
              //var err = new Error('User already exists!');
              //err.status = 400;
              console.log(errConfirm);
              var validationErrorObject = {
                paths: pathsimport,
                errName: errName,
                errMail: errMail,
                errPassword: errPassword,
                errConfirm: errConfirm,
                usernameSpaceholder: req.body.username,
                emailSpaceholder: req.body.email,
                passwordSpaceholder: req.body.password,
                passwordConfirmSpaceholder: req.body.password_confirm,
                credentials: "",
              };
              return done(null, false, validationErrorObject);
            } else {
              //Fügt alle Module-Keys hinzu
              var modules = [];
              var folders = fs.readdirSync("./modules/modules");
              for (var i = 0; i < folders.length; i++) {
                var folder = folders[i];
                var router_temp = require("../modules/modules/" +
                  folder +
                  "/use");
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

              var admins = ["Tobias", "Robekay"]; //Hier eure Usernamen einfügen um euch zum Admin zu machen!
              if (admins.includes(req.body.username)) {
                var isAdmin = "true";
              } else {
                var isAdmin = "false";
              }

              var newUser = new User({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                modules: obj,
                dashed: sec,
                uservars: vars,
                design_theme: "standart",
                admin: isAdmin,
              });

              User.createUser(newUser, function (err, user) {
                if (err) throw err;
                console.log(user);
              });

              return done(null, newUser, "This is an usefull information");
            }
          }
        });
      });
    }
  )
);

router.post(pathsimport.register1, function (req, res, next) {
  passport.authenticate(
    "local-signup",
    {
      badRequestMessage: "Credentials are missing", // standard: Missing credentials.
    },
    function (err, user, info) {
      console.log(user);
      console.log("The usefull information");
      console.log(info);

      var credentialMessage = "Credentials are missing";
      console.log(credentialMessage);
      var UserExistsMessage = "User already exists";

      console.log(info.message);

      if (err) {
        //return next(err);

        var validationErrorObject = {
          credentials: "Error!",
          paths: pathsimport,
          errName: "",
          errMail: "",
          errPassword: "",
          errConfirm: "",
          usernameSpaceholder: req.body.username,
          emailSpaceholder: req.body.email,
          passwordSpaceholder: req.body.password,
          passwordConfirmSpaceholder: req.body.password_confirm,
        };

        return res.render("html/RegisterStep1", validationErrorObject);
      }

      if (info.message == credentialMessage) {
        var validationErrorObject1 = {
          credentials: "There are missing credentils!",
          paths: pathsimport,
          errName: "",
          errMail: "",
          errPassword: "",
          errConfirm: "",
          usernameSpaceholder: req.body.username,
          emailSpaceholder: req.body.email,
          passwordSpaceholder: req.body.password,
          passwordConfirmSpaceholder: req.body.password_confirm,
        };

        return res.render("html/RegisterStep1", validationErrorObject1);
      }

      if (info == UserExistsMessage) {
        var validationErrorObject2 = {
          credentials:
            "Username already exists. Please choose a different one.",
          paths: pathsimport,
          errName: "",
          errMail: "",
          errPassword: "",
          errConfirm: "",
          usernameSpaceholder: req.body.username,
          emailSpaceholder: req.body.email,
          passwordSpaceholder: req.body.password,
          passwordConfirmSpaceholder: req.body.password_confirm,
        };
        console.log("safksdögsdlfö");
        return res.render("html/RegisterStep1", validationErrorObject2);
      } else {
        if (!user) {
          return res.render("html/RegisterStep1", info);
        }

        console.log("erfolgreich erstellt");
        req.logIn(user, function (err) {
          console.log("wirklich erstellt?");
          if (err) {
            return next(err);
          }
          return res.redirect(pathsimport.registration2);
        });
      }
    }
  )(req, res, next);
});

router.get(pathsimport.register3, ensureNotAuthenticated, function (req, res) {
  res.render("html/RegisterStep3", {
    paths: pathsimport,
  });
});

////////// POST Register 2 //////////
router.post(pathsimport.register2, ensureAuthenticated, function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    var myquery = { username: user.username };
    var _db = mongoUtil.getDb();
    var dbo = _db.db("Mello");

    var set_firstname = req.body.firstname;
    var set_secondname = req.body.secondname;
    var set_lastname = req.body.lastname;
    var set_bio = req.body.bio;
    var set_birthday = req.body.birthday;
    var set_tel = req.body.telnumber;
    var set_sex = req.body.sex;
    var set_mob = req.body.mobnumber;

    //req.checkBody('biography', 'DON`T KNOWE').notEmpty();
    //req.checkBody('birthday', 'DON`T KNOWE').notEmpty();
    //req.checkBody('tel', 'DON`T KNOWE').notEmpty();

    //var validation_errors = req.validationErrors();

    newvalues = {
      $set: {
        firstname: set_firstname,
        secondname: set_secondname,
        lastname: set_lastname,
        biography: set_bio,
        birthday: set_birthday,
        tel: set_tel,
        mob: set_mob,
        sex: set_sex,
        last_change: Date.now(),
      },
    };
    console.log("newvalues");
    console.log(newvalues);

    dbo.collection("users").updateOne(myquery, newvalues, function (err, res) {
      if (err) throw err;
    });
    console.log(req.session.passport.user);

    res.redirect(pathsimport.registration2Upload);

    /*if(validation_errors){
            message = "Mama, kannst du mich abholen? Denn ich habe scheiße gebaut.";
            console.log(message);

            res.redirect(pathsimport.registration2); */ // <<<<---- hier muss register 1 mit fehlermeldung wider aufgerufen werden.
    // Wie der Fehler ausgegeben werden soll, muss noch gegooglet werden!!
  });
});
//else {
//    res.redirect(pathsimport.registration2Upload);
// }

//Check if values are valid
//encrypt
//send to database
//redirecct to Register 3 --->>>--->>>--->>>--->>>--->>>
//if not valid redirect to Register 2 and give Error "input not valid"

//});

////////// POST Register 2 END //////////

////////// POST Register 3 //////////
router.post(pathsimport.register3, ensureAuthenticated, function (req, res) {
  res.redirect(pathsimport.dashboard);
  //redirecct to Dashboard --->>>--->>>--->>>--->>>--->>>
});
////////// POST Register 3 END //////////

////// POST END ********** POST END ********** POST END ********** POST END ********** POST END ********** POST END //////

//////////////////////////////////////////////////////////////////////

module.exports = router;
