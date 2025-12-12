document.addEventListener("DOMContentLoaded", function () {
  const sidebar = document.getElementById("sidebar");
  const hamburgerMenu = document.querySelector(".hamburger-menu");

  if (!sidebar || !hamburgerMenu) {
    return;
  }

  hamburgerMenu.addEventListener("click", function (event) {
    event.stopPropagation();
    sidebar.classList.toggle("show");
    hamburgerMenu.classList.toggle("active");
  });

  document.addEventListener("click", function (event) {
    if (
      !sidebar.contains(event.target) &&
      !hamburgerMenu.contains(event.target)
    ) {
      sidebar.classList.remove("show");
      hamburgerMenu.classList.remove("active");
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      sidebar.classList.remove("show");
      hamburgerMenu.classList.remove("active");
    }
  });
});
