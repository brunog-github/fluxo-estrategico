export class SubjectsManager {
  constructor(toast) {
    this.subjects = JSON.parse(localStorage.getItem("studyCycle")) || [];
    this.currentIndex = parseInt(localStorage.getItem("currentIndex") || 0);
    this.toast = toast;
  }

  save() {
    localStorage.setItem("studyCycle", JSON.stringify(this.subjects));
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.subjects.length;
    localStorage.setItem("currentIndex", this.currentIndex);
  }

  add(subject) {
    const trimmedSubject = subject.trim();

    if (!trimmedSubject) {
      this.toast.showToast("error", "O nome da matéria não pode ser vazio.");
      return false;
    }

    const subjectExists = this.subjects.some(
      (s) => s.toLowerCase() === trimmedSubject.toLowerCase()
    );

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

  resetIndexIfOverflow() {
    if (this.currentIndex >= this.subjects.length) {
      this.currentIndex = 0;
      localStorage.setItem("currentIndex", 0);
    }
  }
}
