export class HistoryFilterUI {
  constructor() {
    this.subjectSelect = document.getElementById("filter-subject");
    this.startInput = document.getElementById("filter-start");
    this.endInput = document.getElementById("filter-end");
  }

  applyMaxDate() {
    const today = new Date().toISOString().split("T")[0];

    if (this.startInput) this.startInput.setAttribute("max", today);
    if (this.endInput) this.endInput.setAttribute("max", today);
  }

  fillSubjects(subjects) {
    if (!this.subjectSelect) return;

    const current = this.subjectSelect.value;

    this.subjectSelect.innerHTML = `<option value="">Todas as Matérias</option>`;

    subjects.forEach((subj) => {
      const opt = document.createElement("option");
      opt.value = subj;
      opt.innerText = subj;
      this.subjectSelect.appendChild(opt);
    });

    this.subjectSelect.value = current;
  }

  clearFields() {
    if (this.subjectSelect) this.subjectSelect.value = "";
    if (this.startInput) this.startInput.value = "";
    if (this.endInput) this.endInput.value = "";
  }

  getFilters() {
    return {
      subject: this.subjectSelect?.value || "",
      start: this.startInput?.value || "",
      end: this.endInput?.value || "",
    };
  }
}
