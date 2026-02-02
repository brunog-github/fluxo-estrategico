export class SimuladosSalvosUI {
  constructor() {
    this.controller = null;
  }

  setController(controller) {
    this.controller = controller;
  }

  async render(editalId) {
    if (!this.controller) {
      console.error("SimuladosSalvosUI: Controller não foi setado!");
      return;
    }

    await this.controller.init(editalId);
  }

  getController() {
    return this.controller;
  }
}
