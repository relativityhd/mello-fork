var express = require("express");
var app = express();
var router = express.Router();

var mongoose = require("mongoose");
var async = require("async");
var multer = require("multer");
var GridFsStorage = require("multer-gridfs-storage");
var Grid = require("gridfs-stream");
var crypto = require("crypto");
var path = require("path");
var client = require("../scripts/standart_functions.js").standartClient;

var pathsimport = require("../scripts/paths.js");
var User = require("../Mongoose/user");
var standardAvatar = require("../Mongoose/StandardAvatar");
var serverVariablen = require("../Mongoose/serverVariablen");
var MongoUtil = require("../Mongoose/MongoUtil.js");
var ensureAuthenticated = require("../scripts/standart_functions.js")
  .ensureAuthenticated;

//=============================================================================================\\
//========================START mongoose=======================================================\\
//=============================================================================================\\
var conn = mongoose.createConnection(pathsimport.db_url);
var dbmon = mongoose.connection;
/*var Schema = mongoose.Schema;
var profile_dbcollection = dbmon.collection('profiles')

var profileSchema = Schema({
    _id: Schema.Types.ObjectId,
    userId: Schema.Types.ObjectId
})

mongoose.model('profile', profileSchema, 'profiles');*/

var _db = MongoUtil.getDb();
var dbo = _db.db("Mello");

serverVariablen.findOne({}, function (err, field) {
  if (!field) {
    var model = new serverVariablen({
      vars: { varZero: 007, gallery_counter: 0 },
    });
    model.save();
    console.log("Server variables constructed");
  } else {
    if (
      field.vars.gallery_counter == undefined ||
      field.vars.gallery_counter == null
    ) {
      var obj = {};
      obj.vars = field.vars;
      obj.vars.gallery_counter = 0;
      var newvalues = { $set: obj };
      dbo
        .collection("server_vars")
        .updateOne({ id: field._id }, newvalues, function (err, res) {
          if (err) throw err;
        });
      console.log("The Variable 'gallery_counter' started");
    }
  }
});

/*User.find({}, function(err, users) {
    users.forEach(function(user) {
        if (!user.friends) {
            var obj={};
            obj.friends=[user._id];
            var newvalues = {$set:obj};
            dbo.collection("user").updateOne({id:user._id}, newvalues, function (err, res) {
                if (err) throw err;
            })
        }
        if (!user.friends_requests) {
            var obj={};
            obj.friends_requests=[user._id];
            var newvalues = {$set:obj};
            dbo.collection("user").updateOne({id:user._id}, newvalues, function (err, res) {
                if (err) throw err;
            })
        }
    })
})*/

//=============================================================================================\\
//==========================END mongoose=======================================================\\
//=============================================================================================\\
//========================START GFS============================================================\\
//=============================================================================================\\

var gfs;
conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("uploads");
});

// Create storage engine
const initStorage = (url, bucketName, str, gallery) =>
  new GridFsStorage({
    url: url,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          if (gallery) {
            serverVariablen.findOne({}, function (err, field) {
              var gallery_counter = field.vars.gallery_counter;
              filename =
                buf.toString("hex") +
                gallery_counter +
                str +
                req.session.passport.user;
              const fileInfo = {
                filename: filename,
                IsAvatar: false,
                bucketName: "uploads",
              };
              resolve(fileInfo);
            });
          } else {
            const filename =
              buf.toString("hex") + str + req.session.passport.user;
            const fileInfo = {
              filename: filename,
              bucketName: bucketName,
            };
            console.log('--DEBUG  ~ file: profile.js ~ line 132 ~ crypto.randomBytes ~ fileInfo', fileInfo)
            resolve(fileInfo);
          }
        });
      });
    },
  });

// Create storage engine
const storageGallery = initStorage(
  pathsimport.db_url,
  "uploads",
  "_gallery_",
  true
);
const storageBanner = initStorage(
  pathsimport.db_url,
  "uploads",
  "banner_",
  false
);
const storagePicture = initStorage(pathsimport.db_url, "uploads", "", false);

const uploadGallery = multer({
  storage: storageGallery,
  limits: { fileSize: 1000 * 1000 * 1000 },
  fileFilter: function (req, file, cb) {
    checkFileExistence(req, file, cb, "", false);
  },
});

const uploadBanner = multer({
  storage: storageBanner,
  limits: { fileSize: 1000 * 1000 * 1000 },
  fileFilter: function (req, file, cb) {
    checkFileExistence(req, file, cb, "banner_", true);
  },
});

