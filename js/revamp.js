/**
 * Cytron Tutorial Validation Dashboard
 * Revamp Queue Page JavaScript
 */

const RevampQueue = {
    tutorials: [],

    async init() {
        const data = await Utils.loadData();
        this.tutorials = data.tutorials || [];

        this.categorize();
        this.updateSummary();
        this.render();
    },

    categorize() {
        // Filter tutorials that need work
        this.needsWork = this.tutorials.filter(t => {
            // Must be reviewed
            if (!t.reviewed) return false;

            // Exclude completed/archived
            if (t.revampStatus === 'Completed' || t.revampStatus === 'Archived') return false;

            // Include if decision is not Keep
            if (t.decision !== 'Keep') return true;

            // Include Keep if has P0 or P1 issues
            if (t.priority === 'P0' || t.priority === 'P1') return true;

            return false;
        });

        // Sort by priority score
        this.needsWork.sort((a, b) => Utils.getPriorityScore(b) - Utils.getPriorityScore(a));

        // Categorize
        this.critical = this.needsWork.filter(t => t.priority === 'P0');
        this.high = this.needsWork.filter(t => t.priority === 'P1' && t.priority !== 'P0');
        this.beginner = this.needsWork.filter(t =>
            t.targetLevel === 'Beginner' &&
            t.priority !== 'P0' &&
            t.priority !== 'P1'
        );

        // Remaining (not in above categories)
        const categorizedIds = new Set([
            ...this.critical.map(t => t.id),
            ...this.high.map(t => t.id),
            ...this.beginner.map(t => t.id)
        ]);
        this.remaining = this.needsWork.filter(t => !categorizedIds.has(t.id));
    },

    updateSummary() {
        document.getElementById('criticalCount').textContent = this.critical.length;
        document.getElementById('highCount').textContent = this.high.length;
        document.getElementById('beginnerCount').textContent = this.beginner.length;
        document.getElementById('queueTotal').textContent = this.needsWork.length;
    },

    render() {
        // Check if queue is empty
        if (this.needsWork.length === 0) {
            document.getElementById('criticalSection').style.display = 'none';
            document.getElementById('highSection').style.display = 'none';
            document.getElementById('beginnerSection').style.display = 'none';
            document.getElementById('remainingSection').style.display = 'none';
            document.getElementById('allClearState').style.display = 'block';
            return;
        }

        // Render each section
        this.renderSection('critical', this.critical, 'criticalEmpty');
        this.renderSection('high', this.high, 'highEmpty');
        this.renderSection('beginner', this.beginner, 'beginnerEmpty');
        this.renderSection('remaining', this.remaining, 'remainingEmpty');
    },

    renderSection(queueId, tutorials, emptyId) {
        const grid = document.getElementById(`${queueId}Queue`);
        const empty = document.getElementById(emptyId);
        const section = document.getElementById(`${queueId}Section`);

        if (!grid || !section) return;

        if (tutorials.length === 0) {
            grid.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        if (empty) empty.style.display = 'none';

        grid.innerHTML = tutorials.map(t => this.renderCard(t)).join('');
    },

    renderCard(t) {
        const validityClass = Utils.getValidityClass(t.validity?.grade);
        const decisionClass = Utils.getDecisionClass(t.decision);
        const priorityClass = Utils.getPriorityClass(t.priority);
        const statusClass = Utils.getStatusClass(t.revampStatus);
        const levelClass = Utils.getLevelClass(t.targetLevel);

        const topIssue = t.topIssues?.[0];

        return `
            <div class="queue-card">
                <div class="queue-card-header">
                    <h3 class="queue-card-title">
                        <a href="tutorial.html?id=${Utils.escapeHtml(t.id)}">${Utils.escapeHtml(t.title)}</a>
                    </h3>
                </div>
                <div class="queue-card-meta">
                    ${t.validity?.grade ? `<span class="validity-badge ${validityClass}">${t.validity.grade}</span>` : ''}
                    <span class="decision-badge ${decisionClass}">${Utils.escapeHtml(t.decision || 'Not Decided')}</span>
                    ${t.priority && t.priority !== 'None' ? `<span class="priority-badge ${priorityClass}">${t.priority}</span>` : ''}
                    <span class="level-badge ${levelClass}">${Utils.escapeHtml(t.targetLevel)}</span>
                    <span class="status-badge ${statusClass}">${Utils.escapeHtml(t.revampStatus)}</span>
                </div>
                ${topIssue ? `
                    <div class="queue-card-issue">
                        <strong>${Utils.escapeHtml(topIssue.title)}</strong>
                        ${topIssue.description ? `<p>${Utils.escapeHtml(topIssue.description.substring(0, 100))}${topIssue.description.length > 100 ? '...' : ''}</p>` : ''}
                    </div>
                ` : ''}
                <div class="queue-card-footer">
                    <span>Reviewed: ${Utils.formatDate(t.lastReviewed)}</span>
                    <a href="tutorial.html?id=${Utils.escapeHtml(t.id)}" class="btn btn-secondary btn-sm">View Audit</a>
                </div>
            </div>
        `;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    RevampQueue.init();
});
