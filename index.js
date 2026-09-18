var menuItems = document.querySelectorAll(".menu-item");
var toast = document.querySelector(".toast");
var toastTimer = null;

function showComingSoon(title) {
  toast.textContent = title + "功能正在准备中";
  toast.classList.add("is-visible");

  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(function () {
    toast.classList.remove("is-visible");
  }, 1600);
}

Array.prototype.forEach.call(menuItems, function (item) {
  item.addEventListener("click", function () {
    showComingSoon(item.getAttribute("data-title"));
  });
});
