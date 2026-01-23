import { ConfirmUI } from "../ui/confirm-toastUI.js";

export class ConfirmController {
  constructor() {
    this.ui = new ConfirmUI();
  }

  confirm(
    message,
    onConfirm,
    title = "Confirmação",
    confirmText = "Confirmar",
    cancelText = "Cancelar"
  ) {
    const { overlay, toast } = this.ui.createConfirm(
      title,
      message,
      confirmText,
      cancelText
    );

    const btnCancel = toast.querySelector(".btn-cancel");
    const btnConfirm = toast.querySelector(".btn-confirm");

    const close = () => this.ui.hide(overlay, toast);

    btnCancel.onclick = close;
    overlay.onclick = close;

    btnConfirm.onclick = () => {
      onConfirm();
      close();
    };

    this.ui.show(overlay, toast);
  }
}

