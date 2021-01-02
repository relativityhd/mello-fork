var express = require("express");
var app = express();
var router = express.Router();
var mongoose = require("mongoose");
var async = require("async");
var fs = require("fs");
var cron = require("node-cron");

var pathsimport = require("../../../scripts/paths.js");
var ensureAuthenticated = require("../../../scripts/standart_functions.js")
  .ensureAuthenticated;
var client = require("../../../scripts/standart_functions.js").dashboardClient;
var MongoUtil = require("../../../Mongoose/MongoUtil.js");
var User = require("../../../Mongoose/user.js");

//=============================================================================================\\
//========================START mongoose=======================================================\\
//=============================================================================================\\

mongoose.connect(pathsimport.db_url);
var dbmon = mongoose.connection;
var Schema = mongoose.Schema;

var wm_game_dbcollection = dbmon.collection("wm_games");
var wm_bet_dbcollection = dbmon.collection("wm_bets");
var group_dbcollection = dbmon.collection("wm_groups");
var group_dbcollection = dbmon.collection("groups");

var gameSchema = Schema({
  _id: Schema.Types.ObjectId,
  teams: [{ type: Schema.Types.String, ref: "wm_team" }],
  number: Number,
  type: String,
  firstGoals: String,
  secondGoals: String,
  date: String,
  place: String,
  actual: Boolean,
  action: String,
});

var betSchema = Schema({
  user_id: { type: Schema.Types.ObjectId, ref: "User" },
  group: { type: Schema.Types.ObjectId, ref: "group" },
  game: { type: Schema.Types.ObjectId, ref: "wm_game" },
  firstGoals: Number,
  secondGoals: Number,
});

var wm_groupSchema = Schema({
  _id: Schema.Types.ObjectId,
  name: String,
  teams: [{ type: Schema.Types.String, ref: "wm_team" }],
  games: [{ type: Schema.Types.String, ref: "wm_game" }],
});

var teamSchema = Schema({
  _id: Schema.Types.ObjectId,
  land: String,
  number: Number,
  fifaCode: String,
  flag: String,
  goals: Number,
  antigoals: Number,
  points: Number,
  group: { type: Schema.Types.String, ref: "wm_group" },
  games: [{ type: Schema.Types.String, ref: "wm_game" }],
});

var betModel = mongoose.model("wm_bet", betSchema, "wm_bets");
var gameModel = mongoose.model("wm_game", gameSchema, "wm_games");
var teamModel = mongoose.model("wm_team", teamSchema, "wm_teams");
var wm_groupModel = mongoose.model("wm_group", wm_groupSchema, "wm_groups");
var groupModel = require("../groups/schema.js");

var _db = MongoUtil.getDb();
var dbo = _db.db("Mello");
var dbwm = _db.db("Mello");

//=============================================================================================\\
//==========================END mongoose=======================================================\\
//=============================================================================================\\
//==========================START init=========================================================\\
//=============================================================================================\\

var cronValid = true;

