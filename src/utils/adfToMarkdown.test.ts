import { describe, it, expect } from 'vitest';
import { adfToMarkdown } from './adfToMarkdown.js';

describe('adfToMarkdown', () => {
  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it('returns empty string for null', () => {
    expect(adfToMarkdown(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(adfToMarkdown(undefined)).toBe('');
  });

  it('returns empty string for a plain string (v2 description)', () => {
    expect(adfToMarkdown('plain text')).toBe('');
  });

  it('returns empty string for an object without type', () => {
    expect(adfToMarkdown({ content: [] })).toBe('');
  });

  // -------------------------------------------------------------------------
  // Basic text
  // -------------------------------------------------------------------------

  it('converts a simple paragraph', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello, world!' }],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('Hello, world!');
  });

  it('converts multiple paragraphs', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First paragraph.' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second paragraph.' }],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('First paragraph.\n\nSecond paragraph.');
  });

  // -------------------------------------------------------------------------
  // Marks (inline formatting)
  // -------------------------------------------------------------------------

  it('converts bold text', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'bold',
              marks: [{ type: 'strong' }],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('**bold**');
  });

  it('converts italic text', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'italic', marks: [{ type: 'em' }] }],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('*italic*');
  });

  it('converts strikethrough text', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'deleted', marks: [{ type: 'strike' }] },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('~~deleted~~');
  });

  it('converts inline code', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'code', marks: [{ type: 'code' }] }],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('`code`');
  });

  it('converts a link', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'click here',
              marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('[click here](https://example.com)');
  });

  it('applies multiple marks', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'bold italic',
              marks: [{ type: 'strong' }, { type: 'em' }],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('***bold italic***');
  });

  // -------------------------------------------------------------------------
  // Headings
  // -------------------------------------------------------------------------

  it('converts headings', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Subtitle' }],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('# Title\n\n### Subtitle');
  });

  // -------------------------------------------------------------------------
  // Lists
  // -------------------------------------------------------------------------

  it('converts bullet lists', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item A' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item B' }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('- Item A\n- Item B');
  });

  it('converts ordered lists', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'First' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Second' }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('1. First\n2. Second');
  });

  it('converts nested lists', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Parent' }],
                },
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [
                        {
                          type: 'paragraph',
                          content: [{ type: 'text', text: 'Child' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('- Parent\n  - Child');
  });

  // -------------------------------------------------------------------------
  // Code blocks
  // -------------------------------------------------------------------------

  it('converts a code block with language', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'javascript' },
          content: [{ type: 'text', text: 'const x = 1;' }],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('```javascript\nconst x = 1;\n```');
  });

  it('converts a code block without language', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: 'some code' }],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('```\nsome code\n```');
  });

  // -------------------------------------------------------------------------
  // Block quotes
  // -------------------------------------------------------------------------

  it('converts a blockquote', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Quoted text' }],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('> Quoted text');
  });

  // -------------------------------------------------------------------------
  // Horizontal rule
  // -------------------------------------------------------------------------

  it('converts a rule', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Before' }],
        },
        { type: 'rule' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'After' }],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('Before\n\n---\n\nAfter');
  });

  // -------------------------------------------------------------------------
  // Tables
  // -------------------------------------------------------------------------

  it('converts a table with header', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableHeader',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Name' }],
                    },
                  ],
                },
                {
                  type: 'tableHeader',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Value' }],
                    },
                  ],
                },
              ],
            },
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Foo' }],
                    },
                  ],
                },
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Bar' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe(
      '| Name | Value |\n| --- | --- |\n| Foo | Bar |'
    );
  });

  // -------------------------------------------------------------------------
  // Inline nodes
  // -------------------------------------------------------------------------

  it('converts mentions', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Assigned to ' },
            {
              type: 'mention',
              attrs: { id: '12345', text: '@Alice' },
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('Assigned to @Alice');
  });

  it('converts emoji', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Great ' },
            { type: 'emoji', attrs: { shortName: ':thumbsup:' } },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('Great :thumbsup:');
  });

  it('converts inline cards', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'inlineCard',
              attrs: { url: 'https://example.com/page' },
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe(
      '[https://example.com/page](https://example.com/page)'
    );
  });

  it('converts hard breaks', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Line 1' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Line 2' },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('Line 1\nLine 2');
  });

  // -------------------------------------------------------------------------
  // Task lists
  // -------------------------------------------------------------------------

  it('converts task list items', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { state: 'TODO' },
              content: [{ type: 'text', text: 'Do something' }],
            },
            {
              type: 'taskItem',
              attrs: { state: 'DONE' },
              content: [{ type: 'text', text: 'Already done' }],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('- [ ] Do something\n- [x] Already done');
  });

  // -------------------------------------------------------------------------
  // Panels
  // -------------------------------------------------------------------------

  it('converts a panel', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'panel',
          attrs: { panelType: 'warning' },
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Be careful!' }],
            },
          ],
        },
      ],
    };
    expect(adfToMarkdown(adf)).toBe('> **WARNING:** Be careful!');
  });

  // -------------------------------------------------------------------------
  // Complex / combined documents
  // -------------------------------------------------------------------------

  it('handles a realistic Jira description', () => {
    const adf = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Bug Report' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'When clicking the ' },
            {
              type: 'text',
              text: 'Submit',
              marks: [{ type: 'strong' }],
            },
            { type: 'text', text: ' button, an error occurs.' },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: 'Steps to reproduce' }],
        },
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Open the form' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Fill in the fields' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Click Submit' }],
                },
              ],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [{ type: 'text', text: 'throw new Error("oops");' }],
        },
      ],
    };

    const expected = [
      '## Bug Report',
      '',
      'When clicking the **Submit** button, an error occurs.',
      '',
      '### Steps to reproduce',
      '',
      '1. Open the form',
      '2. Fill in the fields',
      '3. Click Submit',
      '',
      '```typescript',
      'throw new Error("oops");',
      '```',
    ].join('\n');

    expect(adfToMarkdown(adf)).toBe(expected);
  });
});
