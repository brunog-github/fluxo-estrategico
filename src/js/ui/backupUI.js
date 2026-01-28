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

        <!-- ✅ Campo de OTP (inicialmente oculto) -->
        <div id="otp-container" style="display: none; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 8px; font-weight: 500; font-size: 14px;">
            Código recebido no email
          </label>
          <input 
            id="otp-input"
            type="text"
            placeholder="Insira o código de 8 dígitos"
            maxlength="8"
            inputmode="numeric"
            style="
              width: 100%;
              padding: 12px;
              border: 1px solid var(--border-color);
              border-radius: 6px;
              background: var(--input-bg);
              color: var(--text-color);
              box-sizing: border-box;
              font-size: 16px;
              letter-spacing: 2px;
              text-align: center;
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
          Enviar Código
        </button>

        <!-- ✅ Botão para verificar OTP (inicialmente oculto) -->
        <button id="verify-otp-btn" class="backup-modal-btn backup-modal-btn-primary" style="
          display: none;
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
          Verificar Código
        </button>

        <small style="
          display: block;
          text-align: center;
          margin-top: 15px;
          color: var(--text-secondary);
          font-size: 12px;
        ">
          Um código será enviado para seu email.<br>
          Use sempre o mesmo email para evitar conflito de backup.
          <br>(nenhuma senha necessária - confira também a pasta de spam)
        </small>
      `;

      // Event listeners para modal de login
      const closeBtn = modalContent.querySelector("#close-modal");
      const emailInput = modalContent.querySelector("#email-input");
      const sendBtn = modalContent.querySelector("#send-magic-link-btn");
      const otpContainer = modalContent.querySelector("#otp-container");
      const otpInput = modalContent.querySelector("#otp-input");
      const verifyBtn = modalContent.querySelector("#verify-otp-btn");

      closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

      // ✅ Enviar OTP
      sendBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        if (!email) {
          alert("Por favor, insira um email válido");
          return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = "Enviando...";

        // ✅ IMPORTANTE: Iniciar cooldown de 60s IMEDIATAMENTE
        let cooldownSeconds = 60;
        const originalText = "Enviar Código";

        const cooldownInterval = setInterval(() => {
          sendBtn.textContent = `Aguarde ${cooldownSeconds}s...`;
          cooldownSeconds--;

          if (cooldownSeconds < 0) {
            clearInterval(cooldownInterval);
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
          }
        }, 1000);

        const result = await controller.sendOTP(email);

        // ✅ Se enviou com sucesso, mostrar campo de OTP
        if (result.success) {
          sendBtn.style.display = "none";
          otpContainer.style.display = "block";
          verifyBtn.style.display = "block";
          otpInput.focus();
          return;
        }

        // ❌ Se falhou, o cooldown já está rodando
      });

      // ✅ Verificar OTP
      verifyBtn.addEventListener("click", async () => {
        const otp = otpInput.value.trim();
        const email = emailInput.value.trim();

        if (!otp || otp.length !== 8) {
          alert("Por favor, insira um código válido de 8 dígitos");
          return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = "Verificando...";

        const result = await controller.verifyOTP(email, otp);

        if (result.success) {
          setTimeout(() => {
            modal.classList.add("hidden");
            emailInput.value = "";
            otpInput.value = "";
            // Resetar interface
            sendBtn.style.display = "block";
            otpContainer.style.display = "none";
            verifyBtn.style.display = "none";
            verifyBtn.disabled = false;
            verifyBtn.textContent = "Verificar Código";

            // ✅ NOVO: Recarregar página para atualizar estado de autenticação
            window.location.reload();
          }, 500);
          return;
        }

        // ❌ Se falhou, permitir nova tentativa
        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verificar Código";
      });

      // Permitir enviar ao pressionar Enter (campo de email)
      emailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && sendBtn.style.display !== "none") {
          sendBtn.click();
        }
      });

      // Permitir verificar ao pressionar Enter (campo de OTP)
      otpInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && verifyBtn.style.display !== "none") {
          verifyBtn.click();
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

        // ✅ IMPORTANTE: Iniciar cooldown de 60s IMEDIATAMENTE
        let cooldownSeconds = 60;
        const originalText = "Enviar Link";

        const cooldownInterval = setInterval(() => {
          sendBtn.textContent = `Aguarde ${cooldownSeconds}s...`;
          cooldownSeconds--;

          if (cooldownSeconds < 0) {
            clearInterval(cooldownInterval);
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
          }
        }, 1000);

        await controller.sendMagicLink(email);
      });

      this.loginForm = panel;
    }

    // Adicionar ao container ANTES de chamar checkSyncStatus
    container.innerHTML = "";
    container.appendChild(panel);

    // ✅ IMPORTANTE: Chamar DEPOIS de adicionar ao DOM
    if (supabaseService.isAuthenticated()) {
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

          // ✅ Desabilitar todos os botões de restaurar (evita clique duplo)
          const allRestoreButtons = container.querySelectorAll(
            ".restore-backup-btn",
          );
          allRestoreButtons.forEach((b) => {
            b.disabled = true;
            b.style.opacity = "0.5";
            b.style.cursor = "not-allowed";
          });

          try {
            await controller.restoreBackup(fileName);
          } finally {
            // ✅ Re-habilitar botões após operação (sucesso ou erro)
            allRestoreButtons.forEach((b) => {
              b.disabled = false;
              b.style.opacity = "1";
              b.style.cursor = "pointer";
            });
          }
        });
      });
    } else {
      historyList.style.display = "none";
    }
  }

  /**
   * ✅ NOVO: Mostrar banner de atualização disponível
   * Exibido logo abaixo do título da home-screen
   */
  showUpdateBanner(backupInfo) {
    // Remover banner anterior se existir
    const oldBanner = document.getElementById("update-banner-container");
    if (oldBanner) oldBanner.remove();

    // Criar container separado para o banner
    const bannerContainer = document.createElement("div");
    bannerContainer.id = "update-banner-container";
    bannerContainer.style.cssText = `
      padding: 0 0 15px 0;
      margin-bottom: 0;
    `;

    const banner = document.createElement("div");
    banner.id = "update-banner";
    banner.style.cssText = `
      background: linear-gradient(135deg, #ff9800, #f57c00);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 15px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      animation: slideDown 0.3s ease-out;
      width: 100%;
      box-sizing: border-box;
    `;

    const infoText = backupInfo
      ? `
      <strong>Atualização disponível!</strong>
      <small style="display: block; margin-top: 5px; opacity: 0.9;">
        Há dados mais recentes na nuvem (${backupInfo.timestamp}).
        <br>(atualize antes de continuar)
      </small>
    `
      : `
      <strong>Atualização disponível!</strong>
      <small style="display: block; margin-top: 5px; opacity: 0.9;">
        Há dados mais recentes para sincronizar na nuvem.
      </small>
    `;

    banner.innerHTML = `
      <div style="flex: 1;">
        ${infoText}
      </div>
      <button id="banner-dismiss" style="
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.5);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        white-space: nowrap;
      ">Descartar</button>
    `;

    bannerContainer.appendChild(banner);

    // Encontrar o cycle-card e inserir o banner ANTES dele
    const cycleCard = document.querySelector(".cycle-card");
    if (cycleCard && cycleCard.parentNode) {
      cycleCard.parentNode.insertBefore(bannerContainer, cycleCard);
    } else {
      // Fallback: inserir no homeScreen após o header
      const homeScreen =
        document.querySelector(".home-screen") ||
        document.querySelector("main") ||
        document.body;
      homeScreen.insertBefore(
        bannerContainer,
        homeScreen.querySelector(".cycle-card") || homeScreen.firstChild,
      );
    }

    // Listener para descartar
    document.getElementById("banner-dismiss")?.addEventListener("click", () => {
      bannerContainer.remove();
    });
  }

  /**
   * ✅ NOVO: Adicionar confirmação ao modal para restaurar backup
   * Pergunta se o usuário quer mesmo atualizar os dados
   */
  async showRestoreConfirmation(controller, backupInfo) {
    return new Promise((resolve) => {
      const confirmBox = document.createElement("div");
      confirmBox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10003;
      `;

      confirmBox.innerHTML = `
        <div style="
          background: var(--card-bg);
          padding: 30px;
          border-radius: 12px;
          max-width: 500px;
          color: var(--text-color);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          margin: 0 10px;
        ">
          <h3 style="margin-top: 0; color: var(--primary-color);">⚠️ Atualizar dados?</h3>
          <p style="margin: 15px 0; color: var(--text-secondary);">
            Há dados mais recentes na nuvem. Se você continuar, seus dados locais serão substituídos pelos da nuvem.
          </p>
          ${
            backupInfo
              ? `
            <div style="
              background: var(--badge-bg);
              padding: 12px;
              border-radius: 6px;
              margin: 15px 0;
              font-size: 13px;
            ">
              <strong>Backup na nuvem:</strong><br>
              ${backupInfo.timestamp}
            </div>
          `
              : ""
          }
          <p style="color: var(--text-secondary); font-size: 13px; margin: 15px 0;">
            ⚠️ Esta ação não pode ser desfeita!
          </p>
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="confirm-restore" style="
              flex: 1;
              padding: 12px;
              background: var(--primary-color);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
            ">
              Sim, atualizar
            </button>
            <button id="cancel-restore" style="
              flex: 1;
              padding: 12px;
              background: var(--badge-bg);
              color: var(--text-color);
              border: 1px solid var(--border-color);
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
            ">
              Cancelar
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(confirmBox);

      document
        .getElementById("confirm-restore")
        .addEventListener("click", () => {
          confirmBox.remove();
          resolve(true);
        });

      document
        .getElementById("cancel-restore")
        .addEventListener("click", () => {
          confirmBox.remove();
          resolve(false);
        });
    });
  }

  /**
   * ✅ NOVO: Adicionar confirmação para sobrescrever backup no servidor
   * Avisa quando há mudanças locais que vão sobrescrever dados no Supabase
   */
  async showOverwriteConfirmation() {
    return new Promise((resolve) => {
      const confirmBox = document.createElement("div");
      confirmBox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10003;
      `;

      confirmBox.innerHTML = `
        <div style="
          background: var(--card-bg);
          padding: 30px;
          border-radius: 12px;
          max-width: 500px;
          color: var(--text-color);
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          margin: 0 10px;
        ">
          <h3 style="margin-top: 0; color: #f57c00;">⚠️ Sobrescrever dados na nuvem?</h3>
          <p style="margin: 15px 0; color: var(--text-secondary);">
            Você fez alterações que vão sobrescrever o backup mais antigo na nuvem.
          </p>
          <p style="color: var(--text-secondary); font-size: 13px; margin: 15px 0;">
            Certifique-se de que realmente deseja sincronizar esses dados.
          </p>
          <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button id="confirm-overwrite" style="
              flex: 1;
              padding: 12px;
              background: #f57c00;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
            ">
              Sim, sincronizar
            </button>
            <button id="cancel-overwrite" style="
              flex: 1;
              padding: 12px;
              background: var(--badge-bg);
              color: var(--text-color);
              border: 1px solid var(--border-color);
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
            ">
              Cancelar
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(confirmBox);

      document
        .getElementById("confirm-overwrite")
        .addEventListener("click", () => {
          confirmBox.remove();
          resolve(true);
        });

      document
        .getElementById("cancel-overwrite")
        .addEventListener("click", () => {
          confirmBox.remove();
          resolve(false);
        });
    });
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
