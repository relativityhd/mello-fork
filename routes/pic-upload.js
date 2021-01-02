var express = require("express");
var bodyParser = require("body-parser");
var path = require("path");
var crypto = require("crypto");
var mongoose = require("mongoose");
var multer = require("multer");
var GridFsStorage = require("multer-gridfs-storage");
var Grid = require("gridfs-stream");
var fs = require("fs");
var methodOverride = require("method-override");
var app = express();
var router = express.Router();
var pathsimport = require("../scripts/paths.js");
var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var User = require("../Mongoose/user");
var standardAvatar = require("../Mongoose/StandardAvatar");
// Create mongo connection
//const conn = mongoose.createConnection(mongoURI);
var mongoUtil = require("../Mongoose/MongoUtil.js");
var ensureAuthenticated = require("../scripts/standart_functions.js")
  .ensureAuthenticated;

app.use(bodyParser.json());
app.use(methodOverride("_method"));

// Mongo URI
const mongoURI = pathsimport.db_url;

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);
var db = mongoose.connection;

// Init gfs
let gfs;

conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

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

router.get(
  pathsimport.register2Upload,
  ensureAuthenticated,
  function (req, res) {
    gfs.files.findOne({ filename: req.session.passport.user }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        return ShowStandardAvatarrr();

        function ShowStandardAvatarrr() {
          return standardAvatar.findOne(
            { filename: "standardAvatar" },
            function (err, doc) {
              if (err) return next(err);
              //return res.send(doc.img.data);
              //res.contentType(doc.img.contentType);
              return res.render("html/RegisterStep25", {
                paths: pathsimport,
                file: doc,
                user: req.isAuthenticated(),
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
        // Read output to browser
        //const readstream = gfs.createReadStream(file.filename);
        //console.log(file);
        return res.render("html/RegisterStep25", {
          paths: pathsimport,
          file: file,
          user: req.isAuthenticated(),
        });
      } else {
        res.status(404).json({
          err: "Not an image",
        });
      }
    });
  }
);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.getUserById(id, function (err, user) {
    done(err, user);
  });
});

function ensureAuthenticatedd(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    //req.flash('error_msg','You are not logged in');
    var err = new Error("Not authorized! Go back!");
    err.status = 400;
    return next(err);
  }
}

function checkFileExistence(req, file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    var myquery = { filename: req.session.passport.user };
    var _db = mongoUtil.getDb();
    var dbo = _db.db("Mello");
    var picturedata = dbo.collection("uploads.files").findOne(myquery);
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

router.post(
  pathsimport.register2Upload,
  ensureAuthenticatedd,
  upload.single("file"),
  function (req, res) {
    gfs.files.findOne({ filename: req.session.passport.user }, (err, file) => {
      // Check if file
      if (!file || file.length === 0) {
        res.redirect(pathsimport.registration3);
        // return res.status(404).json({
        // err: 'No file exists'
        //  });
      } else {
        // Check if image
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          // Read output to browser
          const readstream = gfs.createReadStream(file.filename);
          /*
            files.map(file => {
              if (
                file.contentType === 'image/jpeg' ||
                file.contentType === 'image/png'
              ) {
                file.isImage = true;
              } else {
                file.isImage = false;
              }
            });

    */

          res.redirect(pathsimport.registration3);
        } else {
          res.status(404).json({
            err: "Not an image",
          });
        }
      }
    });

    /*
    upload(req, res, (err) => {
        if(err){
            res.render("html/RegisterStep25", {
                paths:pathsimport,
                msg:err,
                file:"../pics/standart.png"
            });
        }else{
            if(req.file == undefined){
                res.render("html/RegisterStep25", {
                    paths:pathsimport,
                    msg:"Select a Picture please",
                    file:"../pics/standart.png"
                });
            }else{
                res.render("html/RegisterStep25", {
                    paths:pathsimport,
                    file: `../pics/${req.file.filename}`
                });
            }
        }
    });
    */
  }
);

router.get("/avatar/:filename", ensureAuthenticated, (req, res) => {
  if (req.params.filename == "standardAvatar") {
    return ShowStandardAvatar();

    function ShowStandardAvatar() {
      standardAvatar.findOne(
        { filename: "standardAvatar" },
        function (err, doc) {
          if (err) return next(err);
          res.contentType(doc.img.contentType);
          return res.send(doc.img.data);
        }
      );
    }
  } else {
    if (req.session.passport.user == req.params.filename) {
      gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if file
        if (!file || file.length === 0) {
          return res.status(404).json({
            err: "No file exists",
          });
        }

        // Check if image
        if (
          file.contentType === "image/jpeg" ||
          file.contentType === "image/png"
        ) {
          // Read output to browser
          if (file.IsAvatar == true) {
            return ShowStandardAvatar();

            function ShowStandardAvatar() {
              standardAvatar.findById(
                { _id: "5ae7668445e1271f946ea499" },
                function (err, doc) {
                  if (err) return next(err);
                  res.contentType(doc.img.contentType);
                  return res.send(doc.img.data);
                }
              );
            }
            res.contentType(file.img.contentType);
            return res.send(file.img.data);
          } else {
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
          }
        } else {
          res.status(404).json({
            err: "Not an image",
          });
        }
      });
    } else {
      /*var err = new Error('Not authorized! Go back! Not your picture!');
      err.status = 400;
      return next(err);
*/
      res.status(400).json({
        err: "Not authorized! Go back! Not your picture!",
      });
    }
  }
});

var imgPath = path.join(__dirname, "../public/pics/standart.png");

function StoreStandardAvatar() {
  standardAvatar.findOne({ filename: "standardAvatar" }, function (err, doc) {
    if (!doc) {
      // store an img in binary in mongo
      var stAv = new standardAvatar();
      stAv.filename = "standardAvatar";
      stAv.img.data = fs.readFileSync(imgPath);
      stAv.img.contentType = "image/png";
      stAv.contentType = "image/jpeg";
      stAv.IsAvatar = true;
      stAv.save(function (err, stAv) {
        if (err) throw err;
        return console.log("Standard Avatar was saved succesfully!");
      });
    }

    if (doc) {
      return console.log(
        "Standard Avatar already exists, no changes were applied!"
      );
    }
  });
}
/*
  gfs.files.findOne({ filename: req.session.passport.user }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
    console.log('kdlkglklödökglökflögkdfölgksdgmklsnkgksdlgj');

    if (doc){
      return console.log("Standard Avatar already exists, no changes were applied!");
    }

ShowStandardAvatarrr();
  }}

*/
StoreStandardAvatar();

module.exports = router;
