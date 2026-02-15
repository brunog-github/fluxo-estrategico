import { supabaseService } from "../services/supabase/supabase-service.js";

export class BackupUI {
  constructor(confirmToast, toast) {
    this.confirm = confirmToast;
    this.toast = toast;
    this.syncButton = null;
    this.loginForm = null;
    this.backupPanel = null;
    this.modalClickListenerAdded = false; // ✅ Flag para controlar listener de clique fora
  }

  /**
   * Renderizar botão de sincronização no header da tela inicial
   */
  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

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

        <button id="change-pw-btn" class="backup-modal-btn" style="
          width: 100%;
          padding: 12px;
          background: transparent;
          color: var(--text-color);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          margin-bottom: 10px;
          transition: all 0.3s ease;
        ">
          🔑 Alterar Senha
        </button>

        <!-- Container de alterar senha (inicialmente oculto) -->
        <div id="change-pw-form" style="display: none; margin-bottom: 15px;">
          <div style="margin-bottom: 8px; position: relative;">
            <input
              id="new-pw-input"
              type="password"
              placeholder="Nova senha"
              autocomplete="new-password"
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
          <div id="change-pw-requirements" class="pw-requirements" style="display: none;"></div>
          <div style="margin-bottom: 8px;">
            <input
              id="new-pw-confirm-input"
              type="password"
              placeholder="Confirme a nova senha"
              autocomplete="new-password"
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
            <small id="change-pw-match-msg" style="display: none; margin-top: 4px; font-size: 12px;"></small>
          </div>
          <button id="save-pw-btn" class="backup-modal-btn backup-modal-btn-primary" style="
            width: 100%;
            padding: 10px;
            background: var(--primary-color);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
          ">
            Salvar Nova Senha
          </button>
        </div>

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

      // ----- Alterar senha -----
      const changePwBtn = modalContent.querySelector("#change-pw-btn");
      const changePwForm = modalContent.querySelector("#change-pw-form");
      const newPwInput = modalContent.querySelector("#new-pw-input");
      const newPwConfirmInput = modalContent.querySelector(
        "#new-pw-confirm-input",
      );
      const savePwBtn = modalContent.querySelector("#save-pw-btn");
      const changePwMatchMsg = modalContent.querySelector(
        "#change-pw-match-msg",
      );
      const changePwReqs = modalContent.querySelector(
        "#change-pw-requirements",
      );

      // Gerar indicadores de requisitos para alterar senha
      changePwReqs.innerHTML = `
        <span id="chg-req-length" class="pw-req">✗ Mínimo 6 caracteres</span>
        <span id="chg-req-lower" class="pw-req">✗ Letra minúscula</span>
        <span id="chg-req-upper" class="pw-req">✗ Letra maiúscula</span>
        <span id="chg-req-digit" class="pw-req">✗ Número</span>
        <span id="chg-req-symbol" class="pw-req">✗ Símbolo (!@#$...)</span>
      `;

      const checkChangePwReqs = (password) => {
        const reqs = {
          length: password.length >= 6,
          lower: /[a-z]/.test(password),
          upper: /[A-Z]/.test(password),
          digit: /[0-9]/.test(password),
          symbol: /[^a-zA-Z0-9]/.test(password),
        };
        const updateReq = (id, ok) => {
          const el = modalContent.querySelector(`#chg-req-${id}`);
          if (el) {
            el.classList.toggle("met", ok);
            el.textContent = (ok ? "✓ " : "✗ ") + el.textContent.substring(2);
          }
        };
        updateReq("length", reqs.length);
        updateReq("lower", reqs.lower);
        updateReq("upper", reqs.upper);
        updateReq("digit", reqs.digit);
        updateReq("symbol", reqs.symbol);
        return (
          reqs.length && reqs.lower && reqs.upper && reqs.digit && reqs.symbol
        );
      };

      changePwBtn.addEventListener("click", () => {
        const isVisible = changePwForm.style.display !== "none";
        changePwForm.style.display = isVisible ? "none" : "block";
        if (!isVisible) newPwInput.focus();
      });

