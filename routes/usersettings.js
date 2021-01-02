var express = require("express");
var app = express();
var router = express.Router();
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;

var GridFsStorage = require("multer-gridfs-storage");
var Grid = require("gridfs-stream");
var multer = require("multer");
var fs = require("fs");
var mongoose = require("mongoose");
var methodOverride = require("method-override");
var crypto = require("crypto");
var path = require("path");
var bodyParser = require("body-parser");

var pathsimport = require("../scripts/paths.js");
var ensureAuthenticated = require("../scripts/standart_functions.js")
  .ensureAuthenticated;
var User = require("../Mongoose/user");
var mongoUtil = require("../Mongoose/MongoUtil.js");
var standardAvatar = require("../Mongoose/StandardAvatar");

app.use(bodyParser.json());
app.use(methodOverride("_method"));

const mongoURI = pathsimport.db_url;
const conn = mongoose.createConnection(mongoURI);
var db = mongoose.connection;
let gfs;
conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = req.session.passport.user;
        //const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          IsAvatar: false,
          bucketName: "uploads",
        };
        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1000000000 },
  fileFilter: function (req, file, cb) {
    checkFileExistence(req, file, cb);
  },
});

/*// Check File Type
function checkFileType(file, cb){
  // Allowed ext
    const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
    const mimetype = filetypes.test(file.mimetype);

    if(mimetype && extname){
        return cb(null,true);
    } else {
        cb('Error: Images Only!');
    }
}

function checkFileExistence(req, file, cb){
     var picturedata = db.collection('uploads.files').findOne({filename: req.session.passport.user});

     if (picturedata) {

      gfs.remove({ filename: req.session.passport.user, root: 'uploads' }, (err, gridStore) => {
        if (err) {
          return res.status(404).json({ err: err });
        }
      return cb(null,true);
      });
     }
     if (!picturedata) {
      return cb(null,true);
       // return res.render("html/Login");
     }
}*/

function checkFileExistence(req, file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    var picturedata = db
      .collection("uploads.files")
      .findOne({ filename: req.session.passport.user });
    if (picturedata) {
      gfs.remove(
        { filename: req.session.passport.user, root: "uploads" },
        (err, gridStore) => {
          if (err) {
            return res.status(404).json({ err: err });
          }
        }
      );
    }
    return cb(null, true);
  } else {
    return cb("Error: Images Only!");
  }
}

function validSettings(user) {
  var obj = {};
  if (user.firstname == undefined) {
    obj["firstname"] = "";
  } else {
    obj["firstname"] = user.firstname;
  }
  if (user.secondname == undefined) {
    obj["secondname"] = "";
  } else {
    obj["secondname"] = user.secondname;
  }
  if (user.lastname == undefined) {
    obj["lastname"] = "";
  } else {
    obj["lastname"] = user.lastname;
  }
  if (user.biography == undefined) {
    obj["biography"] = "";
  } else {
    obj["biography"] = user.biography;
  }
  if (user.birthday == undefined) {
    obj["birthday"] = "";
  } else {
    obj["birthday"] = user.birthday;
  }
  if (user.tel == undefined) {
    obj["tel"] = "";
  } else {
    obj["tel"] = user.tel;
  }
  if (user.mob == undefined) {
    obj["mob"] = "";
  } else {
    obj["mob"] = user.mob;
  }
  if (user.sex == undefined) {
    obj["sex"] = { male: "", female: "", other: "" };
  } else {
    obj["sex"] = { male: "", female: "", other: "" };
    if (user.sex == "male") {
      obj["sex"]["male"] = "checked='on'";
    } else if (user.sex == "female") {
      obj["sex"]["female"] = "checked='on'";
    } else if (user.sex == "other") {
      obj["sex"]["other"] = "checked='on'";
    }
  }
  return obj;
}

//=============================================================================
//===========================Change============================================
//=============================================================================

