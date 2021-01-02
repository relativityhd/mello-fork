/**Changes the backgroundImageof any given div.*/
function setImageDiv(img, id) {
  if (id == "background") {
    document.body.style.backgroundImage = "url('" + img + "')";
  } else {
    let div = document.getElementById(id);
    div.style.backgroundImage = "url('" + img + "')";
  }
}

/**Changes the backgroundColor of any given div.*/
function setColorDiv(color = "#ffffff", id) {
  if (id == "background") {
    document.body.style.backgroundColor = color;
  } else {
    let div = document.getElementById(id);
    div.style.backgroundColor = color;
  }
}

/**Changes the shape of any given Div.*/
function shapeDiv(shape, id) {
  if (shape == "circle") {
    let div = document.getElementById(id);
    div.style.borderRadius = "50%";
  }
  if (shape == "roundSquare") {
    let div = document.getElementById(id);
    div.style.borderRadius = "5%";
  }
  if (shape == "square") {
    let div = document.getElementById(id);
    div.style.borderRadius = "0%";
  }
}

//Failed try for changing the images
function changeIMG() {
  document.getElementById("eins").src =
    "/registration/avatar/<%= file.filename %>";
}

function change_img(id) {
  let div = document.getElementById(id);
  div.style.backgroundImage = "/registration/avatar/<%= file.filename %>";
}

//Calling functions to set up the profile site.
shapeDiv("roundSquare", "profilePicture");
setColorDiv("#182894", "profilePicture");
setColorDiv("#0C79E8", "profileBanner");
setColorDiv("#cee7ef", "profileBackground");
