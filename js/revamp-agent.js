/**
 * Cytron Tutorial Revamp Agent — Milestone 2
 *
 * Dashboard-side UI for: Revamp Tutorial modal -> job creation -> job
 * progress polling. Talks ONLY to the local bridge's
 * /api/revamp/start, /api/revamp/:jobId, and /api/revamp/:jobId/cancel
 * endpoints (plus /health and /api/test for the debug panel).
 *
 * This is still a stub pipeline: the bridge's StubWriter simulates
 * progress and writes a throwaway artifact inside its own gitignored job
 * directory. Nothing here ever touches revamped-tutorials/,
 * data/tutorials.json, or audits/.
 */

(function () {
  const BRIDGE_URL = 'http://127.0.0.1:47821';
  const TOKEN_KEY = 'revampBridgeToken';
  const POLL_INTERVAL_MS = 1500;

  // Real bridge states shown in the progress checklist, in order.
  // "Queued" is represented implicitly by the "Job Created" row.
  const DISPLAY_STEPS = ['Preparing Context', 'Writing', 'Validating', 'Ready for Review'];

  function getToken() {
    try {
      return window.sessionStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }

  function setToken(value) {
    try {
      window.sessionStorage.setItem(TOKEN_KEY, value);
    } catch {
      // sessionStorage unavailable (e.g. privacy mode) — pairing just won't persist.
    }
  }

  function getStoredJobId(tutorialId) {
    try {
      return window.sessionStorage.getItem(`revampJob:${tutorialId}`) || '';
    } catch {
      return '';
    }
  }

  function setStoredJobId(tutorialId, jobId) {
    try {
      window.sessionStorage.setItem(`revampJob:${tutorialId}`, jobId);
    } catch {
      // ignore
    }
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
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

  const RevampAgent = {
    tutorial: null,
    pollHandle: null,
    activeJobId: null,

    async init() {
      const openBtn = document.getElementById('revampTutorialBtn');
      if (!openBtn) return; // not on a tutorial page

      const params = new URLSearchParams(window.location.search);
      const tutorialId = params.get('id');
      if (tutorialId && window.Utils && typeof Utils.loadData === 'function') {
        try {
          const data = await Utils.loadData();
          const t = (data.tutorials || []).find((x) => x.id === tutorialId);
          if (t) this.tutorial = { id: t.id, title: t.title };
        } catch {
          // fall through — modal will show a "tutorial not found" message
        }
      }

      openBtn.addEventListener('click', () => this.openModal());

      document.getElementById('revampModalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'revampModalOverlay') this.closeModal();
      });

      this.initDebugPanel();
    },

    // -----------------------------------------------------------------
    // Modal shell
    // -----------------------------------------------------------------

    openModal() {
      const overlay = document.getElementById('revampModalOverlay');
      overlay.style.display = 'flex';

      if (!this.tutorial) {
        this.renderBody(`
          <div class="revamp-modal-header"><h2>Revamp Tutorial</h2>${this.closeButton()}</div>
          <div class="revamp-error">Could not identify this tutorial. Reload the page and try again.</div>
        `);
        return;
      }

      const storedJobId = getStoredJobId(this.tutorial.id);
      if (storedJobId) {
        this.activeJobId = storedJobId;
        this.pollOnce();
        return;
      }

      if (!getToken()) {
        this.renderPairingView();
      } else {
        this.renderFormView();
      }
    },

    closeModal() {
      document.getElementById('revampModalOverlay').style.display = 'none';
      this.stopPolling();
    },

    closeButton() {
      return `<button type="button" class="revamp-modal-close" id="revampCloseBtn" aria-label="Close">&times;</button>`;
    },

    renderBody(html) {
      const body = document.getElementById('revampModalBody');
      body.innerHTML = html;
      const closeBtn = document.getElementById('revampCloseBtn');
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
    },

    // -----------------------------------------------------------------
    // Pairing view
    // -----------------------------------------------------------------

    renderPairingView(errorMessage) {
      this.renderBody(`
        <div class="revamp-modal-header"><h2>Revamp Tutorial</h2>${this.closeButton()}</div>
        <div class="revamp-notice">
          This browser is not paired with your local Revamp Bridge yet. Start the bridge
          (<code>node service/server.js</code>) and paste the pairing token it prints to
          the console below.
        </div>
        ${errorMessage ? `<div class="revamp-error">${escapeHtml(errorMessage)}</div>` : ''}
        <div class="revamp-field">
          <label for="revampPairingTokenInput">Pairing Token</label>
          <input type="password" id="revampPairingTokenInput" placeholder="Paste token from bridge console">
          <p class="hint">Stored only for this browser tab session (sessionStorage) — cleared when the tab closes.</p>
        </div>
        <div class="revamp-actions">
          <button type="button" class="btn btn-secondary" id="revampCancelBtn">Cancel</button>
          <button type="button" class="btn btn-primary" id="revampPairBtn">Save &amp; Continue</button>
        </div>
      `);

      document.getElementById('revampCancelBtn').addEventListener('click', () => this.closeModal());
      document.getElementById('revampPairBtn').addEventListener('click', () => {
        const value = (document.getElementById('revampPairingTokenInput').value || '').trim();
        if (!value) return;
        setToken(value);
        this.renderFormView();
      });
    },

    // -----------------------------------------------------------------
    // Instructions form view
    // -----------------------------------------------------------------

    async renderFormView(errorMessage) {
      this.renderBody(`
        <div class="revamp-modal-header"><h2>Revamp Tutorial</h2>${this.closeButton()}</div>
        <div id="revampFormNotices"></div>
        <div class="revamp-field">
          <label>Tutorial</label>
          <div>${escapeHtml(this.tutorial.title)}</div>
        </div>
        ${errorMessage ? `<div class="revamp-error">${escapeHtml(errorMessage)}</div>` : ''}
        <div class="revamp-field">
          <label for="revampInstructionsInput">Optional Revamp Instructions</label>
          <textarea id="revampInstructionsInput" rows="5" maxlength="4000" placeholder="LCD -> OLED&#10;NodeMCU ESP32 -> Maker ESP32&#10;Do not use Robo ESP32"></textarea>
          <p class="hint">Plain text only, up to 4000 characters. This describes editorial direction — it is never run as a command.</p>
        </div>
        <div class="revamp-actions">
          <button type="button" class="btn btn-secondary" id="revampCancelBtn">Cancel</button>
          <button type="button" class="btn btn-primary" id="revampStartBtn">Start Revamp</button>
        </div>
      `);

      document.getElementById('revampCancelBtn').addEventListener('click', () => this.closeModal());
      document.getElementById('revampStartBtn').addEventListener('click', () => this.startRevamp());

      // Non-blocking heads-up if the bridge isn't reachable, without stopping the user from trying.
      try {
        const { res } = await bridgeFetch('/health', { method: 'GET' });
        if (!res.ok) throw new Error('unhealthy');
      } catch {
        const notices = document.getElementById('revampFormNotices');
        if (notices) {
          notices.innerHTML = `<div class="revamp-notice">Could not reach the local bridge at ${BRIDGE_URL}. Make sure <code>node service/server.js</code> is running.</div>`;
        }
      }
    },

    async startRevamp() {
      const startBtn = document.getElementById('revampStartBtn');
      const instructions = document.getElementById('revampInstructionsInput').value;

      startBtn.disabled = true;
      startBtn.textContent = 'Starting...';

      let result;
      try {
        result = await bridgeFetch('/api/revamp/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tutorialId: this.tutorial.id, instructions }),
        });
      } catch {
        this.renderFormView(`Could not reach the local bridge at ${BRIDGE_URL}. Make sure it is running.`);
        return;
      }

      const { res, data } = result;

      if (res.status === 401) {
        this.renderPairingView('Pairing token was rejected. The bridge may have restarted — re-pair below.');
        return;
      }

      if (res.status === 409 && data && data.job) {
        // Another job for this tutorial is already active — resume showing it
        // rather than silently starting a duplicate.
        this.activeJobId = data.job.jobId;
        setStoredJobId(this.tutorial.id, data.job.jobId);
        this.renderProgressView(data.job);
        this.startPolling();
        return;
      }

      if (!res.ok || !data || !data.ok) {
        const message = (data && data.error && data.error.message) || `Bridge returned HTTP ${res.status}.`;
        this.renderFormView(message);
        return;
      }

      this.activeJobId = data.jobId;
      setStoredJobId(this.tutorial.id, data.jobId);
      this.renderProgressView({
        jobId: data.jobId,
        tutorialId: this.tutorial.id,
        title: this.tutorial.title,
        userInstructions: instructions,
        state: data.state,
        error: null,
      });
      this.startPolling();
    },

    // -----------------------------------------------------------------
    // Progress view
    // -----------------------------------------------------------------

    renderProgressView(job) {
      const stateIndex = DISPLAY_STEPS.indexOf(job.state);
      const isFailed = job.state === 'Failed';
      const isCancelled = job.state === 'Cancelled';
      const isDone = job.state === 'Ready for Review';
      const isTerminal = isFailed || isCancelled || isDone;

      const stepsHtml = DISPLAY_STEPS.map((step, i) => {
        let cls = ''; let mark = '&#9675;'; // ○ upcoming
        if (isFailed && i === Math.max(stateIndex, 0)) {
          cls = 'failed'; mark = '&times;';
        } else if (stateIndex === -1) {
          // still Queued — nothing started yet
        } else if (i < stateIndex || (i === stateIndex && isDone)) {
          cls = 'done'; mark = '&#10003;'; // check
        } else if (i === stateIndex) {
          cls = 'active'; mark = '&#9679;'; // ● current
        }
        return `<li class="${cls}"><span>${mark}</span> ${escapeHtml(step)}</li>`;
      }).join('');

      let banner = '';
      if (isDone) {
        banner = `<div class="revamp-success">Milestone 2 stub completed successfully. No tutorial files were modified.</div>`;
      } else if (isFailed) {
        banner = `<div class="revamp-error">Job failed${job.error ? `: ${escapeHtml(job.error)}` : '.'}</div>`;
      } else if (isCancelled) {
        banner = `<div class="revamp-notice">Job cancelled.</div>`;
      }

      this.renderBody(`
        <div class="revamp-modal-header"><h2>Tutorial Revamp Agent</h2>${this.closeButton()}</div>
        <div class="revamp-progress-tutorial">${escapeHtml(job.title || this.tutorial.title)}</div>
        <div class="revamp-progress-status">Status: <strong>${escapeHtml(job.state)}</strong></div>
        ${banner}
        <ul class="revamp-steps">
          <li class="done"><span>&#10003;</span> Job Created</li>
          <li class="done"><span>&#10003;</span> Tutorial Loaded</li>
          ${stepsHtml}
        </ul>
        ${job.userInstructions ? `
          <div class="revamp-field">
            <label>Special Instructions</label>
            <div class="revamp-instructions-readback">${escapeHtml(job.userInstructions)}</div>
          </div>
        ` : ''}
        <div class="revamp-actions">
          ${isTerminal
            ? `<button type="button" class="btn btn-secondary" id="revampCloseProgressBtn">Close</button>`
            : `<button type="button" class="btn btn-secondary" id="revampCancelJobBtn">Cancel Job</button>`}
        </div>
      `);

      const closeBtn = document.getElementById('revampCloseProgressBtn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          if (isTerminal) this.forgetStoredJob();
          this.closeModal();
        });
      }

      const cancelBtn = document.getElementById('revampCancelJobBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => this.cancelJob());
      }

      if (isTerminal) this.stopPolling();
    },

    forgetStoredJob() {
      if (!this.tutorial) return;
      try {
        window.sessionStorage.removeItem(`revampJob:${this.tutorial.id}`);
      } catch {
        // ignore
      }
    },

    // -----------------------------------------------------------------
    // Polling
    // -----------------------------------------------------------------

    async pollOnce() {
      if (!this.activeJobId) return;

      let result;
      try {
        result = await bridgeFetch(`/api/revamp/${this.activeJobId}`, { method: 'GET' });
      } catch {
        this.renderFormAfterPollFailure('Lost connection to the local bridge.');
        return;
      }

      const { res, data } = result;

      if (res.status === 401) {
        this.stopPolling();
        this.renderPairingView('Pairing token was rejected. The bridge may have restarted — re-pair below.');
        return;
      }

      if (res.status === 404) {
        this.stopPolling();
        this.forgetStoredJob();
        this.renderFormView('That revamp job no longer exists on the bridge (it may have restarted). Starting over.');
        return;
      }

      if (!res.ok || !data || !data.ok) {
        this.renderFormAfterPollFailure(`Bridge returned HTTP ${res.status} while checking job status.`);
        return;
      }

      this.renderProgressView(data.job);
    },

    renderFormAfterPollFailure(message) {
      this.stopPolling();
      this.forgetStoredJob();
      this.renderFormView(message);
    },

    startPolling() {
      this.stopPolling();
      this.pollHandle = setInterval(() => this.pollOnce(), POLL_INTERVAL_MS);
    },

    stopPolling() {
      if (this.pollHandle) {
        clearInterval(this.pollHandle);
        this.pollHandle = null;
      }
    },

    async cancelJob() {
      if (!this.activeJobId) return;
      const cancelBtn = document.getElementById('revampCancelJobBtn');
      if (cancelBtn) {
        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Cancelling...';
      }
      try {
        await bridgeFetch(`/api/revamp/${this.activeJobId}/cancel`, { method: 'POST' });
      } catch {
        // ignore — the next poll will surface the real state (or a connection error)
      }
      this.pollOnce();
    },

    // -----------------------------------------------------------------
    // Secondary debug panel (Milestone 1 tools, kept for troubleshooting)
    // -----------------------------------------------------------------

    initDebugPanel() {
      const checkBtn = document.getElementById('devBridgeCheckBtn');
      if (!checkBtn) return;

      const status = document.getElementById('devBridgeStatus');
      const log = document.getElementById('devBridgeLog');
      const tokenInput = document.getElementById('devBridgeTokenInput');
      const saveTokenBtn = document.getElementById('devBridgeSaveTokenBtn');
      const testBtn = document.getElementById('devBridgeTestBtn');

      const writeLog = (message) => {
        if (!log) return;
        const time = new Date().toLocaleTimeString();
        log.textContent += `[${time}] ${message}\n`;
        log.scrollTop = log.scrollHeight;
      };

      const setStatus = (text, ok) => {
        if (!status) return;
        status.textContent = `Status: ${text}`;
        status.style.color = ok === true ? '#1a7f37' : ok === false ? '#c53030' : '';
      };

      checkBtn.addEventListener('click', async () => {
        setStatus('Checking...', null);
        writeLog(`GET ${BRIDGE_URL}/health`);
        try {
          const res = await fetch(`${BRIDGE_URL}/health`, { method: 'GET' });
          if (!res.ok) {
            setStatus(`Not Connected (HTTP ${res.status})`, false);
            return;
          }
          const data = await res.json();
          setStatus(`Connected (${data.service || 'bridge'} v${data.version || '?'})`, true);
          writeLog(`Bridge OK: ${JSON.stringify(data)}`);
        } catch (err) {
          setStatus('Not Connected', false);
          writeLog(`Could not reach bridge: ${err.message}`);
        }
      });

      saveTokenBtn.addEventListener('click', () => {
        const value = (tokenInput.value || '').trim();
        if (!value) {
          writeLog('No token entered.');
          return;
        }
        setToken(value);
        tokenInput.value = '';
        tokenInput.placeholder = 'Token saved (hidden) — paste a new one to replace it';
        writeLog('Pairing token saved for this browser tab session (sessionStorage).');
      });

      testBtn.addEventListener('click', async () => {
        const token = getToken();
        if (!token) {
          writeLog('No pairing token saved yet.');
          return;
        }
        if (!this.tutorial) {
          writeLog('No tutorial ID in the current page URL.');
          return;
        }
        writeLog(`POST ${BRIDGE_URL}/api/test { tutorialId: "${this.tutorial.id}" }`);
        try {
          const { res, data } = await bridgeFetch('/api/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tutorialId: this.tutorial.id }),
          });
          writeLog(res.ok ? `Success: ${JSON.stringify(data)}` : `HTTP ${res.status}: ${JSON.stringify(data)}`);
        } catch (err) {
          writeLog(`Request failed: ${err.message}`);
        }
      });
    },
  };

  document.addEventListener('DOMContentLoaded', () => RevampAgent.init());
})();
