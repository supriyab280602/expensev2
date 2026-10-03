document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");
  if (!themeToggle) return;

  const body = document.body;

  // Load saved theme
  const savedTheme = localStorage.getItem("det_theme");
  if (savedTheme === "dark") {
    body.classList.add("dark");
    themeToggle.textContent = "🌙";
  } else {
    themeToggle.textContent = "🌞";
  }

  themeToggle.addEventListener("click", () => {
    body.classList.toggle("dark");

    const isDark = body.classList.contains("dark");
    themeToggle.textContent = isDark ? "🌙" : "🌞";
    localStorage.setItem("det_theme", isDark ? "dark" : "light");

    // Notify other parts of app (charts, etc.)
    document.dispatchEvent(new Event("theme-changed"));
  });
});
