let db_url = "";
let url = "";
if (process.env.NODE_ENV == "production") {
  db_url = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/Mello?retryWrites=true&w=majority`;
  url = "https://mello.eu-de.mybluemix.net";
} else {
  db_url = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_URL}/test?retryWrites=true&w=majority`;
  url = "localhost:3000";
}
module.exports = {
  adress: "localhost", //localhost (soll nicht verändert werden)
  url: url, //eoyp.info.tm --> informatik.info.tm:6776 //gitignore
  db_url: db_url,
  info: "/info",
  impressum: "/impressum",
  agb: "/AGB",
  updateLog: "/updates",
  feedback: "/feedback",
  main: "/",
  dashboard: "/dashboard",
  profilesite: "/profile",
  gallery: "/gallery",
  profileGallery: "/profile/gallery",
  banner: "/banner",
  profileBanner: "/profile/banner",
  avatar: "/avatar",
  profileAvatar: "/profile/avatar",
  searchUser: "/search/users",
  profileSearchUser: "/profile/search/users",
  abomodule: "/module/store",
  store: "/store",
  submodule: "/module",
  settings: "/usersettings",
  settingsUpload: "/usersettingsupload",
  changeTheme: "/changeTheme",
  LogIn: "/login",
  log_in: "/",
  log_out: "/logout",
  login: "/login/",
  logout: "/login/logout",
  registration: "/registration",
  register1: "/register1",
  register2: "/register2",
  register2Upload: "/register2upload",
  register3: "/register3",
  registration1: "/registration/register1",
  registration2: "/registration/register2",
  registration2Upload: "/registration/register2upload",
  registration3: "/registration/register3",
  authenticate: "/registration/auth",
  auth: "/auth",

  //Module
  Modules: {
    Modules: "/module",
    addModule: "/module/addModule",
    add_Module: "/addModule",
    removeModule: "/module/remModule",
    remove_Module: "/remModule",
    addDashed: "/module/addDash",
    add_Dashed: "/addDash",
    removeDashed: "/module/remDash",
    remove_Dashed: "/remDash",
  },
};
