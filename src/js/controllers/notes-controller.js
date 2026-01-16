export class NotesController {
  constructor() {
    this.modal = document.getElementById("modal-notes");
    this.btnOpen = document.getElementById("btn-open-notes");
    this.btnClose = document.getElementById("btn-close-notes");
    this.editorContainer = document.getElementById("quill-editor-container");

    this.quill = null;
    this.tempContent = ""; // Guarda o texto enquanto o timer roda

    this.initQuill();
    this.attachEvents();
  }

  initQuill() {
    // Inicializa o Quill apenas uma vez
    if (!this.quill && window.Quill) {
      const toolbarOptions = [
        ["bold", "italic", "underline", "strike"],
        ["blockquote", "code-block"],
        ["link", "formula"],

        [{ header: 1 }, { header: 2 }],
        [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
        [{ script: "sub" }, { script: "super" }], // superscript/subscript
        [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
        [{ direction: "rtl" }], // text direction

        [{ size: ["small", false, "large", "huge"] }], // custom dropdown
        [{ header: [1, 2, 3, 4, 5, 6, false] }],

        [{ color: [] }, { background: [] }], // dropdown with defaults from theme
        [{ font: [] }],
        [{ align: [] }],

        ["clean"], // remove formatting button
      ];

      this.quill = new Quill(this.editorContainer, {
        theme: "snow",
        placeholder: "Digite suas observações aqui...",
        modules: {
          toolbar: toolbarOptions,
        },
      });
    }
  }

  attachEvents() {
    // Abrir Modal
    if (this.btnOpen) {
      this.btnOpen.addEventListener("click", () => this.open());
    }

    // Botão Salvar/Fechar (Manual)
    if (this.btnClose) {
      this.btnClose.addEventListener("click", () => this.closeAndSaveTemp());
    }

    // Clicar fora para fechar (Auto-save temporário)
    window.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.closeAndSaveTemp();
      }
    });
  }

  open() {
    this.modal.classList.remove("hidden");
    // Restaura o conteúdo temporário se houver
    if (this.quill) {
      this.quill.root.innerHTML = this.tempContent;
      // Pequeno delay para focar corretamente
      setTimeout(() => this.quill.focus(), 100);
    }
  }

  closeAndSaveTemp() {
    if (this.quill) {
      // Salva o HTML atual na variável temporária
      this.tempContent = this.quill.root.innerHTML;
    }
    this.modal.classList.add("hidden");
  }

  // Método chamado quando o Timer inicia (Limpa notas anteriores)
  reset() {
    this.tempContent = "";
    if (this.quill) this.quill.setText("");
  }

  saveFinalNote(linkedId) {
    const text = this.quill ? this.quill.getText().trim() : "";

    if (text.length === 0) return; // Não salva vazio

    const noteEntry = {
      linkedId: linkedId, // ID do registro de estudo (ex: timestamp)
      content: this.tempContent, // HTML formatado
      preview: text.substring(0, 100), // Preview para listas futuras
    };

    // Salva no localStorage separado
    const notesHistory = JSON.parse(localStorage.getItem("studyNotes")) || [];
    notesHistory.push(noteEntry);
    localStorage.setItem("studyNotes", JSON.stringify(notesHistory));

    console.log("Anotação salva vinculada ao ID:", linkedId);

    // Reseta para a próxima
    this.reset();
  }
}