router.get(pathsimport.settings, ensureAuthenticated, function (req, res) {
  var newpasswordsaved = req.query.newpassword;

  User.getUserById(req.session.passport.user, function (err, user) {
    gfs.files.findOne({ filename: req.session.passport.user }, (err, file) => {
      var obj = validSettings(user);
      var saved = false;
      if (
        newpasswordsaved == "saved" ||
        (user.last_change != undefined && Date.now() - user.last_change <= 1000)
      ) {
        saved = "saved";
      }
      if (newpasswordsaved == "wrong") {
        saved = "wrong";
      }
      if (newpasswordsaved == "mc") {
        saved = mc;
      }
      if (newpasswordsaved == "nm") {
        saved = nc;
      }

      var err = "";

      if (!file || file == null || file.length === 0) {
        standardAvatar.findOne(
          { filename: "standardAvatar" },
          function (errsa, doc) {
            return res.render("html/Settings", {
              paths: pathsimport,
              user: req.isAuthenticated(),
              username: user.username,
              email: user.email,
              userdata: obj,
              err: err,
              saved: saved,
              file: doc,
              theme: user.design_theme,
            });
          }
        );
      } else {
        return res.render("html/Settings", {
          paths: pathsimport,
          user: req.isAuthenticated(),
          username: user.username,
          email: user.email,
          userdata: obj,
          err: err,
          saved: saved,
          file: file,
          theme: user.design_theme,
        });
      }
    });
  });
});