function init() {
  async.waterfall(
    [
      function (callback) {
        var wm_data = require("../wm_bets/data.json");
        callback(null, wm_data);
      },
    ],
    function (err, wm_data) {
      var newMatches = [];
      var newGroups = [];
      var newTeams = [];

      var temp_groupIDs = [];
      var temp_teamIDs = [];
      var temp_matchIDs = [];
      var temp_groups = ["a", "b", "c", "d", "e", "f", "g", "h"];
      temp_groups.forEach(function (group) {
        newGroup = new wm_groupModel({
          _id: new mongoose.Types.ObjectId(),
          name: wm_data.groups[group].name,
        });
        temp_groupIDs.push(newGroup._id);
        newGroups.push(newGroup);
        wm_data.groups[group].matches.forEach(function (match) {
          if (0 < match.name <= 16) {
            var type = "Round 1";
          } else if (16 < match.name <= 32) {
            var type = "Round 2";
          } else if (32 < match.name <= 48) {
            var type = "Round 3";
          }
          newMatch = new gameModel({
            _id: new mongoose.Types.ObjectId(),
            teams: [match.home_team, match.away_team],
            number: match.name,
            type: newGroup.name,
            firstGoals: "-",
            secondGoals: "-",
            date: match.date,
            place:
              wm_data.stadiums[match.stadium - 1].name +
              " (" +
              wm_data.stadiums[match.stadium - 1].city +
              ")",
            actual: true,
            action: "unplayed",
          });
          newMatches.push(newMatch);
        });
      });

      var temp_counter = 0;
      var temp_group = 0;
      wm_data.teams.forEach(function (team) {
        temp_counter++;
        if (temp_counter == 4) {
          temp_group++;
          temp_counter = 1;
        }
        newTeam = new teamModel({
          _id: new mongoose.Types.ObjectId(),
          land: team.name,
          number: team.id,
          fidaCode: team.fifaCode,
          flag: team.flag,
          goals: 0,
          antigoals: 0,
          points: 0,
          group: temp_groupIDs[temp_group],
        });
        temp_teamIDs.push(newTeam._id);
        newTeams.push(newTeam);
      });

      var temp_matchtypes = [
        "round_16",
        "round_8",
        "round_4",
        "round_2_loser",
        "round_2",
      ];
      temp_matchtypes.forEach(function (matchtype) {
        wm_data.knockout[matchtype].matches.forEach(function (match) {
          var teams = [];
          teams.push(temp_teamIDs[match.home_team - 1]);
          teams.push(temp_teamIDs[match.away_team - 1]);
          newMatch = new gameModel({
            _id: new mongoose.Types.ObjectId(),
            teams: teams,
            number: match.name,
            type: wm_data.knockout[matchtype].name,
            firstGoals: "-",
            secondGoals: "-",
            date: match.date,
            place:
              wm_data.stadiums[match.stadium - 1].name +
              " (" +
              wm_data.stadiums[match.stadium - 1].city +
              ")",
            actual: false,
            action: "uncalced",
          });
          newMatches.push(newMatch);
        });
      });

      var temp_counter = 0;
      var temp_group = 0;
      var temp_teams = [];
      var temp_games = [];
      newTeams.forEach(function (team) {
        temp_teams.push(team._id);
        temp_counter++;
        if (temp_counter == 4) {
          temp_counter = 0;
          newGroups[temp_group].teams = temp_teams;
          temp_teams = [];
          temp_group++;
        }

        newMatches.forEach(function (game) {
          if (game.teams[0] == team.number) {
            team.games.push(game._id);
            game.teams[0] = team._id;
          }
          if (game.teams[1] == team.number) {
            team.games.push(game._id);
            game.teams[1] = team._id;
          }
        });
      });
      newGroups.forEach(function (group) {
        newMatches.forEach(function (game) {
          if (game.type == group.name) {
            group.games.push(game._id);
          }
        });
      });

      cron.schedule("* * * * *", function () {
        var valid = false;
        var temp = [];
        newMatches.forEach(function (game) {
          if (
            -70000 <= new Date().getTime() - new Date(game.date).getTime() &&
            new Date().getTime() - new Date(game.date).getTime() <= 70000
          ) {
            valid = true;
            temp.push(game._id);
          }
        });
        if (valid == true) {
          temp.forEach(function (id) {
            var obj = { actual: false, action: "ingame" };
            var newvalues = { $set: obj };
            dbo
              .collection("wm_games")
              .updateOne({ _id: id }, newvalues, function (err, res) {
                if (err) throw err;
              });
            console.log("updated game to 'ingame'");
          });
        }
      });
      cronValid = false;

      var colls = ["wm_games", "wm_groups", "wm_teams", "wm_bets"];

      colls.forEach(function (coll) {
        dbwm.listCollections({ name: coll }).next(function (err, collinfo) {
          if (collinfo) {
            dbwm.dropCollection(coll, function (err, result) {
              if (err) throw err;
            });
          }
        });
      });

      newGroups.forEach(function (obj) {
        obj.save();
      });
      newMatches.forEach(function (obj) {
        obj.save();
      });
      newTeams.forEach(function (obj) {
        obj.save();
      });
    }
  );
}
//init();
if (cronValid == true) {
  async.waterfall(
    [
      function (callback) {
        gameModel.find({}).exec(function (err, newMatches) {
          callback(null, newMatches);
        });
      },
    ],
    function (err, newMatches) {
      cron.schedule("* * * * *", function () {
        var valid = false;
        var temp = [];
        newMatches.forEach(function (game) {
          if (
            -70000 <= new Date().getTime() - new Date(game.date).getTime() &&
            new Date().getTime() - new Date(game.date).getTime() <= 70000
          ) {
            valid = true;
            temp.push(game._id);
          }
        });
        if (valid == true) {
          temp.forEach(function (id) {
            var obj = { actual: false, action: "ingame" };
            var newvalues = { $set: obj };
            dbo
              .collection("wm_games")
              .updateOne({ _id: id }, newvalues, function (err, res) {
                if (err) throw err;
              });
            console.log("updated game to 'ingame'");
          });
        }
      });
    }
  );
}
//=============================================================================================\\
//==========================END init===========================================================\\
//=============================================================================================\\
//========================START ensures========================================================\\
//=============================================================================================\\
function ensureGroups(req, res, next) {
  User.getUserById(req.session.passport.user, function (err, user) {
    if (user.uservars.groups.groups) {
      user.uservars.groups.groups.forEach(function (groupname) {
        groupModel.find({ name: groupname }).exec(function (err, group) {
          if (group[0].moduleVars) {
            if (!group[0].moduleVars.football_points) {
              var obj = {};
              obj.moduleVars = group[0].moduleVars;
              obj.moduleVars.football_points = { equal: 5, diff: 3, win: 2 };
              var newvalues = { $set: obj };
              dbo
                .collection("groups")
                .updateOne(
                  { _id: group[0]._id },
                  newvalues,
                  function (err, res) {
                    if (err) throw err;
                  }
                );
            }
          }
        });
      });
    }
    if (user.modules.groups == true) {
      return next();
    } else {
      return res.render("./../modules/modules/wm_bets/err", {
        paths: pathsimport,
        user: req.isAuthenticated(),
        theme: user.design_theme,
        err:
          "Please subscribe to the 'groups' module before you use football bets 2018.",
      });
    }
  });
}

function ensureAdmin(req, res, next) {
  User.getUserById(req.session.passport.user, function (err, user) {
    if (user.admin == true || user.admin == "true") {
      return next();
    } else {
      return res.render("./../modules/modules/wm_bets/err", {
        paths: pathsimport,
        user: req.isAuthenticated(),
        theme: user.design_theme,
        err: "Your are not authorized to visit this site!",
      });
    }
  });
}

//=============================================================================================\\
//==========================END ensures========================================================\\
//=============================================================================================\\
//========================START socket=========================================================\\
//=============================================================================================\\

