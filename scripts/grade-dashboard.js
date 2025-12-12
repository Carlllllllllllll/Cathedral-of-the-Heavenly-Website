const formatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
});

function renderForms(forms) {
  const list = document.getElementById("forms-feed");
  list.innerHTML = "";

  if (!forms.length) {
    const empty = document.createElement("li");
    empty.className = "placeholder";
    empty.textContent = "لا توجد نماذج حالياً لهذا الصف.";
    list.appendChild(empty);
    return;
  }

  forms.forEach((form) => {
    const item = document.createElement("li");
    const strong = document.createElement("strong");
    strong.textContent = form.topic || "بدون عنوان";
    const span = document.createElement("span");
    span.textContent = form.description || "بدون وصف مخصص حالياً.";
    const small = document.createElement("small");
    small.textContent = form.expiry
      ? formatter.format(new Date(form.expiry))
      : "متاح دون موعد انتهاء";
    item.appendChild(strong);
    item.appendChild(span);
    item.appendChild(small);
    if (form.link) {
      item.addEventListener("click", () => {
        window.location.href = `/form/${encodeURIComponent(form.link)}`;
      });
    }
    list.appendChild(item);
  });
}

async function loadFormsForGrade(slug) {
  const list = document.getElementById("forms-feed");
  list.innerHTML = '<li class="placeholder">جارٍ تحميل النماذج...</li>';

  try {
    const response = await fetch(`/api/grades/${slug}/forms`);
    if (!response.ok) {
      throw new Error("request-failed");
    }
    const forms = await response.json();
    renderForms(forms);
  } catch (error) {
    const fail = document.createElement("li");
    fail.className = "placeholder";
    fail.textContent = "تعذر تحميل النماذج. حاول لاحقاً.";
    list.innerHTML = "";
    list.appendChild(fail);
  }
}

async function performLogout() {
  try {
    await fetch("/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
}

const bootstrap = () => {
  const context = window.__gradePage;
  if (!context?.slug) return;
  loadFormsForGrade(context.slug);

  const logoutBtnDesktop = document.getElementById("logoutBtnDesktop");
  const logoutBtnMobile = document.getElementById("logoutBtnMobile");
  const logoutBtnMobileDropdown = document.getElementById(
    "logoutBtnMobileDropdown"
  );

  if (logoutBtnDesktop) {
    logoutBtnDesktop.addEventListener("click", performLogout);
  }
  if (logoutBtnMobile) {
    logoutBtnMobile.addEventListener("click", performLogout);
  }
  if (logoutBtnMobileDropdown) {
    logoutBtnMobileDropdown.addEventListener("click", performLogout);
  }
};

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", bootstrap)
  : bootstrap();
