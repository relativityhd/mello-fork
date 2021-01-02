var picture_fileSelect = document.getElementById("fileSelect"),
  picture_fileElem = document.getElementById("fileElem"),
  picture_imgtag = document.getElementById("prevImg"),
  picture_submit = document.getElementById("fileSubmit");

picture_fileSelect.addEventListener(
  "click",
  function (e) {
    if (picture_fileElem) {
      picture_fileElem.value = null;
      picture_fileElem.click();
    }
  },
  false
);

function handleFile(picture_FileList) {
  var picture_File = picture_FileList[0];
  var picture_reader = new FileReader();

  picture_imgtag.title = picture_File.name;

  picture_reader.onload = function (event) {
    picture_imgtag.src = event.target.result;
  };

  picture_reader.readAsDataURL(picture_File);
  picture_submit.click();
}