client.on("connection", function (socket) {
  socket.on("requestData", function (data) {
    async.waterfall(
      [
        function (callback) {
          User.getUserByUsername(data.name, function (err, user) {
            var dG = user.uservars.football_bets.dashedGroup;
            var dS = user.uservars.football_bets.dashedSelect;
            if (
              dG == undefined ||
              dS == undefined ||
              dG == null ||
              dS == null
            ) {
              var myquery = { username: user.username };
              var obj = {};
              obj.uservars = user.uservars;
              obj.uservars.football_bets.dashedGroup = "global";
              obj.uservars.football_bets.dashedSelect = "all";
              var newvalues = { $set: obj };
              dbo
                .collection("users")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            callback(null, user);
          });
        },
        function (user, callback) {
          var dS = user.uservars.football_bets.dashedSelect;
          var query = {};
          if (dS == "all") {
            query = {};
          } else if (dS == "actual") {
            query = { actual: true };
          } else if (dS == "not actual") {
            query = { actual: false };
          }
          gameModel
            .find(query)
            .populate({ path: "teams" })
            .sort("number")
            .exec(function (err, games) {
              callback(null, user, games);
            });
        },
        function (user, games, callback) {
          var obj = {};
          var _obj = {};
          var groupname = user.uservars.football_bets.dashedGroup;
          groupModel.findOne({ name: groupname }, function (err, group) {
            betModel
              .find({ user_id: user._id })
              .populate({ path: "game" })
              .populate({ path: "group" })
              .exec(function (err, bets) {
                bets.forEach(function (bet) {
                  if (bet.group._id.equals(group._id)) {
                    obj[bet.game._id] = bet.firstGoals;
                    _obj[bet.game._id] = bet.secondGoals;
                  }
                });
                games.forEach(function (game) {
                  if (obj[game._id] == undefined || obj[game._id] == null) {
                    obj[game._id] = "-";
                  }
                  if (_obj[game._id] == undefined || obj[game._id] == null) {
                    _obj[game._id] = "-";
                  }
                });
                callback(null, [user, games, obj, _obj]);
              });
          });
        },
      ],
      function (err, results) {
        socket.emit(data.sckt, {
          user: results[0],
          games: results[1],
          tipsFirst: results[2],
          tipsSecond: results[3],
        });
      }
    );
  });

  socket.on("requestChangeGroup", function (data) {
    User.getUserByUsername(data.name, function (err, user) {
      var myquery = { username: user.username };
      var obj = {};
      obj.uservars = user.uservars;
      obj.uservars.football_bets.dashedGroup = data.newGroup;
      var newvalues = { $set: obj };
      dbo
        .collection("users")
        .updateOne(myquery, newvalues, function (err, res) {
          if (err) throw err;
        });
      socket.emit("receiveChange", {
        name: data.name,
      });
    });
  });
  socket.on("requestChangeGames", function (data) {
    User.getUserByUsername(data.name, function (err, user) {
      var myquery = { username: user.username };
      var obj = {};
      obj.uservars = user.uservars;
      obj.uservars.football_bets.dashedSelect = data.newFilter;
      var newvalues = { $set: obj };
      dbo
        .collection("users")
        .updateOne(myquery, newvalues, function (err, res) {
          if (err) throw err;
        });
      socket.emit("receiveChange", {
        name: data.name,
      });
    });
  });
});

//=============================================================================================\\
//==========================END socket=========================================================\\
//=============================================================================================\\
//========================START gets===========================================================\\
//=============================================================================================\\

router.get("/dash", ensureAuthenticated, ensureGroups, function (req, res) {
  User.getUserById(req.session.passport.user, function (err, user) {
    if (!user.uservars.groups.groups) {
      return res.redirect(pathsimport.Modules.Modules + "/groups/yourgroups");
    }
  });
  async.waterfall(
    [
      function (callback) {
        User.getUserById(req.session.passport.user, function (err, user) {
          groupModel.find(
            { name: { $in: user.uservars.groups.groups } },
            function (err, groups) {
              callback(null, user, groups);
            }
          );
        });
      },
      function (user, groups, callback) {
        gameModel
          .find({ actual: true })
          .sort({ number: 1 })
          .populate({ path: "teams" })
          .exec(function (err, actualgames) {
            callback(null, user, groups, actualgames);
          });
      },
      function (user, groups, actualgames, callback) {
        gameModel
          .find({ actual: false, action: "played" })
          .sort({ number: -1 })
          .populate({ path: "teams" })
          .exec(function (err, oldgames) {
            callback(null, [user, groups, actualgames, oldgames]);
          });
      },
    ],
    function (err, results) {
      res.render("./../modules/modules/wm_bets/dash", {
        paths: pathsimport,
        user: req.isAuthenticated(),
        theme: results[0].design_theme,
        groups: results[1],
        actualgames: results[2],
        oldgames: results[3],
      });
    }
  );
});

router.get("/tips", ensureAuthenticated, ensureGroups, function (req, res) {
  async.waterfall(
    [
      function (callback) {
        User.getUserById(req.session.passport.user, function (err, user) {
          groupModel.find(
            { name: { $in: user.uservars.groups.groups } },
            function (err, groups) {
              callback(null, user, groups);
            }
          );
        });
      },
      function (user, groups, callback) {
        gameModel
          .find({})
          .sort("number")
          .populate({ path: "teams" })
          .exec(function (err, games) {
            callback(null, user, groups, games);
          });
      },
      function (user, groups, games, callback) {
        var obj = {};
        var _obj = {};
        betModel
          .find({ user_id: req.session.passport.user })
          .populate({ path: "group" })
          .populate({ path: "game" })
          .exec(function (err, bets) {
            groups.forEach(function (group) {
              bets.forEach(function (bet) {
                if (bet.group._id.equals(group._id)) {
                  obj[bet.game._id + group.name] = bet.firstGoals;
                  _obj[bet.game._id + group.name] = bet.secondGoals;
                }
              });
              games.forEach(function (game) {
                if (
                  obj[game._id + group.name] == undefined ||
                  obj[game._id + group.name] == null
                ) {
                  obj[game._id + group.name] = "-";
                }
                if (
                  _obj[game._id + group.name] == undefined ||
                  obj[game._id + group.name] == null
                ) {
                  _obj[game._id + group.name] = "-";
                }
              });
            });
            callback(null, [user, groups, games, obj, _obj]);
          });
      },
    ],
    function (err, results) {
      res.render("./../modules/modules/wm_bets/tips", {
        paths: pathsimport,
        user: req.isAuthenticated(),
        theme: results[0].design_theme,
        groups: results[1],
        allgames: results[2],
        firstTips: results[3],
        secondTips: results[4],
      });
    }
  );
});

router.get(
  "/tips/:username",
  ensureAuthenticated,
  ensureGroups,
  function (req, res) {
    var username = req.params.username;
    async.waterfall(
      [
        function (callback) {
          User.getUserByUsername(username, function (err, user) {
            groupModel.find(
              { name: { $in: user.uservars.groups.groups } },
              function (err, groups) {
                callback(null, user, groups);
              }
            );
          });
        },
        function (user, groups, callback) {
          gameModel
            .find({})
            .sort("number")
            .populate({ path: "teams" })
            .exec(function (err, games) {
              callback(null, user, groups, games);
            });
        },
        function (user, groups, games, callback) {
          var obj = {};
          var _obj = {};
          betModel
            .find({ user_id: user._id })
            .populate({ path: "group" })
            .populate({ path: "game" })
            .exec(function (err, bets) {
              groups.forEach(function (group) {
                bets.forEach(function (bet) {
                  if (bet.group._id.equals(group._id)) {
                    obj[bet.game._id + group.name] = bet.firstGoals;
                    _obj[bet.game._id + group.name] = bet.secondGoals;
                  }
                });
                games.forEach(function (game) {
                  if (
                    obj[game._id + group.name] == undefined ||
                    obj[game._id + group.name] == null
                  ) {
                    obj[game._id + group.name] = "-";
                  }
                  if (
                    _obj[game._id + group.name] == undefined ||
                    obj[game._id + group.name] == null
                  ) {
                    _obj[game._id + group.name] = "-";
                  }
                });
              });
              callback(null, user, groups, games, obj, _obj);
            });
        },
        function (user, groups, games, obj, _obj, callback) {
          User.getUserById(req.session.passport.user, function (err, selfuser) {
            callback(null, [user, groups, games, obj, _obj, selfuser]);
          });
        },
      ],
      function (err, results) {
        res.render("./../modules/modules/wm_bets/usertips", {
          paths: pathsimport,
          user: req.isAuthenticated(),
          otheruser: results[0],
          theme: results[5].design_theme,
          groups: results[1],
          allgames: results[2],
          firstTips: results[3],
          secondTips: results[4],
        });
      }
    );
  }
);

router.get(
  "/edit-tips",
  ensureAuthenticated,
  ensureGroups,
  function (req, res) {
    async.waterfall(
      [
        function (callback) {
          User.getUserById(req.session.passport.user, function (err, user) {
            callback(null, user);
          });
        },
        function (user, callback) {
          wm_groupModel
            .find({})
            .sort("name")
            .populate({ path: "teams" })
            .exec(function (err, wm_groups) {
              wm_groups.forEach(function (wm_group) {
                function compare(a, b) {
                  if (a.points > b.points) return -1;
                  if (a.points < b.points) return 1;
                  if (a.points == b.points) {
                    if (a.goals - a.antigoals > b.goals - b.antigoals)
                      return -1;
                    if (a.goals - a.antigoals < b.goals - b.antigoals) return 1;
                    if (a.goals - a.antigoals == b.goals - b.antigoals) {
                      if (a.goals > b.goals) return -1;
                      if (a.goals < b.goals) return 1;
                      if (a.goals == b.goals) {
                        if (a.land > b.land) return 1;
                        if (a.land < b.land) return -1;
                      }
                    }
                  }
                  return 0;
                }

                wm_group.teams.sort(compare);
              });
              callback(null, user, wm_groups);
            });
        },
        function (user, wm_groups, callback) {
          async.parallel(
            [
              function (callback) {
                gameModel
                  .find({ type: "Round of 16" })
                  .populate({ path: "teams" })
                  .exec(function (err, games) {
                    callback(null, { games: games, name: "Round of 16" });
                  });
              },
              function (callback) {
                gameModel
                  .find({ type: "Quarter-finals" })
                  .populate({ path: "teams" })
                  .exec(function (err, games) {
                    callback(null, { games: games, name: "Quarter-finals" });
                  });
              },
              function (callback) {
                gameModel
                  .find({ type: "Semi-finals" })
                  .populate({ path: "teams" })
                  .exec(function (err, games) {
                    callback(null, { games: games, name: "Semi-finals" });
                  });
              },
              function (callback) {
                gameModel
                  .find({ type: "Third place play-off" })
                  .populate({ path: "teams" })
                  .exec(function (err, games) {
                    callback(null, {
                      games: games,
                      name: "Third place play-off",
                    });
                  });
              },
              function (callback) {
                gameModel
                  .find({ type: "Final" })
                  .populate({ path: "teams" })
                  .exec(function (err, games) {
                    callback(null, { games: games, name: "Final" });
                  });
              },
            ],
            function (err, results) {
              results.forEach(function (result) {
                var teams = [];
                result.games.forEach(function (game) {
                  game.teams.forEach(function (team) {
                    teams.push(team);
                  });
                });
                wm_groups.push({ name: result.name, teams: teams });
              });
              callback(null, [user, wm_groups]);
            }
          );
        },
      ],
      function (err, results) {
        res.render("./../modules/modules/wm_bets/edittipsgroups", {
          paths: pathsimport,
          user: req.isAuthenticated(),
          theme: results[0].design_theme,
          wm_groups: results[1],
        });
      }
    );
  }
);

router.get(
  "/edit-tips-table",
  ensureAuthenticated,
  ensureGroups,
  function (req, res) {
    async.waterfall(
      [
        function (callback) {
          User.getUserById(req.session.passport.user, function (err, user) {
            var groups = ["all"];
            user.uservars.groups.groups.forEach(function (group) {
              groups.push(group);
            });
            callback(null, user, groups);
          });
        },
        function (user, groups, callback) {
          gameModel
            .find({ actual: true })
            .sort("number")
            .populate({ path: "teams" })
            .exec(function (err, actualgames) {
              callback(null, user, groups, actualgames);
            });
        },
        function (user, groups, actualgames, callback) {
          var obj = {};
          var _obj = {};
          betModel
            .find({ user_id: req.session.passport.user })
            .populate({ path: "game" })
            .populate({ path: "group" })
            .exec(function (err, bets) {
              callback(null, [user, groups, actualgames, bets]);
            });
        },
      ],
      function (err, results) {
        res.render("./../modules/modules/wm_bets/edittipstable", {
          paths: pathsimport,
          user: req.isAuthenticated(),
          theme: results[0].design_theme,
          groups: results[1],
          actualgames: results[2],
          bets: results[3],
        });
      }
    );
  }
);

router.get(
  "/edit-tips/:groupname",
  ensureAuthenticated,
  ensureGroups,
  function (req, res) {
    var groupname = req.params.groupname;
    async.waterfall(
      [
        function (callback) {
          User.getUserById(req.session.passport.user, function (err, user) {
            var groups = ["all"];
            user.uservars.groups.groups.forEach(function (group) {
              groups.push(group);
            });
            callback(null, user, groups);
          });
        },
        function (user, groups, callback) {
          gameModel
            .find({ type: groupname })
            .sort("number")
            .populate({ path: "teams" })
            .exec(function (err, actualgames) {
              callback(null, user, groups, actualgames);
            });
        },
        function (user, groups, actualgames, callback) {
          var obj = {};
          var _obj = {};
          betModel
            .find({ user_id: req.session.passport.user })
            .populate({ path: "game" })
            .populate({ path: "group" })
            .exec(function (err, bets) {
              callback(null, [user, groups, actualgames, bets]);
            });
        },
      ],
      function (err, results) {
        res.render("./../modules/modules/wm_bets/edittips", {
          paths: pathsimport,
          user: req.isAuthenticated(),
          theme: results[0].design_theme,
          groups: results[1],
          groupgames: results[2],
          bets: results[3],
        });
      }
    );
  }
);

router.get("/games", ensureAuthenticated, ensureGroups, function (req, res) {
  async.waterfall(
    [
      function (callback) {
        User.getUserById(req.session.passport.user, function (err, user) {
          callback(null, user);
        });
      },
      function (user, callback) {
        gameModel
          .find({})
          .sort("number")
          .populate({ path: "teams", populate: { path: "group" } })
          .exec(function (err, games) {
            callback(null, [user, games]);
          });
      },
    ],
    function (err, results) {
      res.render("./../modules/modules/wm_bets/games", {
        paths: pathsimport,
        user: req.isAuthenticated(),
        theme: results[0].design_theme,
        games: results[1],
      });
    }
  );
});

router.get(
  "/wm_groups",
  ensureAuthenticated,
  ensureGroups,
  function (req, res) {
    async.waterfall(
      [
        function (callback) {
          User.getUserById(req.session.passport.user, function (err, user) {
            callback(null, user);
          });
        },
        function (user, callback) {
          wm_groupModel
            .find({})
            .sort("name")
            .populate({ path: "teams" })
            .exec(function (err, wm_groups) {
              wm_groups.forEach(function (wm_group) {
                function compare(a, b) {
                  if (a.points > b.points) return -1;
                  if (a.points < b.points) return 1;
                  if (a.points == b.points) {
                    if (a.goals - a.antigoals > b.goals - b.antigoals)
                      return -1;
                    if (a.goals - a.antigoals < b.goals - b.antigoals) return 1;
                    if (a.goals - a.antigoals == b.goals - b.antigoals) {
                      if (a.goals > b.goals) return -1;
                      if (a.goals < b.goals) return 1;
                      if (a.goals == b.goals) {
                        if (a.land > b.land) return 1;
                        if (a.land < b.land) return -1;
                      }
                    }
                  }
                  return 0;
                }

                wm_group.teams.sort(compare);
              });

              callback(null, [user, wm_groups]);
            });
        },
      ],
      function (err, results) {
        res.render("./../modules/modules/wm_bets/groups", {
          paths: pathsimport,
          user: req.isAuthenticated(),
          theme: results[0].design_theme,
          wm_groups: results[1],
        });
      }
    );
  }
);

router.get(
  "/devConsole",
  ensureAuthenticated,
  ensureGroups,
  ensureAdmin,
  function (req, res) {
    async.parallel(
      [
        function (callback) {
          User.getUserById(req.session.passport.user, function (err, user) {
            callback(null, user);
          });
        },
        function (callback) {
          gameModel
            .find({})
            .sort("number")
            .populate({ path: "teams" })
            .exec(function (err, actualgames) {
              callback(null, actualgames);
            });
        },
      ],
      function (err, results) {
        res.render("./../modules/modules/wm_bets/dev", {
          paths: pathsimport,
          user: req.isAuthenticated(),
          theme: results[0].design_theme,
          actualgames: results[1],
        });
      }
    );
  }
);

router.get(
  "/groups/:groupname",
  ensureAuthenticated,
  ensureGroups,
  (req, res) => {
    var groupname = req.params.groupname;
    async.parallel(
      [
        function (callback) {
          User.getUserById(req.session.passport.user, function (err, user) {
            callback(null, user);
          });
        },
        function (callback) {
          User.find({ "uservars.groups.groups": groupname })
            .sort([["uservars.football_bets.points." + groupname, -1]])
            .exec(function (err, users) {
              callback(null, users);
            });
        },
        function (callback) {
          groupModel.findOne({ name: groupname }).exec(function (err, group) {
            callback(null, group);
          });
        },
      ],
      function (err, results) {
        var loggedUser = results[0];
        var users_sort = results[1];

        var names = [];
        var points = {};
        users_sort.forEach(function (user) {
          names.push(user.username);
          if (user.uservars.football_bets.points != undefined) {
            points[user.username] =
              user.uservars.football_bets.points[groupname];
          } else {
            points[user.username] = 0;
          }
        });
        var isAdmin = false;
        if (loggedUser.username == Object.keys(results[2].members)[0]) {
          isAdmin = true;
        }

        res.render("./../modules/modules/wm_bets/profile.ejs", {
          paths: pathsimport,
          user: req.isAuthenticated(),
          theme: loggedUser.design_theme,
          thisuser: loggedUser,
          groupname: groupname,
          group: results[2],
          names: names,
          points: points,
          admin: isAdmin,
        });
      }
    );
  }
);

//=============================================================================================\\
//==========================END gets===========================================================\\
//=============================================================================================\\
//========================START posts==========================================================\\
//=============================================================================================\\

router.post(
  "/editGame",
  ensureAuthenticated,
  ensureGroups,
  ensureAdmin,
  function (req, res) {
    async.waterfall(
      [
        function (callback) {
          gameModel.find({}).exec(function (err, games) {
            callback(null, games);
          });
        },
      ],
      function (err, games) {
        games.forEach(function (game) {
          if (
            req.body[game._id + "_firstGoals"] != "" &&
            req.body[game._id + "_secondGoals"] != ""
          ) {
            var myquery = { _id: game._id };
            var obj = {};
            obj.firstGoals = req.body[game._id + "_firstGoals"];
            obj.secondGoals = req.body[game._id + "_secondGoals"];
            obj.actual = false;
            obj.action = "played";
            var newvalues = { $set: obj };
            dbwm
              .collection("wm_games")
              .updateOne(myquery, newvalues, function (err, res) {
                if (err) throw err;
              });
          }
        });
      }
    );
    function test() {
      function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
      }
      gameModel.find({ actual: true }).exec(function (err, games) {
        games.forEach(function (game) {
          var myquery = { _id: game._id };
          var obj = {};
          obj.firstGoals = getRandomInt(0, 5);
          obj.secondGoals = getRandomInt(0, 5);
          obj.actual = false;
          obj.action = "played";
          var newvalues = { $set: obj };
          dbwm
            .collection("wm_games")
            .updateOne(myquery, newvalues, function (err, res) {
              if (err) throw err;
            });
        });
      });
    }
    //test()

    res.redirect(
      pathsimport.Modules.Modules + "/football-wm-betting-game/devConsole"
    );
  }
);

