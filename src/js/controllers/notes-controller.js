export class NotesController {
  constructor() {
    this.modal = document.getElementById("modal-notes");
    this.btnOpen = document.getElementById("btn-open-notes");
    this.btnClose = document.getElementById("btn-close-notes");
    this.editorContainer = document.getElementById("quill-editor-container");

    this.currentLinkedId = null;
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
      this.btnClose.addEventListener("click", () => this.handleClose());
    }

    // Clicar fora para fechar (Auto-save temporário)
    window.addEventListener("click", (e) => {
      if (e.target === this.modal) {
        this.handleClose();
      }
    });
  }

  // --- LÓGICA CENTRAL DE FECHAMENTO ---
  handleClose() {
    if (!this.modal.classList.contains("hidden")) {
      // 1. Atualiza a memória temporária com o que está no editor
      if (this.quill) {
        this.tempContent = this.quill.root.innerHTML;
      }

      // 2. VERIFICAÇÃO CRUCIAL:
      // Se existe um currentLinkedId, significa que estamos editando pelo Histórico.
      // Então TEMOS que salvar no localStorage agora mesmo.
      if (this.currentLinkedId) {
        this.saveFinalNote(this.currentLinkedId);
        this.currentLinkedId = null; // Limpa o ID após salvar
      }

      // 3. Fecha o modal
      this.modal.classList.add("hidden");
    }
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

  openLinkedNote(linkedId) {
    this.currentLinkedId = linkedId; // Marca este ID como o atual

    // 1. Busca se já existe nota para este ID
    const allNotes = JSON.parse(localStorage.getItem("studyNotes")) || [];
    const foundNote = allNotes.find((n) => n.linkedId == linkedId); // '==' para garantir caso seja string/number

    // 2. Preenche o editor ou limpa
    if (this.quill) {
      if (foundNote) {
        this.tempContent = foundNote.content;
      } else {
        this.tempContent = ""; // Limpa para nova nota
      }
    }

    // 3. Abre o modal
    this.open();
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
    if (!linkedId) return;

    // Pega o conteúdo mais recente (seja do editor ou da memória)
    // Se o modal estiver aberto, pega do editor. Se fechado, pega do tempContent.
    let contentToSave = this.tempContent;
    let textPreview = "";

    if (this.quill && !this.modal.classList.contains("hidden")) {
      contentToSave = this.quill.root.innerHTML;
      textPreview = this.quill.getText().trim();
    } else {
      // Gambiarra para pegar texto puro sem Quill instance visível (opcional)
      // Ou simplesmente salvamos o HTML. Para preview, seria bom ter o texto.
      // Se só tiver HTML na variavel, o preview pode ficar impreciso, mas ok.
      textPreview = "Anotação salva.";
    }

    // Se o editor estiver vazio (ou só tags vazias), deletamos a nota?
    // Vamos assumir que se textPreview for vazio, deleta.
    // Mas o Quill as vezes deixa um "\n". Vamos simplificar: salvar sempre.

    let allNotes = JSON.parse(localStorage.getItem("studyNotes")) || [];

    // Remove versão anterior dessa nota
    allNotes = allNotes.filter((n) => n.linkedId != linkedId);

    // Adiciona nova versão (apenas se tiver conteúdo real, opcional)
    // Aqui estou salvando mesmo que vazio para permitir "apagar" o texto.
    const newNote = {
      linkedId: linkedId,
      content: contentToSave,
      preview: textPreview.substring(0, 50),
    };

    allNotes.push(newNote);
    localStorage.setItem("studyNotes", JSON.stringify(allNotes));

    console.log(`Nota salva para ID: ${linkedId}`);
  }
}
