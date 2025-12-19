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
  const createFormButton = document.getElementById("create-form");
  const formModal = document.getElementById("form-modal");
  const closeButton = formModal
    ? formModal.querySelector(".close-button")
    : null;
  const formCreator = document.getElementById("form-creator");
  const questionsContainer = document.getElementById("questions-container");
  const addQuestionButton = document.getElementById("add-question");
  const formsList = document.getElementById("forms-list");
  const targetGradeField = document.getElementById("target-grade");
  const statusField = document.getElementById("status");
  const allowRetakeField = document.getElementById("allow-retake");
  const logoutButton = document.getElementById("logout-button");
  const logoutInline = document.getElementById("logout-inline");
  const userRolePill = document.getElementById("user-role-pill");
  const usernameDisplay = document.getElementById("username-display");
  const userMenuName = document.getElementById("user-menu-name");
  const userMenuRole = document.getElementById("user-menu-role");
  const userMenu = document.getElementById("user-menu");

  let questions = [];

  const STORAGE_KEY = "form_modal_data";

  function saveFormData() {
    if (!formCreator) return;
    const formData = {
      topic: document.getElementById("topic")?.value || "",
      description: document.getElementById("description")?.value || "",
      expiry: document.getElementById("expiry")?.value || "",
      targetGrade: targetGradeField?.value || "all",
      status: statusField?.value || "draft",
      allowRetake: allowRetakeField?.checked || false,
      questions: Array.from(document.querySelectorAll(".question"))
        .map((q) => {
          const questionText = q.querySelector(".question-text")?.value || "";
          const questionType = q.querySelector(".question-type")?.value || "";
          const options = Array.from(q.querySelectorAll(".option")).map(
            (opt) => opt.value
          );
          const correctAnswer = q.querySelector(".correct-answer")?.value || "";
          const points = parseInt(
            q.querySelector(".question-points")?.value || "10"
          );
          const hasPoints =
            q.querySelector(".question-has-points")?.checked !== false;
          return {
            questionText,
            questionType,
            options,
            correctAnswer,
            points,
            hasPoints,
          };
        })
        .filter((q) => q.questionText && q.questionType),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }

  function loadFormData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      const formData = JSON.parse(saved);

      if (document.getElementById("topic"))
        document.getElementById("topic").value = formData.topic || "";
      if (document.getElementById("description"))
        document.getElementById("description").value =
          formData.description || "";
      if (document.getElementById("expiry"))
        document.getElementById("expiry").value = formData.expiry || "";
      if (targetGradeField)
        targetGradeField.value = formData.targetGrade || "all";
      if (statusField) statusField.value = formData.status || "draft";
      if (allowRetakeField)
        allowRetakeField.checked = formData.allowRetake || false;

      if (
        formData.questions &&
        formData.questions.length > 0 &&
        questionsContainer
      ) {
        questionsContainer.innerHTML = "";
        formData.questions.forEach((qData, index) => {
          const questionDiv = document.createElement("div");
          questionDiv.className = "question";
          questionDiv.innerHTML = `
                        <label>نوع السؤال:</label>
                        <select class="question-type">
                            <option value="" disabled>اختر خياراً</option>
                            <option value="true-false" ${
                              qData.questionType === "true-false"
                                ? "selected"
                                : ""
                            }>صحيح/خطأ</option>
                            <option value="multiple-choice" ${
                              qData.questionType === "multiple-choice"
                                ? "selected"
                                : ""
                            }>اختيارات متعددة</option>
                        </select>
                        <div class="question-fields"></div>
                        <button type="button" class="remove-question">❌</button>
                    `;
          const typeSelect = questionDiv.querySelector(".question-type");
          const fieldsContainer = questionDiv.querySelector(".question-fields");

          if (qData.questionType === "true-false") {
            fieldsContainer.innerHTML = `
                            <label>نص السؤال:</label>
                            <input type="text" class="question-text" value="${
                              qData.questionText
                            }" required>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" class="question-has-points" ${
                                  qData.hasPoints ? "checked" : ""
                                }>
                                <span>هذا السؤال مع نقاط</span>
                            </label>
                            <div class="points-container" style="display: ${
                              qData.hasPoints ? "block" : "none"
                            }">
                                <label>النقاط (افتراضي: 10):</label>
                                <input type="number" class="question-points" value="${
                                  qData.points || 10
                                }">
                            </div>
                            <label>الإجابة الصحيحة:</label>
                            <select class="correct-answer">
                                <option value="True" ${
                                  qData.correctAnswer === "True"
                                    ? "selected"
                                    : ""
                                }>صحيح</option>
                                <option value="False" ${
                                  qData.correctAnswer === "False"
                                    ? "selected"
                                    : ""
                                }>خطأ</option>
                            </select>
                        `;
            const hpCb = fieldsContainer.querySelector(".question-has-points");
            const ptsCtr = fieldsContainer.querySelector(".points-container");
            const ptsInp = fieldsContainer.querySelector(".question-points");
            if (hpCb && ptsCtr && ptsInp) {
              hpCb.addEventListener("change", (e) => {
                if (e.target.checked) {
                  ptsCtr.style.display = "block";
                  ptsInp.required = true;
                  ptsInp.setAttribute("min", "1");
                  ptsInp.value = ptsInp.value || "10";
                } else {
                  ptsCtr.style.display = "none";
                  ptsInp.removeAttribute("required");
                  ptsInp.removeAttribute("min");
                  ptsInp.value = "0";
                }
              });
              if (qData.hasPoints) {
                ptsInp.required = true;
                ptsInp.setAttribute("min", "1");
              }
            }
          } else {
            fieldsContainer.innerHTML = `
                            <label>نص السؤال:</label>
                            <input type="text" class="question-text" value="${
                              qData.questionText
                            }" required>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" class="question-has-points" ${
                                  qData.hasPoints ? "checked" : ""
                                }>
                                <span>هذا السؤال مع نقاط</span>
                            </label>
                            <div class="points-container" style="display: ${
                              qData.hasPoints ? "block" : "none"
                            }">
                                <label>النقاط (افتراضي: 10):</label>
                                <input type="number" class="question-points" value="${
                                  qData.points || 10
                                }">
                            </div>
                            <div class="options">
                                <label>الخيار 1:</label><input type="text" class="option" value="${
                                  qData.options[0] || ""
                                }" required>
                                <label>الخيار 2:</label><input type="text" class="option" value="${
                                  qData.options[1] || ""
                                }" required>
                                <label>الخيار 3:</label><input type="text" class="option" value="${
                                  qData.options[2] || ""
                                }" required>
                                <label>الخيار 4:</label><input type="text" class="option" value="${
                                  qData.options[3] || ""
                                }" required>
                            </div>
                            <label>الإجابة الصحيحة:</label>
                            <select class="correct-answer">
                                <option value="1" ${
                                  qData.correctAnswer === "1" ? "selected" : ""
                                }>الخيار 1</option>
                                <option value="2" ${
                                  qData.correctAnswer === "2" ? "selected" : ""
                                }>الخيار 2</option>
                                <option value="3" ${
                                  qData.correctAnswer === "3" ? "selected" : ""
                                }>الخيار 3</option>
                                <option value="4" ${
                                  qData.correctAnswer === "4" ? "selected" : ""
                                }>الخيار 4</option>
                            </select>
                        `;
            const hpCb = fieldsContainer.querySelector(".question-has-points");
            const ptsCtr = fieldsContainer.querySelector(".points-container");
            const ptsInp = fieldsContainer.querySelector(".question-points");
            if (hpCb && ptsCtr && ptsInp) {
              hpCb.addEventListener("change", (e) => {
                if (e.target.checked) {
                  ptsCtr.style.display = "block";
                  ptsInp.required = true;
                  ptsInp.setAttribute("min", "1");
                  ptsInp.value = ptsInp.value || "10";
                } else {
                  ptsCtr.style.display = "none";
                  ptsInp.removeAttribute("required");
                  ptsInp.removeAttribute("min");
                  ptsInp.value = "0";
                }
              });
              if (qData.hasPoints) {
                ptsInp.required = true;
                ptsInp.setAttribute("min", "1");
              }
            }
          }

          typeSelect.addEventListener("change", (e) => {
            const fieldsContainer =
              questionDiv.querySelector(".question-fields");
            fieldsContainer.innerHTML = "";
            if (e.target.value === "true-false") {
              fieldsContainer.innerHTML = `
                                <label>نص السؤال:</label>
                                <input type="text" class="question-text" required>
                                <label style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" class="question-has-points" checked>
                                    <span>هذا السؤال مع نقاط</span>
                                </label>
                                <div class="points-container">
                                    <label>النقاط (افتراضي: 10):</label>
                                    <input type="number" class="question-points" value="10" required>
                                </div>
                                <label>الإجابة الصحيحة:</label>
                                <select class="correct-answer">
                                    <option value="True">صحيح</option>
                                    <option value="False">خطأ</option>
                                </select>
                            `;
              const hpCb = fieldsContainer.querySelector(
                ".question-has-points"
              );
              const ptsCtr = fieldsContainer.querySelector(".points-container");
              const ptsInp = fieldsContainer.querySelector(".question-points");
              if (hpCb && ptsCtr && ptsInp) {
                ptsInp.setAttribute("min", "1");
                hpCb.addEventListener("change", (evt) => {
                  if (evt.target.checked) {
                    ptsCtr.style.display = "block";
                    ptsInp.required = true;
                    ptsInp.setAttribute("min", "1");
                    ptsInp.value = ptsInp.value || "10";
                  } else {
                    ptsCtr.style.display = "none";
                    ptsInp.removeAttribute("required");
                    ptsInp.removeAttribute("min");
                    ptsInp.value = "0";
                  }
                });
              }
            } else if (e.target.value === "multiple-choice") {
              fieldsContainer.innerHTML = `
                                <label>نص السؤال:</label>
                                <input type="text" class="question-text" required>
                                <label style="display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" class="question-has-points" checked>
                                    <span>هذا السؤال مع نقاط</span>
                                </label>
                                <div class="points-container">
                                    <label>النقاط (افتراضي: 10):</label>
                                    <input type="number" class="question-points" value="10" required>
                                </div>
                                <div class="options">
                                    <label>الخيار 1:</label><input type="text" class="option" required>
                                    <label>الخيار 2:</label><input type="text" class="option" required>
                                    <label>الخيار 3:</label><input type="text" class="option" required>
                                    <label>الخيار 4:</label><input type="text" class="option" required>
                                </div>
                                <label>الإجابة الصحيحة:</label>
                                <select class="correct-answer">
                                    <option value="1">الخيار 1</option>
                                    <option value="2">الخيار 2</option>
                                    <option value="3">الخيار 3</option>
                                    <option value="4">الخيار 4</option>
                                </select>
                            `;
              const hpCb = fieldsContainer.querySelector(
                ".question-has-points"
              );
              const ptsCtr = fieldsContainer.querySelector(".points-container");
              const ptsInp = fieldsContainer.querySelector(".question-points");
              if (hpCb && ptsCtr && ptsInp) {
                ptsInp.setAttribute("min", "1");
                hpCb.addEventListener("change", (evt) => {
                  if (evt.target.checked) {
                    ptsCtr.style.display = "block";
                    ptsInp.required = true;
                    ptsInp.setAttribute("min", "1");
                    ptsInp.value = ptsInp.value || "10";
                  } else {
                    ptsCtr.style.display = "none";
                    ptsInp.removeAttribute("required");
                    ptsInp.removeAttribute("min");
                    ptsInp.value = "0";
                  }
                });
              }
            }
          });

          questionDiv
            .querySelector(".remove-question")
            .addEventListener("click", () => {
              questionsContainer.removeChild(questionDiv);
              saveFormData();
            });

          questionsContainer.appendChild(questionDiv);
        });
      }
      return true;
    } catch (error) {
      console.error("Error loading form data:", error);
      return false;
    }
  }

  function clearFormData() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function closeModal() {
    if (formModal) {
      formModal.style.display = "none";
      formModal.classList.remove("active");
      document.body.style.overflow = "auto";
    }
  }

  if (createFormButton) {
    createFormButton.addEventListener("click", () => {
      if (formModal) {
        formModal.style.display = "block";
        formModal.classList.add("active");
        document.body.style.overflow = "hidden";
        loadFormData();
      }
    });
  }

  if (formCreator) {
    formCreator.addEventListener("input", saveFormData);
    formCreator.addEventListener("change", saveFormData);
  }

  window.addEventListener("beforeunload", saveFormData);

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      formModal &&
      formModal.style.display === "block"
    ) {
      closeModal();
    }
  });

  if (closeButton) {
    closeButton.addEventListener("click", closeModal);
  }

  const cancelButton = formModal
    ? formModal.querySelector(".cancel-btn")
    : null;
  if (cancelButton) {
    cancelButton.addEventListener("click", closeModal);
  }

  if (formModal) {
    formModal.addEventListener("click", (e) => {
      if (e.target === formModal) {
        closeModal();
      }
    });
  }

  if (addQuestionButton) {
    addQuestionButton.addEventListener("click", () => {
      if (!questionsContainer) return;

      const questionDiv = document.createElement("div");
      questionDiv.className = "question";

      questionDiv.innerHTML = `
                <label>نوع السؤال:</label>
                <select class="question-type">
                    <option value="" disabled selected>اختر خياراً</option>
                    <option value="true-false">صحيح/خطأ</option>
                    <option value="multiple-choice">اختيارات متعددة</option>
                </select>
                <div class="question-fields"></div>
                <button type="button" class="remove-question">❌</button>
            `;

      questionDiv
        .querySelector(".question-type")
        .addEventListener("change", (e) => {
          const fieldsContainer = questionDiv.querySelector(".question-fields");
          fieldsContainer.innerHTML = "";

          if (e.target.value === "true-false") {
            fieldsContainer.innerHTML = `
                        <label>نص السؤال:</label>
                        <input type="text" class="question-text" required>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" class="question-has-points" checked>
                            <span>هذا السؤال مع نقاط</span>
                        </label>
                        <div class="points-container">
                            <label>النقاط (افتراضي: 10):</label>
                            <input type="number" class="question-points" value="10" required>
                        </div>
                        <label>الإجابة الصحيحة:</label>
                        <select class="correct-answer">
                            <option value="True">صحيح</option>
                            <option value="False">خطأ</option>
                        </select>
                    `;

            const hasPointsCheckbox = fieldsContainer.querySelector(
              ".question-has-points"
            );
            const pointsContainer =
              fieldsContainer.querySelector(".points-container");
            const pointsInput =
              pointsContainer.querySelector(".question-points");

            hasPointsCheckbox.addEventListener("change", (e) => {
              if (e.target.checked) {
                pointsContainer.style.display = "block";
                pointsInput.required = true;
                pointsInput.setAttribute("min", "1");
                pointsInput.value = pointsInput.value || "10";
              } else {
                pointsContainer.style.display = "none";
                pointsInput.removeAttribute("required");
                pointsInput.removeAttribute("min");
                pointsInput.value = "0";
              }
            });
          } else if (e.target.value === "multiple-choice") {
            fieldsContainer.innerHTML = `
                        <label>نص السؤال:</label>
                        <input type="text" class="question-text" required>
                        <label style="display: flex; align-items: center; gap: 8px;">
                            <input type="checkbox" class="question-has-points" checked>
                            <span>هذا السؤال مع نقاط</span>
                        </label>
                        <div class="points-container">
                            <label>النقاط (افتراضي: 10):</label>
                            <input type="number" class="question-points" value="10" required>
                        </div>
                        <div class="options">
                            <label>الخيار 1:</label><input type="text" class="option" required>
                            <label>الخيار 2:</label><input type="text" class="option" required>
                            <label>الخيار 3:</label><input type="text" class="option" required>
                            <label>الخيار 4:</label><input type="text" class="option" required>
                        </div>
                        <label>الإجابة الصحيحة:</label>
                        <select class="correct-answer">
                            <option value="1">الخيار 1</option>
                            <option value="2">الخيار 2</option>
                            <option value="3">الخيار 3</option>
                            <option value="4">الخيار 4</option>
                        </select>
                    `;

            const hasPointsCheckbox = fieldsContainer.querySelector(
              ".question-has-points"
            );
            const pointsContainer =
              fieldsContainer.querySelector(".points-container");
            const pointsInput =
              pointsContainer.querySelector(".question-points");

            hasPointsCheckbox.addEventListener("change", (e) => {
              if (e.target.checked) {
                pointsContainer.style.display = "block";
                pointsInput.required = true;
                pointsInput.setAttribute("min", "1");
                pointsInput.value = pointsInput.value || "10";
              } else {
                pointsContainer.style.display = "none";
                pointsInput.removeAttribute("required");
                pointsInput.removeAttribute("min");
                pointsInput.value = "0";
              }
            });
          }
        });

      questionDiv
        .querySelector(".remove-question")
        .addEventListener("click", () => {
          questionsContainer.removeChild(questionDiv);
        });

      questionsContainer.appendChild(questionDiv);
    });
  }

  if (formCreator) {
    formCreator.addEventListener("submit", async (e) => {
      e.preventDefault();

      document.querySelectorAll(".question-points").forEach((input) => {
        const pointsContainer = input.closest(".points-container");
        if (pointsContainer && pointsContainer.style.display === "none") {
          input.removeAttribute("required");
          input.value = "0";
        }
      });

      const questionElements = document.querySelectorAll(".question");
      if (questionElements.length === 0) {
        Swal.fire({
          text: "لا يمكن إنشاء نموذج بدون سؤال واحد على الأقل",
          icon: "error",
          confirmButtonText: "حسنًا",
        });
        return;
      }

      const topic = document.getElementById("topic").value.trim();
      const description = document.getElementById("description").value.trim();
      const expiry = document.getElementById("expiry").value;

      const questions = Array.from(document.querySelectorAll(".question")).map(
        (q) => {
          const questionText = q.querySelector(".question-text").value;
          const questionType = q.querySelector(".question-type").value;
          const options = Array.from(q.querySelectorAll(".option")).map(
            (opt) => opt.value
          );
          let correctAnswer = q.querySelector(".correct-answer").value;
          const pointsInput = q.querySelector(".question-points");
          const hasPointsCheckbox = q.querySelector(".question-has-points");
          const hasPoints = hasPointsCheckbox
            ? hasPointsCheckbox.checked
            : true;
          const points =
            hasPoints && pointsInput
              ? parseInt(pointsInput.value, 10) || 10
              : 0;

          if (questionType === "multiple-choice") {
            correctAnswer = parseInt(correctAnswer, 10) - 1;
          }

          return { questionText, questionType, options, correctAnswer, points };
        }
      );

      const submitBtn = formCreator.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...';
      }

      try {
        const response = await fetch("/api/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            description: description || "",
            expiry: expiry || null,
            questions,
            targetGrade: targetGradeField ? targetGradeField.value : "all",
            status: "published",
            allowRetake: false,
          }),
        });

        if (response.ok) {
          const { form } = await response.json();
          clearFormData();
          if (formCreator) {
            formCreator.reset();
          }
          if (questionsContainer) {
            questionsContainer.innerHTML = "";
          }
          Swal.fire({
            text: "تم إنشاء النموذج!.",
            icon: "success",
            confirmButtonText: "حسنًا",
          });
          closeModal();
          if (formsList) {
            loadForms();
          } else {
            window.location.reload();
          }
        } else {
          Swal.fire({
            text: "خطأ في إنشاء النموذج. تحقق من اسم الموضوع أو حاول مرة أخرى.",
            icon: "error",
            confirmButtonText: "حسنًا",
          });
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "إنشاء النموذج";
        }
      }
    });
  }

  function CopyLinkButton(formDiv, formLink) {
    const baseUrl = `${window.location.origin}/form/`;
    const copyButton = document.createElement("button");
    copyButton.textContent = " 📋 نسخ رابط النموذج";
    copyButton.className = "copy-link-btn";

    copyButton.addEventListener("click", () => {
      const fullLink = `${baseUrl}${formLink}`;
      navigator.clipboard
        .writeText(fullLink)
        .then(() => {
          Swal.fire({
            text: "تم نسخ الرابط بنجاح!",
            icon: "success",
            confirmButtonText: "حسنًا",
          });
        })
        .catch((err) => {
          Swal.fire({
            text: "حدث خطأ أثناء نسخ الرابط.",
            icon: "error",
            confirmButtonText: "حسنًا",
          });
          console.error("Error copying link:", err);
        });
    });

    formDiv.appendChild(copyButton);
  }

  async function loadForms() {
    if (!formsList) {
      console.error("formsList element not found");
      return;
    }

    formsList.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري التحميل...</p>
            </div>
        `;

    try {
      const response = await fetch("/api/forms", {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Forms API response status:", response.status);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "فشل تحميل النماذج" }));
        throw new Error(
          errorData.message || `HTTP ${response.status}: فشل تحميل النماذج`
        );
      }

      const data = await response.json();
      console.log("Forms data received:", data);

      const forms = Array.isArray(data) ? data : data.active || [];
      const expiredForms = data.expired || [];

      formsList.innerHTML = "";

      if (forms.length === 0 && expiredForms.length === 0) {
        const noFormsDiv = document.createElement("div");
        noFormsDiv.className = "empty-state";
        noFormsDiv.style.cssText =
          "grid-column: 1 / -1; text-align: center; padding: 50px 20px; width: 100%;";
        noFormsDiv.innerHTML = `
                    <i class="fas fa-file-alt"></i>
                    <h3>لا توجد نماذج</h3>
                    <p>لم يتم إنشاء أي نموذج حتى الآن.</p>
                `;
        formsList.appendChild(noFormsDiv);
      } else {
        if (forms.length > 0) {
          const activeTitle = document.createElement("h2");
          activeTitle.className = "section-title";
          activeTitle.innerHTML = `
                        <i class="fas fa-check-circle"></i>
                        النماذج النشطة (${forms.length})
                    `;
          formsList.appendChild(activeTitle);

          const activeSection = document.createElement("div");
          activeSection.className = "forms-section";
          formsList.appendChild(activeSection);

          forms.forEach((form) => {
            renderFormCard(form, activeSection, false);
          });
        }

        if (expiredForms.length > 0) {
          const expiredTitle = document.createElement("h2");
          expiredTitle.className = "section-title";
          expiredTitle.innerHTML = `
                        <i class="fas fa-clock"></i>
                        النماذج المنتهية (${expiredForms.length})
                    `;
          formsList.appendChild(expiredTitle);

          const expiredSection = document.createElement("div");
          expiredSection.className = "forms-section";
          formsList.appendChild(expiredSection);

          expiredForms.forEach((form) => {
            renderFormCard(form, expiredSection, true);
          });
        }
      }
    } catch (error) {
      console.error("Error loading forms:", error);
      const errorDiv = document.createElement("div");
      errorDiv.className = "empty-state";
      errorDiv.style.cssText =
        "grid-column: 1 / -1; text-align: left; padding: 50px 20px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 15px;";
      errorDiv.innerHTML = `
                <i class="fas fa-exclamation-circle"></i>
                <h3>حدث خطأ</h3>
                <p>${
                  error.message || "تعذر تحميل النماذج. يرجى المحاولة مرة أخرى."
                }</p>
                <button onclick="location.reload()" style="margin-top: 15px; padding: 10px 20px; background: var(--accent); color: var(--dark); border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    إعادة المحاولة
                </button>
            `;
      formsList.innerHTML = "";
      formsList.appendChild(errorDiv);

      if (window.innerWidth <= 768) {
        errorDiv.style.textAlign = "center";
        errorDiv.style.alignItems = "center";
      }
    }
  }

  function renderFormCard(form, container, isExpired) {
    const expiryDate = form.expiry ? new Date(form.expiry) : null;
    const formDiv = document.createElement("div");
    formDiv.className = isExpired ? "form-card expired" : "form-card";

    formDiv.innerHTML = `
            <div class="form-header">
                <div class="form-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <span class="form-status ${
                  isExpired
                    ? "status-expired"
                    : form.status === "published"
                    ? "status-published"
                    : "status-draft"
                }">
                    ${
                      isExpired
                        ? "منتهي"
                        : form.status === "published"
                        ? "منشور"
                        : "مسودة"
                    }
                </span>
            </div>
            <h3 class="form-title">${form.topic}</h3>
            <p class="form-description">${form.description || "لا يوجد وصف"}</p>
            <div class="form-meta">
                <div class="meta-item">
                    <span class="meta-label">الفئة:</span>
                    <span class="meta-value">${form.targetGrade || "all"}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">الأسئلة:</span>
                    <span class="meta-value">${
                      form.questions?.length || 0
                    }</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">ينتهي:</span>
                    <span class="meta-value">${
                      expiryDate
                        ? expiryDate.toLocaleDateString("ar-EG")
                        : "بدون موعد"
                    }</span>
                </div>
            </div>
            <div class="form-actions">
                <a href="/form/${
                  form.link || form._id
                }/leaderboard" target="_blank" class="action-btn view-btn">
                    <i class="fas fa-trophy"></i>
                    لوحة الترتيب
                </a>
                <a href="/form/${
                  form.link || form._id
                }" target="_blank" class="action-btn view-btn">
                    <i class="fas fa-eye"></i>
                    عرض النموذج
                </a>
                ${
                  isExpired
                    ? `
                <button class="action-btn reactivate-btn" onclick="reactivateForm('${
                  form.link || form._id
                }')">
                    <i class="fas fa-redo"></i>
                    إعادة تفعيل
                </button>
                `
                    : ""
                }
                <button class="action-btn copy-btn" onclick="copyFormLink('${
                  form.link || form._id
                }')">
                    <i class="fas fa-copy"></i>
                    نسخ
                </button>
                <button class="action-btn deactivate-btn" onclick="deactivateForm('${
                  form._id
                }')">
                    <i class="fas fa-eye-slash"></i>
                    تعطيل
                </button>
                <button class="action-btn delete-btn" onclick="if(confirm('هل أنت متأكد من حذف هذا النموذج نهائيًا؟')) { deleteFormFromList('${
                  form._id
                }', '${form.link || form._id}') }">
                    <i class="fas fa-trash"></i>
                    حذف
                </button>
            </div>
        `;

    container.appendChild(formDiv);
  }

  window.reactivateForm = async function (formLink) {
    const { value: newExpiry } = await Swal.fire({
      title: "إعادة تفعيل النموذج",
      html: `
                <p>أدخل تاريخ انتهاء جديد للنموذج:</p>
                <input id="newExpiry" type="datetime-local" class="swal2-input" required>
            `,
      showCancelButton: true,
      confirmButtonText: "إعادة التفعيل",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#27ae60",
      cancelButtonColor: "#666",
      didOpen: () => {
        const input = document.getElementById("newExpiry");
        const now = new Date();
        now.setHours(now.getHours() + 24);
        input.value = now.toISOString().slice(0, 16);
      },
      preConfirm: () => {
        const expiry = document.getElementById("newExpiry").value;
        if (!expiry) {
          Swal.showValidationMessage("يرجى إدخال تاريخ انتهاء");
          return false;
        }
        return expiry;
      },
    });

    if (newExpiry) {
      try {
        const response = await fetch(`/api/forms/${formLink}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expiry: newExpiry }),
        });

        if (response.ok) {
          Swal.fire({
            title: "تم بنجاح!",
            text: "تم إعادة تفعيل النموذج بنجاح",
            icon: "success",
            confirmButtonText: "حسناً",
            confirmButtonColor: "#ffcc00",
          });
          loadForms();
        } else {
          throw new Error("فشل إعادة تفعيل النموذج");
        }
      } catch (error) {
        Swal.fire({
          title: "خطأ!",
          text: error.message || "تعذر إعادة تفعيل النموذج",
          icon: "error",
          confirmButtonText: "حسناً",
        });
      }
    }
  };

  window.copyFormLink = function (formLink) {
    const baseUrl = window.location.origin;
    const fullLink = `${baseUrl}/form/${formLink}`;
    navigator.clipboard
      .writeText(fullLink)
      .then(() => {
        Swal.fire({
          title: "تم النسخ!",
          text: "تم نسخ رابط النموذج بنجاح",
          icon: "success",
          confirmButtonText: "حسناً",
          confirmButtonColor: "#ffcc00",
        });
      })
      .catch((error) => {
        Swal.fire({
          title: "خطأ!",
          text: "تعذر نسخ الرابط",
          icon: "error",
          confirmButtonText: "حسناً",
        });
      });
  };

  async function deactivateForm(formId) {
    try {
      const response = await fetch(`/api/forms/${formId}/deactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        Swal.fire({
          title: 'تم!',
          text: 'تم تعطيل النموذج بنجاح',
          icon: 'success',
          confirmButtonText: 'حسنًا'
        }).then(() => {
          window.location.reload();
        });
      } else {
        throw new Error(result.message || 'فشل تعطيل النموذج');
      }
    } catch (error) {
      console.error('Error deactivating form:', error);
      Swal.fire({
        title: 'خطأ!',
        text: error.message || 'حدث خطأ أثناء تعطيل النموذج',
        icon: 'error',
        confirmButtonText: 'حسنًا'
      });
    }
  }

  async function deleteFormFromList(formId, formLink) {
    const result = await Swal.fire({
      title: "هل أنت متأكد؟",
      text: "هل أنت متأكد أنك تريد حذف هذا النموذج؟ لا يمكن التراجع عن هذا الإجراء!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "نعم، احذف",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#666",
    });

    if (result.isConfirmed) {
      try {
        const deleteResponse = await fetch(`/api/forms/${formLink}`, {
          method: "DELETE",
        });
        if (deleteResponse.ok) {
          Swal.fire({
            text: "تم حذف النموذج بنجاح.",
            icon: "success",
            confirmButtonText: "حسنًا",
            confirmButtonColor: "#ffcc00",
          });
          loadForms();
        } else {
          Swal.fire({
            text: "حدث خطأ أثناء حذف النموذج. حاول مرة أخرى.",
            icon: "error",
            confirmButtonText: "حسنًا",
          });
        }
      } catch (error) {
        Swal.fire({
          text: "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.",
          icon: "error",
          confirmButtonText: "حسنًا",
        });
      }
    }
  };

  async function hydrateUserMenu() {
    try {
      const response = await fetch("/api/user-info", {
        credentials: "include",
      });
      const data = await response.json();
      if (!data.isAuthenticated) {
        window.location.href = "/login";
        return;
      }
      if (usernameDisplay) {
        usernameDisplay.textContent = data.username;
      }
      if (userRolePill) {
        userRolePill.textContent =
          data.role === "leadadmin"
            ? "ليد أدمن"
            : data.role === "admin"
            ? "أدمن"
            : data.role;
      }
      if (userMenuName) {
        userMenuName.textContent = data.username;
      }
      if (userMenuRole) {
        const roleMap = {
          leadadmin: "القائد العام",
          admin: "مسؤول النظام",
          teacher: "قائد صف",
          student: "طالب",
        };
        userMenuRole.textContent = roleMap[data.role] || data.role;
      }
      return data;
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw error;
    }
  }

  hydrateUserMenu()
    .then(() => {
      if (formsList) {
        loadForms();
      }
    })
    .catch((error) => {
      console.error("Error in hydrateUserMenu:", error);
      if (formsList) {
        loadForms();
      }
    });

  window.toggleMenu = function toggleMenu() {
    if (!userMenu) return;
    userMenu.style.display =
      userMenu.style.display === "block" ? "none" : "block";
  };

  async function performLogout() {
    const result = await Swal.fire({
      title: "تسجيل الخروج",
      text: "هل تريد فعلاً تسجيل الخروج من النظام؟",
      icon: "question",
      iconColor: "#ffcc00",
      showCancelButton: true,
      confirmButtonText: "نعم، تسجيل خروج",
      cancelButtonText: "إلغاء",
      confirmButtonColor: "#e74c3c",
      cancelButtonColor: "#666",
      background: "#2a1b3c",
      color: "#fff",
      backdrop: "rgba(0,0,0,0.8)",
      allowOutsideClick: false,
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch("/logout", { method: "POST" });
        if (response.ok) {
          await Swal.fire({
            title: "تم تسجيل الخروج",
            text: "وداعاً! تم تسجيل خروجك بنجاح",
            icon: "success",
            iconColor: "#27ae60",
            background: "#2a1b3c",
            color: "#fff",
            backdrop: "rgba(0,0,0,0.8)",
            showConfirmButton: false,
            timer: 1500,
          });
          setTimeout(() => {
            window.location.href = "/";
          }, 500);
        }
      } catch (error) {
        console.error("Logout error:", error);
        window.location.href = "/";
      }
    }
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", performLogout);
  }

  if (logoutInline) {
    logoutInline.addEventListener("click", performLogout);
  }

  document.addEventListener("click", (event) => {
    if (!userMenu) return;
    const userDisplay = document.querySelector(".user-display");
    if (
      userMenu.contains(event.target) ||
      (userDisplay && userDisplay.contains(event.target))
    ) {
      return;
    }
    userMenu.style.display = "none";
  });
});
