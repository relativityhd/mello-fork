var pathsimport = require("../scripts/paths.js");

//=============================================================================
//==================START ensureAuthenticated==================================
//=============================================================================

function eA(req, res, next) {
  if (req.isAuthenticated()) {
    //console.log('User ID: ' + req.session.passport.user);
    return next();
  } else {
    //req.flash('error_msg','You are not logged in');
    res.redirect(pathsimport.login);
  }
}

function eNA(req, res, next) {
  if (!req.isAuthenticated()) {
    //console.log('User ID: ' + req.session.passport.user);
    return next();
  } else {
    //req.flash('error_msg','You are not logged in');
    res.redirect(pathsimport.dashboard);
  }
}

module.exports.ensureAuthenticated = eA;
module.exports.ensureNotAuthenticated = eNA;

const colors = require("colors");

colors.setTheme({
  warn: "yellow",
  error: "red",
  fix: "inverse",
  info: "grey",
});

module.exports.colors = colors;

//=============================================================================
//====================END ensureAuthenticated==================================
//=============================================================================
//==================START Sockets==============================================
//=============================================================================

var dL = require("socket.io").listen(9165);
var sL = require("socket.io").listen(9166);
var mL = require("socket.io").listen(9167);
var dC = dL.sockets;
var sC = sL.sockets;
var mC = mL.sockets;

module.exports.dashboardClient = dC;
module.exports.standartClient = sC;
module.exports.moduleClient = mC;
module.exports.dashboardListen = dL;
module.exports.standartListen = sL;
module.exports.moduleListen = mL;

//=============================================================================
//====================END Sockets==============================================
//=============================================================================
