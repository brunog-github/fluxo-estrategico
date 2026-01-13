export class CalendarUI {
  constructor() {
    this.modal = document.getElementById("calendar-modal");
    this.grid = document.getElementById("calendar-grid");
    this.title = document.getElementById("cal-month-year");
  }

  toggleModal() {
    if (!this.modal) return;

    this.modal.classList.toggle("hidden");
    return !this.modal.classList.contains("hidden"); // true se abriu
  }

  renderTitle(monthName, year) {
    if (this.title) {
      this.title.innerText = `${monthName} ${year}`;
    }
  }

  clearGrid() {
    if (this.grid) {
      this.grid.innerHTML = "";
    }
  }

  addEmptyDay() {
    this.grid.innerHTML += `<div class="cal-day empty"></div>`;
  }

  addDay(day, statusClass, isToday) {
    this.grid.innerHTML += `
      <div class="cal-day ${statusClass} ${isToday}">
        ${day}
      </div>
    `;
  }

  enableClickToClose() {
    window.addEventListener("click", (event) => {
      if (event.target === this.modal) {
        this.modal.classList.add("hidden");
      }
    });
  }
}
