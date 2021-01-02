var banner_fileSelect = document.getElementById("bannerSelect"),
  banner_fileElem = document.getElementById("bannerElem"),
  banner_imgtag = document.getElementById("bannerImg"),
  banner_submit = document.getElementById("bannerSubmit");

banner_fileSelect.addEventListener(
  "click",
  function (e) {
    if (banner_fileElem) {
      banner_fileElem.value = null;
      banner_fileElem.click();
    }
  },
  false
);

function handleBanner(banner_FileList) {
  var banner_File = banner_FileList[0];
  var banner_reader = new FileReader();

  banner_imgtag.title = banner_File.name;

  banner_reader.onload = function (event) {
    banner_imgtag.src = event.target.result;
  };

  banner_reader.readAsDataURL(banner_File);
  banner_submit.click();
}
