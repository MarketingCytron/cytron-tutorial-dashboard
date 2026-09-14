/**
 * Cytron Tutorial Validation Dashboard
 * Milestone 9 — CMS HTML Export
 *
 * Deterministic exporter that turns an APPROVED permanent Final Output
 * Markdown file (revamped-tutorials/<id>.md) into a clean HTML fragment
 * ready to paste into Cytron's CMS admin editor.
 *
 * Scope (never expand without a spec change):
 *   - Extracts ONLY the Introduction -> end-of-Troubleshooting range.
 *   - Replaces the Sample Code program block(s) with a single Gist
 *     placeholder comment; the user pastes their own Gist embed there.
 *   - Produces a fragment (no <html>/<head>/<body>/<style>/<script>).
 *   - Read-only: never writes to the Markdown source or any dataset.
 *
 * This module has no DOM dependency (works under Node for testing) and no
 * dependency on js/app.js — it is intentionally self-contained so CMS export
 * behavior can't drift when the dashboard's own renderer changes.
 */
(function (root) {
    'use strict';

    const GIST_PLACEHOLDER_TOKEN = '@@CMS_GIST_PLACEHOLDER@@';
    const GIST_PLACEHOLDER_HTML = '<!-- INSERT GITHUB GIST EMBED HERE -->';

    // Canonical heading text first, documented fallback variant second.
    const INTRO_HEADING_PATTERNS = [
        /^overview\s*\/\s*introduction$/i,
        /^introduction$/i,
    ];
    const TROUBLESHOOTING_HEADING_PATTERNS = [
        /^troubleshooting\s*&\s*extra tips$/i,
        /^troubleshooting$/i,
    ];
    const SAMPLE_CODE_HEADING_PATTERN = /^sample code$/i;

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ---------------------------------------------------------------------
    // Section detection (heading-structure based, not brittle string search)
    // ---------------------------------------------------------------------

    function parseHeadings(lines) {
        const headings = [];
        lines.forEach((line, index) => {
            const m = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
            if (m) headings.push({ index, level: m[1].length, text: m[2].trim() });
        });
        return headings;
    }

    function matchesAny(text, patterns) {
        return patterns.some((p) => p.test(text));
    }

    function findFirstHeading(headings, patterns) {
        return headings.find((h) => matchesAny(h.text, patterns)) || null;
    }

    function findHeadingAfter(headings, patterns, afterIndex) {
        return headings.find((h) => h.index > afterIndex && matchesAny(h.text, patterns)) || null;
    }

    // Section ends at the next heading whose level is the same as, or
    // higher (numerically lower) than, the section heading's own level.
    function findSectionEndLine(headings, heading, totalLines) {
        const next = headings.find((h) => h.index > heading.index && h.level <= heading.level);
        return next ? next.index : totalLines;
    }

    /**
     * Extracts the Introduction -> end-of-Troubleshooting line range from
     * the approved Markdown. Returns { ok:false, error } if either boundary
     * cannot be confidently identified — callers must never fall back to a
     * guessed range.
     */
    function extractIntroToTroubleshooting(markdown) {
        const lines = markdown.replace(/\r\n/g, '\n').split('\n');
        const headings = parseHeadings(lines);

        const intro = findFirstHeading(headings, INTRO_HEADING_PATTERNS);
        if (!intro) {
            return {
                ok: false,
                error: 'Could not confidently identify the Introduction start heading ' +
                    '("Overview / Introduction" or "Introduction"). CMS export aborted.',
            };
        }

        const troubleshooting = findHeadingAfter(headings, TROUBLESHOOTING_HEADING_PATTERNS, intro.index);
        if (!troubleshooting) {
            return {
                ok: false,
                error: 'Could not confidently identify the Troubleshooting end heading ' +
                    '("Troubleshooting & Extra Tips" or "Troubleshooting"). CMS export aborted.',
            };
        }

        const endLine = findSectionEndLine(headings, troubleshooting, lines.length);
        return { ok: true, lines: lines.slice(intro.index, endLine) };
    }

    // Reviewer-only inline annotations such as
    // "**[EDITOR PLACEHOLDER: insert wiring diagram here]**" appear inline
    // inside otherwise-approved sections (not only in the trailing internal
    // notes). They are not public tutorial content and never carry a real
    // image URL to convert, so they are dropped rather than exported.
    const EDITOR_PLACEHOLDER_LINE = /^\*{0,2}\[EDITOR PLACEHOLDER:.*\]\*{0,2}$/i;

    function stripEditorPlaceholderLines(lines) {
        return lines.filter((line) => !EDITOR_PLACEHOLDER_LINE.test(line.trim()));
    }

    /**
     * Within the extracted range, finds the Sample Code section (if any)
     * and removes its fenced program code block(s), leaving exactly one
     * Gist placeholder token in place of the first block removed. All
     * explanatory prose/subsections are preserved untouched.
     */
    function stripSampleCodeBlocks(lines) {
        const headings = parseHeadings(lines);
        const sampleCode = headings.find((h) => SAMPLE_CODE_HEADING_PATTERN.test(h.text));
        if (!sampleCode) return lines.slice();

        const sectionEnd = findSectionEndLine(headings, sampleCode, lines.length);
        const before = lines.slice(0, sampleCode.index + 1);
        const body = lines.slice(sampleCode.index + 1, sectionEnd);
        const after = lines.slice(sectionEnd);

        const newBody = [];
        let inFence = false;
        let fenceCount = 0;
        for (let i = 0; i < body.length; i++) {
            const line = body[i];
            const isFenceLine = /^\s*```/.test(line);
            if (isFenceLine && !inFence) {
                inFence = true;
                fenceCount++;
                if (fenceCount === 1) newBody.push(GIST_PLACEHOLDER_TOKEN);
                continue;
            }
            if (isFenceLine && inFence) {
                inFence = false;
                continue;
            }
            if (inFence) continue;
            newBody.push(line);
        }

        return before.concat(newBody, after);
    }

    // ---------------------------------------------------------------------
    // Minimal Markdown -> semantic HTML conversion, CMS-flavored:
    //   - normal prose paragraphs get inline text-align:justify (portable,
    //     since the CMS won't load the dashboard stylesheet)
    //   - inline `code` becomes <em>, never <code> (Milestone 8 house style)
    //   - full fenced code blocks stay <pre><code> (untouched, except the
    //     Sample Code program block already stripped above)
    //   - images/links become real <img>/<a>, tables become real <table>
    //   - no dashboard-only wrapper divs/classes
    // ---------------------------------------------------------------------

    function renderTable(tableLines, formatInline) {
        const rows = [];
        let hasHeader = false;
        tableLines.forEach((line) => {
            if (/^\|[\s\-:|]+\|$/.test(line)) {
                if (rows.length === 1) hasHeader = true;
                return;
            }
            const cells = line.slice(1, -1).split('|').map((c) => formatInline(c.trim()));
            rows.push(cells);
        });
        if (!rows.length) return '';

        let html = '<table>';
        if (hasHeader) {
            html += '<thead><tr>' + rows[0].map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
            for (let r = 1; r < rows.length; r++) {
                html += '<tr>' + rows[r].map((c) => `<td>${c}</td>`).join('') + '</tr>';
            }
            html += '</tbody>';
        } else {
            html += '<tbody>';
            rows.forEach((r) => { html += '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>'; });
            html += '</tbody>';
        }
        html += '</table>';
        return html;
    }

    function convertMarkdownToHtml(text) {
        if (!text) return '';

        // 1. Pull out fenced code blocks (outside Sample Code, these are
        //    legitimate preformatted output — e.g. Serial Monitor logs).
        const codeBlocks = [];
        let processed = text.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const token = `@@CMS_CODE_BLOCK_${codeBlocks.length}@@`;
            codeBlocks.push({ lang, code: escapeHtml(code.replace(/\r\n/g, '\n').replace(/\n$/, '')) });
            return token;
        });

        // 2. Strip blockquote markers up front — the only blockquote usage
        //    in approved tutorials is a plain "Note:" callout, which reads
        //    fine as a normal justified paragraph and keeps output within
        //    the whitelisted tag set (no <blockquote> in the CMS spec).
        const rawLines = processed.replace(/\r\n/g, '\n').split('\n').map((line) => {
            const m = /^(\s*)>\s?(.*)$/.exec(line);
            return m ? m[2] : line;
        });

        const formatInline = (str) => {
            if (!str) return '';
            let s = escapeHtml(str);
            s = s.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
            s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
            // Milestone 9 rule 11: inline code reads as italic prose, not <code>.
            s = s.replace(/`([^`]+)`/g, '<em>$1</em>');
            // Images before links — the image syntax is a superset match.
            s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
            s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
            return s;
        };

        const output = [];
        const listStack = []; // [{ type: 'ul'|'ol', indent: number }]
        let tableLines = [];
        let paragraphLines = [];

        const flushParagraph = () => {
            if (paragraphLines.length) {
                const html = paragraphLines.map((l) => formatInline(l)).join('<br>');
                output.push(`<p style="text-align: justify;">${html}</p>`);
                paragraphLines = [];
            }
        };
        const flushTable = () => {
            if (tableLines.length) {
                output.push(renderTable(tableLines, formatInline));
                tableLines = [];
            }
        };
        const closeListsToLevel = (target) => {
            while (listStack.length > target) {
                const top = listStack.pop();
                output.push(`</li></${top.type}>`);
            }
        };
        const flushLists = () => closeListsToLevel(0);
        const flushAll = () => { flushParagraph(); flushTable(); flushLists(); };

        for (let i = 0; i < rawLines.length; i++) {
            const rawLine = rawLines[i];
            const trimmed = rawLine.trim();

            // Passthrough tokens (fenced code, Gist placeholder) — never
            // wrapped in a paragraph, never justified.
            if (/^@@CMS_CODE_BLOCK_\d+@@$/.test(trimmed) || trimmed === GIST_PLACEHOLDER_TOKEN) {
                flushAll();
                output.push(trimmed);
                continue;
            }

            if (!trimmed) { flushAll(); continue; }

            // Tables
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                flushParagraph();
                flushLists();
                tableLines.push(trimmed);
                continue;
            } else if (tableLines.length) {
                flushTable();
            }

            // Headings
            const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
            if (headingMatch) {
                flushAll();
                const level = headingMatch[1].length;
                output.push(`<h${level}>${formatInline(headingMatch[2])}</h${level}>`);
                continue;
            }

            // Horizontal rules are a Markdown-authoring separator between
            // sections in the source document, not tutorial content —
            // drop them rather than emitting a stray <hr> in the CMS.
            if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
                flushAll();
                continue;
            }

            // Lists (ordered/unordered, nested by indentation)
            const unorderedMatch = rawLine.match(/^(\s*)[*-]\s+(.*)$/);
            const orderedMatch = rawLine.match(/^(\s*)\d+\.\s+(.*)$/);
            if (unorderedMatch || orderedMatch) {
                flushParagraph();
                flushTable();

                const isOrdered = !!orderedMatch;
                const match = isOrdered ? orderedMatch : unorderedMatch;
                const indentSpaces = match[1].length;
                const itemContent = formatInline(match[2]);
                const listType = isOrdered ? 'ol' : 'ul';

                if (listStack.length === 0) {
                    listStack.push({ type: listType, indent: indentSpaces });
                    output.push(`<${listType}><li>${itemContent}`);
                } else {
                    const currentTop = listStack[listStack.length - 1];
                    if (indentSpaces > currentTop.indent) {
                        listStack.push({ type: listType, indent: indentSpaces });
                        output.push(`<${listType}><li>${itemContent}`);
                    } else if (indentSpaces < currentTop.indent) {
                        while (listStack.length > 0 && indentSpaces < listStack[listStack.length - 1].indent) {
                            const popped = listStack.pop();
                            output.push(`</li></${popped.type}>`);
                        }
                        if (listStack.length > 0 && listStack[listStack.length - 1].type === listType) {
                            output.push(`</li><li>${itemContent}`);
                        } else {
                            listStack.push({ type: listType, indent: indentSpaces });
                            output.push(`<${listType}><li>${itemContent}`);
                        }
                    } else if (currentTop.type === listType) {
                        output.push(`</li><li>${itemContent}`);
                    } else {
                        const popped = listStack.pop();
                        output.push(`</li></${popped.type}><${listType}><li>${itemContent}`);
                        listStack.push({ type: listType, indent: indentSpaces });
                    }
                }
                continue;
            } else if (listStack.length > 0) {
                if (/^\s{2,}/.test(rawLine)) {
                    output.push(` ${formatInline(trimmed)}`);
                    continue;
                }
                flushLists();
            }

            paragraphLines.push(rawLine);
        }

        flushAll();

        let html = output.join('\n');
        codeBlocks.forEach((item, idx) => {
            const langClass = item.lang ? ` class="language-${item.lang}"` : '';
            html = html.split(`@@CMS_CODE_BLOCK_${idx}@@`).join(`<pre><code${langClass}>${item.code}</code></pre>`);
        });
        html = html.split(GIST_PLACEHOLDER_TOKEN).join(GIST_PLACEHOLDER_HTML);
        return html;
    }

    // ---------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------

    /**
     * @param {string} markdown - the full, approved permanent Markdown
     *   (revamped-tutorials/<id>.md content).
     * @returns {{ok:true, html:string}|{ok:false, error:string}}
     */
    function exportCmsHtml(markdown) {
        if (!markdown || !markdown.trim()) {
            return { ok: false, error: 'No Markdown content was provided to export.' };
        }

        const extraction = extractIntroToTroubleshooting(markdown);
        if (!extraction.ok) return extraction;

        const withoutSampleCode = stripSampleCodeBlocks(extraction.lines);
        const withoutPlaceholders = stripEditorPlaceholderLines(withoutSampleCode);
        const html = convertMarkdownToHtml(withoutPlaceholders.join('\n'));
        return { ok: true, html };
    }

    const TutorialHtmlExport = {
        exportCmsHtml,
        // Exposed for testing only.
        _internal: { extractIntroToTroubleshooting, stripSampleCodeBlocks, stripEditorPlaceholderLines, convertMarkdownToHtml, escapeHtml },
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = TutorialHtmlExport;
    } else {
        root.TutorialHtmlExport = TutorialHtmlExport;
    }
})(typeof window !== 'undefined' ? window : globalThis);
