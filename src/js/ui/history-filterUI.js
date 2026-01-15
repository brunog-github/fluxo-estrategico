export class HistoryFilterUI {
  constructor() {
    this.subjectSelect = document.getElementById("filter-subject");
    this.startInput = document.getElementById("filter-start");
    this.endInput = document.getElementById("filter-end");
    this.categorySelect = document.getElementById("filter-category");
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

  // NOVO: Preenche o dropdown de categorias
  fillCategories(categories) {
    if (!this.categorySelect) return;

    const current = this.categorySelect.value;
    this.categorySelect.innerHTML = `<option value="">Todas</option>`;

    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.innerText = cat;
      this.categorySelect.appendChild(opt);
    });

    this.categorySelect.value = current;
  }

  clearFields() {
    if (this.subjectSelect) this.subjectSelect.value = "";
    if (this.startInput) this.startInput.value = "";
    if (this.endInput) this.endInput.value = "";
    if (this.categorySelect) this.categorySelect.value = "";
  }

  getFilters() {
    return {
      subject: this.subjectSelect?.value || "",
      start: this.startInput?.value || "",
      end: this.endInput?.value || "",
      category: this.categorySelect ? this.categorySelect.value : "",
    };
  }
}
