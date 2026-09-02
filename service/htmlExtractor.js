'use strict';

/**
 * Deterministic HTML -> Markdown article extraction — Milestone 3C-A.
 *
 * Uses `cheerio` (a small, well-maintained, non-executing HTML parser —
 * no browser automation, no JS execution, no network access of its own)
 * to select the smallest reliable content region and walk its DOM tree
 * into a normalized Markdown-ish text representation. This is a fixed,
 * inspectable algorithm — not positional regex, not an LLM, not OCR.
 *
 * Content-container selector, in priority order (found by directly
 * inspecting the real esp32-digital-clock page — see
 * docs/TUTORIAL_REVAMP_AGENT_MILESTONE_3B.md "Article Extraction"):
 *   1. `#blog-description` — the exact article body on my.cytron.io tutorial
 *      pages; confirmed to exclude the "Was this helpful?" widget and any
 *      trailing chrome that lives as siblings, not children, of it.
 *   2. `.post_content` — fallback if a page doesn't have the inner id.
 * If neither is present, extraction fails explicitly rather than guessing
 * at some other region (e.g. `<body>`, which would pull in navigation,
 * footer, and unrelated product recommendations).
 */

const cheerio = require('cheerio');

const EXTRACTOR_VERSION = '3C-A.1';
const CONTENT_SELECTORS = ['#blog-description', '.post_content'];

function resolveUrl(maybeRelative, baseUrl) {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}

function inlineText($, el, baseUrl) {
  // Renders inline-level content (text, links, bold/italic, inline code,
  // line breaks) without paragraph-level spacing.
  let out = '';
  $(el)
    .contents()
    .each((_, node) => {
      if (node.type === 'text') {
        out += node.data.replace(/\s+/g, ' ');
        return;
      }
      if (node.type !== 'tag') return;

      const tag = node.tagName;
      const $node = $(node);

      if (tag === 'br') {
        out += '\n';
      } else if (tag === 'a') {
        const href = resolveUrl($node.attr('href'), baseUrl);
        const text = inlineText($, node, baseUrl).trim() || href || '';
        out += href ? `[${text}](${href})` : text;
      } else if (tag === 'strong' || tag === 'b') {
        out += `**${inlineText($, node, baseUrl)}**`;
      } else if (tag === 'em' || tag === 'i') {
        out += `*${inlineText($, node, baseUrl)}*`;
      } else if (tag === 'code') {
        out += `\`${$node.text()}\``;
      } else if (tag === 'img') {
        const src = resolveUrl($node.attr('src'), baseUrl);
        const alt = $node.attr('alt') || '';
        out += src ? `![${alt}](${src})` : '';
      } else if (tag === 'script' || tag === 'style' || tag === 'noscript') {
        // skip entirely
      } else {
        out += inlineText($, node, baseUrl);
      }
    });
  return out;
}

function tableToMarkdown($, tableEl) {
  const rows = [];
  $(tableEl)
    .find('tr')
    .each((_, tr) => {
      const cells = [];
      $(tr)
        .find('th,td')
        .each((__, cell) => {
          cells.push($(cell).text().replace(/\s+/g, ' ').trim());
        });
      if (cells.length) rows.push(cells);
    });
  if (rows.length === 0) return '';

  const header = rows[0];
  const body = rows.slice(1);
  const lines = [];
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`|${header.map(() => '---').join('|')}|`);
  for (const row of body) {
    lines.push(`| ${row.join(' | ')} |`);
  }
  return lines.join('\n');
}

function listToMarkdown($, listEl, baseUrl, ordered, depth) {
  const indent = '  '.repeat(depth);
  const lines = [];
  let index = 1;
  $(listEl)
    .children('li')
    .each((_, li) => {
      const $li = $(li);
      const nestedLists = $li.children('ul,ol');
      const ownText = inlineText($, li, baseUrl).trim();
      const marker = ordered ? `${index}.` : '-';
      if (ownText) lines.push(`${indent}${marker} ${ownText}`);
      nestedLists.each((__, nested) => {
        lines.push(listToMarkdown($, nested, baseUrl, nested.tagName === 'ol', depth + 1));
      });
      index += 1;
    });
  return lines.join('\n');
}

