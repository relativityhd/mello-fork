var gallery_fileSelect = document.getElementById("gallerySelect"),
  gallery_fileElem = document.getElementById("galleryElem"),
  gallery_submit = document.getElementById("gallerySubmit");

gallery_fileSelect.addEventListener(
  "click",
  function (e) {
    if (gallery_fileElem) {
      gallery_fileElem.value = null;
      gallery_fileElem.click();
    }
  },
  false
);

function handleGallery(gallery_FileList) {
  var gallery_File = gallery_FileList[0];
  var gallery_reader = new FileReader();

  var gallery_imgtag = document.getElementById("galleryImg");
  gallery_imgtag.title = gallery_File.name;

  gallery_reader.onload = function (event) {
    gallery_imgtag.src = event.target.result;
  };

  gallery_reader.readAsDataURL(gallery_File);
  gallery_submit.click();
}
