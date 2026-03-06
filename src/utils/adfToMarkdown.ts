/**
 * Converts Atlassian Document Format (ADF) to Markdown.
 *
 * ADF is a JSON-based document format used by Jira Cloud (API v3) for rich
 * text fields such as issue descriptions and comments. Converting ADF to
 * Markdown dramatically reduces token count while preserving semantic meaning
 * for the LLM.
 */

// ---------------------------------------------------------------------------
// Types (minimal — we only type what we need to traverse)
// ---------------------------------------------------------------------------

interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  marks?: AdfMark[];
  attrs?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Inline mark helpers
// ---------------------------------------------------------------------------

function applyMarks(text: string, marks?: AdfMark[]): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        result = `**${result}**`;
        break;
      case 'em':
        result = `*${result}*`;
        break;
      case 'strike':
        result = `~~${result}~~`;
        break;
      case 'code':
        result = `\`${result}\``;
        break;
      case 'link': {
        const href = mark.attrs?.href as string | undefined;
        if (href) {
          result = `[${result}](${href})`;
        }
        break;
      }
      case 'subsup': {
        const supType = mark.attrs?.type as string | undefined;
        if (supType === 'sup') result = `^${result}^`;
        else if (supType === 'sub') result = `~${result}~`;
        break;
      }
      default:
        // Unknown marks — leave text as-is.
        break;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Node converters
// ---------------------------------------------------------------------------

function convertChildren(node: AdfNode): string {
  if (!node.content) return '';
  return node.content.map((child) => convertNode(child)).join('');
}

function convertNode(node: AdfNode): string {
  switch (node.type) {
    case 'doc':
      return convertChildren(node).trim();

    case 'text':
      return applyMarks(node.text ?? '', node.marks);

    case 'paragraph':
      return convertChildren(node) + '\n\n';

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = '#'.repeat(Math.min(level, 6));
      return `${prefix} ${convertChildren(node)}\n\n`;
    }

    case 'bulletList':
      return (
        (node.content ?? [])
          .map((item) => convertListItem(item, '- '))
          .join('') + '\n'
      );

    case 'orderedList': {
      const start = (node.attrs?.order as number) ?? 1;
      return (
        (node.content ?? [])
          .map((item, i) => convertListItem(item, `${start + i}. `))
          .join('') + '\n'
      );
    }

    case 'listItem':
      // Normally handled by parent list — fallback.
      return convertChildren(node);

    case 'codeBlock': {
      const language = (node.attrs?.language as string) ?? '';
      const code = convertChildren(node).replace(/\n\n$/, '');
      return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    }

    case 'blockquote': {
      const inner = convertChildren(node).trim();
      const quoted = inner
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      return quoted + '\n\n';
    }

    case 'rule':
      return '---\n\n';

    case 'hardBreak':
      return '\n';

    // --- Tables ---

    case 'table':
      return convertTable(node);

    case 'tableRow':
    case 'tableHeader':
    case 'tableCell':
      // Handled by convertTable — fallback.
      return convertChildren(node);

    // --- Inline nodes ---

    case 'mention': {
      const mentionText =
        (node.attrs?.text as string) ??
        (node.attrs?.displayName as string) ??
        'unknown';
      return mentionText;
    }

    case 'emoji': {
      const shortName = node.attrs?.shortName as string | undefined;
      return shortName ?? (node.attrs?.text as string) ?? '';
    }

    case 'inlineCard': {
      const url = node.attrs?.url as string | undefined;
      return url ? `[${url}](${url})` : '';
    }

    case 'mediaGroup':
    case 'mediaSingle':
      return convertChildren(node);

    case 'media': {
      const alt =
        (node.attrs?.alt as string) ??
        (node.attrs?.id as string) ??
        'attachment';
      return `[${alt}]`;
    }

    case 'panel': {
      const panelType = (node.attrs?.panelType as string) ?? 'info';
      const inner = convertChildren(node).trim();
      return `> **${panelType.toUpperCase()}:** ${inner}\n\n`;
    }

    case 'expand': {
      const title = (node.attrs?.title as string) ?? 'Details';
      const inner = convertChildren(node).trim();
      return `**${title}**\n${inner}\n\n`;
    }

    case 'decisionList':
    case 'taskList':
      return convertChildren(node);

    case 'decisionItem':
      return `- [decision] ${convertChildren(node)}\n`;

    case 'taskItem': {
      const state = node.attrs?.state as string;
      const marker = state === 'DONE' ? '[x]' : '[ ]';
      return `- ${marker} ${convertChildren(node)}\n`;
    }

    default:
      // Unknown node — try to extract any nested text.
      return convertChildren(node);
  }
}

// ---------------------------------------------------------------------------
// List item helper (handles nested lists)
// ---------------------------------------------------------------------------

function convertListItem(node: AdfNode, prefix: string): string {
  if (!node.content) return `${prefix}\n`;

  const parts: string[] = [];
  for (const child of node.content) {
    if (child.type === 'paragraph') {
      parts.push(`${prefix}${convertChildren(child).trim()}\n`);
    } else if (child.type === 'bulletList' || child.type === 'orderedList') {
      // Indent nested lists.
      const nested = convertNode(child)
        .trimEnd()
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');
      parts.push(nested + '\n');
    } else {
      parts.push(`${prefix}${convertNode(child).trim()}\n`);
    }
  }
  return parts.join('');
}

// ---------------------------------------------------------------------------
// Table converter
// ---------------------------------------------------------------------------

function convertTable(node: AdfNode): string {
  if (!node.content) return '';

  const rows: string[][] = [];

  for (const row of node.content) {
    if (row.type !== 'tableRow') continue;
    const cells: string[] = [];
    for (const cell of row.content ?? []) {
      cells.push(convertChildren(cell).replace(/\n+/g, ' ').trim());
    }
    rows.push(cells);
  }

  if (rows.length === 0) return '';

  // Determine the maximum number of columns.
  const colCount = Math.max(...rows.map((r) => r.length));

  // Normalize row lengths.
  for (const row of rows) {
    while (row.length < colCount) row.push('');
  }

  const lines: string[] = [];
  lines.push('| ' + rows[0].join(' | ') + ' |');

  lines.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
  for (let i = 1; i < rows.length; i++) {
    lines.push('| ' + rows[i].join(' | ') + ' |');
  }

  return lines.join('\n') + '\n\n';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert an ADF document (or node) to Markdown.
 *
 * Returns an empty string for `null`, `undefined`, or non-object values so
 * callers can safely pass v2 plain-text descriptions without crashing.
 */
export function adfToMarkdown(adf: unknown): string {
  if (!adf || typeof adf !== 'object') return '';
  const node = adf as AdfNode;
  if (node.type !== 'doc' && !node.type) return '';

  const md = convertNode(node);
  // Collapse excessive blank lines.
  return md.replace(/\n{3,}/g, '\n\n').trim();
}
