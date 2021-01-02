var clicked = false;

function WM_showTable(id) {
  var div = document.getElementById("WM_tableDIV" + id);
  var table = document.getElementById("WM_table" + id);
  var tableHead = document.getElementById("WM_tableHead" + id);
  var pic1 = document.getElementsByName("WM_pictureDIV1" + id);
  var pic2 = document.getElementsByName("WM_pictureDIV2" + id);
  if (clicked) {
    clicked = false;
    table.style.fontSize = "12px";
    table.style.left = "0px";
    tableHead.style.fontSize = "12px";
    div.style.top = "0px";
    div.style.left = "0px";
    div.style.zIndex = "0";
    div.style.width = "348px";
    for (var i = 0; i < pic1.length; i++) {
      pic1[i].style.width = "20px";
      pic1[i].style.height = "10px";
      pic2[i].style.width = "20px";
      pic2[i].style.height = "10px";
    }
    setTimeout(position, 15, id);
    function position(id) {
      var div = document.getElementById("WM_tableDIV" + id);
      div.style.display = "inline-block";
      div.style.position = "relative";
    }
  } else {
    console.log("Igo");
    clicked = true;
    table.style.fontSize = "40px";
    table.style.left = "200px";
    tableHead.style.fontSize = "40px";
    div.style.top = "-270px";
    div.style.left = "-25px";
    div.style.zIndex = "10";
    div.style.width = "100%";
    for (var i = 0; i < pic1.length; i++) {
      pic1[i].style.width = "80px";
      pic1[i].style.height = "40px";
      pic2[i].style.width = "80px";
      pic2[i].style.height = "40px";
    }
    setTimeout(position, 10, id);
    function position(id) {
      var div = document.getElementById("WM_tableDIV" + id);
      div.style.display = "block";
      div.style.position = "absolute";
      div.style.top = "-25px";
    }
  }
}