const uploadPicture = multer({
  storage: storagePicture,
  limits: { fileSize: 1000 * 1000 * 1000 },
  fileFilter: function (req, file, cb) {
    checkFileExistence(req, file, cb, "", true);
  },
});

function checkFileExistence(req, file, cb, str, del) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (!mimetype || !extname) {
    console.log("Not an image");
    return cb("Error: Images Only!");
  }

  if (!del) {
    return cb(null, true);
  }

  dbo
    .collection("uploads.files")
    .findOne({ filename: str + req.session.passport.user })
    .then((picturedata) => {
      console.log("res", res);
      if (!picturedata) {
        console.log("First image!");
        return cb(null, true);
      }

      console.log('Removing old pic')
      gfs.remove(
        { filename: str + req.session.passport.user, root: "uploads" },
        (err, gridStore) => {
          if (err) {
            console.log('There was an error O.O')
            return res.status(404).json({ err: err });
          }

          return cb(null, true);
        }
      );
    })
    .catch((err) => {
      return cb(null, true);
    });
}

//=============================================================================================\\
//==========================END GFS============================================================\\
//=============================================================================================\\
//========================START socket=========================================================\\
//=============================================================================================\\

client.on("connection", function (socket) {
  socket.on("requestSearch", function (data) {
    var search = data.search;
    async.parallel(
      [
        function (cb) {
          User.find(
            { username: { $regex: search, $options: "i" } },
            function (err, users) {
              cb(null, users);
            }
          );
        },
        function (cb) {
          User.find(
            { _id: { $regex: search, $options: "i" } },
            function (err, users) {
              cb(null, users);
            }
          );
        },
        function (cb) {
          User.find(
            { email: { $regex: search, $options: "i" } },
            function (err, users) {
              cb(null, users);
            }
          );
        },
        function (cb) {
          User.find(
            { firstname: { $regex: search, $options: "i" } },
            function (err, users) {
              cb(null, users);
            }
          );
        },
        function (cb) {
          User.find(
            { secondname: { $regex: search, $options: "i" } },
            function (err, users) {
              cb(null, users);
            }
          );
        },
        function (cb) {
          User.find(
            { lastname: { $regex: search, $options: "i" } },
            function (err, users) {
              cb(null, users);
            }
          );
        },
      ],
      function (err, results) {
        var users = {};
        var userIDs = [];
        for (var i = 0; i < results.length - 1; i++) {
          var result_users = results[i];
          if (result_users) {
            result_users.forEach(function (user) {
              if (!users[user._id]) {
                users[user._id] = user;
                userIDs.push(user._id);
              }
            });
          }
        }
        var obj = {};
        standardAvatar.find(
          { filename: { $in: userIDs } },
          function (err, pics) {
            if (pics) {
              pics.forEach(function (pic) {
                obj[pic.filename] = pic;
              });
            }
            socket.emit("receiveData", {
              users: users,
              userIds: userIDs,
              pictures: obj,
            });
          }
        );
      }
    );
  });
});

//=============================================================================================\\
//==========================END socket=========================================================\\
//=============================================================================================\\
//========================START gets===========================================================\\
//=============================================================================================\\

