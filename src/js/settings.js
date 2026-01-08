// --- FUNÇÕES AUXILIARES DE DIAS ---
const MAPA_DIAS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// Converte [0, 6] -> "Domingo, Sábado"
function convertRestDaysToString(indices) {
  if (!Array.isArray(indices)) return "";
  return indices.map((i) => MAPA_DIAS[i]).join(", ");
}

// Converte "Sábado, domingo" -> [0, 6]
function convertStringToRestDays(text) {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const result = [];

  MAPA_DIAS.forEach((dia, index) => {
    // Verifica se o nome do dia (ex: "domingo") existe no texto do usuário
    // Usamos includes para ser flexível (aceitar "sáb", "sabado", etc se quiser refinar)
    if (normalized.includes(dia.toLowerCase())) {
      result.push(index);
    }
  });
  return result;
}

function triggerImportConfig() {
  document.getElementById("backup-upload").click();
}

function clearConfig() {
  confirmAction(
    "Isso irá remover todas as suas configurações, tem certeza disso ?",
    () => {
      localStorage.removeItem("studyCycle");
      localStorage.removeItem("restDays");
      showToast("success", "Configurações resetadas com sucesso!");
      location.reload();
    }
  );
}

// --- SISTEMA DE BACKUP UNIFICADO (JSON) ---

// 1. EXPORTAR TUDO (Histórico + Configs) para um ARQUIVO LOCAL
function exportBackupFile() {
  // Coleta os dados do localStorage
  const backupData = {
    version: 1.0, // Bom para controlar versões futuras do seu app
    date: new Date().toISOString(),
    data: {
      studyHistory: JSON.parse(localStorage.getItem("studyHistory")) || [],
      studyCycle: JSON.parse(localStorage.getItem("studyCycle")) || [],
      restDays: JSON.parse(localStorage.getItem("restDays")) || [],
      theme: localStorage.getItem("theme") || "light",
      currentIndex: localStorage.getItem("currentIndex") || 0,
      unlockedAchievements:
        JSON.parse(localStorage.getItem("unlockedAchievements")) || [],
    },
  };

  // Converte para texto JSON bonito
  const jsonString = JSON.stringify(backupData, null, 2);

  // Cria o arquivo Blob
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // Gera nome do arquivo com data: "backup_estudos_2023-10-25.json"
  const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  const fileName = `backup_estudos_${dateStr}.json`;

  // Download forçado
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("success", "Download do backup iniciado!");
}

// 2. COMPARTILHAR BACKUP (Web Share API)
async function shareBackupFile() {
  // 1. A Web Share API requer um contexto seguro (HTTPS ou localhost)
  if (!window.isSecureContext) {
    showToast(
      "error",
      "Use um servidor (https ou localhost) para compartilhar."
    );
    console.warn(
      "A função de compartilhamento foi bloqueada pelo navegador porque a página não está em um contexto seguro."
    );
    return;
  }

  // 2. Verifica se o navegador suporta a Web Share API
  if (!navigator.share || !navigator.canShare) {
    showToast(
      "error",
      "Seu navegador não suporta a função de compartilhamento."
    );
    return;
  }

  // 3. Coleta os mesmos dados do backup
  const backupData = {
    version: 1.0,
    date: new Date().toISOString(),
    data: {
      studyHistory: JSON.parse(localStorage.getItem("studyHistory")) || [],
      studyCycle: JSON.parse(localStorage.getItem("studyCycle")) || [],
      restDays: JSON.parse(localStorage.getItem("restDays")) || [],
      theme: localStorage.getItem("theme") || "light",
      currentIndex: localStorage.getItem("currentIndex") || 0,
      unlockedAchievements:
        JSON.parse(localStorage.getItem("unlockedAchievements")) || [],
    },
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
  const fileName = `backup_estudos_${dateStr}.json`;

  // 4. Cria um objeto de arquivo (File)
  const file = new File([jsonString], fileName, {
    type: "application/json",
  });

  // 5. Monta os dados para compartilhamento
  const shareData = {
    files: [file],
    title: "Backup Fluxo Estratégico",
    text: `Backup dos seus dados do app Fluxo Estratégico, gerado em ${dateStr}.`,
  };

  // 6. Verifica se o navegador PODE compartilhar esses dados
  if (navigator.canShare(shareData)) {
    try {
      // 7. Abre o diálogo de compartilhamento
      await navigator.share(shareData);
      showToast("info", "Janela de compartilhamento aberta.");
    } catch (error) {
      // O erro 'AbortError' é comum se o usuário fechar o pop-up de compartilhamento
      if (error.name !== "AbortError") {
        console.error("Erro ao compartilhar:", error);
        showToast(
          "error",
          `Ocorreu um erro ao tentar compartilhar: ${error.message}`
        );
      }
    }
  } else {
    showToast(
      "error",
      "Seu navegador não pode compartilhar este tipo de arquivo."
    );
  }
}

// 3. IMPORTAR BACKUP
function importBackupFile(input) {
  const file = input.files[0];
  if (!file) return;

  // Verificação de segurança simples (tamanho e extensão se quiser)
  // Aqui vamos confiar no JSON.parse para validar o conteúdo

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const text = e.target.result;
      const backup = JSON.parse(text);

      // Validação: O arquivo tem a estrutura certa?
      if (
        !backup.data ||
        !Array.isArray(backup.data.studyHistory) ||
        !Array.isArray(backup.data.studyCycle)
      ) {
        throw new Error("Estrutura do arquivo inválida.");
      }

      // Confirmação final

      confirmAction(
        `Backup de ${new Date(
          backup.date
        ).toLocaleDateString()} encontrado. Isso irá SUBSTITUIR todo o seu histórico e configurações atuais. Deseja continuar?`,
        () => {
          // Restaura os dados
          localStorage.setItem(
            "studyHistory",
            JSON.stringify(backup.data.studyHistory)
          );
          localStorage.setItem(
            "studyCycle",
            JSON.stringify(backup.data.studyCycle)
          );
          localStorage.setItem(
            "restDays",
            JSON.stringify(backup.data.restDays)
          );
          localStorage.setItem("theme", backup.data.theme);
          localStorage.setItem("currentIndex", backup.data.currentIndex);

          // Opcional: Restaurar conquistas também?
          if (backup.data.unlockedAchievements) {
            localStorage.setItem(
              "unlockedAchievements",
              JSON.stringify(backup.data.unlockedAchievements)
            );
          }

          showToast(
            "success",
            "Dados restaurados com sucesso! O aplicativo será recarregado."
          );
          window.location.reload();
        }
      );
    } catch (error) {
      console.error(error);
      showToast(
        "error",
        "Erro ao restaurar: O arquivo selecionado está corrompido ou não é um backup válido deste aplicativo."
      );
    } finally {
      input.value = ""; // Limpa o input
    }
  };

  reader.readAsText(file);
}
