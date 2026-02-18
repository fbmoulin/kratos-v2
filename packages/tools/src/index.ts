// @kratos/tools - Ferramentas e Utilitários
// Exportação DOCX, validação, sanitização

import { Document, Packer, Paragraph, HeadingLevel } from 'docx';

export const TOOLS_MODULE = '@kratos/tools';

export interface DocxBuildOptions {
  title?: string;
}

function toParagraphs(raw: string): Paragraph[] {
  const lines = raw.split(/\r?\n/);
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({}));
      continue;
    }

    if (trimmed.startsWith('### ')) {
      paragraphs.push(new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3 }));
      continue;
    }

    if (trimmed.startsWith('## ')) {
      paragraphs.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 }));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      paragraphs.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 }));
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      paragraphs.push(new Paragraph({ text: trimmed.slice(2), bullet: { level: 0 } }));
      continue;
    }

    paragraphs.push(new Paragraph({ text: trimmed }));
  }

  return paragraphs;
}

export async function buildDocxBuffer(content: string, options: DocxBuildOptions = {}): Promise<Buffer> {
  const sections = [];
  if (options.title) {
    sections.push({ children: [new Paragraph({ text: options.title, heading: HeadingLevel.TITLE })] });
  }

  sections.push({ children: toParagraphs(content) });

  const doc = new Document({ sections });
  return Packer.toBuffer(doc);
}