      newPwInput.addEventListener("input", () => {
        const pw = newPwInput.value;
        changePwReqs.style.display = pw.length > 0 ? "flex" : "none";
        checkChangePwReqs(pw);
        if (newPwConfirmInput.value.length > 0) {
          const match = newPwInput.value === newPwConfirmInput.value;
          changePwMatchMsg.style.display = "block";
          changePwMatchMsg.textContent = match
            ? "✓ Senhas coincidem"
            : "✗ Senhas não coincidem";
          changePwMatchMsg.style.color = match ? "#4caf50" : "#f44336";
        }
      });

      newPwConfirmInput.addEventListener("input", () => {
        const match = newPwInput.value === newPwConfirmInput.value;
        changePwMatchMsg.style.display = "block";
        changePwMatchMsg.textContent = match
          ? "✓ Senhas coincidem"
          : "✗ Senhas não coincidem";
        changePwMatchMsg.style.color = match ? "#4caf50" : "#f44336";
      });

      savePwBtn.addEventListener("click", async () => {
        const newPw = newPwInput.value;
        if (!checkChangePwReqs(newPw)) {
          this.toast.showToast(
            "warning",
            "A senha não cumpre todos os requisitos",
          );
          return;
        }
        if (newPw !== newPwConfirmInput.value) {
          this.toast.showToast("warning", "As senhas não coincidem");
          return;
        }
        savePwBtn.disabled = true;
        savePwBtn.textContent = "Salvando...";
        const result = await controller.changePassword(newPw);
        if (result.success) {
          changePwForm.style.display = "none";
          newPwInput.value = "";
          newPwConfirmInput.value = "";
          changePwMatchMsg.style.display = "none";
          changePwReqs.style.display = "none";
        }
        savePwBtn.disabled = false;
        savePwBtn.textContent = "Salvar Nova Senha";
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
      // Não autenticado - mostrar formulário de login com abas
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

        <!-- ✅ Abas de login -->
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="password">Email e Senha</button>
          <button class="auth-tab" data-tab="otp">Código por Email</button>
        </div>

        <!-- ==================== ABA: EMAIL/SENHA ==================== -->
        <div id="tab-password" class="auth-tab-content active">

          <!-- ===== VIEW: LOGIN ===== -->
          <div id="pw-view-login">
            <p style="
              text-align: center;
              color: var(--text-secondary);
              margin-bottom: 16px;
              font-size: 14px;
            ">
              Faça login para sincronizar seus dados
            </p>

            <div style="margin-bottom: 12px;">
              <input
                id="login-email-input"
                type="email"
                placeholder="seu.email@exemplo.com"
                autocomplete="email"
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

            <div style="margin-bottom: 12px; position: relative;">
              <input
                id="login-password-input"
                type="password"
                placeholder="Sua senha"
                autocomplete="current-password"
                style="
                  width: 100%;
                  padding: 12px;
                  padding-right: 44px;
                  border: 1px solid var(--border-color);
                  border-radius: 6px;
                  background: var(--input-bg);
                  color: var(--text-color);
                  box-sizing: border-box;
                  font-size: 14px;
                "
              />
              <button id="login-toggle-pw" type="button" style="
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                background: transparent;
                border: none;
                cursor: pointer;
                color: var(--text-secondary);
                font-size: 18px;
                padding: 4px;
              ">👁</button>
            </div>

            <button id="signin-btn" class="backup-modal-btn backup-modal-btn-primary" style="
              width: 100%;
              padding: 12px;
              background: var(--primary-color);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              transition: background 0.3s ease;
              margin-bottom: 10px;
            ">
              Entrar
            </button>

            <button id="forgot-pw-btn" type="button" style="
              display: block;
              margin: 0 auto 14px;
              background: transparent;
              border: none;
              color: var(--primary-color);
              font-size: 13px;
              cursor: pointer;
              text-decoration: underline;
              padding: 0;
            ">
              Esqueci minha senha
            </button>

            <p style="text-align: center; font-size: 13px; color: var(--text-secondary); margin: 0;">
              Não tem conta?
              <button id="goto-signup" type="button" style="
                background: transparent;
                border: none;
                color: var(--primary-color);
                font-size: 13px;
                cursor: pointer;
                text-decoration: underline;
                padding: 0;
                font-weight: 600;
              ">Criar conta</button>
            </p>
          </div>

          <!-- ===== VIEW: CRIAR CONTA ===== -->
          <div id="pw-view-signup" style="display: none;">
            <p style="
              text-align: center;
              color: var(--text-secondary);
              margin-bottom: 16px;
              font-size: 14px;
            ">
              Crie sua conta para sincronizar seus dados
            </p>

            <div style="margin-bottom: 12px;">
              <input
                id="signup-email-input"
                type="email"
                placeholder="seu.email@exemplo.com"
                autocomplete="email"
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

            <div style="margin-bottom: 4px; position: relative;">
              <input
                id="signup-password-input"
                type="password"
                placeholder="Crie sua senha"
                autocomplete="new-password"
                style="
                  width: 100%;
                  padding: 12px;
                  padding-right: 44px;
                  border: 1px solid var(--border-color);
                  border-radius: 6px;
                  background: var(--input-bg);
                  color: var(--text-color);
                  box-sizing: border-box;
                  font-size: 14px;
                "
              />
              <button id="signup-toggle-pw" type="button" style="
                position: absolute;
                right: 8px;
                top: 50%;
                transform: translateY(-50%);
                background: transparent;
                border: none;
                cursor: pointer;
                color: var(--text-secondary);
                font-size: 18px;
                padding: 4px;
              ">👁</button>
            </div>

            <div id="pw-requirements" class="pw-requirements" style="display: none;">
              <span id="req-length" class="pw-req">✗ Mínimo 6 caracteres</span>
              <span id="req-lower" class="pw-req">✗ Letra minúscula</span>
              <span id="req-upper" class="pw-req">✗ Letra maiúscula</span>
              <span id="req-digit" class="pw-req">✗ Número</span>
              <span id="req-symbol" class="pw-req">✗ Símbolo (!@#$...)</span>
            </div>

            <div style="margin-bottom: 12px;">
              <input
                id="signup-confirm-input"
                type="password"
                placeholder="Confirme sua senha"
                autocomplete="new-password"
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
              <small id="pw-match-msg" style="display: none; margin-top: 4px; font-size: 12px;"></small>
            </div>

            <button id="signup-submit-btn" class="backup-modal-btn backup-modal-btn-primary" style="
              width: 100%;
              padding: 12px;
              background: var(--primary-color);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
              transition: background 0.3s ease;
              margin-bottom: 14px;
            ">
              Criar Conta
            </button>

            <p style="text-align: center; font-size: 13px; color: var(--text-secondary); margin: 0;">
              Já tem conta?
              <button id="goto-login" type="button" style="
                background: transparent;
                border: none;
                color: var(--primary-color);
                font-size: 13px;
                cursor: pointer;
                text-decoration: underline;
                padding: 0;
                font-weight: 600;
              ">Entrar</button>
            </p>
          </div>

          <small style="
            display: block;
            text-align: center;
            margin-top: 10px;
            color: var(--text-secondary);
            font-size: 12px;
          ">
            Use sempre o mesmo email para evitar conflito de backup.
          </small>
        </div>

        <!-- ==================== ABA: OTP (CÓDIGO) ==================== -->
        <div id="tab-otp" class="auth-tab-content">
          <p style="
            text-align: center;
            color: var(--text-secondary);
            margin-bottom: 16px;
            font-size: 14px;
          ">
            Receba um código no seu email — sem precisar de senha
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

          <!-- Campo de OTP (inicialmente oculto) -->
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

          <!-- Botão para verificar OTP (inicialmente oculto) -->
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
        </div>
      `;

      // ===== Event listeners =====
      const closeBtn = modalContent.querySelector("#close-modal");
      closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

      // ----- Abas -----
      const tabs = modalContent.querySelectorAll(".auth-tab");
      const tabContents = modalContent.querySelectorAll(".auth-tab-content");

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.forEach((t) => t.classList.remove("active"));
          tabContents.forEach((c) => c.classList.remove("active"));
          tab.classList.add("active");
          const target = modalContent.querySelector(`#tab-${tab.dataset.tab}`);
          if (target) target.classList.add("active");
        });
      });

      // ----- Aba Email/Senha: Views Login / Signup -----
      const viewLogin = modalContent.querySelector("#pw-view-login");
      const viewSignup = modalContent.querySelector("#pw-view-signup");

      const showView = (view) => {
        viewLogin.style.display = view === "login" ? "block" : "none";
        viewSignup.style.display = view === "signup" ? "block" : "none";
      };

      modalContent
        .querySelector("#goto-signup")
        .addEventListener("click", () => showView("signup"));
      modalContent
        .querySelector("#goto-login")
        .addEventListener("click", () => showView("login"));

      // ===== VIEW LOGIN =====
      const loginEmailInput = modalContent.querySelector("#login-email-input");
      const loginPasswordInput = modalContent.querySelector(
        "#login-password-input",
      );
      const signInBtn = modalContent.querySelector("#signin-btn");
      const loginTogglePw = modalContent.querySelector("#login-toggle-pw");
      const forgotPwBtn = modalContent.querySelector("#forgot-pw-btn");

      loginTogglePw.addEventListener("click", () => {
        const isPassword = loginPasswordInput.type === "password";
        loginPasswordInput.type = isPassword ? "text" : "password";
        loginTogglePw.textContent = isPassword ? "🙈" : "👁";
      });

      signInBtn.addEventListener("click", async () => {
        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;
        if (!this._isValidEmail(email)) {
          this.toast.showToast("warning", "Por favor, insira um email válido");
          return;
        }
        if (!password || password.length < 6) {
          this.toast.showToast(
            "warning",
            "A senha deve ter pelo menos 6 caracteres",
          );
          return;
        }

        signInBtn.disabled = true;
        signInBtn.textContent = "Entrando...";

        const result = await controller.signIn(email, password);

        if (result.success) {
          setTimeout(() => {
            modal.classList.add("hidden");
            window.location.reload();
          }, 500);
          return;
        }

        signInBtn.disabled = false;
        signInBtn.textContent = "Entrar";
      });

      forgotPwBtn.addEventListener("click", async () => {
        const email = loginEmailInput.value.trim();
        if (!this._isValidEmail(email)) {
          this.toast.showToast(
            "warning",
            "Insira seu email acima para receber o link de redefinição",
          );
          loginEmailInput.focus();
          return;
        }
        forgotPwBtn.disabled = true;
        forgotPwBtn.textContent = "Enviando...";
        await controller.resetPassword(email);
        forgotPwBtn.disabled = false;
        forgotPwBtn.textContent = "Esqueci minha senha";
      });

      loginEmailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") loginPasswordInput.focus();
      });
      loginPasswordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") signInBtn.click();
      });

      // ===== VIEW SIGNUP =====
      const signupEmailInput = modalContent.querySelector(
        "#signup-email-input",
      );
      const signupPasswordInput = modalContent.querySelector(
        "#signup-password-input",
      );
      const signupConfirmInput = modalContent.querySelector(
        "#signup-confirm-input",
      );
      const signupSubmitBtn = modalContent.querySelector("#signup-submit-btn");
      const signupTogglePw = modalContent.querySelector("#signup-toggle-pw");
      const pwRequirements = modalContent.querySelector("#pw-requirements");
      const pwMatchMsg = modalContent.querySelector("#pw-match-msg");

      signupTogglePw.addEventListener("click", () => {
        const isPassword = signupPasswordInput.type === "password";
        signupPasswordInput.type = isPassword ? "text" : "password";
        signupConfirmInput.type = isPassword ? "text" : "password";
        signupTogglePw.textContent = isPassword ? "🙈" : "👁";
      });

      const checkPasswordRequirements = (password) => {
        const reqs = {
          length: password.length >= 6,
          lower: /[a-z]/.test(password),
          upper: /[A-Z]/.test(password),
          digit: /[0-9]/.test(password),
          symbol: /[^a-zA-Z0-9]/.test(password),
        };
        const updateReq = (id, ok) => {
          const el = modalContent.querySelector(`#req-${id}`);
          if (el) {
            el.classList.toggle("met", ok);
            el.textContent = (ok ? "✓ " : "✗ ") + el.textContent.substring(2);
          }
        };
        updateReq("length", reqs.length);
        updateReq("lower", reqs.lower);
        updateReq("upper", reqs.upper);
        updateReq("digit", reqs.digit);
        updateReq("symbol", reqs.symbol);
        return (
          reqs.length && reqs.lower && reqs.upper && reqs.digit && reqs.symbol
        );
      };

      signupPasswordInput.addEventListener("input", () => {
        const pw = signupPasswordInput.value;
        pwRequirements.style.display = pw.length > 0 ? "flex" : "none";
        checkPasswordRequirements(pw);
        if (signupConfirmInput.value.length > 0) checkSignupMatch();
      });

      const checkSignupMatch = () => {
        const match = signupPasswordInput.value === signupConfirmInput.value;
        pwMatchMsg.style.display = "block";
        pwMatchMsg.textContent = match
          ? "✓ Senhas coincidem"
          : "✗ Senhas não coincidem";
        pwMatchMsg.style.color = match ? "#4caf50" : "#f44336";
        return match;
      };

      signupConfirmInput.addEventListener("input", checkSignupMatch);

      signupSubmitBtn.addEventListener("click", async () => {
        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value;
        if (!this._isValidEmail(email)) {
          this.toast.showToast("warning", "Por favor, insira um email válido");
          return;
        }
        if (!password || password.length < 6) {
          this.toast.showToast(
            "warning",
            "A senha deve ter pelo menos 6 caracteres",
          );
          return;
        }
        if (!checkPasswordRequirements(password)) {
          this.toast.showToast(
            "warning",
            "A senha não cumpre todos os requisitos (minúscula, maiúscula, número e símbolo)",
          );
          return;
        }
        if (signupConfirmInput.value !== password) {
          this.toast.showToast("warning", "As senhas não coincidem");
          return;
        }

        signupSubmitBtn.disabled = true;
        signupSubmitBtn.textContent = "Criando conta...";

        const result = await controller.signUp(email, password);

        if (result.success && !result.needsConfirmation) {
          setTimeout(() => {
            modal.classList.add("hidden");
            window.location.reload();
          }, 500);
          return;
        }

        if (result.success && result.needsConfirmation) {
          modal.classList.add("hidden");
          return;
        }

        signupSubmitBtn.disabled = false;
        signupSubmitBtn.textContent = "Criar Conta";
      });

      signupEmailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") signupPasswordInput.focus();
      });
      signupPasswordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") signupConfirmInput.focus();
      });
      signupConfirmInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") signupSubmitBtn.click();
      });

      // ----- Aba OTP -----
      const emailInput = modalContent.querySelector("#email-input");
      const sendBtn = modalContent.querySelector("#send-magic-link-btn");
      const otpContainer = modalContent.querySelector("#otp-container");
      const otpInput = modalContent.querySelector("#otp-input");
      const verifyBtn = modalContent.querySelector("#verify-otp-btn");

      // Enviar OTP
      sendBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        if (!this._isValidEmail(email)) {
          this.toast.showToast("warning", "Por favor, insira um email válido");
          return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = "Enviando...";

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

        if (result.success) {
          sendBtn.style.display = "none";
          otpContainer.style.display = "block";
          verifyBtn.style.display = "block";
          otpInput.focus();
          return;
        }
      });

      // Verificar OTP
      verifyBtn.addEventListener("click", async () => {
        const otp = otpInput.value.trim();
        const email = emailInput.value.trim();

        if (!otp || otp.length !== 8) {
          this.toast.showToast(
            "warning",
            "Por favor, insira um código válido de 8 dígitos",
          );
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
            sendBtn.style.display = "block";
            otpContainer.style.display = "none";
            verifyBtn.style.display = "none";
            verifyBtn.disabled = false;
            verifyBtn.textContent = "Verificar Código";
            window.location.reload();
          }, 500);
          return;
        }

        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verificar Código";
      });

      // Enter no campo de email (OTP)
      emailInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && sendBtn.style.display !== "none") {
          sendBtn.click();
        }
      });

      // Enter no campo de OTP
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
          <h3 style="margin-bottom: 15px;">🔐 Backup Online</h3>
          <p style="color: var(--text-secondary); margin-bottom: 20px;">
            Sincronize seus dados com segurança
          </p>

          <div class="auth-tabs" style="margin-bottom: 15px;">
            <button class="auth-tab active" data-tab="panel-password">Email e Senha</button>
            <button class="auth-tab" data-tab="panel-otp">Código por Email</button>
          </div>

          <!-- Aba Email/Senha -->
          <div id="tab-panel-password" class="auth-tab-content active">
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px;">
              <input 
                id="panel-pw-email" 
                type="email" 
                placeholder="seu.email@exemplo.com"
                autocomplete="email"
                style="padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-color);"
              />
              <input 
                id="panel-pw-password" 
                type="password" 
                placeholder="Sua senha"
                autocomplete="current-password"
                style="padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-color);"
              />
              <div id="panel-pw-requirements" class="pw-requirements" style="display: none;">
                <span id="panel-req-length" class="pw-req">✗ Mínimo 6 caracteres</span>
                <span id="panel-req-lower" class="pw-req">✗ Letra minúscula</span>
                <span id="panel-req-upper" class="pw-req">✗ Letra maiúscula</span>
                <span id="panel-req-digit" class="pw-req">✗ Número</span>
                <span id="panel-req-symbol" class="pw-req">✗ Símbolo (!@#$...)</span>
              </div>
              <input 
                id="panel-pw-confirm" 
                type="password" 
                placeholder="Confirme sua senha"
                autocomplete="new-password"
                style="display: none; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-color);"
              />
              <small id="panel-pw-match-msg" style="display: none; font-size: 12px;"></small>
              <div style="display: flex; gap: 10px;">
                <button id="panel-signin-btn" class="btn-primary" style="flex: 1; padding: 10px;">
                  Entrar
                </button>
                <button id="panel-signup-btn" class="btn-secondary" style="flex: 1; padding: 10px;">
                  Criar Conta
                </button>
              </div>
              <button id="panel-forgot-pw-btn" type="button" style="
                background: transparent;
                border: none;
                color: var(--primary-color);
                font-size: 12px;
                cursor: pointer;
                text-decoration: underline;
                padding: 0;
                margin-top: -4px;
              ">
                Esqueci minha senha
              </button>
            </div>
          </div>

          <!-- Aba OTP -->
          <div id="tab-panel-otp" class="auth-tab-content">
            <div style="display: flex; gap: 10px;">
              <input 
                id="email-input" 
                type="email" 
                placeholder="seu.email@exemplo.com"
                style="flex: 1; padding: 10px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-color);"
              />
              <button id="send-magic-link-btn" class="btn-primary" style="padding: 10px 20px;">
                Enviar Código
              </button>
            </div>
            <small style="display: block; margin-top: 10px; color: var(--text-secondary);">
              Você receberá um código de acesso no seu email — nenhuma senha necessária!
            </small>
          </div>
        </div>
      `;

      // Abas do painel
      const panelTabs = panel.querySelectorAll(".auth-tab");
      const panelContents = panel.querySelectorAll(".auth-tab-content");
      panelTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          panelTabs.forEach((t) => t.classList.remove("active"));
          panelContents.forEach((c) => c.classList.remove("active"));
          tab.classList.add("active");
          const target = panel.querySelector(`#tab-${tab.dataset.tab}`);
          if (target) target.classList.add("active");
        });
      });

      // Login/Signup no painel
      const panelSignInBtn = panel.querySelector("#panel-signin-btn");
      const panelSignUpBtn = panel.querySelector("#panel-signup-btn");
      const panelEmailInput = panel.querySelector("#panel-pw-email");
      const panelPasswordInput = panel.querySelector("#panel-pw-password");
      const panelConfirmInput = panel.querySelector("#panel-pw-confirm");
      const panelMatchMsg = panel.querySelector("#panel-pw-match-msg");
      const panelPwReqs = panel.querySelector("#panel-pw-requirements");
      const panelForgotBtn = panel.querySelector("#panel-forgot-pw-btn");
      let panelSignUpMode = false;

      const checkPanelPwReqs = (password) => {
        const reqs = {
          length: password.length >= 6,
          lower: /[a-z]/.test(password),
          upper: /[A-Z]/.test(password),
          digit: /[0-9]/.test(password),
          symbol: /[^a-zA-Z0-9]/.test(password),
        };
        const updateReq = (id, ok) => {
          const el = panel.querySelector(`#panel-req-${id}`);
          if (el) {
            el.classList.toggle("met", ok);
            el.textContent = (ok ? "✓ " : "✗ ") + el.textContent.substring(2);
          }
        };
        updateReq("length", reqs.length);
        updateReq("lower", reqs.lower);
        updateReq("upper", reqs.upper);
        updateReq("digit", reqs.digit);
        updateReq("symbol", reqs.symbol);
        return (
          reqs.length && reqs.lower && reqs.upper && reqs.digit && reqs.symbol
        );
      };

      panelPasswordInput.addEventListener("input", () => {
        const pw = panelPasswordInput.value;
        if (panelSignUpMode) {
          panelPwReqs.style.display = pw.length > 0 ? "flex" : "none";
          checkPanelPwReqs(pw);
        }
      });

      panelConfirmInput.addEventListener("input", () => {
        const match = panelPasswordInput.value === panelConfirmInput.value;
        panelMatchMsg.style.display = "block";
        panelMatchMsg.textContent = match
          ? "✓ Senhas coincidem"
          : "✗ Senhas não coincidem";
        panelMatchMsg.style.color = match ? "#4caf50" : "#f44336";
      });

      panelSignInBtn.addEventListener("click", async () => {
        const email = panelEmailInput.value.trim();
        const password = panelPasswordInput.value;
        if (!this._isValidEmail(email) || !password || password.length < 6) {
          this.toast.showToast(
            "warning",
            "Insira email e senha válidos (mín. 6 caracteres)",
          );
          return;
        }
        panelSignInBtn.disabled = true;
        panelSignInBtn.textContent = "Entrando...";
        const result = await controller.signIn(email, password);
        if (result.success) {
          setTimeout(() => window.location.reload(), 500);
          return;
        }
        panelSignInBtn.disabled = false;
        panelSignInBtn.textContent = "Entrar";
      });

      panelSignUpBtn.addEventListener("click", async () => {
        if (!panelSignUpMode) {
          panelSignUpMode = true;
          panelConfirmInput.style.display = "block";
          panelPwReqs.style.display = "flex";
          panelPasswordInput.placeholder = "Crie sua senha";
          panelSignUpBtn.textContent = "Confirmar";
          panelSignInBtn.style.display = "none";
          panelForgotBtn.style.display = "none";
          checkPanelPwReqs(panelPasswordInput.value);
          panelConfirmInput.focus();
          return;
        }

        const email = panelEmailInput.value.trim();
        const password = panelPasswordInput.value;
        if (!this._isValidEmail(email) || !password || password.length < 6) {
          this.toast.showToast(
            "warning",
            "Insira email e senha válidos (mín. 6 caracteres)",
          );
          return;
        }
        if (!checkPanelPwReqs(password)) {
          this.toast.showToast(
            "warning",
            "A senha não cumpre todos os requisitos",
          );
          return;
        }
        if (panelConfirmInput.value !== password) {
          this.toast.showToast("warning", "As senhas não coincidem");
          return;
        }
        panelSignUpBtn.disabled = true;
        panelSignUpBtn.textContent = "Criando...";
        const result = await controller.signUp(email, password);
        if (result.success && !result.needsConfirmation) {
          setTimeout(() => window.location.reload(), 500);
          return;
        }
        if (result.success && result.needsConfirmation) {
          panelSignUpBtn.disabled = false;
          panelSignUpBtn.textContent = "Confirmar";
          return;
        }
        panelSignUpBtn.disabled = false;
        panelSignUpBtn.textContent = "Confirmar";
      });

      panelForgotBtn.addEventListener("click", async () => {
        const email = panelEmailInput.value.trim();
        if (!this._isValidEmail(email)) {
          this.toast.showToast(
            "warning",
            "Insira seu email acima para receber o link de redefinição",
          );
          panelEmailInput.focus();
          return;
        }
        panelForgotBtn.disabled = true;
        panelForgotBtn.textContent = "Enviando...";
        await controller.resetPassword(email);
        panelForgotBtn.disabled = false;
        panelForgotBtn.textContent = "Esqueci minha senha";
      });

      // OTP no painel
      const sendBtn = panel.querySelector("#send-magic-link-btn");
      const emailInput = panel.querySelector("#email-input");

      sendBtn.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        if (!this._isValidEmail(email)) {
          this.toast.showToast("warning", "Por favor, insira um email válido");
          return;
        }

        sendBtn.disabled = true;
        sendBtn.textContent = "Enviando...";

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