function blockToMarkdown($, el, baseUrl) {
  const tag = el.tagName;
  const $el = $(el);

  if (['script', 'style', 'noscript', 'iframe'].includes(tag)) return '';

  if (/^h[1-6]$/.test(tag)) {
    const level = Number(tag[1]);
    const text = inlineText($, el, baseUrl).trim();
    return text ? `${'#'.repeat(level)} ${text}` : '';
  }

  if (tag === 'p') {
    const text = inlineText($, el, baseUrl).trim();
    return text || '';
  }

  if (tag === 'pre') {
    const codeEl = $el.find('code').first();
    const raw = (codeEl.length ? codeEl.text() : $el.text()).replace(/\s+$/, '');
    const langMatch = /language-(\w+)/.exec(codeEl.attr('class') || '');
    const lang = langMatch ? langMatch[1] : '';
    return `\`\`\`${lang}\n${raw}\n\`\`\``;
  }

  if (tag === 'ul' || tag === 'ol') {
    return listToMarkdown($, el, baseUrl, tag === 'ol', 0);
  }

  if (tag === 'table') {
    return tableToMarkdown($, el);
  }

  if (tag === 'blockquote') {
    const text = inlineText($, el, baseUrl).trim();
    return text
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
  }

  if (tag === 'hr') return '---';

  if (tag === 'img') {
    const src = resolveUrl($el.attr('src'), baseUrl);
    const alt = $el.attr('alt') || '';
    return src ? `![${alt}](${src})` : '';
  }

  // Generic container (div/span/section/etc.) — recurse into block children.
  const parts = [];
  $el.contents().each((_, child) => {
    if (child.type === 'tag') {
      const rendered = blockToMarkdown($, child, baseUrl);
      if (rendered) parts.push(rendered);
    } else if (child.type === 'text') {
      const text = child.data.replace(/\s+/g, ' ').trim();
      if (text) parts.push(text);
    }
  });
  return parts.join('\n\n');
}

/**
 * @param {string} html raw HTML of the fetched page
 * @param {string} baseUrl the page's own URL, for resolving relative links/images
 * @returns {{ok:true, title:string, markdown:string, headings:string[], counts:object} | {ok:false, message:string}}
 */
function extractArticle(html, baseUrl) {
  let $;
  try {
    $ = cheerio.load(html);
  } catch (err) {
    return { ok: false, message: `HTML could not be parsed: ${err.message}` };
  }

  let container = null;
  let usedSelector = null;
  for (const selector of CONTENT_SELECTORS) {
    const found = $(selector).first();
    if (found.length) {
      container = found;
      usedSelector = selector;
      break;
    }
  }

  if (!container) {
    return { ok: false, message: `No known content container found (tried: ${CONTENT_SELECTORS.join(', ')}).` };
  }

  const title = $('title').first().text().trim() || $('h1').first().text().trim() || '';

  const blocks = [];
  container.contents().each((_, node) => {
    if (node.type === 'tag') {
      const rendered = blockToMarkdown($, node, baseUrl);
      if (rendered && rendered.trim()) blocks.push(rendered.trim());
    } else if (node.type === 'text') {
      const text = node.data.replace(/\s+/g, ' ').trim();
      if (text) blocks.push(text);
    }
  });

  const markdown = blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

  const headings = [];
  container.find('h1,h2,h3,h4,h5,h6').each((_, h) => {
    const text = $(h).text().trim();
    if (text) headings.push(`${h.tagName.toUpperCase()}: ${text}`);
  });

  const counts = {
    images: container.find('img').length,
    links: container.find('a').length,
    codeBlocks: container.find('pre').length,
    tables: container.find('table').length,
    lists: container.find('ul,ol').length,
  };

  return { ok: true, title, markdown, headings, counts, usedSelector };
}

module.exports = { extractArticle, EXTRACTOR_VERSION, CONTENT_SELECTORS };