router.post(
  "/editGroup",
  ensureAuthenticated,
  ensureGroups,
  function (req, res) {
    var groupname = req.body.Groupname;
    if (
      req.body.equal != null &&
      req.body.diff != null &&
      req.body.win != null
    ) {
      groupModel.find({ name: groupname }).exec(function (err, group) {
        if (group[0]) {
          var myquery = { _id: group[0]._id };
          var obj = {};
          obj.moduleVars = group[0].moduleVars;
          obj.moduleVars.football_points = {};
          obj.moduleVars.football_points.equal = parseInt(req.body.equal);
          obj.moduleVars.football_points.diff = parseInt(req.body.diff);
          obj.moduleVars.football_points.win = parseInt(req.body.win);
          var newvalues = { $set: obj };
          dbo
            .collection("groups")
            .updateOne(myquery, newvalues, function (err, res) {
              if (err) throw err;
            });
        }
      });
    }
    res.redirect(
      pathsimport.Modules.Modules + "/football-wm-betting-game/dash"
    );
  }
);

router.post(
  "/calcStandings",
  ensureAuthenticated,
  ensureGroups,
  ensureAdmin,
  function (req, res) {
    async.waterfall(
      [
        function (callback) {
          var bets = [];
          betModel
            .find({})
            .populate({ path: "game" })
            .populate({ path: "group" })
            .exec(function (err, allbets) {
              allbets.forEach(function (allbet) {
                if (
                  allbet.game.actual == false &&
                  allbet.game.firstGoals != "-"
                ) {
                  bets.push(allbet);
                }
              });
              callback(null, bets);
            });
        },
        function (bets, callback) {
          gameModel
            .find({ actual: false, action: "played" })
            .populate({ path: "teams", populate: { path: "group" } })
            .exec(function (err, games) {
              callback(null, bets, games);
            });
        },
        function (bets, games, callback) {
          gameModel
            .find({ actual: false, action: "uncalced" })
            .exec(function (err, nextgames) {
              callback(null, bets, games, nextgames);
            });
        },
        function (bets, games, nextgames, callback) {
          teamModel.find({}).exec(function (err, teams) {
            callback(null, bets, games, nextgames, teams);
          });
        },
        function (bets, games, nextgames, teams, callback) {
          groupModel.find({}).exec(function (err, groups) {
            callback(null, bets, games, nextgames, teams, groups);
          });
        },
        function (bets, games, nextgames, teams, groups, callback) {
          User.find({ "modules.football_bets": true }, function (err, users) {
            callback(null, [bets, users, games, nextgames, teams, groups]);
          });
        },
      ],
      function (err, results) {
        var bets = results[0];
        var users = results[1];
        var playedgames = results[2];
        var nextgames = results[3];
        var teams = results[4];
        var groups = results[5];

        var temp_points = {};
        users.forEach(function (user) {
          if (user.uservars.groups.groups) {
            user.uservars.groups.groups.forEach(function (group) {
              temp_points[user._id + group] = 0;
            });
          }
        });

        bets.forEach(function (bet) {
          var game_firstIsWinner = false;
          var game_secondIsWinner = false;
          var game_IsDraw = false;
          if (parseInt(bet.game.firstGoals) > parseInt(bet.game.secondGoals)) {
            game_firstIsWinner = true;
          } else if (
            parseInt(bet.game.firstGoals) < parseInt(bet.game.secondGoals)
          ) {
            game_secondIsWinner = true;
          } else if (
            parseInt(bet.game.firstGoals) == parseInt(bet.game.secondGoals)
          ) {
            game_IsDraw = true;
          }

          var tip_firstIsWinner = false;
          var tip_secondIsWinner = false;
          var tip_IsDraw = false;
          var isEqual = false;
          var isDifference = false;
          if (parseInt(bet.firstGoals) > parseInt(bet.secondGoals)) {
            tip_firstIsWinner = true;
          } else if (parseInt(bet.firstGoals) < parseInt(bet.secondGoals)) {
            tip_secondIsWinner = true;
          } else if (parseInt(bet.firstGoals) == parseInt(bet.secondGoals)) {
            tip_IsDraw = true;
          }
          if (
            parseInt(bet.firstGoals) == parseInt(bet.game.firstGoals) &&
            parseInt(bet.secondGoals) == parseInt(bet.game.secondGoals)
          ) {
            isEqual = true;
          }
          if (
            parseInt(bet.firstGoals) - parseInt(bet.secondGoals) ==
            parseInt(bet.game.firstGoals) - parseInt(bet.game.secondGoals)
          ) {
            isDifference = true;
          }

          if (isEqual) {
            if (bet.group.moduleVars.football_points) {
              temp_points[bet.user_id + bet.group.name] += parseInt(
                bet.group.moduleVars.football_points.equal
              );
            } else {
              temp_points[bet.user_id + bet.group.name] += 5;
            }
          } else if (isDifference) {
            if (bet.group.moduleVars.football_points) {
              temp_points[bet.user_id + bet.group.name] += parseInt(
                bet.group.moduleVars.football_points.diff
              );
            } else {
              temp_points[bet.user_id + bet.group.name] += 3;
            }
          } else if (
            (game_firstIsWinner && tip_firstIsWinner) ||
            (game_secondIsWinner && tip_secondIsWinner) ||
            (game_IsDraw && tip_IsDraw)
          ) {
            if (bet.group.moduleVars.football_points) {
              temp_points[bet.user_id + bet.group.name] += parseInt(
                bet.group.moduleVars.football_points.win
              );
            } else {
              temp_points[bet.user_id + bet.group.name] += 2;
            }
          }
        });
        users.forEach(function (user) {
          if (user.uservars.groups.groups) {
            var myquery = { username: user.username };
            var obj = {};
            obj.uservars = user.uservars;
            obj.uservars.football_bets.points = {};
            user.uservars.groups.groups.forEach(function (group) {
              obj.uservars.football_bets.points[group] =
                temp_points[user._id + group];
            });
            var newvalues = { $set: obj };
            dbo
              .collection("users")
              .updateOne(myquery, newvalues, function (err, res) {
                if (err) throw err;
              });
          }
        });

        temp = {};

        var types = [
          "Group A",
          "Group B",
          "Group C",
          "Group D",
          "Group E",
          "Group F",
          "Group G",
          "Group H",
        ];
        playedgames.forEach(function (playedgame) {
          var game_firstIsWinner = false;
          var game_secondIsWinner = false;
          var game_IsDraw = false;
          if (playedgame.firstGoals > playedgame.secondGoals) {
            game_firstIsWinner = true;
          } else if (playedgame.firstGoals < playedgame.secondGoals) {
            game_secondIsWinner = true;
          } else if (playedgame.firstGoals == playedgame.secondGoals) {
            game_IsDraw = true;
          }

          if (types.includes(playedgame.type)) {
            playedgame.teams.forEach(function (team) {
              if (temp[team._id] == undefined || temp[team._id] == null) {
                temp[team._id] = {};
                temp[team._id].points = 0;
                temp[team._id].goals = 0;
                temp[team._id].antigoals = 0;
              }
            });

            if (game_firstIsWinner) {
              temp[playedgame.teams[0]._id].points += 3;
            } else if (game_secondIsWinner) {
              temp[playedgame.teams[1]._id].points += 3;
            } else if (game_IsDraw) {
              temp[playedgame.teams[0]._id].points += 1;
              temp[playedgame.teams[1]._id].points += 1;
            }
            temp[playedgame.teams[0]._id].goals += parseInt(
              playedgame.firstGoals
            );
            temp[playedgame.teams[1]._id].goals += parseInt(
              playedgame.secondGoals
            );
            temp[playedgame.teams[1]._id].antigoals += parseInt(
              playedgame.firstGoals
            );
            temp[playedgame.teams[0]._id].antigoals += parseInt(
              playedgame.secondGoals
            );
          }
        });

        teams.forEach(function (team) {
          if (temp[team._id] != null || temp[team._id] != undefined) {
            var myquery = { _id: team._id };
            var obj = temp[team._id];
            var newvalues = { $set: obj };
            dbwm
              .collection("wm_teams")
              .updateOne(myquery, newvalues, function (err, res) {
                if (err) throw err;
              });
          }
        });
      }
    );
    res.redirect(
      pathsimport.Modules.Modules + "/football-wm-betting-game/devConsole"
    );
  }
);

