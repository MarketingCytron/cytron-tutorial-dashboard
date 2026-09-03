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

            this.job = job;
            this.renderPublishAction(job);
        },

        // -----------------------------------------------------------------
        // Milestone 5 — Human Approval & Final Output Publishing
        // -----------------------------------------------------------------

        isJobBlocking(job) {
            return job.state === 'Needs Human Review'
                || (Array.isArray(job.blockingReasons) && job.blockingReasons.length > 0);
        },

        renderPublishAction(job) {
            const area = document.getElementById('publishActionArea');
            if (!area) return;

            const ELIGIBLE_STATES = ['Ready for Review', 'Needs Human Review'];

            if (this.tutorial.revampedOutputFile) {
                area.style.display = 'flex';
                area.innerHTML = `
                    <span class="publish-already-badge">Already in Final Output</span>
                    <a class="btn btn-secondary" href="final-output.html?id=${encodeURIComponent(this.tutorial.id)}">View Published Final Output</a>
                `;
                return;
            }

            if (!ELIGIBLE_STATES.includes(job.state)) {
                area.style.display = 'none';
                area.innerHTML = '';
                return;
            }

            area.style.display = 'flex';
            area.innerHTML = `<button type="button" class="btn btn-primary" id="approvePublishBtn">Approve &amp; Publish to Final Output</button>`;
            const btn = document.getElementById('approvePublishBtn');
            if (btn) btn.addEventListener('click', () => this.openPublishModal());
        },

        openPublishModal() {
            const overlay = document.getElementById('publishModalOverlay');
            const body = document.getElementById('publishModalBody');
            if (!overlay || !body) return;

            const job = this.job;
            const t = this.tutorial;
            const summary = job.validationSummary;
            const blocking = this.isJobBlocking(job);

            const summaryHtml = summary
                ? `<div class="publish-summary-block">
                       <dl>
                           <dt>Tutorial</dt><dd>${Utils.escapeHtml(t.title)}</dd>
                           <dt>Tutorial ID</dt><dd><code>${Utils.escapeHtml(t.id)}</code></dd>
                           <dt>Job ID</dt><dd><code>${Utils.escapeHtml(job.jobId)}</code></dd>
                           <dt>Validation</dt><dd>${summary.pass || 0} passed, ${summary.warning || 0} warning(s), ${summary.fail || 0} failed, ${summary.blocked || 0} blocking</dd>
                       </dl>
                   </div>`
                : `<div class="publish-summary-block">
                       <dl>
                           <dt>Tutorial</dt><dd>${Utils.escapeHtml(t.title)}</dd>
                           <dt>Tutorial ID</dt><dd><code>${Utils.escapeHtml(t.id)}</code></dd>
                           <dt>Job ID</dt><dd><code>${Utils.escapeHtml(job.jobId)}</code></dd>
                       </dl>
                   </div>`;

            const blockingHtml = blocking
                ? `<div class="publish-blocking-warning">
                       <strong>This draft contains blocking verification items.</strong> You are approving publication despite these outstanding items.
                       ${Array.isArray(job.blockingReasons) && job.blockingReasons.length
                           ? `<ul>${job.blockingReasons.map((r) => `<li>${Utils.escapeHtml(r)}</li>`).join('')}</ul>`
                           : ''}
                   </div>
                   <label class="publish-ack-checkbox">
                       <input type="checkbox" id="publishAckBlocking">
                       I acknowledge this draft has blocking verification items and still want to publish.
                   </label>`
                : '';

            body.innerHTML = `
                <div class="revamp-modal-header"><h2 id="publishModalTitle">Approve &amp; Publish</h2>
                    <button type="button" class="revamp-modal-close" id="publishModalCloseBtn" aria-label="Close">&times;</button>
                </div>
                ${summaryHtml}
                ${blockingHtml}
                <p>This will create the permanent Final Output, update the tutorial dataset, commit the approved files, and push them to <code>origin/main</code>.</p>
                <div id="publishModalError"></div>
                <div class="revamp-actions">
                    <button type="button" class="btn btn-secondary" id="publishCancelBtn">Cancel</button>
                    <button type="button" class="btn btn-primary" id="publishConfirmBtn">Approve &amp; Publish</button>
                </div>
            `;

            overlay.style.display = 'flex';

            const closeModal = () => { overlay.style.display = 'none'; };
            document.getElementById('publishModalCloseBtn').addEventListener('click', closeModal);
            document.getElementById('publishCancelBtn').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); }, { once: true });

            const ackBox = document.getElementById('publishAckBlocking');
            const confirmBtn = document.getElementById('publishConfirmBtn');
            if (blocking && ackBox) {
                confirmBtn.disabled = true;
                ackBox.addEventListener('change', () => { confirmBtn.disabled = !ackBox.checked; });
            }

            confirmBtn.addEventListener('click', () => this.submitPublish(blocking && ackBox ? ackBox.checked : true));
        },

        async submitPublish(confirmedBlocking) {
            const confirmBtn = document.getElementById('publishConfirmBtn');
            const cancelBtn = document.getElementById('publishCancelBtn');
            const errorBox = document.getElementById('publishModalError');
            if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Publishing...'; }
            if (cancelBtn) cancelBtn.disabled = true;
            if (errorBox) errorBox.innerHTML = '';

            let result;
            try {
                result = await bridgeFetch(`/api/revamp/${encodeURIComponent(this.job.jobId)}/publish`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ confirmed: true, confirmedBlocking: !!confirmedBlocking }),
                });
            } catch {
                this.showPublishModalError(`Could not reach the local bridge at ${BRIDGE_URL}. Make sure it is running.`);
                return;
            }

            const { res, data } = result;
            if (!res.ok || !data || !data.ok) {
                const message = (data && data.error && data.error.message) || `Bridge returned HTTP ${res.status}.`;
                this.showPublishModalError(message, data && data.error);
                return;
            }

            document.getElementById('publishModalOverlay').style.display = 'none';
            this.renderPublishResult(data);
        },

        showPublishModalError(message, errorDetail) {
            const errorBox = document.getElementById('publishModalError');
            const confirmBtn = document.getElementById('publishConfirmBtn');
            const cancelBtn = document.getElementById('publishCancelBtn');
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Approve & Publish'; }
            if (cancelBtn) cancelBtn.disabled = false;
            if (errorBox) {
                const filesHtml = errorDetail && Array.isArray(errorDetail.files) && errorDetail.files.length
                    ? `<ul>${errorDetail.files.map((f) => `<li><code>${Utils.escapeHtml(f)}</code></li>`).join('')}</ul>`
                    : '';
                const problemsHtml = errorDetail && Array.isArray(errorDetail.problems) && errorDetail.problems.length
                    ? `<ul>${errorDetail.problems.map((p) => `<li>${Utils.escapeHtml(p)}</li>`).join('')}</ul>`
                    : '';
                errorBox.innerHTML = `<div class="revamp-error">${Utils.escapeHtml(message)}${filesHtml}${problemsHtml}</div>`;
            }
        },

        renderPublishResult(data) {
            const area = document.getElementById('publishActionArea');
            const banner = document.getElementById('draftReviewBanner');
            if (banner) banner.style.display = 'none';
            if (!area) return;

            const viewFinalHref = `final-output.html?id=${encodeURIComponent(this.tutorial.id)}`;

            if (data.pushSucceeded) {
                area.style.display = 'block';
                area.innerHTML = `
                    <div class="revamp-success">Final Output Published</div>
                    <ul class="revamp-steps">
                        <li class="done"><span>&#10003;</span> Human approved</li>
                        <li class="done"><span>&#10003;</span> Permanent tutorial created</li>
                        <li class="done"><span>&#10003;</span> Dataset updated</li>
                        <li class="done"><span>&#10003;</span> Validation passed</li>
                        <li class="done"><span>&#10003;</span> Git commit created</li>
                        <li class="done"><span>&#10003;</span> Pushed to main</li>
                    </ul>
                    <p class="publish-push-note">Published to main. GitHub Pages may take a short time to refresh.</p>
                    <div class="revamp-actions">
                        <a class="btn btn-primary" href="${viewFinalHref}">View Published Final Output</a>
                        <a class="btn btn-secondary" href="tutorials.html?tab=final-output">Back to Final Output</a>
                    </div>
                `;
            } else {
                area.style.display = 'block';
                area.innerHTML = `
                    <div class="revamp-notice">Published locally, GitHub push failed. The commit was created and nothing was lost — retry the push below.</div>
                    <ul class="revamp-steps">
                        <li class="done"><span>&#10003;</span> Human approved</li>
                        <li class="done"><span>&#10003;</span> Permanent tutorial created</li>
                        <li class="done"><span>&#10003;</span> Dataset updated</li>
                        <li class="done"><span>&#10003;</span> Validation passed</li>
                        <li class="done"><span>&#10003;</span> Git commit created</li>
                        <li class="failed"><span>&times;</span> Pushed to main</li>
                    </ul>
                    <div class="revamp-actions">
                        <button type="button" class="btn btn-primary" id="retryPushBtn">Retry Push</button>
                    </div>
                `;
                const retryBtn = document.getElementById('retryPushBtn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', async () => {
                        retryBtn.disabled = true;
                        retryBtn.textContent = 'Retrying...';
                        let result;
                        try {
                            result = await bridgeFetch(`/api/revamp/${encodeURIComponent(this.job.jobId)}/publish`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ confirmed: true }),
                            });
                        } catch {
                            retryBtn.disabled = false;
                            retryBtn.textContent = 'Retry Push';
                            return;
                        }
                        const { res, data: retryData } = result;
                        if (res.ok && retryData && retryData.ok) {
                            this.renderPublishResult(retryData);
                        } else {
                            retryBtn.disabled = false;
                            retryBtn.textContent = 'Retry Push';
                        }
                    });
                }
            }
        }
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        FinalOutputViewer.init();
    });

    window.FinalOutputViewer = FinalOutputViewer;
})();
