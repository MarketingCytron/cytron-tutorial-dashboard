/**
 * Cytron Tutorial Validation Dashboard
 * Final Output Viewer JavaScript
 */

const FinalOutputViewer = {
    tutorial: null,

    async init() {
        const id = Utils.getUrlParam('id');
        if (!id) {
            this.showNotFound();
            return;
        }

        const data = await Utils.loadData();
        this.tutorial = data.tutorials?.find(t => t.id === id);

        if (!this.tutorial || !this.tutorial.revampedOutputFile) {
            this.showNotFound();
            return;
        }

        this.renderHeader();
        await this.loadMarkdown();
    },

    showNotFound() {
        const notFound = document.getElementById('notFoundState');
        const view = document.getElementById('finalOutputView');
        if (notFound) notFound.style.display = 'block';
        if (view) view.style.display = 'none';
    },

    renderHeader() {
        const t = this.tutorial;
        document.title = `${t.title} - Final Output - Cytron Dashboard`;

        const breadcrumbTitle = document.getElementById('breadcrumbTitle');
        if (breadcrumbTitle) breadcrumbTitle.textContent = t.title;

        const titleEl = document.getElementById('tutorialTitle');
        if (titleEl) titleEl.textContent = t.title;

        const originalLink = document.getElementById('originalLink');
        if (originalLink) {
            originalLink.href = t.url || '#';
        }

        const metaEl = document.getElementById('tutorialMeta');
        if (metaEl) {
            const statusClass = Utils.getStatusClass(t.revampStatus);
            const levelClass = Utils.getLevelClass(t.targetLevel);
            const validityClass = Utils.getValidityClass(t.validity?.grade);
            const pubDate = Utils.formatDate(t.publishDate);

            metaEl.innerHTML = `
                <div class="meta-item">
                    <strong>Status:</strong>
                    <span class="status-badge ${statusClass}">${Utils.escapeHtml(t.revampStatus || 'Revamping')}</span>
                </div>
                <div class="meta-item">
                    <strong>Publish Date:</strong> ${pubDate}
                </div>
                <div class="meta-item">
                    <strong>Level:</strong>
                    <span class="level-badge ${levelClass}">${Utils.escapeHtml(t.targetLevel || '-')}</span>
                </div>
                <div class="meta-item">
                    <strong>Validity:</strong>
                    ${t.validity?.grade
                        ? `<span class="validity-badge ${validityClass}">${t.validity.grade} - ${Utils.escapeHtml(t.validity.label)}</span>`
                        : '<span class="validity-badge not-reviewed">Not Reviewed</span>'
                    }
                </div>
                <div class="meta-item">
                    <strong>Draft:</strong>
                    <code>${Utils.escapeHtml(t.revampedOutputFile)}</code>
                </div>
            `;
        }
    },

    async loadMarkdown() {
        const container = document.getElementById('markdownContainer');
        if (!container) return;

        try {
            const response = await fetch(`${Utils.getBasePath()}${this.tutorial.revampedOutputFile}`);
            if (!response.ok) throw new Error('Failed to load markdown file');

            const markdown = await response.text();
            container.innerHTML = Utils.renderMarkdown(markdown);
        } catch (err) {
            console.error('Error loading revamped markdown:', err);
            container.innerHTML = `
                <div class="empty-state">
                    <p>Could not load the revamped tutorial file (<code>${Utils.escapeHtml(this.tutorial.revampedOutputFile)}</code>).</p>
                </div>
            `;
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    FinalOutputViewer.init();
});
