export class ThemeManager {
  constructor({
    toggleButtonId = "theme-toggle",
    onThemeChange = () => {},
  } = {}) {
    this.toggleButton = document.getElementById(toggleButtonId);
    this.onThemeChange = onThemeChange;
  }

  initTheme() {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      if (this.toggleButton) this.toggleButton.innerText = "☀️";
    }
  }

  toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");

    if (currentTheme === "dark") {
      html.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
      if (this.toggleButton) this.toggleButton.innerText = "🌙";
    } else {
      html.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
      if (this.toggleButton) this.toggleButton.innerText = "☀️";
    }

    // Callbacks externos (ex.: updateChartTheme e achievements)
    this.onThemeChange();
  }
}
