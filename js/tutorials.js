/**
 * Cytron Tutorial Validation Dashboard
 * Tutorials List Page JavaScript
 */

// Milestone 7 — effective revampStatus overrides ('Complete'/'Revamping'),
// fetched from the local bridge's bulk GET /api/tutorial-status when this
// browser is paired (sessionStorage token present). Best-effort only: if the
// bridge is unreachable or no token is stored, the dashboard simply falls
// back to each tutorial's own dataset revampStatus, exactly as before this
// milestone. This is ONE bulk request, never a per-tutorial fetch.
const BRIDGE_URL = 'http://127.0.0.1:47821';
const BRIDGE_TOKEN_KEY = 'revampBridgeToken';

function getBridgeToken() {
    try {
        return window.sessionStorage.getItem(BRIDGE_TOKEN_KEY) || '';
    } catch {
        return '';
    }
}

const TutorialsList = {
    tutorials: [],
    filteredTutorials: [],
    statusOverrides: {},
    // Milestone 7 human rule: sorting must be based on Publish Date
    // (ascending, earliest first), not Tutorial Name. Missing dates sort
    // after dated ones (see sortTutorials()'s 'publishDate' case).
    sortColumn: 'publishDate',
    sortDirection: 'asc',
    currentTab: 'all',
    filters: {
        search: '',
        level: '',
        validity: '',
        decision: '',
        status: '',
        priority: '',
        category: '',
        publishwindow: ''
    },

    // Launch date: September 16, 2026
    LAUNCH_DATE: '2026-09-16',

    async init() {
        const data = await Utils.loadData();
        this.tutorials = data.tutorials || [];
        this.filteredTutorials = [...this.tutorials];

        await this.loadStatusOverrides();

        this.populateCategoryFilter();
        this.initTabs();
        this.initFilters();
        this.initSorting();
        this.loadUrlParams();
        this.applyFilters();
        this.render();
        this.renderFinalOutput();
    },

    // Milestone 7 — one bulk, best-effort bridge call. Never blocks or
    // breaks the dashboard: any failure (no token, bridge not running,
    // network error, bad JSON) just leaves statusOverrides empty.
    async loadStatusOverrides() {
        const token = getBridgeToken();
        if (!token) return;
        try {
            const res = await fetch(`${BRIDGE_URL}/api/tutorial-status`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.ok && data.statuses && typeof data.statuses === 'object') {
                this.statusOverrides = data.statuses;
            }
        } catch {
            // Bridge not reachable — silently fall back to dataset values.
        }
    },

    // Effective status: the bridge-derived override (Complete/Revamping)
    // when present, otherwise the tutorial's own dataset revampStatus.
    getEffectiveStatus(tutorial) {
        return (tutorial && this.statusOverrides[tutorial.id]) || (tutorial && tutorial.revampStatus);
    },

    initTabs() {
        const tabAll = document.getElementById('tabAll');
        const tabFinal = document.getElementById('tabFinal');

        if (tabAll) {
            tabAll.addEventListener('click', () => {
                this.switchTab('all');
            });
        }

        if (tabFinal) {
            tabFinal.addEventListener('click', () => {
                this.switchTab('final-output');
            });
        }
    },

    switchTab(tabName, updateUrl = true) {
        this.currentTab = tabName;
        const tabAll = document.getElementById('tabAll');
        const tabFinal = document.getElementById('tabFinal');
        const contentAll = document.getElementById('tabContentAll');
        const contentFinal = document.getElementById('tabContentFinal');

        if (tabName === 'final-output') {
            if (tabAll) {
                tabAll.classList.remove('active');
                tabAll.setAttribute('aria-selected', 'false');
            }
            if (tabFinal) {
                tabFinal.classList.add('active');
                tabFinal.setAttribute('aria-selected', 'true');
            }
            if (contentAll) contentAll.style.display = 'none';
            if (contentFinal) contentFinal.style.display = 'block';
        } else {
            if (tabFinal) {
                tabFinal.classList.remove('active');
                tabFinal.setAttribute('aria-selected', 'false');
            }
            if (tabAll) {
                tabAll.classList.add('active');
                tabAll.setAttribute('aria-selected', 'true');
            }
            if (contentFinal) contentFinal.style.display = 'none';
            if (contentAll) contentAll.style.display = 'block';
        }

        if (updateUrl) {
            this.updateUrlParams();
        }
    },

    populateCategoryFilter() {
        const categorySelect = document.getElementById('filterCategory');
        if (!categorySelect) return;

        const categories = [...new Set(this.tutorials.map(t => t.category).filter(Boolean))].sort();

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    },

    initFilters() {
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value.toLowerCase();
                this.applyFilters();
                this.render();
            });
        }

        // Select filters
        const filterIds = ['filterLevel', 'filterValidity', 'filterDecision', 'filterStatus', 'filterPriority', 'filterCategory', 'filterPublishWindow'];
        filterIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', (e) => {
                    const filterName = id.replace('filter', '').toLowerCase();
                    this.filters[filterName] = e.target.value;
                    this.updateUrlParams();
                    this.applyFilters();
                    this.render();
                });
            }
        });

        // Clear filters button
        const clearBtn = document.getElementById('clearFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }
    },

    initSorting() {
        document.querySelectorAll('.data-table th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                if (this.sortColumn === column) {
                    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortColumn = column;
                    this.sortDirection = 'asc';
                }
                this.updateSortUI();
                this.sortTutorials();
                this.render();
            });
        });
    },

    loadUrlParams() {
        const params = new URLSearchParams(window.location.search);

        if (params.get('tab') === 'final-output') {
            this.switchTab('final-output', false);
        }

        if (params.get('level')) {
            this.filters.level = params.get('level');
            const select = document.getElementById('filterLevel');
            if (select) select.value = this.filters.level;
        }

        if (params.get('validity')) {
            this.filters.validity = params.get('validity');
            const select = document.getElementById('filterValidity');
            if (select) select.value = this.filters.validity;
        }

        if (params.get('decision')) {
            this.filters.decision = params.get('decision');
            const select = document.getElementById('filterDecision');
            if (select) select.value = this.filters.decision;
        }

        if (params.get('status')) {
            this.filters.status = params.get('status');
            const select = document.getElementById('filterStatus');
            if (select) select.value = this.filters.status;
        }

        if (params.get('priority')) {
            this.filters.priority = params.get('priority');
            const select = document.getElementById('filterPriority');
            if (select) select.value = this.filters.priority;
        }

        if (params.get('category')) {
            this.filters.category = params.get('category');
            const select = document.getElementById('filterCategory');
            if (select) select.value = this.filters.category;
        }

        if (params.get('search')) {
            this.filters.search = params.get('search').toLowerCase();
            const input = document.getElementById('searchInput');
            if (input) input.value = params.get('search');
        }

        if (params.get('publishwindow')) {
            this.filters.publishwindow = params.get('publishwindow');
            const select = document.getElementById('filterPublishWindow');
            if (select) select.value = this.filters.publishwindow;
        }
    },

    updateUrlParams() {
        const params = new URLSearchParams();

        if (this.currentTab === 'final-output') {
            params.set('tab', 'final-output');
        }

        if (this.filters.level) params.set('level', this.filters.level);
        if (this.filters.validity) params.set('validity', this.filters.validity);
        if (this.filters.decision) params.set('decision', this.filters.decision);
        if (this.filters.status) params.set('status', this.filters.status);
        if (this.filters.priority) params.set('priority', this.filters.priority);
        if (this.filters.category) params.set('category', this.filters.category);
        if (this.filters.publishwindow) params.set('publishwindow', this.filters.publishwindow);
        if (this.filters.search) params.set('search', this.filters.search);

        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
    },

    // Helper: Check publish window filter
    matchesPublishWindow(tutorial, filter) {
        if (!filter || !tutorial.publishDate) return true;

        const pubDate = tutorial.publishDate;

        switch (filter) {
            case 'beforeLaunch':
                return pubDate >= '2026-09-01' && pubDate <= '2026-09-15';
            case 'launchDay':
                return pubDate === '2026-09-16';
            case 'afterLaunch':
                return pubDate >= '2026-09-17' && pubDate <= '2026-09-30';
            default:
                return true;
        }
    },

    applyFilters() {
        this.filteredTutorials = this.tutorials.filter(t => {
            // Search filter
            if (this.filters.search) {
                const searchStr = this.filters.search;
                const searchable = [
                    t.title,
                    t.category,
                    t.subcategory,
                    t.url,
                    ...(t.products || []),
                    ...(t.technologies || []),
                    ...(t.keywords || []),
                    t.mainRecommendation
                ].filter(Boolean).join(' ').toLowerCase();

                if (!searchable.includes(searchStr)) return false;
            }

            // Level filter
            if (this.filters.level && t.targetLevel !== this.filters.level) return false;

            // Validity filter
            if (this.filters.validity) {
                if (this.filters.validity === 'Not Reviewed') {
                    if (t.reviewed) return false;
                } else if (t.validity?.grade !== this.filters.validity) {
                    return false;
                }
            }

            // Decision filter
            if (this.filters.decision && t.decision !== this.filters.decision) return false;

            // Status filter (matches the bridge-derived effective status when
            // one is available, so a locally-active/reviewable job shows up
            // under "Revamping" without data/tutorials.json ever being touched)
            if (this.filters.status && this.getEffectiveStatus(t) !== this.filters.status) return false;

            // Priority filter
            if (this.filters.priority) {
                if (this.filters.priority === 'None') {
                    if (t.priority && t.priority !== 'None') return false;
                } else if (t.priority !== this.filters.priority) {
                    return false;
                }
            }

            // Category filter
            if (this.filters.category && t.category !== this.filters.category) return false;

            // Publish window filter
            if (this.filters.publishwindow && !this.matchesPublishWindow(t, this.filters.publishwindow)) return false;

            return true;
        });

        this.sortTutorials();
        this.updateFilterSummary();
    },

    sortTutorials() {
        this.filteredTutorials.sort((a, b) => {
            let aVal, bVal;

            switch (this.sortColumn) {
                case 'title':
                    aVal = a.title?.toLowerCase() || '';
                    bVal = b.title?.toLowerCase() || '';
                    break;
                case 'category':
                    aVal = a.category?.toLowerCase() || '';
                    bVal = b.category?.toLowerCase() || '';
                    break;
                case 'targetLevel':
                    const levelOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
                    aVal = levelOrder[a.targetLevel] || 4;
                    bVal = levelOrder[b.targetLevel] || 4;
                    break;
                case 'validity':
                    const validityOrder = { 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5 };
                    aVal = validityOrder[a.validity?.grade] || 6;
                    bVal = validityOrder[b.validity?.grade] || 6;
                    break;
                case 'decision':
                    const decisionOrder = { 'Keep': 1, 'Minor Update': 2, 'Major Revamp': 3, 'Replace': 4, 'Not Decided': 5 };
                    aVal = decisionOrder[a.decision] || 6;
                    bVal = decisionOrder[b.decision] || 6;
                    break;
                case 'priority':
                    const priorityOrder = { 'P0': 1, 'P1': 2, 'P2': 3, 'P3': 4, 'None': 5 };
                    aVal = priorityOrder[a.priority] || 6;
                    bVal = priorityOrder[b.priority] || 6;
                    break;
                case 'revampStatus':
                    const statusOrder = { 'Not Reviewed': 1, 'Reviewed': 2, 'Planned': 3, 'Revamping': 4, 'Complete': 5, 'Completed': 5, 'Archived': 6 };
                    aVal = statusOrder[this.getEffectiveStatus(a)] || 7;
                    bVal = statusOrder[this.getEffectiveStatus(b)] || 7;
                    break;
                case 'technicalScore':
                    aVal = a.technicalScore || 0;
                    bVal = b.technicalScore || 0;
                    break;
                case 'lastReviewed':
                    aVal = a.lastReviewed || '1900-01-01';
                    bVal = b.lastReviewed || '1900-01-01';
                    break;
                case 'publishDate':
                    aVal = a.publishDate || '9999-12-31';
                    bVal = b.publishDate || '9999-12-31';
                    break;
                default:
                    aVal = '';
                    bVal = '';
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;

            // Deterministic stable fallback for the primary Publish Date sort:
            // equal (or equally-missing) dates break the tie by title only —
            // title is never the primary key, per the Milestone 7 human rule.
            if (this.sortColumn === 'publishDate') {
                const aTitle = a.title?.toLowerCase() || '';
                const bTitle = b.title?.toLowerCase() || '';
                if (aTitle < bTitle) return -1;
                if (aTitle > bTitle) return 1;
            }
            return 0;
        });
    },

    updateSortUI() {
        document.querySelectorAll('.data-table th.sortable').forEach(th => {
            th.classList.remove('asc', 'desc');
            if (th.dataset.sort === this.sortColumn) {
                th.classList.add(this.sortDirection);
            }
        });
    },

    updateFilterSummary() {
        const countEl = document.getElementById('filterCount');
        const clearBtn = document.getElementById('clearFilters');

        if (countEl) {
            countEl.textContent = `Showing ${this.filteredTutorials.length} of ${this.tutorials.length} tutorials`;
        }

        const hasFilters = Object.values(this.filters).some(v => v);
        if (clearBtn) {
            clearBtn.style.display = hasFilters ? 'inline-flex' : 'none';
        }
    },

    clearFilters() {
        this.filters = {
            search: '',
            level: '',
            validity: '',
            decision: '',
            status: '',
            priority: '',
            category: '',
            publishwindow: ''
        };

        // Reset form elements
        const resetIds = ['searchInput', 'filterLevel', 'filterValidity', 'filterDecision', 'filterStatus', 'filterPriority', 'filterCategory', 'filterPublishWindow'];
        resetIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);

        this.applyFilters();
        this.render();
    },

    // Helper: Check if date is overdue
    isOverdue(dateStr, status) {
        if (!dateStr || Utils.isDoneStatus(status)) return false;
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    },

    // Helper: Format date with overdue indicator
    formatDateWithStatus(dateStr, status, type) {
        if (!dateStr) return '-';

        const isOverdueDate = this.isOverdue(dateStr, status);
        const formattedDate = Utils.formatDate(dateStr);

        if (isOverdueDate) {
            return `<span class="date-overdue" title="${type} date has passed">${formattedDate}</span>`;
        }
        return formattedDate;
    },

    render() {
        const tbody = document.getElementById('tutorialsBody');
        const emptyState = document.getElementById('emptyState');
        const tableSection = document.querySelector('.table-section .table-container');

        if (!tbody) return;

        if (this.filteredTutorials.length === 0) {
            tableSection.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        tableSection.style.display = 'block';
        emptyState.style.display = 'none';

        tbody.innerHTML = this.filteredTutorials.map(t => {
            const effectiveStatus = this.getEffectiveStatus(t);
            const validityClass = Utils.getValidityClass(t.validity?.grade);
            const decisionClass = Utils.getDecisionClass(t.decision);
            const priorityClass = Utils.getPriorityClass(t.priority);
            const statusClass = Utils.getStatusClass(effectiveStatus);
            const levelClass = Utils.getLevelClass(t.targetLevel);

            // Hardware info
            const hw = t.hardwareUsed;
            const board = hw?.board || '-';
            const components = hw?.components?.length > 0 ? hw.components.join(', ') : 'None';
            const hardwareDisplay = board === 'None' ? 'Software only' :
                (components === 'None' ? board : `${board}<br><small class="text-muted">${Utils.escapeHtml(components)}</small>`);

            // Date formatting with overdue indicator. Milestone 8: Prep Date
            // is no longer shown anywhere in the UI (preparationDate stays
            // in the dataset — see js/app.js/tutorialContext — this is a
            // display-only removal); Publish Date remains the sole visible date.
            const pubDateDisplay = this.formatDateWithStatus(t.publishDate, effectiveStatus, 'Publish');

            return `
                <tr>
                    <td>
                        <a href="tutorial.html?id=${Utils.escapeHtml(t.id)}" class="tutorial-link">
                            ${Utils.escapeHtml(t.title)}
                        </a>
                    </td>
                    <td>${Utils.escapeHtml(t.category || '-')}</td>
                    <td class="hardware-cell">${hardwareDisplay}</td>
                    <td>
                        <span class="level-badge ${levelClass}">${Utils.escapeHtml(t.targetLevel || '-')}</span>
                    </td>
                    <td>
                        ${t.validity?.grade
                    ? `<span class="validity-badge ${validityClass}">${t.validity.grade} - ${Utils.escapeHtml(t.validity.label)}</span>`
                    : '<span class="validity-badge not-reviewed">Not Reviewed</span>'
                }
                    </td>
                    <td>
                        <span class="decision-badge ${decisionClass}">${Utils.escapeHtml(t.decision || 'Not Decided')}</span>
                    </td>
                    <td>
                        ${t.priority && t.priority !== 'None'
                    ? `<span class="priority-badge ${priorityClass}">${t.priority}</span>`
                    : '-'
                }
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${Utils.escapeHtml(effectiveStatus || 'Not Reviewed')}</span>
                    </td>
                    <td>${pubDateDisplay}</td>
                    <td>
                        <a href="tutorial.html?id=${Utils.escapeHtml(t.id)}" class="btn btn-secondary btn-sm">View</a>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // Milestone 7: chronological ascending by Publish Date (missing dates
    // last, title as the only tie-breaker) — the same rule as the main list.
    sortByPublishDate(list) {
        return [...list].sort((a, b) => {
            const aVal = a.publishDate || '9999-12-31';
            const bVal = b.publishDate || '9999-12-31';
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
            const aTitle = a.title?.toLowerCase() || '';
            const bTitle = b.title?.toLowerCase() || '';
            if (aTitle < bTitle) return -1;
            if (aTitle > bTitle) return 1;
            return 0;
        });
    },

    renderFinalOutput() {
        const finalTutorials = this.sortByPublishDate(this.tutorials.filter(t => t.revampedOutputFile));
        const countBadge = document.getElementById('finalOutputBadge');
        const summaryEl = document.getElementById('finalOutputSummary');
        const tableContainer = document.getElementById('finalOutputTableContainer');
        const emptyState = document.getElementById('finalEmptyState');
        const tbody = document.getElementById('finalOutputBody');

        if (countBadge) {
            countBadge.textContent = finalTutorials.length;
        }

        if (summaryEl) {
            const count = finalTutorials.length;
            summaryEl.textContent = `Showing ${count} revamped tutorial${count === 1 ? '' : 's'}`;
        }

        if (!tbody) return;

        if (finalTutorials.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            tbody.innerHTML = '';
            return;
        }

        if (tableContainer) tableContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        tbody.innerHTML = finalTutorials.map(t => {
            const effectiveStatus = this.getEffectiveStatus(t);
            const validityClass = Utils.getValidityClass(t.validity?.grade);
            const decisionClass = Utils.getDecisionClass(t.decision);
            const statusClass = Utils.getStatusClass(effectiveStatus);
            const levelClass = Utils.getLevelClass(t.targetLevel);
            const pubDateDisplay = Utils.formatDate(t.publishDate);

            return `
                <tr>
                    <td>
                        <a href="tutorial.html?id=${Utils.escapeHtml(t.id)}" class="tutorial-link">
                            ${Utils.escapeHtml(t.title)}
                        </a>
                    </td>
                    <td>
                        <span class="level-badge ${levelClass}">${Utils.escapeHtml(t.targetLevel || '-')}</span>
                    </td>
                    <td>
                        ${t.validity?.grade
                            ? `<span class="validity-badge ${validityClass}">${t.validity.grade} - ${Utils.escapeHtml(t.validity.label)}</span>`
                            : '<span class="validity-badge not-reviewed">Not Reviewed</span>'
                        }
                    </td>
                    <td>
                        <span class="decision-badge ${decisionClass}">${Utils.escapeHtml(t.decision || 'Not Decided')}</span>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${Utils.escapeHtml(effectiveStatus || 'Not Reviewed')}</span>
                    </td>
                    <td>${pubDateDisplay}</td>
                    <td>
                        <a href="final-output.html?id=${Utils.escapeHtml(t.id)}" class="btn btn-primary btn-sm">View Final Output</a>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    TutorialsList.init();
});