router.post(
  "/calcKickoffs",
  ensureAuthenticated,
  ensureGroups,
  ensureAdmin,
  function (req, res) {
    async.waterfall(
      [
        function (callback) {
          var bets = [];
          betModel
            .find({})
            .populate({ path: "game" })
            .populate({ path: "group" })
            .exec(function (err, allbets) {
              allbets.forEach(function (allbet) {
                if (allbet.game.actual == false && allbet.firstGoals != "-") {
                  bets.push(allbet);
                }
              });
              callback(null, bets);
            });
        },
        function (bets, callback) {
          gameModel
            .find({ actual: false, action: "played" })
            .sort("number")
            .populate({ path: "teams", populate: { path: "group" } })
            .exec(function (err, games) {
              callback(null, bets, games);
            });
        },
        function (bets, games, callback) {
          gameModel
            .find({ actual: false, action: "uncalced" })
            .exec(function (err, nextgames) {
              callback(null, bets, games, nextgames);
            });
        },
        function (bets, games, nextgames, callback) {
          teamModel.find({}).exec(function (err, teams) {
            callback(null, bets, games, nextgames, teams);
          });
        },
        function (bets, games, nextgames, teams, callback) {
          wm_groupModel
            .find({})
            .sort("name")
            .populate({ path: "teams" })
            .exec(function (err, groups) {
              groups.forEach(function (group) {
                function compare(a, b) {
                  if (a.points > b.points) return -1;
                  if (a.points < b.points) return 1;
                  if (a.points == b.points) {
                    if (a.goals - a.antigoals > b.goals - b.antigoals)
                      return -1;
                    if (a.goals - a.antigoals < b.goals - b.antigoals) return 1;
                    if (a.goals - a.antigoals == b.goals - b.antigoals) {
                      if (a.goals > b.goals) {
                        return -1;
                      }
                      if (a.goals < b.goals) {
                        return 1;
                      }
                      if (a.goals == b.goals) {
                        if (a.land > b.land) return 1;
                        if (a.land < b.land) return -1;
                      }
                    }
                  }
                  return 0;
                }

                group.teams.sort(compare);
              });
              callback(null, bets, games, nextgames, teams, groups);
            });
        },
        function (bets, games, nextgames, teams, groups, callback) {
          User.find({ "modules.football_bets": true }, function (err, users) {
            callback(null, [bets, users, games, nextgames, teams, groups]);
          });
        },
      ],
      function (err, results) {
        var bets = results[0];
        var users = results[1];
        var playedgames = results[2];
        var nextgames = results[3];
        var teams = results[4];
        var groups = results[5];

        if (playedgames.length >= 48 && playedgames.length < 64) {
          nextgames.forEach(function (game) {
            if (game.number == 49) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [groups[0].teams[0]._id, groups[1].teams[1]._id];
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 50) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [groups[2].teams[0]._id, groups[3].teams[1]._id];
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 51) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [groups[1].teams[0]._id, groups[0].teams[1]._id];
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 52) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [groups[3].teams[0]._id, groups[2].teams[1]._id];
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 53) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [groups[4].teams[0]._id, groups[5].teams[1]._id];
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 54) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [groups[6].teams[0]._id, groups[7].teams[1]._id];
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 55) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [groups[5].teams[0]._id, groups[4].teams[1]._id];
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 56) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [groups[7].teams[0]._id, groups[6].teams[1]._id];
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
          });
        }
        if (playedgames.length >= 56 && playedgames.length < 64) {
          nextgames.forEach(function (game) {
            if (game.number == 57) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [];
              if (playedgames[48].firstGoals < playedgames[48].secondGoals) {
                obj.teams.push(playedgames[48].teams[1]._id);
              } else {
                obj.teams.push(playedgames[48].teams[0]._id);
              }
              if (playedgames[49].firstGoals < playedgames[49].secondGoals) {
                obj.teams.push(playedgames[49].teams[1]._id);
              } else {
                obj.teams.push(playedgames[49].teams[0]._id);
              }
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 58) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [];
              if (playedgames[50].firstGoals < playedgames[50].secondGoals) {
                obj.teams.push(playedgames[50].teams[1]._id);
              } else {
                obj.teams.push(playedgames[50].teams[0]._id);
              }
              if (playedgames[51].firstGoals < playedgames[51].secondGoals) {
                obj.teams.push(playedgames[51].teams[1]._id);
              } else {
                obj.teams.push(playedgames[51].teams[0]._id);
              }
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 59) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [];
              if (playedgames[52].firstGoals < playedgames[52].secondGoals) {
                obj.teams.push(playedgames[52].teams[1]._id);
              } else {
                obj.teams.push(playedgames[52].teams[0]._id);
              }
              if (playedgames[53].firstGoals < playedgames[53].secondGoals) {
                obj.teams.push(playedgames[53].teams[1]._id);
              } else {
                obj.teams.push(playedgames[53].teams[0]._id);
              }
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 60) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [];
              if (playedgames[54].firstGoals < playedgames[54].secondGoals) {
                obj.teams.push(playedgames[54].teams[1]._id);
              } else {
                obj.teams.push(playedgames[54].teams[0]._id);
              }
              if (playedgames[55].firstGoals < playedgames[55].secondGoals) {
                obj.teams.push(playedgames[55].teams[1]._id);
              } else {
                obj.teams.push(playedgames[55].teams[0]._id);
              }
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
          });
        }
        if (playedgames.length >= 60 && playedgames.length < 64) {
          nextgames.forEach(function (game) {
            if (game.number == 61) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [];
              if (playedgames[56].firstGoals < playedgames[56].secondGoals) {
                obj.teams.push(playedgames[56].teams[1]._id);
              } else {
                obj.teams.push(playedgames[56].teams[0]._id);
              }
              if (playedgames[57].firstGoals < playedgames[57].secondGoals) {
                obj.teams.push(playedgames[57].teams[1]._id);
              } else {
                obj.teams.push(playedgames[57].teams[0]._id);
              }
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 62) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [];
              if (playedgames[58].firstGoals < playedgames[58].secondGoals) {
                obj.teams.push(playedgames[58].teams[1]._id);
              } else {
                obj.teams.push(playedgames[58].teams[0]._id);
              }
              if (playedgames[59].firstGoals < playedgames[59].secondGoals) {
                obj.teams.push(playedgames[59].teams[1]._id);
              } else {
                obj.teams.push(playedgames[59].teams[0]._id);
              }
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
          });
        }
        if (playedgames.length >= 62 && playedgames.length < 64) {
          nextgames.forEach(function (game) {
            if (game.number == 63) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [];
              if (playedgames[60].firstGoals < playedgames[60].secondGoals) {
                obj.teams.push(playedgames[60].teams[0]._id);
              } else {
                obj.teams.push(playedgames[60].teams[1]._id);
              }
              if (playedgames[61].firstGoals < playedgames[61].secondGoals) {
                obj.teams.push(playedgames[61].teams[0]._id);
              } else {
                obj.teams.push(playedgames[61].teams[1]._id);
              }
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
            if (game.number == 64) {
              var myquery = { _id: game._id };
              var obj = {};
              obj.teams = [];
              if (playedgames[60].firstGoals < playedgames[60].secondGoals) {
                obj.teams.push(playedgames[60].teams[1]._id);
              } else {
                obj.teams.push(playedgames[60].teams[0]._id);
              }
              if (playedgames[61].firstGoals < playedgames[61].secondGoals) {
                obj.teams.push(playedgames[61].teams[1]._id);
              } else {
                obj.teams.push(playedgames[61].teams[0]._id);
              }
              obj.action = "unplayed";
              obj.actual = true;
              var newvalues = { $set: obj };
              dbwm
                .collection("wm_games")
                .updateOne(myquery, newvalues, function (err, res) {
                  if (err) throw err;
                });
            }
          });
        }
      }
    );

    res.redirect(
      pathsimport.Modules.Modules + "/football-wm-betting-game/devConsole"
    );
  }
);

