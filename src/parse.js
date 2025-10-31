export function parseContent(content) {
  const result = {
    title: "",
    sections: [],
    conclusion: ""
  };

  // Başlığı ayıkla
  const titleMatch = content.match(/### \*\*Başlık:\s*(.*?)\*\*/);
  if (titleMatch) result.title = titleMatch[1].trim();

  // Sonuç paragrafını ayıkla
  const conclusionMatch = content.match(/\*\*Sonuç\*\*\n([\s\S]*?)$/);
  if (conclusionMatch) result.conclusion = conclusionMatch[1].trim();

  // Ana bölümleri ayıkla
  const sectionRegex = /#### \*\*(?!Sonuç)(?:Giriş|Alt Başlık \d+:)?\s*(.*?)\*\*\n([\s\S]*?)(?=(#### \*\*|$))/g;

  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionRaw = match[2].trim();

    // Alt-alt başlıklar (#####)
    const subsectionRegex = /#####\s*(.*?)\n([\s\S]*?)(?=(#####|$))/g;
    const subsections = [];
    let subMatch;

    while ((subMatch = subsectionRegex.exec(sectionRaw)) !== null) {
      const subContent = subMatch[2]
        .split("\n")
        .filter(l => l.trim() !== "")
        .map(l => {
          const line = l.trim();

          // Görsel satırıysa direkt bırak
          if (line.startsWith("<img") || line.startsWith("{image")) return line;

          // Liste elemanıysa <li> yap
          if (line.startsWith("*")) return `<li>${line.replace(/^\*\s*/, "")}</li>`;

          // Normal paragraf
          return `<p>${line}</p>`;
        })
        .join("\n");

      subsections.push({
        subtitle: subMatch[1].trim(),
        content: subContent
      });
    }

    // Alt-alt başlık yoksa, doğrudan içerik
    const sectionContent =
      subsections.length === 0
        ? sectionRaw
            .split("\n")
            .filter(l => l.trim() !== "")
            .map(l => {
              const line = l.trim();

              if (line.startsWith("<img") || line.startsWith("{image")) return line;
              if (line.startsWith("*")) return `<li>${line.replace(/^\*\s*/, "")}</li>`;
              return `<p>${line}</p>`;
            })
            .join("\n")
        : subsections
            .map(s => `<h3>${s.subtitle}</h3>${s.content}`)
            .join("\n");

    result.sections.push({
      subtitle: match[1].trim(),
      content: sectionContent
    });
  }

  return result;
}
