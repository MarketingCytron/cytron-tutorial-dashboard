/**
 * Cytron Tutorial Validation Dashboard
 * Tutorials List Page JavaScript
 */

const TutorialsList = {
    tutorials: [],
    filteredTutorials: [],
    sortColumn: 'title',
    sortDirection: 'asc',
    filters: {
        search: '',
        level: '',
        validity: '',
        decision: '',
        status: '',
        priority: '',
        category: ''
    },

    async init() {
        const data = await Utils.loadData();
        this.tutorials = data.tutorials || [];
        this.filteredTutorials = [...this.tutorials];

        this.populateCategoryFilter();
        this.initFilters();
        this.initSorting();
        this.loadUrlParams();
        this.applyFilters();
        this.render();
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
        const filterIds = ['filterLevel', 'filterValidity', 'filterDecision', 'filterStatus', 'filterPriority', 'filterCategory'];
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
    },

    updateUrlParams() {
        const params = new URLSearchParams();

        if (this.filters.level) params.set('level', this.filters.level);
        if (this.filters.validity) params.set('validity', this.filters.validity);
        if (this.filters.decision) params.set('decision', this.filters.decision);
        if (this.filters.status) params.set('status', this.filters.status);
        if (this.filters.priority) params.set('priority', this.filters.priority);
        if (this.filters.category) params.set('category', this.filters.category);

        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);
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

            // Status filter
            if (this.filters.status && t.revampStatus !== this.filters.status) return false;

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
                    const statusOrder = { 'Not Reviewed': 1, 'Reviewed': 2, 'Planned': 3, 'Revamping': 4, 'Completed': 5, 'Archived': 6 };
                    aVal = statusOrder[a.revampStatus] || 7;
                    bVal = statusOrder[b.revampStatus] || 7;
                    break;
                case 'technicalScore':
                    aVal = a.technicalScore || 0;
                    bVal = b.technicalScore || 0;
                    break;
                case 'lastReviewed':
                    aVal = a.lastReviewed || '1900-01-01';
                    bVal = b.lastReviewed || '1900-01-01';
                    break;
                default:
                    aVal = '';
                    bVal = '';
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
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
            category: ''
        };

        // Reset form elements
        document.getElementById('searchInput').value = '';
        document.getElementById('filterLevel').value = '';
        document.getElementById('filterValidity').value = '';
        document.getElementById('filterDecision').value = '';
        document.getElementById('filterStatus').value = '';
        document.getElementById('filterPriority').value = '';
        document.getElementById('filterCategory').value = '';

        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);

        this.applyFilters();
        this.render();
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
            const validityClass = Utils.getValidityClass(t.validity?.grade);
            const decisionClass = Utils.getDecisionClass(t.decision);
            const priorityClass = Utils.getPriorityClass(t.priority);
            const statusClass = Utils.getStatusClass(t.revampStatus);
            const levelClass = Utils.getLevelClass(t.targetLevel);
            const scoreClass = Utils.getScoreClass(t.technicalScore);

            return `
                <tr>
                    <td>
                        <a href="tutorial.html?id=${Utils.escapeHtml(t.id)}" class="tutorial-link">
                            ${Utils.escapeHtml(t.title)}
                        </a>
                    </td>
                    <td>${Utils.escapeHtml(t.category || '-')}</td>
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
                        <span class="status-badge ${statusClass}">${Utils.escapeHtml(t.revampStatus || 'Not Reviewed')}</span>
                    </td>
                    <td>
                        ${t.technicalScore
                    ? `<span class="score-cell ${scoreClass}">${t.technicalScore}/10</span>`
                    : '-'
                }
                    </td>
                    <td>${Utils.formatDate(t.lastReviewed)}</td>
                    <td>
                        <a href="tutorial.html?id=${Utils.escapeHtml(t.id)}" class="btn btn-secondary btn-sm">View</a>
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
