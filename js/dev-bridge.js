/**
 * DEV/PROTOTYPE ONLY — Milestone 1 connectivity test.
 *
 * This talks ONLY to GET /health and POST /api/test on the local Revamp
 * Bridge. It does not start a revamp, does not touch tutorials.json, and
 * is not the final Revamp UI. Safe to delete once Milestone 1 is verified
 * and superseded by the real modal.
 */

(function () {
  const BRIDGE_URL = 'http://127.0.0.1:47821';
  const TOKEN_STORAGE_KEY = 'revampBridgeToken';

  const DevBridge = {
    els: {},

    init() {
      this.els.status = document.getElementById('devBridgeStatus');
      this.els.log = document.getElementById('devBridgeLog');
      this.els.tokenInput = document.getElementById('devBridgeTokenInput');
      this.els.checkBtn = document.getElementById('devBridgeCheckBtn');
      this.els.saveTokenBtn = document.getElementById('devBridgeSaveTokenBtn');
      this.els.testBtn = document.getElementById('devBridgeTestBtn');

      if (!this.els.checkBtn) return; // panel not present on this page

      const savedToken = this.getToken();
      if (savedToken && this.els.tokenInput) {
        this.els.tokenInput.placeholder = 'Token saved (hidden) — paste a new one to replace it';
      }

      this.els.checkBtn.addEventListener('click', () => this.checkHealth());
      this.els.saveTokenBtn.addEventListener('click', () => this.saveToken());
      this.els.testBtn.addEventListener('click', () => this.testTutorial());
    },

    getToken() {
      try {
        return window.sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
      } catch {
        return '';
      }
    },

    saveToken() {
      const value = (this.els.tokenInput.value || '').trim();
      if (!value) {
        this.log('No token entered.');
        return;
      }
      try {
        window.sessionStorage.setItem(TOKEN_STORAGE_KEY, value);
        this.els.tokenInput.value = '';
        this.els.tokenInput.placeholder = 'Token saved (hidden) — paste a new one to replace it';
        this.log('Pairing token saved for this browser tab session only (sessionStorage) — cleared when the tab/browser closes.');
      } catch (err) {
        this.log(`Could not save token: ${err.message}`);
      }
    },

    log(message) {
      if (!this.els.log) return;
      const time = new Date().toLocaleTimeString();
      this.els.log.textContent += `[${time}] ${message}\n`;
      this.els.log.scrollTop = this.els.log.scrollHeight;
    },

    setStatus(text, ok) {
      if (!this.els.status) return;
      this.els.status.textContent = `Status: ${text}`;
      this.els.status.style.color = ok === true ? '#1a7f37' : ok === false ? '#c53030' : '';
    },

    async checkHealth() {
      this.setStatus('Checking...', null);
      this.log(`GET ${BRIDGE_URL}/health`);
      try {
        const res = await fetch(`${BRIDGE_URL}/health`, { method: 'GET' });
        if (!res.ok) {
          this.setStatus(`Not Connected (HTTP ${res.status})`, false);
          this.log(`Bridge responded with HTTP ${res.status}.`);
          return;
        }
        const data = await res.json();
        this.setStatus(`Connected (${data.service || 'bridge'} v${data.version || '?'})`, true);
        this.log(`Bridge OK: ${JSON.stringify(data)}`);
      } catch (err) {
        this.setStatus('Not Connected', false);
        this.log(`Could not reach bridge: ${err.message}`);
        this.log('Check that: the bridge is running (node service/server.js), the port is 47821, and the browser console for CORS / Private Network Access errors.');
      }
    },

    async testTutorial() {
      const token = this.getToken();
      if (!token) {
        this.log('No pairing token saved yet. Paste the token from the bridge console and click "Save Token" first.');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const tutorialId = params.get('id');
      if (!tutorialId) {
        this.log('No ?id= tutorial ID in the current page URL.');
        return;
      }

      this.log(`POST ${BRIDGE_URL}/api/test { tutorialId: "${tutorialId}" }`);
      try {
        const res = await fetch(`${BRIDGE_URL}/api/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tutorialId }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          this.log(`Bridge returned HTTP ${res.status}: ${data ? JSON.stringify(data) : '(no body)'}`);
          return;
        }

        this.log(`Success: ${JSON.stringify(data)}`);
      } catch (err) {
        this.log(`Request failed: ${err.message}`);
        this.log('Check the browser console for CORS / Private Network Access details.');
      }
    },
  };

  document.addEventListener('DOMContentLoaded', () => DevBridge.init());
})();
