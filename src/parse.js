export function parseContent(content) {
  const result = {
    title: "",
    sections: [],
    conclusion: ""
  };

  // Başlık
  const titleMatch = content.match(/### \*\*Başlık:\s*(.*?)\*\*/);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Sonuç bölümü
  const conclusionMatch = content.match(/\*\*Sonuç\*\*\n([\s\S]*?)$/);
  if (conclusionMatch) result.conclusion = cleanTitle(conclusionMatch[1].trim());

  // Ana bölümler (####)
  const sectionRegex = /#### \*\*(?!Sonuç)(?:Giriş|Alt Başlık \d+:)?\s*(.*?)\*\*\n([\s\S]*?)(?=(#### \*\*|$))/g;

  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionTitle = cleanTitle(match[1].trim());
    const sectionRaw = match[2].trim();

    // Alt-alt başlıkları bul (#####)
    const subsectionRegex = /#####\s*(.*?)\n([\s\S]*?)(?=(#####|$))/g;
    const subsections = [];
    let subMatch;

    while ((subMatch = subsectionRegex.exec(sectionRaw)) !== null) {
      const subtitle = cleanTitle(subMatch[1].trim());
      const subContent = formatContent(subMatch[2]);
      subsections.push({ subtitle, content: subContent });
    }

    const sectionContent =
      subsections.length === 0
        ? formatContent(sectionRaw)
        : subsections.map(s => `<h3>${s.subtitle}</h3>${s.content}`).join("\n");

    result.sections.push({
      subtitle: sectionTitle,
      content: sectionContent
    });
  }

  return result;
}

/**
 * Alt başlıklardaki “Alt Başlık 1:”, “Alt Alt Başlık 2:” gibi kalıpları temizler
 */
function cleanTitle(title) {
  return title
    .replace(/Alt\s*Alt\s*Başlık\s*\d*:\s*/gi, "")
    .replace(/Alt\s*Başlık\s*\d*:\s*/gi, "")
    .replace(/Başlık\s*\d*:\s*/gi, "")
    .replace(/^\*+|\*+$/g, "") // Markdown yıldız kalıntılarını temizle
    .trim();
}

/**
 * İçerik satırlarını HTML'e dönüştürür
 */
function formatContent(raw) {
  return raw
    .split("\n")
    .filter(l => l.trim() !== "")
    .map(line => {
      const l = line.trim();

      // Görsel placeholder
      if (l.startsWith("<img") || l.startsWith("{image")) return l;

      // Liste elemanı
      if (l.startsWith("*")) return `<li>${l.replace(/^\*\s*/, "")}</li>`;

      // Normal paragraf
      return `<p>${l}</p>`;
    })
    .join("\n");
}
