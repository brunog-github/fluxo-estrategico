import { supabaseService } from "../services/supabase/supabase-service.js";

export class BackupUI {
  constructor(confirmToast) {
    this.confirm = confirmToast;
    this.syncButton = null;
    this.loginForm = null;
    this.backupPanel = null;
    this.modalClickListenerAdded = false; // ✅ Flag para controlar listener de clique fora
  }

  /**
   * Renderizar botão de sincronização no header da tela inicial
   */
  async renderHeaderButton(container, controller) {
    if (!container) return;

    // Limpar container anterior
    container.innerHTML = "";

    const button = document.createElement("button");
    button.id = "sync-button";

    // Se autenticado, inicializar com estado correto
    if (supabaseService.isAuthenticated()) {
      // ✅ NÃO definir estado aqui, deixar que checkSyncStatus() faça isso
      button.innerHTML = `
        <span class="sync-icon">⟳</span>
        <span class="sync-text">Verificando...</span>
      `;
      button.className = "sync-btn loading";
      button.title = "Verificando status...";

      button.addEventListener("click", async (e) => {
        e.preventDefault();
        // Abrir modal com informações de backup
        await this.showBackupModal(controller);
      });

      this.syncButton = button;
      container.appendChild(button);

      // ✅ Verificar status de backup imediatamente após adicionar ao DOM
      console.log("[HeaderUI] Verificando status de backup imediatamente...");
      await controller.checkSyncStatus();
    } else {
      // Não autenticado - estado offline
      button.innerHTML = `
        <span class="sync-icon">⊘</span>
        <span class="sync-text">Offline</span>
      `;
      button.className = "sync-btn offline";
      button.title = "Clique para fazer login";
      button.disabled = false; // ✅ Agora é clicável
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        // Abrir modal com formulário de login
        await this.showBackupModal(controller);
      });
      this.syncButton = button;
      container.appendChild(button);
    }
  }

  /**
   * Mostrar modal de backup (login ou detalhes)
   */
  async showBackupModal(controller) {
    // Usar o container do modal que já existe no HTML
    const modal = document.getElementById("modal-backup");
    if (!modal) {
      console.error("[BACKUP] Modal container não encontrado");
      return;
    }

    const modalContent = modal.querySelector(".backup-modal-container");
    if (!modalContent) {
      console.error("[BACKUP] Modal content container não encontrado");
      return;
    }

    // Limpar conteúdo anterior
    modalContent.innerHTML = "";

    // Se autenticado - mostrar informações de backup
    if (supabaseService.isAuthenticated()) {
      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">☁️ Backup Online</h2>
          <button id="close-modal" class="backup-modal-btn-close" style="
            background: transparent;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-color);
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">✕</button>
        </div>

        <div style="
          background: var(--badge-bg);
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        ">
          <p style="margin: 0 0 5px 0; color: var(--text-secondary); font-size: 13px;">
            Conectado como
          </p>
          <p style="margin: 0; font-weight: bold; font-size: 15px;">
            ${supabaseService.getUserEmail()}
          </p>
        </div>

        <button id="sync-now-btn" class="backup-modal-btn backup-modal-btn-primary" style="
          width: 100%;
          padding: 12px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          margin-bottom: 15px;
          transition: background 0.3s ease;
        ">
          ⟳ Sincronizar Agora
        </button>

        <button id="history-btn" class="backup-modal-btn backup-modal-btn-secondary" style="
          width: 100%;
          padding: 12px;
          background: transparent;
          color: var(--primary-color);
          border: 2px solid var(--primary-color);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 15px;
          transition: all 0.3s ease;
        ">
          📋 Histórico de Backups
        </button>

        <button id="logout-btn" class="backup-modal-btn backup-modal-btn-danger" style="
          width: 100%;
          padding: 12px;
          background: transparent;
          color: #f44336;
          border: 2px solid #f44336;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        ">
          🚪 Desconectar
        </button>

        <div id="history-container" style="margin-top: 20px; display: none;">
          <h3 style="margin: 15px 0 10px 0;">Histórico de Backups</h3>
          <div id="backups-list" style="max-height: 300px; overflow-y: auto;">
            <p style="text-align: center; color: var(--text-secondary);">Carregando...</p>
          </div>
        </div>
      `;

      // Event listeners para modal autenticado
      modalContent
        .querySelector("#close-modal")
        .addEventListener("click", () => modal.classList.add("hidden"));

      const syncNowBtn = modalContent.querySelector("#sync-now-btn");

      // Verificar estado atual do botão do header para determinar se há mudanças
      const headerButton = document.querySelector("#sync-button");
      const hasChanges =
        headerButton && headerButton.classList.contains("needs-sync");

      // Se não há mudanças, desabilitar o botão de sincronizar no modal
      if (!hasChanges) {
        syncNowBtn.disabled = true;
        syncNowBtn.style.opacity = "0.6";
        syncNowBtn.style.cursor = "not-allowed";
        syncNowBtn.title = "Não há mudanças para sincronizar";
      }

      syncNowBtn.addEventListener("click", async () => {
        const btn = modalContent.querySelector("#sync-now-btn");
        btn.disabled = true;
        btn.textContent = "Sincronizando...";
        await controller.syncBackupNow();

        // ✅ Após sincronizar, sempre desabilitar o botão (dados agora estão em sync)
        btn.disabled = true;
        btn.style.opacity = "0.6";
        btn.style.cursor = "not-allowed";
        btn.title = "Não há mudanças para sincronizar";
        btn.textContent = "⟳ Sincronizar Agora";

        // ✅ Fechar modal automaticamente após sincronização bem-sucedida
        setTimeout(() => {
          modal.classList.add("hidden");
        }, 500);
      });

      modalContent
        .querySelector("#history-btn")
        .addEventListener("click", async () => {
          const container = modalContent.querySelector("#history-container");
          const historyBtn = modalContent.querySelector("#history-btn");

          if (container.style.display === "none") {
            container.style.display = "block";
            historyBtn.style.opacity = "0.6";
            await this._renderBackupHistory(modalContent, controller);
          } else {
            container.style.display = "none";
            historyBtn.style.opacity = "1";
          }
        });

      modalContent
        .querySelector("#logout-btn")
        .addEventListener("click", async () => {
          // ✅ Usar confirmController ao invés de alert do navegador
          this.confirm.confirm(
            "Tem certeza que deseja desconectar?",
            async () => {
              await controller.logout();
              modal.classList.add("hidden");
            },
          );
        });
    } else {
      // Não autenticado - mostrar formulário de login
      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0;">🔐 Backup Online</h2>
          <button id="close-modal" class="backup-modal-btn-close" style="
            background: transparent;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-color);
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">✕</button>
        </div>

        <p style="
          text-align: center;
          color: var(--text-secondary);
          margin-bottom: 20px;
          font-size: 14px;
        ">
          Sincronize seus dados com segurança usando um link de login único
        </p>

        <div style="margin-bottom: 15px;">
          <input
            id="email-input"
            type="email"
            placeholder="seu.email@exemplo.com"
            style="
              width: 100%;
              padding: 12px;
              border: 1px solid var(--border-color);
              border-radius: 6px;
              background: var(--input-bg);
              color: var(--text-color);
              box-sizing: border-box;
              font-size: 14px;
            "
          />
        </div>

        <button id="send-magic-link-btn" class="backup-modal-btn backup-modal-btn-primary" style="
          width: 100%;
          padding: 12px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.3s ease;
        ">
          Enviar Link de Acesso
        </button>

        <small style="
          display: block;
          text-align: center;
          margin-top: 15px;
          color: var(--text-secondary);
          font-size: 12px;
        ">
          Você receberá um link de acesso no seu email<br>
          (nenhuma senha necessária - confira também a pasta de spam)
        </small>
      `;

      // Event listeners para modal de login
      const closeBtn = modalContent.querySelector("#close-modal");
      const emailInput = modalContent.querySelector("#email-input");
      const sendBtn = modalContent.querySelector("#send-magic-link-btn");

      closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

      sendBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        if (!email) {
          alert("Por favor, insira um email válido");
          return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = "Enviando...";

        await controller.sendMagicLink(email);

        // ✅ Bloquear botão por 60 segundos com contador regressivo (cooldown do Supabase)
        let cooldownSeconds = 60;
        const originalText = "Enviar Link de Acesso";

        const cooldownInterval = setInterval(() => {
          sendBtn.textContent = `Aguarde ${cooldownSeconds}s...`;
          cooldownSeconds--;

          if (cooldownSeconds < 0) {
            clearInterval(cooldownInterval);
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
          }
        }, 1000);
      });

      // Permitir enviar ao pressionar Enter
      emailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          sendBtn.click();
        }
      });
    }

    // ✅ Mostrar modal
    modal.classList.remove("hidden");

    // ✅ Fechar ao clicar fora do modal (apenas uma vez)
    if (!this.modalClickListenerAdded) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.add("hidden");
        }
      });
      this.modalClickListenerAdded = true;
    }
  }

  /**
   * Renderizar histórico de backups no modal
   */
  async _renderBackupHistory(modalContent, controller) {
    const container = modalContent.querySelector("#backups-list");

    const history = await controller.getBackupHistory();

    if (history.length === 0) {
      container.innerHTML =
        "<p style='text-align: center; color: var(--text-secondary);'>Nenhum backup encontrado</p>";
      return;
    }

    container.innerHTML = history
      .map(
        (backup) => `
      <div style="
        padding: 12px;
        margin-bottom: 10px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--badge-bg);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      ">
        <div style="flex: 1;">
          <strong style="display: block; font-size: 14px;">
            ${new Date(backup.synced_at).toLocaleString("pt-BR")}
          </strong>
          <small style="display: block; color: var(--text-secondary); font-size: 12px;">
            ${(backup.backup_size / 1024).toFixed(2)} KB
          </small>
        </div>
        <button class="restore-backup-btn" data-filename="${backup.file_name}" style="
          padding: 8px 12px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          white-space: nowrap;
          transition: background 0.3s ease;
        ">
          Restaurar
        </button>
      </div>
    `,
      )
      .join("");

    // Event listeners para restaurar
    container.querySelectorAll(".restore-backup-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const fileName = btn.getAttribute("data-filename");
        // ✅ Usar confirmController ao invés de alert do navegador
        this.confirm.confirm(
          "Tem certeza que deseja restaurar este backup? Seus dados atuais serão substituídos.",
          async () => {
            await controller.restoreBackup(fileName);
            // Fechar o modal após restaurar
            const modal = document.getElementById("modal-backup");
            if (modal) modal.classList.add("hidden");
          },
        );
      });
    });
  }

  /**
   * Renderizar panel de backup na tela de configurações
   */
  async renderBackupPanel(container, controller) {
    if (!container) return;

    const panel = document.createElement("div");
    panel.id = "backup-panel";
    panel.style.cssText = `
      padding: 20px;
      border-radius: 8px;
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      margin-bottom: 20px;
    `;

    // Se autenticado
    if (supabaseService.isAuthenticated()) {
      panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div>
            <h3 style="margin: 0 0 5px 0;">Backup Online</h3>
            <small style="color: var(--text-secondary);">
              Sincronizado como: <strong>${supabaseService.getUserEmail()}</strong>
            </small>
          </div>
          <button id="sync-button" class="sync-btn synced" title="Sincronizado">
            <span class="sync-icon">✓</span>
            <span class="sync-text">Sincronizado</span>
          </button>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="history-button" class="btn-secondary" style="flex: 1; min-width: 150px;">
            📋 Histórico de Backups
          </button>
          <button id="logout-button" class="btn-secondary" style="flex: 1; min-width: 150px;">
            🚪 Desconectar
          </button>
        </div>

        <div id="history-list" style="margin-top: 15px; display: none;">
          <h4>Histórico de Backups</h4>
          <div id="backups-container" style="max-height: 300px; overflow-y: auto;">
            <!-- Carregado dinamicamente -->
          </div>
        </div>
      `;

      // Event listeners
      const syncBtn = panel.querySelector("#sync-button");
      syncBtn.addEventListener("click", async () => {
        if (!syncBtn.classList.contains("synced")) {
          await controller.syncBackupNow();
        }
      });

      const historyBtn = panel.querySelector("#history-button");
      historyBtn.addEventListener("click", async () => {
        await this._showBackupHistory(panel, controller);
      });

      const logoutBtn = panel.querySelector("#logout-button");
      logoutBtn.addEventListener("click", async () => {
        await controller.logout();
        await this.renderBackupPanel(container, controller);
      });

      this.syncButton = syncBtn;
    } else {
      // Se não autenticado - mostrar formulário de login
      panel.innerHTML = `
        <div style="text-align: center; padding: 20px 0;">
          <h3 style="margin-bottom: 15px;">🔐 Backup Online com Magic Link</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">
            Sincronize seus dados com segurança usando um link de login único
          </p>

          <div style="display: flex; gap: 10px;">
            <input 
              id="email-input" 
              type="email" 
              placeholder="seu.email@exemplo.com"
              style="flex: 1; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-color);"
            />
            <button id="send-magic-link-btn" class="btn-primary" style="padding: 10px 20px;">
              Enviar Link
            </button>
          </div>

          <small style="display: block; margin-top: 10px; color: var(--text-secondary);">
            Você receberá um link de acesso no seu email - nenhuma senha necessária!
          </small>
        </div>
      `;

      const sendBtn = panel.querySelector("#send-magic-link-btn");
      const emailInput = panel.querySelector("#email-input");

      sendBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        if (!email) {
          alert("Por favor, insira um email válido");
          return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = "Enviando...";

        await controller.sendMagicLink(email);

        sendBtn.disabled = false;
        sendBtn.textContent = "Enviar Link";
      });

      this.loginForm = panel;
    }

    // Adicionar ao container ANTES de chamar checkSyncStatus
    container.innerHTML = "";
    container.appendChild(panel);

    // ✅ IMPORTANTE: Chamar DEPOIS de adicionar ao DOM
    if (supabaseService.isAuthenticated()) {
      console.log("[UI] Verificando status de backup imediatamente...");
      await controller.checkSyncStatus();
    }
  }

  /**
   * Definir estado do botão de sincronização
   */
  setSyncButtonState(state) {
    // Encontrar o botão sempre (em caso de re-renderização)
    const syncBtn = document.querySelector("#sync-button");
    if (!syncBtn) {
      console.warn("[UI] Botão de sincronização não encontrado");
      return;
    }

    const states = {
      synced: {
        className: "sync-btn synced",
        icon: "✓",
        text: "Sincronizado",
        title: "Clique para ver detalhes de backup",
      },
      needsSync: {
        className: "sync-btn needs-sync",
        icon: "●",
        text: "Sincronizar",
        title: "Clique para sincronizar",
      },
      loading: {
        className: "sync-btn loading",
        icon: "⟳",
        text: "Sincronizando...",
        title: "Sincronizando...",
      },
      error: {
        className: "sync-btn error",
        icon: "⚠",
        text: "Erro",
        title: "Erro ao sincronizar",
      },
      offline: {
        className: "sync-btn offline",
        icon: "⊘",
        text: "Offline",
        title: "Clique para fazer login",
      },
    };

    const stateData = states[state] || states.offline;

    syncBtn.className = stateData.className;
    // ✅ IMPORTANTE: O botão do header SEMPRE habilitado para abrir o modal
    syncBtn.disabled = false;
    syncBtn.title = stateData.title;

    const icon = syncBtn.querySelector(".sync-icon");
    const text = syncBtn.querySelector(".sync-text");

    if (icon) icon.textContent = stateData.icon;
    if (text) text.textContent = stateData.text;

    // Guardar referência para acesso rápido
    this.syncButton = syncBtn;
  }

  /**
   * Mostrar formulário de login
   */
  showLoginForm() {
    // Apenas disparar re-renderização (será chamado do controller)
    console.log("[UI] showLoginForm chamado");
  }

  /**
   * Mostrar histórico de backups
   */
  async _showBackupHistory(panel, controller) {
    const historyList = panel.querySelector("#history-list");
    const container = panel.querySelector("#backups-container");

    if (historyList.style.display === "none") {
      historyList.style.display = "block";
      container.innerHTML = "<p>Carregando...</p>";

      const history = await controller.getBackupHistory();

      if (history.length === 0) {
        container.innerHTML =
          "<p style='color: var(--text-secondary);'>Nenhum backup encontrado</p>";
        return;
      }

      container.innerHTML = history
        .map(
          (backup) => `
        <div style="
          padding: 10px;
          margin-bottom: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background: rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div>
            <strong>${new Date(backup.synced_at).toLocaleString("pt-BR")}</strong>
            <small style="display: block; color: var(--text-secondary);">
              ${(backup.backup_size / 1024).toFixed(2)} KB
            </small>
          </div>
          <button class="restore-backup-btn" data-filename="${backup.file_name}" style="
            padding: 6px 12px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
          ">
            Restaurar
          </button>
        </div>
      `,
        )
        .join("");

      // Event listeners para restaurar
      container.querySelectorAll(".restore-backup-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const fileName = btn.getAttribute("data-filename");
          await controller.restoreBackup(fileName);
        });
      });
    } else {
      historyList.style.display = "none";
    }
  }

  /**
   * Mostrar mensagem de magic-link enviado
   */
  showMagicLinkSent(email) {
    const msg = document.createElement("div");
    msg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4caf50;
      color: white;
      padding: 15px 20px;
      border-radius: 4px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    msg.innerHTML = `
      ✅ Link de acesso enviado para <strong>${email}</strong><br>
      <small>Confira seu email (incluindo spam)</small>
    `;
    document.body.appendChild(msg);

    setTimeout(() => msg.remove(), 5000);
  }
}