router.post(pathsimport.settings, ensureAuthenticated, function (req, res) {
  //________________________________________________________________
  //================================================================
  User.getUserById(req.session.passport.user, function (err, user) {
    var myquery = { username: user.username };
    var _db = mongoUtil.getDb();
    var dbo = _db.db("Mello");
    var goUpload = true;

    if (req.body.apply == "apply Changes") {
      var set_email = req.body.email;
      var set_firstname = req.body.firstname;
      var set_secondname = req.body.secondname;
      var set_lastname = req.body.lastname;
      var set_bio = req.body.bio;
      var set_birthday = req.body.birthday;
      var set_tel = req.body.telnumber;
      var set_mob = req.body.mobnumber;
      var set_sex = req.body.sex;
      req.checkBody("email", "Email is required").notEmpty();
      var validation_errors = req.validationErrors();
      if (validation_errors) {
        goUpload = false;
        gfs.files.findOne(
          { filename: req.session.passport.user },
          (errgfs, file) => {
            var obj = validSettings(user);
            var saved = false;

            var err = validation_errors[0].msg;
            if (!file || file == null || file.length === 0) {
              standardAvatar.findOne(
                { filename: "standardAvatar" },
                function (errsa, doc) {
                  return res.render("html/Settings", {
                    paths: pathsimport,
                    user: req.isAuthenticated(),
                    username: user.username,
                    email: user.email,
                    userdata: obj,
                    err: err,
                    saved: saved,
                    file: doc,
                    theme: user.design_theme,
                  });
                }
              );
            } else {
              return res.render("html/Settings", {
                paths: pathsimport,
                user: req.isAuthenticated(),
                username: user.username,
                email: user.email,
                userdata: obj,
                err: err,
                saved: saved,
                file: file,
                theme: user.design_theme,
              });
            }
          }
        );
      } else {
        newvalues = {
          $set: {
            email: set_email,
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
      }
    } else if (req.body.apply == "change Password") {
      var set_password = req.body.password;
      var set_confirm = req.body.password_confirm;

      req.checkBody("password", "Password is required").notEmpty();
      req
        .checkBody(
          "password",
          "Must be at least 6 characters long with at least one number"
        )
        .isLength({ min: 6 })
        .matches(/\d/);
      req
        .checkBody("password_confirm", "Passwords do not match")
        .equals(req.body.password);

      var validation_errors = req.validationErrors();
      if (validation_errors) {
        goUpload = false;
        gfs.files.findOne(
          { filename: req.session.passport.user },
          (err, file) => {
            var obj = validSettings(user);
            var saved = false;

            var err = validation_errors[0].msg;
            if (!file || file == null || file.length === 0) {
              standardAvatar.findOne(
                { filename: "standardAvatar" },
                function (errsa, doc) {
                  return res.render("html/Settings", {
                    paths: pathsimport,
                    user: req.isAuthenticated(),
                    username: user.username,
                    email: user.email,
                    userdata: obj,
                    err: err,
                    saved: saved,
                    file: doc,
                    theme: user.design_theme,
                  });
                }
              );
            } else {
              return res.render("html/Settings", {
                paths: pathsimport,
                user: req.isAuthenticated(),
                username: user.username,
                email: user.email,
                userdata: obj,
                err: err,
                saved: saved,
                file: file,
                theme: user.design_theme,
              });
            }
          }
        );
      } else {
        //Fügt Passwort als String unverschlüsselt hinzu.

        goUpload = false;
        if (
          req.body.oldpassword == "" ||
          req.body.password == "" ||
          req.body.password_confirm == ""
        ) {
          return res.redirect(pathsimport.settings + "?newpassword=" + "mc");
        }

        req.checkBody("password", "Password is required").notEmpty();
        req
          .checkBody(
            "password",
            "Password must be at least 6 characters long with at least one number"
          )
          .isLength({ min: 6 })
          .matches(/\d/);
        req
          .checkBody("password_confirm", "Passwords do not match")
          .equals(req.body.password);

        var validation_errors = req.validationErrors();
        console.log("Validation Errors");
        console.log(validation_errors);

        if (validation_errors) {
          return res.redirect(pathsimport.settings + "?newpassword=" + "nm");
        }

        User.comparePassword(
          req.body.oldpassword,
          user.password,
          function (err, isMatch) {
            if (err) throw err;
            if (isMatch) {
              console.log("isssmatch");
              User.updatePassword(
                req.session.passport.user,
                req.body.password,
                function (err, hpswd, user) {
                  if (err) throw err;

                  console.log(
                    "User called " +
                      "\u0022" +
                      user.username +
                      "\u0022" +
                      " has changes his/her password successfully."
                  );
                  console.log(
                    "New hashed password: " + "\u0022" + hpswd + "\u0022"
                  );

                  /*  newvalues = {$set:{
                                                    password: hashedpaswrd,
                                                    last_change:Date.now()
                                                }};*/

                  return res.redirect(
                    pathsimport.settings + "?newpassword=" + "saved"
                  );

                  if (err) {
                    return res.status(404).json({ err: err });
                  }
                }
              );
            } else {
              return res.redirect(
                pathsimport.settings + "?newpassword=" + "wrong"
              );
            }
          }
        );
      }
    } else if (req.body.apply == "change Profilepicture") {
      goUpload = false;
      res.redirect(pathsimport.settingsUpload);
    } else if (req.body.apply == "delete Profilepicture") {
      goUpload = false;
      gfs.remove(
        { filename: req.session.passport.user, root: "uploads" },
        (err, gridStore) => {
          if (err) {
            return res.status(404).json({ err: err });
          }
          res.redirect(pathsimport.settings);
        }
      );
    } else if (req.body.apply == "delete Banner") {
      goUpload = false;
      gfs.remove(
        { filename: "banner_" + req.session.passport.user, root: "uploads" },
        (err, gridStore) => {
          if (err) {
            return res.status(404).json({ err: err });
          }
          res.redirect(pathsimport.settings);
        }
      );
    }

    if (goUpload == true) {
      dbo
        .collection("users")
        .updateOne(myquery, newvalues, function (err, res) {
          if (err) throw err;
        });

      res.redirect(pathsimport.settings);
    }
  });
});

//=============================================================================
//===========================END Change========================================
//=============================================================================

//=============================================================================
//===========================Upload============================================
//=============================================================================

router.get(
  pathsimport.settingsUpload,
  ensureAuthenticated,
  function (req, res) {
    User.getUserById(req.session.passport.user, function (err, user) {
      gfs.files.findOne(
        { filename: req.session.passport.user },
        (err, file) => {
          // Check if file
          if (!file || file == null || file.length === 0) {
            return ShowStandardAvatarrr();
            function ShowStandardAvatarrr() {
              return standardAvatar.findOne(
                { filename: "standardAvatar" },
                function (err, doc) {
                  if (err) return next(err);
                  return res.render("html/ChangePicture", {
                    paths: pathsimport,
                    file: doc,
                    user: req.isAuthenticated(),
                    theme: user.design_theme,
                  });
                }
              );
            }
          }
          // Check if image
          if (
            file.contentType === "image/jpeg" ||
            file.contentType === "image/png"
          ) {
            return res.render("html/ChangePicture", {
              paths: pathsimport,
              file: file,
              user: req.isAuthenticated(),
              theme: user.design_theme,
            });
          } else {
            res.status(404).json({
              err: "Not an image",
            });
          }
        }
      );
    });
  }
);

router.post(
  pathsimport.settingsUpload,
  ensureAuthenticated,
  upload.single("file"),
  function (req, res) {
    res.redirect(pathsimport.settings);
    /*User.getUserById(req.session.passport.user, function(err, user){
        gfs.files.findOne({ filename: req.session.passport.user }, (err, file) => {
          // Check if file
          if (!file || file.length === 0) {
            return res.render('html/ChangePicture' ,{
              paths:pathsimport,
              AvatarExistence: true,
              theme:user.design_theme
            });
          }

          // Check if image
          if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            // Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            res.render("html/ChangePicture",{
              paths:pathsimport,
              file: file,
              user:req.isAuthenticated(),
              theme:user.design_theme
            });
          } else {
            res.status(404).json({
              err: 'Not an image'
            });
          }
        });
    });*/
  }
);

//=============================================================================
//===========================END Upload========================================
//=============================================================================

module.exports = router;