router.get("/", ensureAuthenticated, function (req, res) {
  async.parallel(
    [
      function (cb) {
        User.findOne({ _id: req.session.passport.user })
          .populate({ path: "friends" })
          .populate({ path: "friends_requests" })
          .populate({ path: "friends_inquiries" })
          .exec(function (err, user) {
            cb(null, user);
          });
      },
      function (cb) {
        standardAvatar
          .findOne({ filename: "banner_" + req.session.passport.user })
          .exec(function (err, doc) {
            cb(null, doc);
          });
      },
      function (cb) {
        standardAvatar
          .findOne({ filename: req.session.passport.user })
          .exec(function (err, file) {
            if (!file || file == null || file.length === 0) {
              standardAvatar
                .findOne({ filename: "standardAvatar" })
                .exec(function (err, doc) {
                  cb(null, doc);
                });
            } else {
              cb(null, file);
            }
          });
      },
      function (cb) {
        standardAvatar
          .find({
            filename: { $regex: "_gallery_" + req.session.passport.user },
          })
          .sort({ filename: 1 })
          .exec(function (err, docs) {
            cb(null, docs);
          });
      },
      function (cb) {
        User.findOne({ _id: req.session.passport.user }).exec(function (
          err,
          user
        ) {
          standardAvatar.find(
            { filename: { $in: user.friends } },
            function (err, files) {
              var obj = {};
              if (files) {
                files.forEach(function (file) {
                  obj[file.filename] = file;
                });
              }
              standardAvatar.find(
                { filename: { $in: user.friends_requests } },
                function (err, _files) {
                  if (_files) {
                    _files.forEach(function (file) {
                      obj[file.filename] = file;
                    });
                  }
                  standardAvatar.find(
                    { filename: { $in: user.friends_inquiries } },
                    function (err, _files_) {
                      if (_files_) {
                        _files_.forEach(function (file) {
                          obj[file.filename] = file;
                        });
                      }
                      cb(null, obj);
                    }
                  );
                }
              );
            }
          );
        });
      },
    ],
    function (err, results) {
      var thisUser = results[0];
      var banner = results[1];
      var profilepic = results[2];
      var gallery = results[3];
      var friendspics = results[4];

      return res.render("html/Profile", {
        isAuth: req.isAuthenticated(),
        thisUser: thisUser,
        paths: pathsimport,
        banner: banner,
        profilepic: profilepic,
        gallery: gallery,
        friendspics: friendspics,
      });
    }
  );
});

router.get("/:username", ensureAuthenticated, function (req, res) {
  var username = req.params.username;
  if (username == undefined || username == null) {
    User.getUserById(req.session.passport.user, function (err, user) {
      username = user.username;
    });
  }

  async.waterfall(
    [
      function (cb) {
        User.findOne({ username: username })
          .populate({ path: "friends" })
          .populate({ path: "friends_requests" })
          .exec(function (err, searchedUser) {
            if (searchedUser) {
              cb(null, searchedUser);
            } else {
              cb("User profile not found", null);
            }
          });
      },
      function (searchedUser, cb) {
        User.getUserById(req.session.passport.user, function (err, thisUser) {
          if (searchedUser.username != thisUser.username) {
            cb(null, [searchedUser, thisUser]);
          } else {
            cb(null, [searchedUser, searchedUser]);
          }
        });
      },
      function (results, cb) {
        standardAvatar
          .findOne({ filename: "banner_" + results[0]._id })
          .exec(function (err, doc) {
            results.push(doc);
            cb(null, results);
          });
      },
      function (results, cb) {
        standardAvatar
          .findOne({ filename: results[0]._id })
          .exec(function (err, file) {
            if (!file || file == null || file.length === 0) {
              standardAvatar
                .findOne({ filename: "standardAvatar" })
                .exec(function (err, doc) {
                  results.push(doc);
                  cb(null, results);
                });
            } else {
              results.push(file);
              cb(null, results);
            }
          });
      },
      function (results, cb) {
        standardAvatar
          .find({ filename: { $regex: "_gallery_" + results[0]._id } })
          .sort({ filename: 1 })
          .exec(function (err, docs) {
            results.push(docs);
            cb(null, results);
          });
      },
      function (results, cb) {
        User.findOne({ _id: req.session.passport.user }).exec(function (
          err,
          user
        ) {
          standardAvatar.find(
            { filename: { $in: user.friends } },
            function (err, files) {
              var obj = {};
              if (files) {
                files.forEach(function (file) {
                  obj[file.filename] = file;
                });
              }
              standardAvatar.find(
                { filename: { $in: user.friends_requests } },
                function (err, _files) {
                  if (_files) {
                    _files.forEach(function (file) {
                      obj[file.filename] = file;
                    });
                  }
                  standardAvatar.find(
                    { filename: { $in: user.friends_inquiries } },
                    function (err, _files_) {
                      if (_files_) {
                        _files_.forEach(function (file) {
                          obj[file.filename] = file;
                        });
                      }
                      results.push(obj);
                      cb(null, results);
                    }
                  );
                }
              );
            }
          );
        });
      },
    ],
    function (err, results) {
      if (err) {
        User.findOne({ _id: req.session.passport.user }).exec(function (
          user_err,
          user
        ) {
          return res.render("html/ErrorMSG", {
            isAuth: req.isAuthenticated(),
            thisUser: user,
            paths: pathsimport,
            errmsg: err,
          });
        });
      } else {
        var searchedUser = results[0];
        var thisUser = results[1];
        var banner = results[2];
        var profilepic = results[3];
        var gallery = results[4];
        var friendspics = results[5];

        return res.render("html/ProfileOther", {
          isAuth: req.isAuthenticated(),
          thisUser: thisUser,
          searchedUser: searchedUser,
          paths: pathsimport,
          banner: banner,
          profilepic: profilepic,
          gallery: gallery,
          friendspics: friendspics,
        });
      }
    }
  );
});

