/**
 * Cytron Tutorial Validation Dashboard
 * Final Output Viewer JavaScript
 *
 * Milestone 4: this page now has two modes.
 *   - Static mode (unchanged): ?id=<tutorialId> only — loads the committed,
 *     already-promoted revampedOutputFile from the static site, exactly as
 *     before.
 *   - Draft mode (new): ?id=<tutorialId>&jobId=<jobId> — loads the raw
 *     candidate Markdown for that exact real-writer job from the local
 *     bridge (authenticated). This is a LOCAL REVIEW ARTIFACT ONLY: nothing
 *     here reads or writes revamped-tutorials/ or data/tutorials.json for a
 *     draft. Internal Editor Notes are intentionally shown, not hidden —
 *     they are hidden from publication, not from the human reviewer.
 */

(function () {
    const BRIDGE_URL = 'http://127.0.0.1:47821';
    const TOKEN_KEY = 'revampBridgeToken';

    function getToken() {
        try {
            return window.sessionStorage.getItem(TOKEN_KEY) || '';
        } catch {
            return '';
        }
    }

    async function bridgeFetch(path, options = {}) {
        const headers = Object.assign({}, options.headers);
        const token = getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${BRIDGE_URL}${path}`, { ...options, headers });
        let data = null;
        try {
            data = await res.json();
        } catch {
            // no/invalid JSON body
        }
        return { res, data };
    }

    // Splits a candidate draft into its public and internal-notes parts so
    // the internal section can get a distinct visual treatment — it is
    // still fully rendered and readable, never hidden from the reviewer.
    function splitPublicAndInternal(markdown) {
        const marker = /^#{1,2}\s*INTERNAL EDITOR NOTES/im;
        const match = marker.exec(markdown || '');
        if (!match) return { publicPart: markdown || '', internalPart: '' };
        return { publicPart: markdown.slice(0, match.index), internalPart: markdown.slice(match.index) };
    }

    const FinalOutputViewer = {
        tutorial: null,
        jobId: null,

        async init() {
            const id = Utils.getUrlParam('id');
            this.jobId = Utils.getUrlParam('jobId');

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

            if (this.jobId) {
                await this.initDraftMode();
                return;
            }

            if (!this.tutorial.revampedOutputFile) {
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
        },

        // -----------------------------------------------------------------
        // Draft mode (Milestone 4) — ?id=<tutorialId>&jobId=<jobId>
        // -----------------------------------------------------------------

        renderDraftHeader(job) {
            const t = this.tutorial;
            document.title = `${t.title} (Draft) - Cytron Dashboard`;

            const breadcrumbTitle = document.getElementById('breadcrumbTitle');
            if (breadcrumbTitle) breadcrumbTitle.textContent = `${t.title} (Draft)`;

            const titleEl = document.getElementById('tutorialTitle');
            if (titleEl) titleEl.textContent = t.title;

            const originalLink = document.getElementById('originalLink');
            if (originalLink) originalLink.href = t.url || '#';

            // In draft mode "Back" should return to the tutorial page (where
            // Revamp Tutorial lives), not the published Final Output list.
            const backBtn = document.getElementById('backToFinalBtn');
            if (backBtn) {
                backBtn.href = `tutorial.html?id=${encodeURIComponent(t.id)}`;
                backBtn.textContent = '';
                backBtn.append('← Back to Tutorial');
            }

            const metaEl = document.getElementById('tutorialMeta');
            if (metaEl) {
                metaEl.innerHTML = `
                    <div class="meta-item">
                        <strong>Job Status:</strong>
                        <span class="status-badge">${Utils.escapeHtml(job.state)}</span>
                    </div>
                    <div class="meta-item">
                        <strong>Level:</strong>
                        <span class="level-badge ${Utils.getLevelClass(t.targetLevel)}">${Utils.escapeHtml(t.targetLevel || '-')}</span>
                    </div>
                `;
            }

            const banner = document.getElementById('draftReviewBanner');
            if (banner) {
                const summary = job.validationSummary;
                const summaryLine = summary
                    ? `Validation: ${summary.pass || 0} passed, ${summary.warning || 0} warning(s), ${summary.fail || 0} failed, ${summary.blocked || 0} blocking.`
                    : '';
                const needsReviewLine = job.state === 'Needs Human Review' && Array.isArray(job.blockingReasons) && job.blockingReasons.length
                    ? `<ul class="revamp-blocking-reasons">${job.blockingReasons.map((r) => `<li>${Utils.escapeHtml(r)}</li>`).join('')}</ul>`
                    : '';
                banner.style.display = 'block';
                banner.innerHTML = `
                    <strong>Local Review Draft — Not Published.</strong>
                    This is a real-writer draft for internal review only. Nothing in <code>revamped-tutorials/</code> or
                    <code>data/tutorials.json</code> has been changed. ${summaryLine}
                    ${needsReviewLine}
                `;
            }
        },

        showDraftError(message) {
            const container = document.getElementById('markdownContainer');
            const banner = document.getElementById('draftReviewBanner');
            if (banner) banner.style.display = 'none';
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <p>${Utils.escapeHtml(message)}</p>
                    </div>
                `;
            }
        },

        async initDraftMode() {
            if (!getToken()) {
                this.renderDraftHeader({ state: 'Unknown', validationSummary: null });
                this.showDraftError('This browser is not paired with the local Revamp Bridge. Open this tutorial\'s page and use "Revamp Tutorial" to pair, then come back to this draft.');
                return;
            }

            let jobResult;
            try {
                jobResult = await bridgeFetch(`/api/revamp/${encodeURIComponent(this.jobId)}`, { method: 'GET' });
            } catch {
                this.renderDraftHeader({ state: 'Unknown', validationSummary: null });
                this.showDraftError(`Could not reach the local bridge at ${BRIDGE_URL}. Make sure it is running.`);
                return;
            }

            if (jobResult.res.status === 401) {
                this.renderDraftHeader({ state: 'Unknown', validationSummary: null });
                this.showDraftError('Pairing token was rejected. Re-pair from this tutorial\'s page and try again.');
                return;
            }
            if (jobResult.res.status === 404) {
                this.showNotFound();
                return;
            }
            if (!jobResult.res.ok || !jobResult.data || !jobResult.data.ok) {
                this.renderDraftHeader({ state: 'Unknown', validationSummary: null });
                this.showDraftError(`Bridge returned HTTP ${jobResult.res.status} while loading this job.`);
                return;
            }

            const job = jobResult.data.job;
            if (job.tutorialId !== this.tutorial.id) {
                this.showNotFound();
                return;
            }

            this.renderDraftHeader(job);

            let outputResult;
            try {
                outputResult = await bridgeFetch(`/api/revamp/${encodeURIComponent(this.jobId)}/output`, { method: 'GET' });
            } catch {
                this.showDraftError(`Could not reach the local bridge at ${BRIDGE_URL}. Make sure it is running.`);
                return;
            }

            if (outputResult.res.status === 404) {
                this.showDraftError('No candidate tutorial output exists yet for this job. It may still be generating, or the job may have failed before producing a draft.');
                return;
            }
            if (!outputResult.res.ok || !outputResult.data || !outputResult.data.ok) {
                this.showDraftError(`Bridge returned HTTP ${outputResult.res.status} while loading the draft output.`);
                return;
            }

            const container = document.getElementById('markdownContainer');
            if (!container) return;

            const { publicPart, internalPart } = splitPublicAndInternal(outputResult.data.markdown);
            container.innerHTML = Utils.renderMarkdown(publicPart) + (internalPart
                ? `<div class="internal-editor-notes-block">
                       <div class="internal-editor-notes-label">Internal Editor Notes — visible to reviewers, never published</div>
                       ${Utils.renderMarkdown(internalPart)}
                   </div>`
                : '');
        }
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        FinalOutputViewer.init();
    });

    window.FinalOutputViewer = FinalOutputViewer;
})();
