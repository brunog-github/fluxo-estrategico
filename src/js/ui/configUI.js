export class ConfigUI {
  constructor(subjectsManager, toast) {
    this.subjectsManager = subjectsManager;
    this.sortableInstance = null;
    this.toast = toast;

    // Event delegation -> registrado APENAS UMA VEZ
    const list = document.getElementById("config-list");
    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".delete-subject");
      if (!btn) return;

      const li = btn.closest("li");
      const index = parseInt(li.dataset.index);

      this.subjectsManager.remove(index);
      this.toast.showToast("success", "Matéria removida!");

      this.renderList();
    });
  }

  renderList() {
    const list = document.getElementById("config-list");
    list.innerHTML = "";

    this.subjectsManager.subjects.forEach((subj, index) => {
      const li = document.createElement("li");
      li.dataset.index = index;
      li.dataset.name = subj;

      li.innerHTML = `
        <div style="display:flex; align-items:center;">
          <span class="drag-handle">::</span>
          <span>${index + 1}. ${subj}</span>
        </div>
        <button style="background:red; color:white; border:none; border-radius:5px; cursor:pointer;" class="delete-subject">
          <i class="fa fa-trash-o"></i>
        </button>
      `;

      list.appendChild(li);
    });

    this.initSortable();
  }

  initSortable() {
    if (this.sortableInstance) return;

    const el = document.getElementById("config-list");
    this.sortableInstance = new Sortable(el, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: () => this.updateOrder(),
    });
  }

  updateOrder() {
    const listItems = document.querySelectorAll("#config-list li");

    const newOrder = Array.from(listItems).map((li) => li.dataset.name);

    this.subjectsManager.reorder(newOrder);
    this.renderList();
  }
}
