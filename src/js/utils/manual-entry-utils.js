// YYYY-MM-DD → DD/MM/YYYY
export function formatDateToBR(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// corrige ISO para fuso local (evita bug do timezone)
export function toLocalISO(date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
}

// mascara de tempo
export function maskTimeValue(raw) {
  let value = raw.replace(/\D/g, "");
  if (value.length > 6) value = value.slice(0, 6);

  if (value.length >= 4) {
    let mins = parseInt(value.substring(2, 4));
    if (mins > 59) value = value.substring(0, 2) + "59" + value.substring(4);
  }
  if (value.length >= 6) {
    let secs = parseInt(value.substring(4, 6));
    if (secs > 59) value = value.substring(0, 4) + "59";
  }

  if (value.length >= 5) {
    return value.replace(/^(\d{2})(\d{2})(\d{2}).*/, "$1:$2:$3");
  }
  if (value.length >= 3) {
    return value.replace(/^(\d{2})(\d{2}).*/, "$1:$2");
  }

  return value;
}
