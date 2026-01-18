export class ViewLoader {
  static async load(views) {
    const promises = views.map(async (view) => {
      const element = document.getElementById(view.id);
      if (!element) return;

      try {
        const response = await fetch(view.url);
        if (!response.ok) throw new Error(`Erro ao carregar ${view.url}`);
        const html = await response.text();
        element.innerHTML = html;
      } catch (error) {
        console.error(error);
        element.innerHTML = `<p style="color:red">Erro ao carregar a tela: ${view.id}</p>`;
      }
    });

    // Espera todas as telas carregarem antes de continuar
    await Promise.all(promises);
  }
}
