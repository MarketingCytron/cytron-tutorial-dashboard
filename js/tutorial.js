/**
 * Cytron Tutorial Validation Dashboard
 * Tutorial Detail Page JavaScript
 */

const TutorialDetail = {
    tutorial: null,

    async init() {
        const id = Utils.getUrlParam('id');
        if (!id) {
            this.showNotFound();
            return;
        }

        const data = await Utils.loadData();
        this.tutorial = data.tutorials?.find(t => t.id === id);

        if (!this.tutorial) {
            this.showNotFound();
            return;
        }

        this.render();
        this.loadAuditReport();
    },

    showNotFound() {
        document.getElementById('tutorialHeader').style.display = 'none';
        document.getElementById('tutorialContent').style.display = 'none';
        document.getElementById('notFoundState').style.display = 'block';
    },

    render() {
        const t = this.tutorial;

        // Update page title
        document.title = `${t.title} - Cytron Tutorial Validation Dashboard`;

        // Breadcrumb
        document.getElementById('breadcrumbTitle').textContent = t.title;

        // Tutorial header
        document.getElementById('tutorialTitle').textContent = t.title;
        document.getElementById('originalLink').href = t.url || '#';

        // Meta information
        const metaHtml = `
            <div class="meta-item"><strong>Category:</strong> ${Utils.escapeHtml(t.category || '-')}</div>
            <div class="meta-item"><strong>Level:</strong> <span class="level-badge ${Utils.getLevelClass(t.targetLevel)}">${Utils.escapeHtml(t.targetLevel || '-')}</span></div>
            <div class="meta-item"><strong>Products:</strong> ${Utils.escapeHtml((t.products || []).join(', ') || '-')}</div>
            <div class="meta-item"><strong>Reviewed:</strong> ${Utils.formatDate(t.lastReviewed)}</div>
        `;
        document.getElementById('tutorialMeta').innerHTML = metaHtml;

        // Validation panel
        this.renderValidationPanel();

        // Scores
        this.renderScores();

        // Top issues
        this.renderIssues();

        // Assessment (Keep/Update/Remove)
        this.renderAssessment();

        // Evidence
        this.renderEvidence();

        // External links
        this.renderLinks();
    },

    renderValidationPanel() {
        const t = this.tutorial;

        // Validity display
        const validityDisplay = document.getElementById('validityDisplay');
        if (t.validity?.grade) {
            validityDisplay.innerHTML = `
                <span class="grade validity-badge ${Utils.getValidityClass(t.validity.grade)}" style="font-size: 2rem; padding: 0.5rem 1rem;">${t.validity.grade}</span>
                <span class="label">${Utils.escapeHtml(t.validity.label)}</span>
            `;
        }

        // Decision display
        const decisionDisplay = document.getElementById('decisionDisplay');
        decisionDisplay.innerHTML = `
            <span class="decision-badge ${Utils.getDecisionClass(t.decision)}" style="font-size: 0.95rem;">${Utils.escapeHtml(t.decision || 'Not Decided')}</span>
        `;

        // Scope display
        const scopeDisplay = document.getElementById('scopeDisplay');
        scopeDisplay.innerHTML = `<span>${Utils.escapeHtml(t.revampScope || '-')}</span>`;

        // Status display
        const statusDisplay = document.getElementById('statusDisplay');
        statusDisplay.innerHTML = `
            <span class="status-badge ${Utils.getStatusClass(t.revampStatus)}" style="font-size: 0.95rem;">${Utils.escapeHtml(t.revampStatus || 'Not Reviewed')}</span>
        `;

        // Main recommendation
        const mainRec = document.getElementById('mainRecommendation');
        mainRec.innerHTML = `
            <h3>Main Recommendation</h3>
            <p>${Utils.escapeHtml(t.mainRecommendation || 'Awaiting technical audit.')}</p>
        `;
    },

    renderScores() {
        const scores = this.tutorial.scores;
        const grid = document.getElementById('scoresGrid');

        if (!scores || Object.keys(scores).length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <p>No scores available yet.</p>
                </div>
            `;
            return;
        }

        const scoreLabels = {
            technicalAccuracy: 'Technical Accuracy',
            currentValidity: 'Current Validity',
            esp32Compatibility: 'ESP32 Compatibility',
            nodeRedCompatibility: 'Node-RED Compatibility',
            codeQuality: 'Code Quality',
            completeness: 'Completeness',
            beginnerFriendliness: 'Beginner Friendliness',
            reproducibility: 'Reproducibility'
        };

        grid.innerHTML = Object.entries(scores).map(([key, value]) => {
            const label = scoreLabels[key] || key;
            const scoreClass = Utils.getScoreClass(value);
            const percent = (value / 10) * 100;

            return `
                <div class="score-card">
                    <h4>${Utils.escapeHtml(label)}</h4>
                    <div class="score-value ${scoreClass}">${value}/10</div>
                    <div class="score-bar">
                        <div class="score-bar-fill ${scoreClass}" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderIssues() {
        const issues = this.tutorial.topIssues;
        const list = document.getElementById('issuesList');

        if (!issues || issues.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <p>No issues documented yet.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = issues.map(issue => {
            const priorityClass = Utils.getPriorityClass(issue.priority);

            return `
                <div class="issue-card ${priorityClass}">
                    <div class="issue-header">
                        <span class="priority-badge ${priorityClass}">${issue.priority}</span>
                        <span class="issue-title">${Utils.escapeHtml(issue.title)}</span>
                        <span class="issue-section">${Utils.escapeHtml(issue.section || '')}</span>
                    </div>
                    <p class="issue-description">${Utils.escapeHtml(issue.description || '')}</p>
                    ${issue.recommendation ? `
                        <div class="issue-recommendation">
                            <strong>Recommendation:</strong> ${Utils.escapeHtml(issue.recommendation)}
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    renderAssessment() {
        const t = this.tutorial;

        // Keep
        const keepContent = document.getElementById('keepContent');
        if (t.keep && t.keep.length > 0) {
            keepContent.innerHTML = t.keep.map(item => `
                <div class="assessment-item">
                    <strong>${Utils.escapeHtml(item.section || 'Section')}</strong>
                    <p>${Utils.escapeHtml(item.reason || '')}</p>
                </div>
            `).join('');
        }

        // Update
        const updateContent = document.getElementById('updateContent');
        if (t.update && t.update.length > 0) {
            updateContent.innerHTML = t.update.map(item => `
                <div class="assessment-item">
                    <strong>${Utils.escapeHtml(item.section || 'Section')}</strong>
                    <p>${Utils.escapeHtml(item.reason || '')}</p>
                    ${item.action ? `<p><em>Action: ${Utils.escapeHtml(item.action)}</em></p>` : ''}
                </div>
            `).join('');
        }

        // Remove
        const removeContent = document.getElementById('removeContent');
        if (t.remove && t.remove.length > 0) {
            removeContent.innerHTML = t.remove.map(item => `
                <div class="assessment-item">
                    <strong>${Utils.escapeHtml(item.section || 'Section')}</strong>
                    <p>${Utils.escapeHtml(item.reason || '')}</p>
                    ${item.action ? `<p><em>Action: ${Utils.escapeHtml(item.action)}</em></p>` : ''}
                </div>
            `).join('');
        }
    },

    renderEvidence() {
        const evidence = this.tutorial.evidence;
        const tbody = document.getElementById('evidenceBody');

        if (!evidence || evidence.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-cell">No evidence documented yet.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = evidence.map(e => `
            <tr>
                <td>${Utils.escapeHtml(e.claim || '')}</td>
                <td>${Utils.escapeHtml(e.currentTutorial || '')}</td>
                <td>${Utils.escapeHtml(e.finding || '')}</td>
                <td>${e.officialSource ? `<a href="${Utils.escapeHtml(e.officialSource)}" target="_blank" rel="noopener noreferrer">${Utils.escapeHtml(e.sourceLabel || 'View Source')}</a>` : '-'}</td>
                <td>${Utils.escapeHtml(e.recommendedChange || '')}</td>
            </tr>
        `).join('');
    },

    renderLinks() {
        const links = this.tutorial.links;
        const tbody = document.getElementById('linksBody');

        if (!links || links.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-cell">No external links documented yet.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = links.map(link => {
            const statusClass = link.status?.toLowerCase() || 'unknown';

            return `
                <tr>
                    <td><a href="${Utils.escapeHtml(link.url || '#')}" target="_blank" rel="noopener noreferrer">${Utils.escapeHtml(link.url || '-')}</a></td>
                    <td>${Utils.escapeHtml(link.purpose || '-')}</td>
                    <td><span class="link-status ${statusClass}">${Utils.escapeHtml(link.status || 'Unknown')}</span></td>
                    <td>${Utils.escapeHtml(link.notes || '-')}</td>
                </tr>
            `;
        }).join('');
    },

    async loadAuditReport() {
        const auditFile = this.tutorial.auditFile;
        const reportDiv = document.getElementById('auditReport');

        if (!auditFile) {
            reportDiv.innerHTML = `
                <div class="empty-state">
                    <p>Full technical audit report not yet available.</p>
                </div>
            `;
            return;
        }

        try {
            const response = await fetch(`${Utils.getBasePath()}${auditFile}`);
            if (!response.ok) throw new Error('Failed to load audit');

            const markdown = await response.text();
            reportDiv.innerHTML = `<div class="markdown-content">${this.renderMarkdown(markdown)}</div>`;
        } catch (error) {
            console.error('Error loading audit report:', error);
            reportDiv.innerHTML = `
                <div class="empty-state">
                    <p>Could not load audit report. File may not exist yet.</p>
                </div>
            `;
        }
    },

    renderMarkdown(text) {
        // Simple markdown renderer
        // For production, consider using a library like marked.js

        let html = Utils.escapeHtml(text);

        // Headers
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // Inline code
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // Horizontal rules
        html = html.replace(/^---$/gm, '<hr>');

        // Tables
        html = this.renderTables(html);

        // Lists
        html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
        html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)\n(?!<li>)/g, '$1</ul>\n');
        html = html.replace(/(?<!<\/ul>\n)(<li>)/g, '<ul>$1');

        // Numbered lists
        html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');

        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';

        // Clean up
        html = html.replace(/<p><h/g, '<h');
        html = html.replace(/<\/h(\d)><\/p>/g, '</h$1>');
        html = html.replace(/<p><pre>/g, '<pre>');
        html = html.replace(/<\/pre><\/p>/g, '</pre>');
        html = html.replace(/<p><ul>/g, '<ul>');
        html = html.replace(/<\/ul><\/p>/g, '</ul>');
        html = html.replace(/<p><hr><\/p>/g, '<hr>');
        html = html.replace(/<p><\/p>/g, '');

        return html;
    },

    renderTables(html) {
        // Simple table rendering
        const lines = html.split('\n');
        let inTable = false;
        let result = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    result.push('<table>');
                    inTable = true;
                }

                // Skip separator line
                if (line.match(/^\|[\s-:|]+\|$/)) {
                    continue;
                }

                const cells = line.slice(1, -1).split('|').map(c => c.trim());
                const isHeader = i + 1 < lines.length && lines[i + 1].match(/^\|[\s-:|]+\|$/);

                if (isHeader) {
                    result.push('<thead><tr>');
                    cells.forEach(cell => result.push(`<th>${cell}</th>`));
                    result.push('</tr></thead><tbody>');
                } else {
                    result.push('<tr>');
                    cells.forEach(cell => result.push(`<td>${cell}</td>`));
                    result.push('</tr>');
                }
            } else {
                if (inTable) {
                    result.push('</tbody></table>');
                    inTable = false;
                }
                result.push(line);
            }
        }

        if (inTable) {
            result.push('</tbody></table>');
        }

        return result.join('\n');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    TutorialDetail.init();
});
