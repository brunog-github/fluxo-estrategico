export function initCalendarEvents(calendar) {
  document
    .getElementById("btn-calendar-toggle")
    .addEventListener("click", () => {
      calendar.toggleModal();
    });

  document
    .getElementById("btn-close-calendar")
    .addEventListener("click", () => {
      calendar.toggleModal();
    });

  document.getElementById("cal-prev").addEventListener("click", () => {
    calendar.changeMonth(-1);
  });

  document.getElementById("cal-next").addEventListener("click", () => {
    calendar.changeMonth(1);
  });
}
