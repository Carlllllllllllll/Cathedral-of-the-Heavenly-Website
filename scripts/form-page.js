const submitButton = document.querySelector(".submit-btn");
const formElement = document.getElementById("solve-form");

async function generateDeviceId() {
  if (!window.FingerprintJS) {
    return crypto.randomUUID?.() || `device-${Date.now()}`;
  }
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}

function collectAnswers(form) {
  const data = {};
  const formData = new FormData(form);
  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
}

async function submitForm(event) {
  event.preventDefault();
  if (!formElement) return;

  const result = await Swal.fire({
    title: "تأكيد الإرسال",
    text: "هل أنت متأكد من إرسال النموذج؟",
    icon: "question",
    iconColor: "#ffcc00",
    showCancelButton: true,
    confirmButtonColor: "#ffcc00",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "نعم، أرسل",
    cancelButtonText: "إلغاء",
    background: "rgba(0, 0, 0, 0.8)",
    color: "#fff",
    customClass: {
      popup: "notification-modal",
      confirmButton: "notification-confirm",
      cancelButton: "notification-cancel",
    },
  });

  if (!result.isConfirmed) {
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "يتم الإرسال...";

  try {
    const payload = collectAnswers(formElement);
    payload.deviceId = await generateDeviceId();

    const response = await fetch(window.location.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "تعذر إرسال النموذج");
    }

    await Swal.fire({
      text: result.message || "تم تسجيل إجاباتك بنجاح.",
      icon: "success",
      confirmButtonText: "تم",
    });
    setTimeout(async () => {
      try {
        const userInfo = await fetch("/api/user-info");
        const userData = await userInfo.json();
        if (userData.grade) {
          window.location.href = `/grades/${userData.grade}`;
        } else {
          window.location.href = "/dashboard";
        }
      } catch (error) {
        window.location.href = "/dashboard";
      }
    }, 2000);
  } catch (error) {
    Swal.fire({
      text: error.message || "حدث خطأ غير متوقع. حاول مرة أخرى.",
      icon: "error",
      confirmButtonText: "حسناً",
    });
    console.error("Form submission failed:", error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "إرسال الإجابات";
  }
}

if (formElement) {
  formElement.addEventListener("submit", submitForm);
}