router.get(pathsimport.searchUser, ensureAuthenticated, function (req, res) {
  async.parallel(
    [
      function (cb) {
        User.getUserById(req.session.passport.user, function (err, user) {
          cb(null, user);
        });
      },
    ],
    function (err, results) {
      user = results[0];
      res.render("html/Search", {
        isAuth: req.isAuthenticated(),
        thisUser: user,
        paths: pathsimport,
      });
    }
  );
});

router.get("/picture/:filename", function (req, res) {
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
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      if (!file || file.length === 0) {
        return res.status(404).json({
          err: "No file exists",
        });
      }

      if (
        file.contentType === "image/jpeg" ||
        file.contentType === "image/png"
      ) {
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
  }
});

//=============================================================================================\\
//==========================END gets===========================================================\\
//=============================================================================================\\
//========================START posts==========================================================\\
//=============================================================================================\\

router.post(
  pathsimport.gallery,
  ensureAuthenticated,
  uploadGallery.single("gallery"),
  function (req, res) {
    serverVariablen.findOne({}, function (err, field) {
      var gallery_counter = field.vars.gallery_counter;
      gallery_counter++;
      var obj = {};
      obj.vars = field.vars;
      obj.vars.gallery_counter = gallery_counter;
      var newvalues = { $set: obj };
      var myquery = { _id: field._id };

      dbo
        .collection("server_vars")
        .updateOne(myquery, newvalues, function (err, res) {
          if (err) throw err;
        });
    });
    res.redirect(pathsimport.profilesite);
  }
);

router.post(
  pathsimport.banner,
  ensureAuthenticated,
  uploadBanner.single("banner"),
  function (req, res) {
    res.redirect(pathsimport.profilesite);
  }
);

router.post(
  pathsimport.avatar,
  ensureAuthenticated,
  uploadPicture.single("file"),
  function (req, res) {
    res.redirect(pathsimport.profilesite);
  }
);

router.post(
  "/delete/:filename/:userID",
  ensureAuthenticated,
  function (req, res) {
    if (
      req.params.filename.includes(req.params.userID) &&
      req.params.filename.includes("gallery")
    ) {
      standardAvatar.findOne(
        { filename: req.params.filename },
        function (err, doc) {
          if (doc) {
            gfs.remove({ _id: doc._id, root: "uploads" }, (err, gridStore) => {
              if (err) {
                return res.status(404).json({ err: err });
              }
            });
          }
        }
      );
    }
    res.redirect(pathsimport.profilesite);
  }
);

