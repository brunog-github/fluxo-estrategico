export class SubjectsManager {
  constructor(toast) {
    this.subjects = [];
    this.currentIndex = 0;
    this.toast = toast;
  }

  async init() {
    // Carregar dados do IndexedDB
    this.subjects = await DBService.getSubjects();
    const currentIndexSubjects = this.subjects.map((s) => s.name || s);

    const savedIndex = await DBService.getCurrentIndex();
    this.currentIndex = parseInt(savedIndex || 0);

    // Se não há subjects no DB, manter arrays vazios
    if (!Array.isArray(this.subjects)) {
      this.subjects = [];
    }
  }

  async save() {
    // Limpar subjects antigos e adicionar novamente
    await DBService.clearSubjects();
    for (const subject of this.subjects) {
      const subjectName = subject.name || subject; // compatibilidade com string ou objeto
      await DBService.addSubject(subjectName);
    }
  }

  async next() {
    this.currentIndex = (this.currentIndex + 1) % this.subjects.length;
    await DBService.setCurrentIndex(this.currentIndex);
  }

  add(subject) {
    const trimmedSubject = subject.trim();

    if (!trimmedSubject) {
      this.toast.showToast("error", "O nome da matéria não pode ser vazio.");
      return false;
    }

    const subjectExists = this.subjects.some((s) => {
      const subjectName = s.name || s;
      return subjectName.toLowerCase() === trimmedSubject.toLowerCase();
    });

    if (subjectExists) {
      this.toast.showToast("error", "Essa matéria já existe.");
      return false;
    }

    this.subjects.push(trimmedSubject);
    this.save();
    return true;
  }

  remove(index) {
    this.subjects.splice(index, 1);
    this.save();
  }

  reorder(newOrder) {
    this.subjects = newOrder;
    this.save();
  }

  getCurrent() {
    return this.subjects[this.currentIndex];
  }

  getNext() {
    return this.subjects[(this.currentIndex + 1) % this.subjects.length];
  }

  async resetIndexIfOverflow() {
    if (this.currentIndex >= this.subjects.length) {
      this.currentIndex = 0;
      await DBService.setCurrentIndex(0);
    }
  }
}
