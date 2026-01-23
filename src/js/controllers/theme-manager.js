export class ThemeManager {
  constructor({
    toggleButtonId = "theme-toggle",
    onThemeChange = () => {},
  } = {}) {
    this.toggleButton = document.getElementById(toggleButtonId);
    this.onThemeChange = onThemeChange;
  }

  async initTheme() {
    const savedTheme = await DBService.getTheme();

    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      if (this.toggleButton) this.toggleButton.innerText = "☀️";
    }
  }

  async toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");

    if (currentTheme === "dark") {
      html.removeAttribute("data-theme");
      await DBService.setTheme("light");
      if (this.toggleButton) this.toggleButton.innerText = "🌙";
    } else {
      html.setAttribute("data-theme", "dark");
      await DBService.setTheme("dark");
      if (this.toggleButton) this.toggleButton.innerText = "☀️";
    }

    // Callbacks externos (ex.: updateChartTheme e achievements)
    this.onThemeChange();
  }
}
