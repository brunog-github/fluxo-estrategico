import { dbService } from "../services/db/db-service.js";

export class NotesController {
  constructor() {
    this.modal = document.getElementById("modal-notes");
    this.btnOpen = document.getElementById("btn-open-notes");
    this.btnClose = document.getElementById("btn-close-notes");
    this.editorContainer = document.getElementById("quill-editor-container");

    this.currentLinkedId = null;
    this.quill = null;
    this.tempContent = localStorage.getItem("currentSessionNoteDraft") || ""; // Guarda o texto enquanto o timer roda
    this.originalContent = ""; // Conteúdo original ao abrir (para detectar alterações)

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

      // 2. AUTO-SAVE: Salva no localStorage a cada alteração de texto
      // Isso garante que se der F5 com o modal aberto, não perde nada.
      this.quill.on("text-change", () => {
        // Só salva como rascunho se NÃO estiver editando um item do histórico
        if (!this.currentLinkedId) {
          const content = this.quill.root.innerHTML;
          this.tempContent = content;
          localStorage.setItem("currentSessionNoteDraft", content);
        }
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
      this.btnClose.addEventListener(
        "click",
        async () => await this.handleClose(),
      );
    }

    // Clicar fora para fechar (Auto-save temporário)
    window.addEventListener("click", async (e) => {
      if (e.target === this.modal) {
        await this.handleClose();
      }
    });
  }

  // --- LÓGICA CENTRAL DE FECHAMENTO ---
  async handleClose() {
    if (!this.modal.classList.contains("hidden")) {
      // 1. Atualiza a memória temporária com o que está no editor
      if (this.quill) {
        this.tempContent = this.quill.root.innerHTML;
      }

      // 2. VERIFICAÇÃO CRUCIAL:
      // Se existe um currentLinkedId, significa que estamos editando pelo Histórico.
      // Só salva se o conteúdo foi alterado.
      if (this.currentLinkedId) {
        const currentContent = this.tempContent;
        if (currentContent !== this.originalContent) {
          await this.saveFinalNote(this.currentLinkedId);
        }
        this.currentLinkedId = null; // Limpa o ID após fechar
        this.originalContent = ""; // Limpa o conteúdo original
      } else {
        localStorage.setItem("currentSessionNoteDraft", this.tempContent);
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

  async openLinkedNote(linkedId) {
    this.currentLinkedId = linkedId; // Marca este ID como o atual

    // 1. Busca se já existe nota para este ID no IndexedDB
    const allNotes = await dbService.getNotes();
    const foundNote = allNotes.find((n) => n.linkedId == linkedId);

    // 2. Preenche o editor ou limpa
    if (this.quill) {
      if (foundNote) {
        this.tempContent = foundNote.content;
        this.originalContent = foundNote.content; // Guarda original para comparar
      } else {
        this.tempContent = ""; // Limpa para nova nota
        this.originalContent = ""; // Nota nova, original é vazio
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
    this.currentLinkedId = null;
    this.originalContent = "";

    // 3. Limpa o rascunho do localStorage
    localStorage.removeItem("currentSessionNoteDraft");

    if (this.quill) this.quill.setText("");
  }

  async saveFinalNote(linkedId) {
    if (!linkedId) return;

    // Pega o conteúdo mais recente (seja do editor ou da memória)
    // Se o modal estiver aberto, pega do editor. Se fechado, pega do tempContent.
    let contentToSave = this.tempContent;
    let textPreview = "";

    if (this.quill && !this.modal.classList.contains("hidden")) {
      contentToSave = this.quill.root.innerHTML;
      textPreview = this.quill.getText().trim();
    } else {
      // Se o modal está fechado, usamos o tempContent.
      // Criamos uma div temporária para extrair o texto puro (preview) sem renderizar
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = contentToSave;
      textPreview = tempDiv.textContent || tempDiv.innerText || "";
    }

    // Busca nota existente no IndexedDB
    const allNotes = await dbService.getNotes();
    const existingNote = allNotes.find((n) => n.linkedId == linkedId);

    // SE NÃO HÁ TEXTO REAL
    if (!textPreview || textPreview.trim() === "") {
      // Se existe uma nota anterior, DELETA ela (usuário esvaziou o conteúdo)
      if (existingNote && existingNote.id) {
        await dbService.deleteNote(existingNote.id);
      }
      return;
    }

    // SE HÁ TEXTO: Atualiza ou adiciona a nota normalmente
    const newNote = {
      linkedId: linkedId,
      content: contentToSave,
      preview: textPreview.substring(0, 50),
    };

    // Atualiza ou adiciona a nota
    if (existingNote && existingNote.id) {
      await dbService.updateNote(existingNote.id, newNote);
    } else {
      await dbService.addNote(newNote);
    }

    if (!this.currentLinkedId) {
      localStorage.removeItem("currentSessionNoteDraft");
      this.tempContent = ""; // Reseta memória
      if (this.quill) this.quill.setText("");
    }
  }
}
