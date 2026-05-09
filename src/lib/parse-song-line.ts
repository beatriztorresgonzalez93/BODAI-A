export function parseSongLine(line: string): { title: string; artist: string } {
  const trimmed = line.trim();
  const separators = [" — ", " – ", " - ", "—", "–"];
  for (const sep of separators) {
    const i = trimmed.indexOf(sep);
    if (i !== -1) {
      return {
        title: trimmed.slice(0, i).trim(),
        artist: trimmed.slice(i + sep.length).trim(),
      };
    }
  }
  return { title: trimmed, artist: "" };
}
