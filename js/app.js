/**
 * Cytron Tutorial Validation Dashboard
 * Main Application JavaScript
 */

// Global state
let tutorialsData = null;

// Utility functions
const Utils = {
    // Get base path for GitHub Pages compatibility
    getBasePath() {
        const path = window.location.pathname;
        const lastSlash = path.lastIndexOf('/');
        return path.substring(0, lastSlash + 1);
    },

    // Load JSON data
    async loadData() {
        if (tutorialsData) return tutorialsData;

        try {
            const response = await fetch(`${this.getBasePath()}data/tutorials.json`);
            if (!response.ok) throw new Error('Failed to load data');
            tutorialsData = await response.json();
            return tutorialsData;
        } catch (error) {
            console.error('Error loading tutorials data:', error);
            return { tutorials: [] };
        }
    },

    // Format date
    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    },

    // Get validity class
    getValidityClass(grade) {
        if (!grade) return 'not-reviewed';
        return `grade-${grade.toLowerCase()}`;
    },

    // Get validity label
    getValidityLabel(grade) {
        const labels = {
            'A': 'Valid',
            'B': 'Mostly Valid',
            'C': 'Partially Outdated',
            'D': 'Outdated',
            'E': 'Invalid'
        };
        return labels[grade] || 'Not Reviewed';
    },

    // Get decision class
    getDecisionClass(decision) {
        const classes = {
            'Keep': 'decision-keep',
            'Minor Update': 'decision-minor',
            'Major Revamp': 'decision-major',
            'Replace': 'decision-replace',
            'Not Decided': 'decision-not-decided'
        };
        return classes[decision] || 'decision-not-decided';
    },

    // Get priority class
    getPriorityClass(priority) {
        if (!priority || priority === 'None') return 'none';
        return priority.toLowerCase();
    },

    // Get status class
    getStatusClass(status) {
        const classes = {
            'Not Reviewed': 'status-not-reviewed',
            'Reviewed': 'status-reviewed',
            'Planned': 'status-planned',
            'Revamping': 'status-revamping',
            'Completed': 'status-completed',
            'Archived': 'status-archived'
        };
        return classes[status] || 'status-not-reviewed';
    },

    // Get level class
    getLevelClass(level) {
        const classes = {
            'Beginner': 'level-beginner',
            'Intermediate': 'level-intermediate',
            'Advanced': 'level-advanced'
        };
        return classes[level] || '';
    },

    // Get score class
    getScoreClass(score) {
        if (score >= 8) return 'high';
        if (score >= 5) return 'medium';
        return 'low';
    },

    // Check if tutorial needs action
    needsAction(tutorial) {
        if (!tutorial.reviewed) return false;
        if (tutorial.revampStatus === 'Completed' || tutorial.revampStatus === 'Archived') return false;
        if (tutorial.decision === 'Keep' && (!tutorial.priority || tutorial.priority === 'None' || tutorial.priority === 'P3')) return false;
        return true;
    },

    // Check if beginner tutorial needs action
    isBeginnerNeedingAction(tutorial) {
        return tutorial.targetLevel === 'Beginner' && this.needsAction(tutorial);
    },

    // Calculate priority score for sorting
    getPriorityScore(tutorial) {
        let score = 0;

        // Priority weight
        const priorityWeights = { 'P0': 10000, 'P1': 1000, 'P2': 100, 'P3': 10 };
        score += priorityWeights[tutorial.priority] || 0;

        // Beginner tutorials get boost
        if (tutorial.targetLevel === 'Beginner') score += 500;

        // Decision weight
        const decisionWeights = { 'Replace': 80, 'Major Revamp': 60, 'Minor Update': 40 };
        score += decisionWeights[tutorial.decision] || 0;

        // Validity grade weight (E=5, D=4, C=3, B=2, A=1)
        const validityWeights = { 'E': 5, 'D': 4, 'C': 3, 'B': 2, 'A': 1 };
        score += (validityWeights[tutorial.validity?.grade] || 0);

        return score;
    },

    // Create badge HTML
    createBadge(text, className) {
        return `<span class="${className}">${this.escapeHtml(text)}</span>`;
    },

    // Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Get URL parameter
    getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    },

    // Set URL parameter
    setUrlParam(name, value) {
        const params = new URLSearchParams(window.location.search);
        if (value) {
            params.set(name, value);
        } else {
            params.delete(name);
        }
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
    },

    // Render Markdown to HTML
    renderMarkdown(text) {
        if (!text) return '';

        // Preserve fenced code blocks by replacing them with placeholders
        const codeBlocks = [];
        let processedText = text.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push({ lang, code: this.escapeHtml(code.replace(/\r\n/g, '\n').trim()) });
            return placeholder;
        });

        let html = this.escapeHtml(processedText);

        // Headers
        html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

        // Bold & Italic
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        // Horizontal rules
        html = html.replace(/^---$/gm, '<hr>');

        // Blockquotes
        html = html.replace(/^>\s?(.*$)/gm, '<blockquote>$1</blockquote>');
        html = html.replace(/(<\/blockquote>\n<blockquote>)/g, '<br>');

        // Tables
        html = this.renderTables(html);

        // Lists (unordered)
        html = html.replace(/^\* (.*$)/gm, '<li>$1</li>');
        html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)\n(?!<li>)/g, '$1</ul>\n');
        html = html.replace(/(?<!<\/ul>\n)(<li>)/g, '<ul>$1');

        // Numbered lists
        html = html.replace(/^\d+\. (.*$)/gm, '<oli>$1</oli>');
        html = html.replace(/(<oli>.*<\/oli>)\n(?!<oli>)/g, '$1</ol>\n');
        html = html.replace(/(?<!<\/ol>\n)(<oli>)/g, '<ol>$1');
        html = html.replace(/<oli>/g, '<li>').replace(/<\/oli>/g, '</li>');

        // Paragraphs
        html = html.replace(/\n\n+/g, '</p><p>');
        html = '<p>' + html + '</p>';

        // Cleanup HTML tags wrapped in paragraphs
        html = html.replace(/<p><h(\d)>/g, '<h$1>');
        html = html.replace(/<\/h(\d)><\/p>/g, '</h$1>');
        html = html.replace(/<p><hr><\/p>/g, '<hr>');
        html = html.replace(/<p><ul>/g, '<ul>');
        html = html.replace(/<\/ul><\/p>/g, '</ul>');
        html = html.replace(/<p><ol>/g, '<ol>');
        html = html.replace(/<\/ol><\/p>/g, '</ol>');
        html = html.replace(/<p><blockquote>/g, '<blockquote>');
        html = html.replace(/<\/blockquote><\/p>/g, '</blockquote>');
        html = html.replace(/<p><div class="table-container">/g, '<div class="table-container">');
        html = html.replace(/<\/table><\/div><\/p>/g, '</table></div>');
        html = html.replace(/<p><\/p>/g, '');

        // Restore code blocks
        codeBlocks.forEach((item, index) => {
            const langClass = item.lang ? ` class="language-${item.lang}"` : '';
            const blockHtml = `<pre><code${langClass}>${item.code}</code></pre>`;
            html = html.replace(new RegExp(`__CODE_BLOCK_${index}__`, 'g'), blockHtml);
        });

        return html;
    },

    // Render markdown tables to HTML table
    renderTables(html) {
        const lines = html.split('\n');
        let inTable = false;
        let result = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    result.push('<div class="table-container"><table class="data-table">');
                    inTable = true;
                }

                // Skip separator line
                if (line.match(/^\|[\s-:|]+\|$/)) {
                    continue;
                }

                const cells = line.slice(1, -1).split('|').map(c => c.trim());
                const isHeader = i + 1 < lines.length && lines[i + 1].trim().match(/^\|[\s-:|]+\|$/);

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
                    result.push('</tbody></table></div>');
                    inTable = false;
                }
                result.push(lines[i]);
            }
        }

        if (inTable) {
            result.push('</tbody></table></div>');
        }

        return result.join('\n');
    }
};

