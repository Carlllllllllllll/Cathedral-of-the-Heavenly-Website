const toggleMobileNav = () => {
  const toggleButton = document.querySelector(".mobile-toggle");
  const nav = document.querySelector(".primary-nav");

  if (!toggleButton || !nav) return;

  toggleButton.addEventListener("click", () => {
    nav.classList.toggle("open");
    toggleButton.classList.toggle("open");
  });
};

const formatActivityLink = (link) => {
  if (!link) return "#";
  try {
    const url = new URL(link, window.location.origin);
    return url.href;
  } catch {
    return link;
  }
};

const renderActivities = (activities) => {
  const grid = document.getElementById("activities-grid");
  const emptyState = document.getElementById("activities-empty");

  if (!grid || !emptyState) {
    return;
  }

  grid.innerHTML = "";

  if (!activities.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  activities.forEach((activity) => {
    const card = document.createElement("article");
    card.className = "activity-card";

    card.innerHTML = `
            <div>
                <p class="eyebrow">${activity.category || "نشاط خاص"}</p>
                <h3>${activity.title}</h3>
                <p>${activity.description}</p>
            </div>
            <a href="${formatActivityLink(
              activity.link
            )}" class="link-arrow">زيارة الصفحة</a>
        `;

    grid.appendChild(card);
  });
};

const loadPublicActivities = async () => {
  try {
    const response = await fetch("/public-activities");
    if (!response.ok) {
      throw new Error("Failed to load activities");
    }

    const activities = await response.json();
    renderActivities(activities);
  } catch (error) {
    console.error(error);
    renderActivities([]);
  }
};

const whenReady = (callback) => {
  if (typeof callback !== "function") return;
  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    callback();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
    window.addEventListener("load", run, { once: true });
    window.addEventListener("pageshow", run, { once: true });
  } else {
    (typeof queueMicrotask === "function"
      ? queueMicrotask
      : (fn) => Promise.resolve().then(fn))(run);
  }
};

whenReady(() => {
  toggleMobileNav();
  loadPublicActivities();
});
