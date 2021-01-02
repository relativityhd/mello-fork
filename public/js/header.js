var clicked = false;

function ShowMenu(click) {
  var list = document.getElementById("menu");
  if (click == "on") {
    clicked = true;
  }
  list.style.display = "block";
}

function HideMenu(click) {
  var list = document.getElementById("menu");
  if (
    (clicked == true && click == "on") ||
    (clicked == false && click == "off") ||
    click == "on"
  ) {
    list.style.display = "none";
    clicked = false;
  }
}

function ChangeMenu() {
  var list = document.getElementById("menu");
  if (list.style.display == "block" && clicked == true) {
    HideMenu("on");
  } else {
    ShowMenu("on");
  }
}
