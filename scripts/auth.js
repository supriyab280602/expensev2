document.addEventListener("DOMContentLoaded", () => {
  const authModal = document.getElementById("authModal");
  const closeAuthModalBtn = document.getElementById("closeAuthModal");
  const loginFormWrapper = document.getElementById("loginFormWrapper");
  const signupFormWrapper = document.getElementById("signupFormWrapper");
  const switchToSignup = document.getElementById("switchToSignup");
  const switchToLogin = document.getElementById("switchToLogin");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const authNav = document.getElementById("authNav");
  const initialLoginBtn = document.getElementById("loginBtn");
  const initialSignupBtn = document.getElementById("signupBtn");

  function openAuthModal(mode) {
    if (!authModal) return;

    if (mode === "signup") {
      signupFormWrapper.classList.remove("hidden");
      loginFormWrapper.classList.add("hidden");
    } else {
      loginFormWrapper.classList.remove("hidden");
      signupFormWrapper.classList.add("hidden");
    }
    authModal.classList.add("active");
  }

  function closeAuthModal() {
    if (!authModal) return;
    authModal.classList.remove("active");
  }

  function setLoggedInUser(user) {
    localStorage.setItem("det_user", JSON.stringify(user));
    renderAuthState();
  }

  function getLoggedInUser() {
    const raw = localStorage.getItem("det_user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function logoutUser() {
    // remove auth marker
    localStorage.removeItem("det_user");

    // remove app data keys (clear previous user's data)
    // clear v2 keys (if you use them)
    localStorage.removeItem("det_expenses_v2");
    localStorage.removeItem("det_budget_v2");
    localStorage.removeItem("det_category_limits_v2");

    // also clear older keys if present in older version
    localStorage.removeItem("det_expenses");
    localStorage.removeItem("det_budget");
    localStorage.removeItem("det_category_limits");

    // update auth UI
    renderAuthState();

    // notify app to clear in-memory state and re-render
    window.dispatchEvent(new CustomEvent("user-logged-out"));

    // user feedback
    if (window.showToast) window.showToast("Logged out — user data cleared", "info");
  }

  function renderAuthState() {
    if (!authNav) return;
    const user = getLoggedInUser();

    if (!user) {
      authNav.innerHTML = `
        <button class="btn-icon" id="themeToggleInline" aria-label="Toggle theme (duplicate)">🌓</button>
        <button class="btn-ghost" id="loginBtn">Login</button>
        <button class="btn-outline" id="signupBtn">Sign up</button>
      `;
      const newLoginBtn = document.getElementById("loginBtn");
      const newSignupBtn = document.getElementById("signupBtn");
      newLoginBtn.addEventListener("click", () => openAuthModal("login"));
      newSignupBtn.addEventListener("click", () => openAuthModal("signup"));
    } else {
      authNav.innerHTML = `
        <span class="user-badge">Logged in as ${user.name}</span>
        <button class="btn-ghost" id="logoutBtn">Logout</button>
      `;
      document
        .getElementById("logoutBtn")
        .addEventListener("click", logoutUser);
    }
  }

  // initial header buttons
  if (initialLoginBtn) {
    initialLoginBtn.addEventListener("click", () => openAuthModal("login"));
  }
  if (initialSignupBtn) {
    initialSignupBtn.addEventListener("click", () => openAuthModal("signup"));
  }

  if (switchToSignup) {
    switchToSignup.addEventListener("click", () => openAuthModal("signup"));
  }
  if (switchToLogin) {
    switchToLogin.addEventListener("click", () => openAuthModal("login"));
  }

  if (closeAuthModalBtn) {
    closeAuthModalBtn.addEventListener("click", closeAuthModal);
  }
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  // Signup
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("signupName").value.trim();
      const email = document.getElementById("signupEmail").value.trim();
      const password = document
        .getElementById("signupPassword")
        .value.trim();

      if (!name || !email || !password) {
        window.showToast("Please fill all fields.", "error");
        return;
      }
      if (password.length < 6) {
        window.showToast("Password should be at least 6 characters.", "error");
        return;
      }

      const user = { name, email, password };
      localStorage.setItem("det_registered_user", JSON.stringify(user));
      setLoggedInUser({ name, email });
      closeAuthModal();
      signupForm.reset();
      window.showToast("Account created", "success");
    });
  }

  // Login
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document
        .getElementById("loginPassword")
        .value.trim();

      const stored = localStorage.getItem("det_registered_user");
      if (!stored) {
        window.showToast("No account found. Please sign up first.", "error");
        return;
      }
      const savedUser = JSON.parse(stored);

      if (email === savedUser.email && password === savedUser.password) {
        setLoggedInUser({ name: savedUser.name, email: savedUser.email });
        closeAuthModal();
        loginForm.reset();
        window.showToast("Logged in", "success");
      } else {
        window.showToast("Invalid email or password.", "error");
      }
    });
  }

  // initial render of auth state
  renderAuthState();
});
