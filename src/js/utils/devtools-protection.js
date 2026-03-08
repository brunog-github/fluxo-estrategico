export class DevToolsProtection {
  constructor(options = {}) {
    this.options = {
      blockKeyboard: options.blockKeyboard !== false, // Padrão: true
      clearConsole: options.clearConsole !== false, // Padrão: true
      disableRightClick: options.disableRightClick !== false, // Padrão: true
      detectSize: options.detectSize !== false, // Padrão: true
      sizeThreshold: options.sizeThreshold || 200, // pixels - aumentado para menos falsos positivos
      redirectOnDetect: options.redirectOnDetect !== false, // Padrão: true
      redirectUrl: options.redirectUrl || "about:blank",
      onDetect: options.onDetect || null, // Callback personalizado
      debug: options.debug || false, // Modo debug para testes
    };

    this.devtoolsDetected = false;
    this.isMobile = this.detectMobileDevice();
    this.init();
  }

  /**
   * Detecta se é um dispositivo móvel/tablet
   */
  detectMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    // Verifica user agent para mobile/tablet
    const isMobileUA =
      /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase(),
      );
    // Também verifica Touch API (mais confiável)
    const hasTouch = () => {
      return (
        (window.matchMedia && window.matchMedia("(pointer:coarse)").matches) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 2) ||
        (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 2)
      );
    };
    return isMobileUA || hasTouch();
  }

  /**
   * Inicializa todas as proteções
   */
  init() {
    if (this.options.blockKeyboard) {
      this.blockKeyboardShortcuts();
    }

    if (this.options.clearConsole) {
      this.setupConsoleClear();
    }

    if (this.options.disableRightClick) {
      this.disableContextMenu();
    }

    if (this.options.detectSize) {
      this.setupSizeDetection();
    }

    this.log(
      `✓ DevTools Protection initialized (Device: ${this.isMobile ? "Mobile/Tablet" : "Desktop"})`,
    );
  }

  /**
   * Estratégia 2: Desabilita atalhos de teclado para DevTools
   */
  blockKeyboardShortcuts() {
    document.addEventListener(
      "keydown",
      (e) => {
        // F12 - DevTools padrão
        if (e.key === "F12") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.log("🚫 F12 bloqueado");
        }

        // Ctrl+Shift+I - DevTools (Windows/Linux/Chrome)
        if (e.ctrlKey && e.shiftKey && e.key === "I") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.log("🚫 Ctrl+Shift+I bloqueado");
        }

        // Ctrl+Shift+J - Console (Windows/Linux/Chrome)
        if (e.ctrlKey && e.shiftKey && e.key === "J") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.log("🚫 Ctrl+Shift+J bloqueado");
        }

        // Ctrl+Shift+C - Inspect Element (Windows/Linux/Chrome)
        if (e.ctrlKey && e.shiftKey && e.key === "C") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.log("🚫 Ctrl+Shift+C bloqueado");
        }

        // Cmd+Option+I - DevTools (Safari/Mac)
        if (e.metaKey && e.altKey && e.key === "i") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.log("🚫 Cmd+Option+I bloqueado");
        }

        // Cmd+Option+J - Console (Safari/Mac)
        if (e.metaKey && e.altKey && e.key === "j") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.log("🚫 Cmd+Option+J bloqueado");
        }

        // Cmd+Option+U - View Source (Safari/Mac)
        if (e.metaKey && e.altKey && e.key === "u") {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.log("🚫 Cmd+Option+U bloqueado");
        }
      },
      true,
    ); // Usar captura para máxima prioridade
  }

  /**
   * Estratégia 3: Limpa o console periodicamente
   */
  setupConsoleClear() {
    // Limpar a cada 500ms
    setInterval(() => {
      console.clear();
    }, 500);

    this.log("✓ Console auto-clear ativado");
  }

  /**
   * Estratégia 4: Desabilita clique direito
   * Permite o menu nativo dentro do Quill Editor (.ql-editor)
   * para não quebrar copiar/colar no mobile
   */
  disableContextMenu() {
    document.addEventListener(
      "contextmenu",
      (e) => {
        // Permitir menu de contexto dentro do Quill Editor (copiar/colar no mobile)
        if (e.target.closest && e.target.closest(".ql-editor, .ql-container")) {
          return;
        }

        e.preventDefault();
        e.stopImmediatePropagation();
        this.log("🚫 Clique direito bloqueado");
        return false;
      },
      true,
    );
  }

  /**
   * Estratégia 5: Detecta DevTools por tamanho da janela
   * Desabilitada em dispositivos móveis para evitar falsos positivos
   */
  setupSizeDetection() {
    // Em dispositivos móveis/tablets, a detecção por tamanho não é confiável
    // pois as barras de navegação variam muito. Desabilitar essa proteção.
    if (this.isMobile) {
      this.log("⚠️  Size detection desabilitada em dispositivos móveis");
      return;
    }

    // Aguardar 3 segundos antes de iniciar a detecção (evita falsos positivos no carregamento)
    setTimeout(() => {
      setInterval(() => {
        // Ignorar quando a página não está visível (tela bloqueada, aba em background, minimizada)
        if (document.hidden || document.visibilityState === "hidden") {
          return;
        }

        // Ignorar quando a janela está minimizada (dimensões internas zeradas)
        if (window.innerHeight === 0 || window.innerWidth === 0) {
          return;
        }

        const heightDiff = window.outerHeight - window.innerHeight;
        const widthDiff = window.outerWidth - window.innerWidth;

        // Se a diferença é maior que o threshold, DevTools provavelmente está aberto
        if (
          heightDiff > this.options.sizeThreshold ||
          widthDiff > this.options.sizeThreshold
        ) {
          if (!this.devtoolsDetected) {
            this.handleDevtoolsDetected(heightDiff, widthDiff);
          }
        } else {
          this.devtoolsDetected = false;
        }
      }, 1000);
    }, 3000); // Delay de 3 segundos

    this.log("✓ Size detection ativado (desktop apenas)");
  }

  /**
   * Executa quando DevTools é detectado
   */
  handleDevtoolsDetected(heightDiff, widthDiff) {
    this.devtoolsDetected = true;
    this.log(
      `🚨 DEVTOOLS DETECTADO! Height: ${heightDiff}px, Width: ${widthDiff}px`,
    );

    // Callback personalizado se fornecido
    if (typeof this.options.onDetect === "function") {
      this.options.onDetect({
        heightDiff,
        widthDiff,
        timestamp: new Date(),
      });
    }

    // Ação padrão: redirecionar
    if (this.options.redirectOnDetect) {
      console.clear();
      this.log("⚠️ Redirecionando para: " + this.options.redirectUrl);

      // Aguardar um pouco antes de redirecionar para que o log seja visto
      setTimeout(() => {
        window.location.href = this.options.redirectUrl;
      }, 100);
    }
  }

  /**
   * Log com prefixo apenas em modo debug
   */
  log(message) {
    if (this.options.debug) {
      console.log(`[DevTools Protection] ${message}`);
    }
  }

  /**
   * Desabilita/habilita proteções
   */
  disable() {
    this.log("Proteções desativadas");
    this.options.blockKeyboard = false;
    this.options.clearConsole = false;
    this.options.disableRightClick = false;
    this.options.detectSize = false;
  }

  /**
   * Status das proteções
   */
  getStatus() {
    return {
      blockKeyboard: this.options.blockKeyboard,
      clearConsole: this.options.clearConsole,
      disableRightClick: this.options.disableRightClick,
      detectSize: this.options.detectSize,
      devtoolsDetected: this.devtoolsDetected,
    };
  }
}