router.post(
  "/edit-tips",
  ensureAuthenticated,
  ensureGroups,
  function (req, res) {
    if (req.body.group != "all") {
      async.waterfall(
        [
          function (callback) {
            gameModel.find({ actual: true }).exec(function (err, games) {
              callback(null, games);
            });
          },
          function (games, callback) {
            groupModel.findOne({ name: req.body.group }, function (err, group) {
              if (group != undefined && group != null) {
                betModel
                  .find({
                    group: group._id,
                    user_id: req.session.passport.user,
                  })
                  .populate("game")
                  .exec(function (err, bets) {
                    callback(null, [games, bets, group]);
                  });
              } else {
                callback(null, false);
              }
            });
          },
        ],
        function (err, results) {
          if (results != false) {
            var games = results[0];
            var bets = results[1];
            var group = results[2];
            games.forEach(function (game) {
              var valid = true;
              bets.forEach(function (bet) {
                if (bet.game._id.equals(game._id)) {
                  valid = false;
                }
              });
              if (
                req.body[game._id + "_firstTip"] != "" &&
                req.body[game._id + "_secondTip"] != "" &&
                req.body[game._id + "_firstTip"] >= 0 &&
                req.body[game._id + "_secondTip"] >= 0
              ) {
                if (valid == true) {
                  newTip = new betModel({
                    user_id: req.session.passport.user,
                    game: game._id,
                    group: group._id,
                    firstGoals: req.body[game._id + "_firstTip"],
                    secondGoals: req.body[game._id + "_secondTip"],
                  });
                  newTip.save();
                } else if (valid == false) {
                  betModel.findOne(
                    {
                      user_id: req.session.passport.user,
                      game: game._id,
                      group: group._id,
                    },
                    function (err, bet) {
                      var myquery = { _id: bet._id };
                      var obj = {};
                      obj.firstGoals = req.body[game._id + "_firstTip"];
                      obj.secondGoals = req.body[game._id + "_secondTip"];
                      var newvalues = { $set: obj };
                      dbo
                        .collection("wm_bets")
                        .updateOne(myquery, newvalues, function (err, res) {
                          if (err) throw err;
                        });
                    }
                  );
                }
              }
            });
          }
        }
      );
    } else if (req.body.group == "all") {
      async.waterfall(
        [
          function (callback) {
            gameModel.find({ actual: true }).exec(function (err, games) {
              callback(null, games);
            });
          },
          function (games, callback) {
            User.getUserById(req.session.passport.user, function (err, user) {
              groupModel.find(
                { name: { $in: user.uservars.groups.groups } },
                function (err, groups) {
                  betModel
                    .find({ user_id: req.session.passport.user })
                    .populate({ path: "game" })
                    .populate({ path: "group" })
                    .exec(function (err, bets) {
                      callback(null, [games, bets, groups]);
                    });
                }
              );
            });
          },
        ],
        function (err, results) {
          var games = results[0];
          var bets = results[1];
          var groups = results[2];
          groups.forEach(function (group) {
            games.forEach(function (game) {
              var valid = true;
              bets.forEach(function (bet) {
                if (
                  bet.game._id.equals(game._id) &&
                  bet.group._id.equals(group._id)
                ) {
                  valid = false;
                }
              });
              if (
                req.body[game._id + "_firstTip"] != "" &&
                req.body[game._id + "_secondTip"] != "" &&
                req.body[game._id + "_firstTip"] >= 0 &&
                req.body[game._id + "_secondTip"] >= 0
              ) {
                if (valid == true) {
                  newTip = new betModel({
                    user_id: req.session.passport.user,
                    game: game._id,
                    group: group._id,
                    firstGoals: req.body[game._id + "_firstTip"],
                    secondGoals: req.body[game._id + "_secondTip"],
                  });
                  newTip.save();
                } else if (valid == false) {
                  betModel.findOne(
                    {
                      user_id: req.session.passport.user,
                      game: game._id,
                      group: group._id,
                    },
                    function (err, bet) {
                      var myquery = { _id: bet._id };
                      var obj = {};
                      obj.firstGoals = req.body[game._id + "_firstTip"];
                      obj.secondGoals = req.body[game._id + "_secondTip"];
                      var newvalues = { $set: obj };
                      dbo
                        .collection("wm_bets")
                        .updateOne(myquery, newvalues, function (err, res) {
                          if (err) throw err;
                        });
                    }
                  );
                }
              }
            });
          });
        }
      );
    }
    res.redirect(
      pathsimport.Modules.Modules + "/football-wm-betting-game/tips"
    );
  }
);

//=============================================================================================\\
//==========================END posts==========================================================\\
//=============================================================================================\\

module.exports = {
  router: router,
  path_main: "/football-wm-betting-game",
  name: "Football Bets",
  db_name: "football_bets",
  info:
    "This is a football worldcup betting game for you and you friends. Make sure you have subscribed to Groups!",
  path_site: "/dash",
  path_view: "/view",
};