// Sidebar functionality
const Sidebar = {
    init() {
        const toggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');

        if (!toggle || !sidebar) return;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            }
        });
    }
};

// Dashboard functionality
const Dashboard = {
    async init() {
        const data = await Utils.loadData();
        if (!data.tutorials.length) {
            this.showEmptyState();
            return;
        }

        this.updateKPIs(data.tutorials);
        this.updateScheduleStats(data.tutorials);
        this.updateDistributions(data.tutorials);
        this.updateHealthSummary(data.tutorials);
        this.updatePriorityList(data.tutorials);
        this.updateLastUpdated(data);
        this.initKPIClicks();
    },

    showEmptyState() {
        const priorityList = document.getElementById('priorityList');
        if (priorityList) {
            priorityList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <h3>No tutorials reviewed yet</h3>
                    <p>Add tutorial audits to see them here.</p>
                </div>
            `;
        }
    },

    updateKPIs(tutorials) {
        const total = tutorials.length;
        const reviewed = tutorials.filter(t => t.reviewed).length;
        const notReviewed = total - reviewed;

        const decisions = {
            keep: tutorials.filter(t => t.decision === 'Keep').length,
            minor: tutorials.filter(t => t.decision === 'Minor Update').length,
            major: tutorials.filter(t => t.decision === 'Major Revamp').length,
            replace: tutorials.filter(t => t.decision === 'Replace').length
        };

        const beginnerAction = tutorials.filter(t => Utils.isBeginnerNeedingAction(t)).length;

        document.getElementById('totalTutorials').textContent = total;
        document.getElementById('reviewedCount').textContent = reviewed;
        document.getElementById('notReviewedCount').textContent = notReviewed;
        document.getElementById('keepCount').textContent = decisions.keep;
        document.getElementById('minorUpdateCount').textContent = decisions.minor;
        document.getElementById('majorRevampCount').textContent = decisions.major;
        document.getElementById('replaceCount').textContent = decisions.replace;
        document.getElementById('beginnerActionCount').textContent = beginnerAction;
    },

    updateScheduleStats(tutorials) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        // Filter tutorials with dates
        const withPrepDate = tutorials.filter(t => t.preparationDate);
        const withPubDate = tutorials.filter(t => t.publishDate);

        // Prep stats
        const preppedCount = withPrepDate.filter(t => t.revampStatus === 'Completed').length;
        const overduePrepCount = withPrepDate.filter(t =>
            t.preparationDate < todayStr && t.revampStatus !== 'Completed'
        ).length;
        const pendingPrepCount = withPrepDate.filter(t =>
            t.preparationDate >= todayStr && t.revampStatus !== 'Completed'
        ).length;

        // Publish stats
        const publishedCount = withPubDate.filter(t =>
            t.publishDate <= todayStr && t.revampStatus === 'Completed'
        ).length;
        const overduePublishCount = withPubDate.filter(t =>
            t.publishDate < todayStr && t.revampStatus !== 'Completed'
        ).length;
        const upcomingPublishCount = withPubDate.filter(t =>
            t.publishDate >= todayStr
        ).length;

        // Publish window stats
        const beforeLaunchCount = withPubDate.filter(t =>
            t.publishDate >= '2026-09-01' && t.publishDate <= '2026-09-15'
        ).length;
        const launchDayCount = withPubDate.filter(t =>
            t.publishDate === '2026-09-16'
        ).length;
        const afterLaunchCount = withPubDate.filter(t =>
            t.publishDate >= '2026-09-17' && t.publishDate <= '2026-09-30'
        ).length;

        // Update DOM elements (with null checks)
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        updateElement('preppedCount', preppedCount);
        updateElement('pendingPrepCount', pendingPrepCount);
        updateElement('overduePrepCount', overduePrepCount);
        updateElement('publishedCount', publishedCount);
        updateElement('upcomingPublishCount', upcomingPublishCount);
        updateElement('overduePublishCount', overduePublishCount);
        updateElement('beforeLaunchCount', beforeLaunchCount);
        updateElement('launchDayCount', launchDayCount);
        updateElement('afterLaunchCount', afterLaunchCount);

        // Update progress bars
        const prepProgressBar = document.getElementById('prepProgressBar');
        if (prepProgressBar && withPrepDate.length > 0) {
            const prepPercent = (preppedCount / withPrepDate.length) * 100;
            prepProgressBar.style.width = `${prepPercent}%`;
        }

        const publishProgressBar = document.getElementById('publishProgressBar');
        if (publishProgressBar && withPubDate.length > 0) {
            const pubPercent = (publishedCount / withPubDate.length) * 100;
            publishProgressBar.style.width = `${pubPercent}%`;
        }
    },

    updateDistributions(tutorials) {
        // Validity distribution
        const validityBars = document.getElementById('validityBars');
        if (validityBars) {
            const grades = ['A', 'B', 'C', 'D', 'E'];
            const total = tutorials.filter(t => t.reviewed).length || 1;

            validityBars.innerHTML = grades.map(grade => {
                const count = tutorials.filter(t => t.validity?.grade === grade).length;
                const percent = (count / total) * 100;
                return `
                    <div class="bar-item">
                        <span class="bar-label">${grade} - ${Utils.getValidityLabel(grade)}</span>
                        <div class="bar-track">
                            <div class="bar-fill grade-${grade.toLowerCase()}" style="width: ${percent}%"></div>
                        </div>
                        <span class="bar-count">${count}</span>
                    </div>
                `;
            }).join('');
        }

        // Decision distribution
        const decisionBars = document.getElementById('decisionBars');
        if (decisionBars) {
            const decisions = ['Keep', 'Minor Update', 'Major Revamp', 'Replace'];
            const total = tutorials.filter(t => t.reviewed).length || 1;

            decisionBars.innerHTML = decisions.map(decision => {
                const count = tutorials.filter(t => t.decision === decision).length;
                const percent = (count / total) * 100;
                const cssClass = Utils.getDecisionClass(decision).replace('decision-', '');
                return `
                    <div class="bar-item">
                        <span class="bar-label">${decision}</span>
                        <div class="bar-track">
                            <div class="bar-fill decision-${cssClass}" style="width: ${percent}%"></div>
                        </div>
                        <span class="bar-count">${count}</span>
                    </div>
                `;
            }).join('');
        }

        // Status distribution
        const statusBars = document.getElementById('statusBars');
        if (statusBars) {
            const statuses = ['Not Reviewed', 'Reviewed', 'Planned', 'Revamping', 'Completed', 'Archived'];
            const total = tutorials.length || 1;

            statusBars.innerHTML = statuses.map(status => {
                const count = tutorials.filter(t => t.revampStatus === status).length;
                const percent = (count / total) * 100;
                const cssClass = Utils.getStatusClass(status).replace('status-', '');
                return `
                    <div class="bar-item">
                        <span class="bar-label">${status}</span>
                        <div class="bar-track">
                            <div class="bar-fill status-${cssClass}" style="width: ${percent}%"></div>
                        </div>
                        <span class="bar-count">${count}</span>
                    </div>
                `;
            }).join('');
        }
    },

    updateHealthSummary(tutorials) {
        const summary = document.getElementById('healthSummary');
        if (!summary) return;

        const total = tutorials.length;
        const needsWork = tutorials.filter(t =>
            t.decision === 'Major Revamp' || t.decision === 'Replace'
        ).length;
        const beginnerNeedsWork = tutorials.filter(t => Utils.isBeginnerNeedingAction(t)).length;
        const p0Count = tutorials.filter(t => t.priority === 'P0').length;
        const p1Count = tutorials.filter(t => t.priority === 'P1').length;

        const items = [];

        if (needsWork > 0) {
            items.push(`<strong>${needsWork}</strong> of ${total} tutorials require major updates or replacement.`);
        }

        if (beginnerNeedsWork > 0) {
            items.push(`<strong>${beginnerNeedsWork}</strong> beginner tutorials currently require action.`);
        }

        if (p0Count > 0) {
            items.push(`<strong>${p0Count}</strong> tutorials contain P0 critical issues.`);
        }

        if (p1Count > 0) {
            items.push(`<strong>${p1Count}</strong> tutorials contain P1 high priority issues.`);
        }

        if (items.length === 0) {
            items.push('All tutorials are in good shape!');
        }

        summary.innerHTML = items.map(item => `
            <div class="health-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>${item}</span>
            </div>
        `).join('');
    },

    updatePriorityList(tutorials) {
        const list = document.getElementById('priorityList');
        if (!list) return;

        const priorityTutorials = tutorials
            .filter(t => Utils.needsAction(t))
            .sort((a, b) => Utils.getPriorityScore(b) - Utils.getPriorityScore(a))
            .slice(0, 8);

        if (priorityTutorials.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <h3>All caught up!</h3>
                    <p>No tutorials currently require attention.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = priorityTutorials.map(t => `
            <div class="priority-card">
                <div class="priority-card-content">
                    <h3><a href="tutorial.html?id=${Utils.escapeHtml(t.id)}">${Utils.escapeHtml(t.title)}</a></h3>
                    <div class="priority-card-meta">
                        ${t.validity?.grade ? `<span class="validity-badge ${Utils.getValidityClass(t.validity.grade)}">${t.validity.grade}</span>` : ''}
                        <span class="decision-badge ${Utils.getDecisionClass(t.decision)}">${Utils.escapeHtml(t.decision || 'Not Decided')}</span>
                        ${t.priority && t.priority !== 'None' ? `<span class="priority-badge ${Utils.getPriorityClass(t.priority)}">${t.priority}</span>` : ''}
                        <span class="level-badge ${Utils.getLevelClass(t.targetLevel)}">${Utils.escapeHtml(t.targetLevel)}</span>
                        <span class="status-badge ${Utils.getStatusClass(t.revampStatus)}">${Utils.escapeHtml(t.revampStatus)}</span>
                    </div>
                    ${t.topIssues?.[0] ? `
                        <div class="priority-card-issue">
                            <strong>${Utils.escapeHtml(t.topIssues[0].title)}</strong>
                        </div>
                    ` : ''}
                </div>
                <a href="tutorial.html?id=${Utils.escapeHtml(t.id)}" class="btn btn-secondary btn-sm">View Audit</a>
            </div>
        `).join('');
    },

    updateLastUpdated(data) {
        const element = document.getElementById('lastUpdated');
        if (!element) return;

        // Find most recent review date
        const dates = data.tutorials
            .filter(t => t.lastReviewed)
            .map(t => new Date(t.lastReviewed));

        if (dates.length > 0) {
            const latest = new Date(Math.max(...dates));
            element.textContent = `Last audit: ${Utils.formatDate(latest.toISOString().split('T')[0])}`;
        }
    },

    initKPIClicks() {
        document.querySelectorAll('.kpi-card.clickable').forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.dataset.filter;
                const value = card.dataset.value;

                if (filter === 'beginnerAction') {
                    window.location.href = `tutorials.html?level=Beginner`;
                } else if (filter === 'decision') {
                    window.location.href = `tutorials.html?decision=${encodeURIComponent(value)}`;
                }
            });
        });
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Sidebar.init();

    // Initialize dashboard if on index page
    if (document.getElementById('priorityList')) {
        Dashboard.init();
    }
});

// Export for other modules
window.Utils = Utils;
window.tutorialsData = tutorialsData;
