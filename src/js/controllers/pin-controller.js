import { dbService } from "../services/db/db-service.js";

/**
 * Controlador do sistema de PIN de bloqueio.
 *
 * Settings keys usadas:
 *  - "pinHash"       → PIN armazenado (SHA-256 via Web Crypto API)
 *  - "pinRecovery"   → { questions: [idx1, idx2, idx3], answers: { q1, q2, q3 } }
 */

const PIN_QUESTIONS = [
  "Qual o nome do seu primeiro animal de estimação?",
  "Em qual cidade você nasceu?",
  "Qual é o nome do seu melhor amigo de infância?",
  "Qual é o nome da sua mãe?",
  "Qual o modelo do seu primeiro carro?",
  "Qual é o nome da sua escola primária?",
  "Qual é a sua comida favorita?",
  "Qual o nome do seu professor favorito?",
  "Em que ano você se formou?",
  "Qual é o nome do seu filme favorito?",
];

export class PinController {
  constructor(toast) {
    this.toast = toast;
    this.isLocked = false;
  }

  // ==============================
  // Utilidades de hash (Web Crypto API)
  // ==============================

  /**
   * Gera um hash SHA-256 usando a Web Crypto API.
   * @param {string} str - Texto a ser hasheado
   * @returns {Promise<string>} Hash em hexadecimal
   */
  async _hash(str) {
    const normalized = str.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ==============================
  // Verificação inicial (on load)
  // ==============================

  /**
   * Chamado no start da aplicação. Se há PIN, bloqueia a tela.
   */
  async checkAndLock() {
    const pinHash = await dbService.getSetting("pinHash");

    if (!pinHash) {
      // Sem PIN definido → acesso livre
      this._hideOverlay();
      return;
    }

    // Verificar se há pausa ativa
    if (this._isPaused()) {
      this._hideOverlay();
      return;
    }

    // Tem PIN → bloquear
    this.isLocked = true;
    this._showOverlay();
    this._setupLockEvents();
  }

  // ==============================
  // Pausa da verificação
  // ==============================

  /**
   * Verifica se a pausa está ativa.
   */
  _isPaused() {
    const pauseUntil = localStorage.getItem("pinPauseUntil");
    if (!pauseUntil) return false;
    return Date.now() < parseInt(pauseUntil, 10);
  }

  /**
   * Define a pausa por X minutos.
   */
  _setPause(minutes) {
    const until = Date.now() + minutes * 60 * 1000;
    localStorage.setItem("pinPauseUntil", until.toString());
  }

  /**
   * Remove a pausa ativa e atualiza a UI de config.
   */
  removePause() {
    localStorage.removeItem("pinPauseUntil");
    this._updatePauseButton();
    if (this.toast)
      this.toast.showToast("success", "Pausa removida com sucesso!");
  }

  /**
   * Atualiza a visibilidade do botão "Remover Pausa" na tela de config.
   */
  _updatePauseButton() {
    const btn = document.getElementById("btn-remove-pause");
    if (!btn) return;
    if (this._isPaused()) {
      const remaining = parseInt(localStorage.getItem("pinPauseUntil"), 10);
      const mins = Math.ceil((remaining - Date.now()) / 60000);
      btn.style.display = "block";
      btn.title = `Pausa ativa — ${mins} min restante${mins !== 1 ? "s" : ""}`;
    } else {
      btn.style.display = "none";
      btn.title = "";
    }
  }

  // ==============================
  // Overlay (lock/unlock)
  // ==============================

  _showOverlay() {
    const overlay = document.getElementById("pin-lock-overlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      // Focus no primeiro campo
      setTimeout(() => {
        const firstInput = overlay.querySelector(
          "#pin-input-container input:first-child",
        );
        if (firstInput) firstInput.focus();
      }, 100);
    }
  }

  _hideOverlay() {
    const overlay = document.getElementById("pin-lock-overlay");
    if (overlay) {
      overlay.classList.add("hidden");
    }
    this.isLocked = false;
    // Resetar select de pausa
    const pauseSelect = document.getElementById("pin-pause-select");
    if (pauseSelect) pauseSelect.value = "0";
  }

  // ==============================
  // Eventos da tela de bloqueio
  // ==============================

  _setupLockEvents() {
    const overlay = document.getElementById("pin-lock-overlay");
    if (!overlay) return;

    const inputs = overlay.querySelectorAll("#pin-input-container input");
    const btnUnlock = document.getElementById("btn-pin-unlock");
    const btnForgot = document.getElementById("btn-pin-forgot");
    const errorMsg = document.getElementById("pin-lock-error");

    // Auto-avançar entre campos
    inputs.forEach((input, idx) => {
      input.value = "";

      input.addEventListener("input", (e) => {
        // Só números
        input.value = input.value.replace(/\D/g, "");

        if (input.value.length === 1 && idx < inputs.length - 1) {
          inputs[idx + 1].focus();
        }

        // Se todos preenchidos, auto-submit
        const pin = Array.from(inputs)
          .map((i) => i.value)
          .join("");
        if (pin.length === 4) {
          this._tryUnlock(pin);
        }
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && idx > 0) {
          inputs[idx - 1].focus();
          inputs[idx - 1].value = "";
        }
        if (e.key === "Enter") {
          const pin = Array.from(inputs)
            .map((i) => i.value)
            .join("");
          if (pin.length === 4) {
            this._tryUnlock(pin);
          }
        }
      });

      // Permitir colar PIN
      input.addEventListener("paste", (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData)
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, 4);
        if (pasted.length === 4) {
          pasted.split("").forEach((ch, i) => {
            if (inputs[i]) inputs[i].value = ch;
          });
          this._tryUnlock(pasted);
        }
      });
    });

    // Botão desbloquear
    btnUnlock?.addEventListener("click", () => {
      const pin = Array.from(inputs)
        .map((i) => i.value)
        .join("");
      if (pin.length < 4) {
        errorMsg.textContent = "Digite os 4 dígitos do PIN.";
        return;
      }
      this._tryUnlock(pin);
    });

    // Botão "Esqueci meu PIN"
    btnForgot?.addEventListener("click", async () => {
      await this._showRecovery();
    });

    // Recovery: Voltar
    document
      .getElementById("btn-pin-recovery-back")
      ?.addEventListener("click", () => {
        this._hideRecovery();
      });

    // Recovery: Confirmar
    document
      .getElementById("btn-pin-recovery-confirm")
      ?.addEventListener("click", async () => {
        await this._tryRecovery();
      });
  }

  async _tryUnlock(pin) {
    const storedHash = await dbService.getSetting("pinHash");
    const enteredHash = await this._hash(pin);

    const inputs = document.querySelectorAll("#pin-input-container input");
    const errorMsg = document.getElementById("pin-lock-error");

    if (enteredHash === storedHash) {
      // PIN correto → aplicar pausa se selecionada e desbloquear
      errorMsg.textContent = "";
      const pauseSelect = document.getElementById("pin-pause-select");
      const pauseMinutes = parseInt(pauseSelect?.value || "0", 10);
      if (pauseMinutes > 0) {
        this._setPause(pauseMinutes);
      }
      this._hideOverlay();
    } else {
      // PIN incorreto
      errorMsg.textContent = "PIN incorreto. Tente novamente.";
      inputs.forEach((i) => {
        i.classList.add("pin-error");
        i.value = "";
      });
      inputs[0]?.focus();

      setTimeout(() => {
        inputs.forEach((i) => i.classList.remove("pin-error"));
      }, 500);
    }
  }

  // ==============================
  // Recuperação
  // ==============================

  async _showRecovery() {
    const lockCard = document.getElementById("pin-lock-card");
    const recoveryCard = document.getElementById("pin-recovery-card");
    if (lockCard) lockCard.style.display = "none";
    if (recoveryCard) recoveryCard.style.display = "block";

    // Renderizar perguntas salvas dinamicamente
    const container = document.getElementById(
      "pin-recovery-questions-container",
    );
    const errorMsg = document.getElementById("pin-recovery-error");
    if (errorMsg) errorMsg.textContent = "";

    if (!container) return;
    container.innerHTML = "";

    const storedRecovery = await dbService.getSetting("pinRecovery");
    if (!storedRecovery || !storedRecovery.questions) {
      container.innerHTML =
        '<p style="color: var(--text-secondary); font-size: 13px;">Recuperação não configurada.</p>';
      return;
    }

    storedRecovery.questions.forEach((qIdx, i) => {
      const questionText = PIN_QUESTIONS[qIdx] || `Pergunta ${i + 1}`;
      const div = document.createElement("div");
      div.className = "pin-recovery-question";
      div.innerHTML = `
        <label>${i + 1}. ${questionText}</label>
        <input type="text" id="pin-recovery-answer-${i + 1}" placeholder="Sua resposta..." autocomplete="off" />
      `;
      container.appendChild(div);
    });
  }

  _hideRecovery() {
    const lockCard = document.getElementById("pin-lock-card");
    const recoveryCard = document.getElementById("pin-recovery-card");
    if (lockCard) lockCard.style.display = "block";
    if (recoveryCard) recoveryCard.style.display = "none";
  }

  async _tryRecovery() {
    const a1 = document.getElementById("pin-recovery-answer-1")?.value || "";
    const a2 = document.getElementById("pin-recovery-answer-2")?.value || "";
    const a3 = document.getElementById("pin-recovery-answer-3")?.value || "";
    const errorMsg = document.getElementById("pin-recovery-error");

    if (!a1.trim() || !a2.trim() || !a3.trim()) {
      errorMsg.textContent = "Preencha todas as respostas.";
      return;
    }

    const storedRecovery = await dbService.getSetting("pinRecovery");
    if (!storedRecovery || !storedRecovery.answers) {
      errorMsg.textContent = "Recuperação não configurada.";
      return;
    }

    const h1 = await this._hash(a1);
    const h2 = await this._hash(a2);
    const h3 = await this._hash(a3);

    if (
      h1 === storedRecovery.answers.q1 &&
      h2 === storedRecovery.answers.q2 &&
      h3 === storedRecovery.answers.q3
    ) {
      // Respostas corretas → remover PIN
      await dbService.deleteSetting("pinHash");
      await dbService.deleteSetting("pinRecovery");
      this._hideOverlay();
      this.toast.showToast(
        "success",
        "PIN removido com sucesso! Você pode definir um novo nas configurações.",
      );
    } else {
      errorMsg.textContent = "Respostas incorretas. Tente novamente.";
    }
  }

  // ==============================
  // Configurações (tela de config)
  // ==============================

  /**
   * Carrega o estado atual do PIN na tela de configurações.
   */
  async loadConfigUI() {
    const pinHash = await dbService.getSetting("pinHash");
    const recovery = await dbService.getSetting("pinRecovery");
    const statusEl = document.getElementById("pin-config-status");
    const btnRemove = document.getElementById("btn-remove-pin");
    const pinInput = document.getElementById("pin-config-input");
    const pinConfirm = document.getElementById("pin-config-confirm");

    if (pinHash) {
      // PIN ativo
      if (statusEl) {
        statusEl.textContent = "Ativado";
        statusEl.className = "pin-config-status active";
      }
      if (btnRemove) btnRemove.style.display = "block";
      if (pinInput) pinInput.placeholder = "••••  (já definido)";
      if (pinConfirm) pinConfirm.placeholder = "••••  (já definido)";
    } else {
      // PIN não definido
      if (statusEl) {
        statusEl.textContent = "Desativado";
        statusEl.className = "pin-config-status inactive";
      }
      if (btnRemove) btnRemove.style.display = "none";
      if (pinInput) pinInput.placeholder = "••••";
      if (pinConfirm) pinConfirm.placeholder = "••••";
    }

    // Atualizar botão de pausa
    this._updatePauseButton();

    // Limpar campos
    if (pinInput) pinInput.value = "";
    if (pinConfirm) pinConfirm.value = "";

    // Popular selects de perguntas
    this._populateQuestionSelects();

    // Limpar campos de recovery
    const q1 = document.getElementById("pin-recovery-q1");
    const q2 = document.getElementById("pin-recovery-q2");
    const q3 = document.getElementById("pin-recovery-q3");
    if (q1) q1.value = "";
    if (q2) q2.value = "";
    if (q3) q3.value = "";
  }

  /**
   * Popula os selects com as perguntas disponíveis e sincroniza opções.
   */
  _populateQuestionSelects() {
    const selects = [
      document.getElementById("pin-config-select-q1"),
      document.getElementById("pin-config-select-q2"),
      document.getElementById("pin-config-select-q3"),
    ];

    const buildOptions = () => {
      const selectedValues = selects.map((s) => s?.value || "");

      selects.forEach((select, i) => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML =
          '<option value="">Selecione uma pergunta...</option>';

        PIN_QUESTIONS.forEach((q, idx) => {
          const val = idx.toString();
          // Mostrar se: é o valor selecionado NESTE select, ou não está selecionado em outro
          const usedByOther = selectedValues.some(
            (sv, si) => si !== i && sv === val,
          );
          if (!usedByOther || currentVal === val) {
            const opt = document.createElement("option");
            opt.value = val;
            opt.textContent = q;
            if (currentVal === val) opt.selected = true;
            select.appendChild(opt);
          }
        });
      });
    };

    buildOptions();

    // Ao mudar um select, recalcular opções dos outros
    selects.forEach((select) => {
      if (!select) return;
      // Remover listeners antigos clonando
      const newSelect = select.cloneNode(true);
      select.parentNode.replaceChild(newSelect, select);
    });

    // Refetch após clone
    const freshSelects = [
      document.getElementById("pin-config-select-q1"),
      document.getElementById("pin-config-select-q2"),
      document.getElementById("pin-config-select-q3"),
    ];

    freshSelects.forEach((select) => {
      if (!select) return;
      select.addEventListener("change", () => {
        this._refreshQuestionSelects();
      });
    });
  }

  /**
   * Atualiza as opções dos selects sem resetar as seleções.
   */
  _refreshQuestionSelects() {
    const selects = [
      document.getElementById("pin-config-select-q1"),
      document.getElementById("pin-config-select-q2"),
      document.getElementById("pin-config-select-q3"),
    ];

    const selectedValues = selects.map((s) => s?.value || "");

    selects.forEach((select, i) => {
      if (!select) return;
      const currentVal = select.value;
      select.innerHTML = '<option value="">Selecione uma pergunta...</option>';

      PIN_QUESTIONS.forEach((q, idx) => {
        const val = idx.toString();
        const usedByOther = selectedValues.some(
          (sv, si) => si !== i && sv === val,
        );
        if (!usedByOther || currentVal === val) {
          const opt = document.createElement("option");
          opt.value = val;
          opt.textContent = q;
          if (currentVal === val) opt.selected = true;
          select.appendChild(opt);
        }
      });
    });
  }

  /**
   * Salva o PIN e as perguntas de recuperação.
   */
  async savePin() {
    const pinInput = document.getElementById("pin-config-input");
    const pinConfirm = document.getElementById("pin-config-confirm");
    const selectQ1 = document.getElementById("pin-config-select-q1");
    const selectQ2 = document.getElementById("pin-config-select-q2");
    const selectQ3 = document.getElementById("pin-config-select-q3");
    const q1 = document.getElementById("pin-recovery-q1");
    const q2 = document.getElementById("pin-recovery-q2");
    const q3 = document.getElementById("pin-recovery-q3");

    const pin = pinInput?.value?.trim() || "";
    const confirm = pinConfirm?.value?.trim() || "";
    const selectedQ1 = selectQ1?.value || "";
    const selectedQ2 = selectQ2?.value || "";
    const selectedQ3 = selectQ3?.value || "";
    const r1 = q1?.value?.trim() || "";
    const r2 = q2?.value?.trim() || "";
    const r3 = q3?.value?.trim() || "";

    // Validações
    if (!pin) {
      this.toast.showToast("warning", "Digite um PIN de 4 dígitos.");
      return;
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      this.toast.showToast(
        "warning",
        "O PIN deve conter exatamente 4 dígitos numéricos.",
      );
      return;
    }

    if (pin !== confirm) {
      this.toast.showToast("warning", "Os PINs não coincidem.");
      return;
    }

    if (!selectedQ1 || !selectedQ2 || !selectedQ3) {
      this.toast.showToast(
        "warning",
        "Selecione as 3 perguntas de recuperação.",
      );
      return;
    }

    if (!r1 || !r2 || !r3) {
      this.toast.showToast(
        "warning",
        "Preencha todas as respostas de recuperação.",
      );
      return;
    }

    // Salvar com os índices das perguntas escolhidas
    await dbService.setSetting("pinHash", await this._hash(pin));
    await dbService.setSetting("pinRecovery", {
      questions: [
        parseInt(selectedQ1),
        parseInt(selectedQ2),
        parseInt(selectedQ3),
      ],
      answers: {
        q1: await this._hash(r1),
        q2: await this._hash(r2),
        q3: await this._hash(r3),
      },
    });

    this.toast.showToast("success", "PIN definido com sucesso!");
    await this.loadConfigUI();
  }

  /**
   * Remove o PIN.
   */
  async removePin() {
    await dbService.deleteSetting("pinHash");
    await dbService.deleteSetting("pinRecovery");
    this.toast.showToast("success", "PIN removido com sucesso!");
    await this.loadConfigUI();
  }
}
