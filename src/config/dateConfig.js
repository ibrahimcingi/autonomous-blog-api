export function formatDateReadable(isoString) {
  return new Date(isoString).toLocaleString("tr-TR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}