router.post(
  "/request_friendship/:userID",
  ensureAuthenticated,
  function (req, res) {
    var isWrong = true;
    async.parallel(
      [
        function (cb) {
          User.getUserById(req.params.userID, function (err, user) {
            cb(null, user);
          });
        },
        function (cb) {
          User.getUserById(req.session.passport.user, function (err, user) {
            cb(null, user);
          });
        },
      ],
      function (err, results) {
        var otherUser = results[0];
        var thisUser = results[1];

        /* Send friend-request is only possible if:
         *  -You have NOT requested the Stranger.
         *  -The Stranger has NOT requested you.
         *  -You and the Stranger are NOT friends.
         * Always double check up.
         */
        if (thisUser && otherUser) {
          /*console.log("this User requests: ", thisUser.friends_requests)
            console.log("other User requests: ", otherUser.friends_requests)
            console.log("this User inquiries: ", thisUser.friends_inquiries)
            console.log("other User inquiries: ", otherUser.friends_inquiries)
            console.log("this User friends: ", thisUser.friends)
            console.log("other User friends: ", otherUser.friends)
            console.log("this User id: ", thisUser._id)
            console.log("this User id toString: ", thisUser._id.toString())
            console.log("other User id: ", otherUser._id)
            console.log("other User id toString: ", otherUser._id.toString())
            
            console.log("thisRequestsStatus: ", (!thisUser.friends_requests.includes(otherUser._id.toString())))
            console.log("otherRequestsStatus: ", (!otherUser.friends_requests.includes(thisUser._id.toString())))
            console.log("thisInquiriesStatus: ", (!thisUser.friends_inquiries.includes(otherUser._id.toString())))
            console.log("otherInquiriesStatus: ", (!otherUser.friends_inquiries.includes(thisUser._id.toString())))
            console.log("thisFriendsStatus: ", (!thisUser.friends.includes(otherUser._id.toString())))
            console.log("otherFriendsStatus: ", (!otherUser.friends.includes(thisUser._id.toString())))*/

          if (
            !thisUser.friends_requests.includes(otherUser._id.toString()) &&
            !otherUser.friends_inquiries.includes(thisUser._id.toString()) &&
            !otherUser.friends_requests.includes(thisUser._id.toString()) &&
            !thisUser.friends_inquiries.includes(otherUser._id.toString()) &&
            !otherUser.friends.includes(thisUser._id.toString()) &&
            !thisUser.friends.includes(otherUser._id.toString())
          ) {
            var obj = {};
            obj.friends_requests = otherUser.friends_requests;
            obj.friends_requests.push(thisUser._id);
            var newvalues = { $set: obj };
            var myquery = { _id: otherUser._id };

            dbo
              .collection("users")
              .updateOne(myquery, newvalues, function (err, res) {
                if (err) throw err;
              });

            var _obj = {};
            _obj.friends_inquiries = thisUser.friends_inquiries;
            _obj.friends_inquiries.push(otherUser._id);
            var _newvalues = { $set: _obj };
            var _myquery = { _id: thisUser._id };

            dbo
              .collection("users")
              .updateOne(_myquery, _newvalues, function (err, res) {
                if (err) throw err;
              });
            isWrong = false;
            return res.redirect(
              pathsimport.profilesite + "/" + otherUser.username
            );
          }
        }
      }
    );
  }
);

router.post(
  "/accept_friendship/:userID",
  ensureAuthenticated,
  function (req, res) {
    var isWrong = true;
    async.parallel(
      [
        function (cb) {
          User.getUserById(req.params.userID, function (err, user) {
            cb(null, user);
          });
        },
        function (cb) {
          User.getUserById(req.session.passport.user, function (err, user) {
            cb(null, user);
          });
        },
      ],
      function (err, results) {
        var otherUser = results[0];
        var thisUser = results[1];

        /* Accept a friend-request is only possible if:
         *  -The Stranger has requested you.
         * Always double check up.
         */
        if (thisUser && otherUser) {
          if (
            thisUser.friends_requests.includes(otherUser._id.toString()) &&
            otherUser.friends_inquiries.includes(thisUser._id.toString())
          ) {
            var obj = {};
            obj.friends = thisUser.friends;
            obj.friends.push(otherUser._id);
            obj.friends_requests = thisUser.friends_requests;
            obj.friends_requests.splice(
              obj.friends_requests.indexOf(otherUser._id),
              1
            );
            var newvalues = { $set: obj };
            var myquery = { _id: thisUser._id };

            dbo
              .collection("users")
              .updateOne(myquery, newvalues, function (err, res) {
                if (err) throw err;
              });

            var _obj = {};
            _obj.friends = otherUser.friends;
            _obj.friends.push(thisUser._id);
            _obj.friends_inquiries = otherUser.friends_inquiries;
            _obj.friends_inquiries.splice(
              _obj.friends_inquiries.indexOf(thisUser._id),
              1
            );
            var _newvalues = { $set: _obj };
            var _myquery = { _id: otherUser._id };

            dbo
              .collection("users")
              .updateOne(_myquery, _newvalues, function (err, res) {
                if (err) throw err;
              });
            isWrong = false;
            return res.redirect(
              pathsimport.profilesite + "/" + otherUser.username
            );
          }
        }
      }
    );
  }
);

