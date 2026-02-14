export class ManualEntryUI {
  constructor() {
    this.modal = document.getElementById("modal-manual-entry");
    this.subjectSelect = document.getElementById("manual-subject");
    this.dateInput = document.getElementById("manual-date");
    this.entryTimeInput = document.getElementById("manual-entry-time");
    this.timeInput = document.getElementById("manual-time");
    this.questionsInput = document.getElementById("manual-questions");
    this.correctInput = document.getElementById("manual-correct");
    this.title = document.querySelector("h3.manual-modal-title");

    // chips
    this.chipToday = document.getElementById("chip-today");
    this.chipYesterday = document.getElementById("chip-yesterday");
    this.chipOther = document.getElementById("chip-other");

    // notes button
    this.btnToggleNotes = document.getElementById("btn-toggle-manual-notes");
    this.notesToggleLabel = document.getElementById(
      "manual-notes-toggle-label",
    );

    // fecha modal ao clicar no fundo
    window.addEventListener("click", (event) => {
      if (event.target === this.modal) {
        this.close();
      }
    });
  }

  getEntryData() {
    return {
      subject: this.subjectSelect.value,
      date: this.dateInput.value,
      entryTime: this.entryTimeInput.value,
      time: this.timeInput.value,
      questions: this.questionsInput.value,
      correct: this.correctInput.value,
    };
  }

  fillFields(data) {
    // data esperada: { subject, dateISO, time, questions, correct, entryTime }
    this.subjectSelect.value = data.subject;
    this.dateInput.value = data.dateISO;
    this.timeInput.value = data.time;
    this.questionsInput.value = data.questions;
    this.correctInput.value = data.correct;

    if (data.entryTime) {
      this.entryTimeInput.value = data.entryTime;
    }
  }

  open() {
    this.modal.classList.remove("hidden");
  }

  close() {
    this.modal.classList.add("hidden");
  }

  setTitle(text) {
    this.title.innerText = text;
  }

  resetFields(todayISO) {
    this.timeInput.value = "";
    this.questionsInput.value = "";
    this.correctInput.value = "";
    this.entryTimeInput.value = new Date().toTimeString().slice(0, 5);

    this.dateInput.setAttribute("max", todayISO);
    this.dateInput.value = todayISO;

    this.subjectSelect.innerHTML = '<option value="">Selecione...</option>';
  }

  setSubjectsList(subjects) {
    this.subjectSelect.innerHTML = '<option value="">Selecione...</option>';

    subjects.forEach((subj) => {
      const option = document.createElement("option");
      option.value = subj;
      option.innerText = subj;
      this.subjectSelect.appendChild(option);
    });
  }

  setChipSelection(option) {
    [this.chipToday, this.chipYesterday, this.chipOther].forEach((btn) =>
      btn.classList.remove("selected"),
    );

    if (option === "today") this.chipToday.classList.add("selected");
    if (option === "yesterday") this.chipYesterday.classList.add("selected");
    if (option === "other") this.chipOther.classList.add("selected");
  }

  showDateInput(show) {
    this.dateInput.style.display = show ? "block" : "none";
  }

  // --- Notes button label ---

  updateNotesLabel(hasNotes) {
    if (this.notesToggleLabel) {
      this.notesToggleLabel.textContent = hasNotes
        ? "Editar anotação"
        : "Adicionar anotação";
    }
    if (this.btnToggleNotes) {
      if (hasNotes) {
        this.btnToggleNotes.classList.add("active");
      } else {
        this.btnToggleNotes.classList.remove("active");
      }
    }
  }

  resetNotes() {
    this.updateNotesLabel(false);
  }
}
