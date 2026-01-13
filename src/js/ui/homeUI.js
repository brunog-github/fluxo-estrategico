export class HomeUI {
  constructor(subjectManager, screenNavigator) {
    this.subjectManager = subjectManager;
    this.screenNavigator = screenNavigator;
  }

  render() {
    const subjects = this.subjectManager.subjects;

    if (subjects.length === 0) {
      document.getElementById("home-subject-name").innerText =
        "Nenhuma matéria";
      document.getElementById("home-next-subject").innerText = "Configure";
      this.subjectManager.currentIndex = 0;
      this.subjectManager.save();
      return;
    }

    this.subjectManager.resetIndexIfOverflow();

    const current = this.subjectManager.getCurrent();
    const next = this.subjectManager.getNext();

    document.getElementById("home-subject-name").innerText = current;
    document.getElementById("home-next-subject").innerText = "Depois: " + next;
  }
}