router.post(
  "/revoke_friendship/:userID",
  ensureAuthenticated,
  function (req, res) {
    var isWrong = true;
    async.parallel(
      [
        function (cb) {
          User.getUserById(req.params.userID, function (err, user) {
            cb(null, user);
          });
        },
        function (cb) {
          User.getUserById(req.session.passport.user, function (err, user) {
            cb(null, user);
          });
        },
      ],
      function (err, results) {
        var otherUser = results[0];
        var thisUser = results[1];

        /* Revoke a friend-request is only possible if:
         *  -You have requested the Stranger.
         * Always double check up.
         */
        if (thisUser && otherUser) {
          if (
            otherUser.friends_requests.includes(thisUser._id.toString()) &&
            thisUser.friends_inquiries.includes(otherUser._id.toString())
          ) {
            var obj = {};
            obj.friends_requests = otherUser.friends_requests;
            obj.friends_requests.splice(
              obj.friends_requests.indexOf(thisUser._id),
              1
            );
            var newvalues = { $set: obj };
            var myquery = { _id: otherUser._id };

            dbo
              .collection("users")
              .updateOne(myquery, newvalues, function (err, res) {
                if (err) throw err;
              });

            var _obj = {};
            _obj.friends_inquiries = thisUser.friends_inquiries;
            _obj.friends_inquiries.splice(
              _obj.friends_inquiries.indexOf(otherUser._id),
              1
            );
            var _newvalues = { $set: _obj };
            var _myquery = { _id: thisUser._id };

            dbo
              .collection("users")
              .updateOne(_myquery, _newvalues, function (err, res) {
                if (err) throw err;
              });
            isWrong = false;
            return res.redirect(pathsimport.profilesite);
          }
        }
      }
    );
  }
);

router.post(
  "/decline_friendship/:userID",
  ensureAuthenticated,
  function (req, res) {
    var isWrong = true;
    async.parallel(
      [
        function (cb) {
          User.getUserById(req.params.userID, function (err, user) {
            cb(null, user);
          });
        },
        function (cb) {
          User.getUserById(req.session.passport.user, function (err, user) {
            cb(null, user);
          });
        },
      ],
      function (err, results) {
        var otherUser = results[0];
        var thisUser = results[1];

        /* Decline a friend-request is only possible if:
         *  -The Stranger has requested you.
         * Always double check up.
         */
        if (thisUser && otherUser) {
          if (
            thisUser.friends_requests.includes(otherUser._id.toString()) &&
            otherUser.friends_inquiries.includes(thisUser._id.toString())
          ) {
            var obj = {};
            obj.friends_requests = thisUser.friends_requests;
            obj.friends_requests.splice(
              obj.friends_requests.indexOf(otherUser._id),
              1
            );
            var newvalues = { $set: obj };
            var myquery = { _id: thisUser._id };

            dbo
              .collection("users")
              .updateOne(myquery, newvalues, function (err, res) {
                if (err) throw err;
              });

            var _obj = {};
            _obj.friends_inquiries = otherUser.friends_inquiries;
            _obj.friends_inquiries.splice(
              _obj.friends_inquiries.indexOf(thisUser._id),
              1
            );
            var _newvalues = { $set: _obj };
            var _myquery = { _id: otherUser._id };

            dbo
              .collection("users")
              .updateOne(_myquery, _newvalues, function (err, res) {
                if (err) throw err;
              });
            isWrong = false;
            return res.redirect(pathsimport.profilesite);
          }
        }
      }
    );
  }
);

router.post(
  "/end_friendship/:userID",
  ensureAuthenticated,
  function (req, res) {
    var isWrong = true;
    async.parallel(
      [
        function (cb) {
          User.getUserById(req.params.userID, function (err, user) {
            cb(null, user);
          });
        },
        function (cb) {
          User.getUserById(req.session.passport.user, function (err, user) {
            cb(null, user);
          });
        },
      ],
      function (err, results) {
        var otherUser = results[0];
        var thisUser = results[1];

        /* End a Friendship is only possible if:
         *  -You and the Stranger are friends.
         * Always double check up.
         */
        if (thisUser && otherUser) {
          if (
            thisUser.friends.includes(otherUser._id.toString()) &&
            otherUser.friends.includes(thisUser._id.toString())
          ) {
            var obj = {};
            obj.friends = thisUser.friends;
            obj.friends.splice(obj.friends.indexOf(otherUser._id), 1);
            var newvalues = { $set: obj };
            var myquery = { _id: thisUser._id };

            dbo
              .collection("users")
              .updateOne(myquery, newvalues, function (err, res) {
                if (err) throw err;
              });

            var _obj = {};
            _obj.friends = otherUser.friends;
            _obj.friends.splice(_obj.friends.indexOf(thisUser._id), 1);
            _newvalues = { $set: _obj };
            _myquery = { _id: otherUser._id };

            dbo
              .collection("users")
              .updateOne(_myquery, _newvalues, function (err, res) {
                if (err) throw err;
              });
            isWrong = false;
            return res.redirect(pathsimport.profilesite);
          }
        }
      }
    );
  }
);

//=============================================================================================\\
//==========================END posts==========================================================\\
//=============================================================================================\\

module.exports = router;
