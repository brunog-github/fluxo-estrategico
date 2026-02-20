import { dbService } from "../services/db/db-service.js";

export class NotesController {
  constructor(toast) {
    this.toast = toast;
    this.modal = document.getElementById("modal-notes");
    this.btnOpen = document.getElementById("btn-open-notes");
    this.btnClose = document.getElementById("btn-close-notes");
    this.editorContainer = document.getElementById("quill-editor-container");

    this.currentLinkedId = null;
    this.quill = null;
    this.tempContent = localStorage.getItem("currentSessionNoteDraft") || "";
    this.originalContent = "";
    this._manualEntryMode = false; // Quando true, handleClose NÃO salva no DB
    this._onManualClose = null; // Callback chamado ao fechar em modo manual entry

    this.initQuill();
    this.attachEvents();
  }

  initQuill() {
    // Inicializa o Quill apenas uma vez
    if (!this.quill && window.Quill) {
      // Registra fontes personalizadas no Quill
      const Font = Quill.import("formats/font");
      Font.whitelist = [
        false, // Sans Serif (padrão)
        "serif",
        "monospace",
        "arial",
        "times-new-roman",
        "georgia",
        "verdana",
        "trebuchet-ms",
        "courier-new",
        "comic-sans-ms",
        "impact",
        "tahoma",
        "roboto",
        "open-sans",
        "lato",
        "montserrat",
        "poppins",
        "nunito",
      ];
      Quill.register(Font, true);

      const toolbarOptions = [
        ["bold", "italic", "underline", "strike"],
        ["blockquote", "code-block"],
        ["link", "image", "formula"],

        [{ header: 1 }, { header: 2 }],
        [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
        [{ script: "sub" }, { script: "super" }], // superscript/subscript
        [{ indent: "-1" }, { indent: "+1" }], // outdent/indent
        [{ direction: "rtl" }], // text direction

        [{ size: ["small", false, "large", "huge"] }], // custom dropdown
        [{ header: [1, 2, 3, 4, 5, 6, false] }],

        [{ color: [] }, { background: [] }], // dropdown with defaults from theme
        [
          {
            font: [
              false,
              "serif",
              "monospace",
              "arial",
              "times-new-roman",
              "georgia",
              "verdana",
              "trebuchet-ms",
              "courier-new",
              "comic-sans-ms",
              "impact",
              "tahoma",
              "roboto",
              "open-sans",
              "lato",
              "montserrat",
              "poppins",
              "nunito",
            ],
          },
        ],
        [{ align: [] }],

        ["clean"], // remove formatting button
      ];

      this.quill = new Quill(this.editorContainer, {
        theme: "snow",
        placeholder: "Digite suas observações aqui...",
        modules: {
          toolbar: {
            container: toolbarOptions,
            handlers: {
              image: () => this._handleImageURL(),
            },
          },
          clipboard: {
            matchers: [
              ["IMG", (node, delta) => this._stripBase64Images(node, delta)],
            ],
          },
        },
      });

      // Bloqueia drop de imagens (que seriam convertidas em Base64)
      this.editorContainer.addEventListener(
        "drop",
        (e) => {
          const hasFiles =
            e.dataTransfer &&
            e.dataTransfer.files &&
            e.dataTransfer.files.length > 0;
          if (hasFiles) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.toast.showToast(
              "warning",
              "Arrastar imagens não é suportado. Use o botão de imagem (🖼️) para inserir via URL.",
            );
          }
        },
        true,
      ); // true = fase de captura (antes do Quill)

      // Intercepta paste ANTES do Quill processar (fase de captura)
      this.editorContainer.addEventListener(
        "paste",
        (e) => {
          const clipboardData = e.clipboardData || window.clipboardData;
          if (!clipboardData) return;

          // Verifica se tem arquivos de imagem no clipboard (print screen, imagem copiada)
          const hasImageFile =
            clipboardData.files &&
            clipboardData.files.length > 0 &&
            Array.from(clipboardData.files).some((f) =>
              f.type.startsWith("image/"),
            );

          // Verifica se o HTML colado contém imagens Base64
          const htmlData = clipboardData.getData("text/html") || "";
          const hasBase64Img =
            htmlData.includes('src="data:image') ||
            htmlData.includes("src='data:image");

          if (hasImageFile || hasBase64Img) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this.toast.showToast(
              "warning",
              "Colar imagens não é suportado. Use o botão de imagem (🖼️) para inserir via URL.",
            );
          }
        },
        true,
      ); // true = fase de captura (antes do Quill)

      // 2. AUTO-SAVE: Salva no localStorage a cada alteração de texto
      // Isso garante que se der F5 com o modal aberto, não perde nada.
      this.quill.on("text-change", () => {
        // Só salva como rascunho se NÃO estiver editando um item do histórico
        if (!this.currentLinkedId) {
          const content = this.quill.root.innerHTML;
          this.tempContent = content;
          try {
            localStorage.setItem("currentSessionNoteDraft", content);
          } catch (e) {
            console.warn(
              "Não foi possível salvar rascunho no localStorage (cota excedida).",
              e,
            );
          }
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

      // 2. Se está em modo manual entry, apenas guarda em memória (não salva no DB)
      if (this._manualEntryMode) {
        // Notifica o ManualEntryController que o modal fechou (para atualizar UI)
        if (this._onManualClose) {
          const text = this.quill ? this.quill.getText().trim() : "";
          this._onManualClose(!!text);
        }
        this.modal.classList.add("hidden");
        return;
      }

      // 3. VERIFICAÇÃO CRUCIAL:
      // Se existe um currentLinkedId, significa que estamos editando pelo Histórico.
      // Só salva se o conteúdo foi alterado.
      if (this.currentLinkedId) {
        const currentContent = this.tempContent;
        if (currentContent !== this.originalContent) {
          await this.saveFinalNote(this.currentLinkedId);
        }
        this.currentLinkedId = null;
        this.originalContent = "";
      } else {
        try {
          localStorage.setItem("currentSessionNoteDraft", this.tempContent);
        } catch (e) {
          console.warn(
            "Não foi possível salvar rascunho no localStorage (cota excedida).",
            e,
          );
        }
      }

      // 4. Fecha o modal
      this.modal.classList.add("hidden");
    }
  }

  open() {
    this.modal.classList.remove("hidden");
    // Restaura o conteúdo temporário se houver
    if (this.quill) {
      this.quill.root.innerHTML = this.tempContent;
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

  // --- HANDLER: Inserir imagem por URL ---
  _handleImageURL() {
    const overlay = document.createElement("div");
    overlay.className = "img-url-overlay";

    const dialog = document.createElement("div");
    dialog.className = "img-url-dialog";

    const title = document.createElement("h3");
    title.className = "img-url-dialog__title";
    title.textContent = "Inserir imagem por URL";

    const hint = document.createElement("p");
    hint.className = "img-url-dialog__hint";
    hint.textContent =
      "💡 Posicione o cursor no editor onde deseja que a imagem apareça antes de inserir.";

    const hint2 = document.createElement("p");
    hint2.className = "img-url-dialog__hint";
    hint2.textContent =
      '🔍 No Google Imagens, clique com o botão direito na imagem e use "Copiar endereço da imagem", caso a imagem desejada não esteja disponível tente outra URL.';

    const input = document.createElement("input");
    input.type = "url";
    input.className = "img-url-dialog__input";
    input.placeholder = "https://exemplo.com/imagem.png";

    const preview = document.createElement("div");
    preview.className = "img-url-dialog__preview";
    const previewImg = document.createElement("img");
    preview.appendChild(previewImg);

    // Preview ao digitar/colar URL
    let previewTimeout;
    input.addEventListener("input", () => {
      clearTimeout(previewTimeout);
      const val = input.value.trim();
      if (val.startsWith("http://") || val.startsWith("https://")) {
        previewTimeout = setTimeout(() => {
          previewImg.src = val;
          previewImg.onload = () => preview.classList.add("visible");
          previewImg.onerror = () => preview.classList.remove("visible");
        }, 400);
      } else {
        preview.classList.remove("visible");
      }
    });

    const btnRow = document.createElement("div");
    btnRow.className = "img-url-dialog__actions";

    const btnCancel = document.createElement("button");
    btnCancel.className = "img-url-dialog__btn img-url-dialog__btn--cancel";
    btnCancel.textContent = "Cancelar";

    const btnInsert = document.createElement("button");
    btnInsert.className = "img-url-dialog__btn img-url-dialog__btn--insert";
    btnInsert.textContent = "Inserir";

    btnRow.append(btnCancel, btnInsert);
    dialog.append(title, hint, hint2, input, preview, btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => input.focus());

    const close = () => overlay.remove();

    const insert = () => {
      const trimmed = input.value.trim();
      if (!trimmed) {
        close();
        return;
      }

      if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        this.toast.showToast(
          "warning",
          "URL inválida. Deve começar com http:// ou https://",
        );
        input.focus();
        return;
      }

      const range = this.quill.getSelection(true);
      this.quill.insertEmbed(range.index, "image", trimmed);
      this.quill.setSelection(range.index + 1);
      close();
    };

    btnCancel.addEventListener("click", close);
    btnInsert.addEventListener("click", insert);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") insert();
      if (e.key === "Escape") close();
    });
  }

  // --- MATCHER: Remove imagens Base64 coladas via clipboard ---
  _stripBase64Images(node, delta) {
    const src = node.getAttribute("src") || "";

    // Se a imagem é Base64, remove-a do delta (não insere)
    if (src.startsWith("data:")) {
      return { ops: [] }; // Retorna delta vazio, removendo a imagem
    }

    // Se é uma URL normal, permite normalmente
    return delta;
  }
}
