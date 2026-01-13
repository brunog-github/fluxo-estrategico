export function parseHistoryDatetime(dateStr) {
  const [dmy, hm] = dateStr.split(" às ");
  const [day, mon, year] = dmy.split("/").map(Number);
  const [hh, mm] = hm.split(":").map(Number);
  return new Date(year, mon - 1, day, hh, mm);
}

export function getFilteredHistory(history, filterSubject) {
  if (!filterSubject || filterSubject === "all") return history;
  return history.filter((item) => item.subject === filterSubject);
}
