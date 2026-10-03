// Toast utility
(function () {
  const toastContainer = document.getElementById("toastContainer");

  function showToast(message, type = "info") {
    if (!toastContainer) return;

    const div = document.createElement("div");
    div.classList.add("toast");
    if (type === "success") div.classList.add("toast-success");
    else if (type === "error") div.classList.add("toast-error");
    else div.classList.add("toast-info");

    div.textContent = message;
    toastContainer.appendChild(div);

    setTimeout(() => {
      div.remove();
    }, 2500);
  }

  // expose globally
  window.showToast = showToast;
})();
