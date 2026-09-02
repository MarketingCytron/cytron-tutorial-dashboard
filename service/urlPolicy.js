'use strict';

/**
 * URL/SSRF policy for fetching an original Cytron tutorial — Milestone 3C-A.
 *
 * This is NOT a generic URL fetcher's allow-list config — it is a fixed
 * code constant, deliberately never derived from data/tutorials.json at
 * runtime (a bad/compromised data entry must never be able to expand what
 * hosts this bridge will fetch). It was derived once, by inspecting every
 * `tutorial.url` value currently in the dataset (all of them are
 * `my.cytron.io`) — see docs/TUTORIAL_REVAMP_AGENT_MILESTONE_3B.md.
 * Adding a host here is a deliberate code change, not a data change.
 */

const dns = require('dns').promises;
const net = require('net');

const APPROVED_HOSTNAMES = ['my.cytron.io'];
const MAX_REDIRECTS = 3;

function isPrivateOrLoopbackIp(ip) {
  const type = net.isIP(ip);

  if (type === 4) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 127) return true; // loopback
    if (parts[0] === 10) return true; // RFC1918
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // RFC1918
    if (parts[0] === 192 && parts[1] === 168) return true; // RFC1918
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local
    if (parts[0] === 0) return true; // "this network"
    return false;
  }

  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true; // loopback
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
    if (lower.startsWith('::ffff:')) {
      const v4 = lower.split(':').pop();
      if (net.isIPv4(v4)) return isPrivateOrLoopbackIp(v4);
    }
    return false;
  }

  return true; // unrecognizable -> treat conservatively as disallowed
}

/**
 * Validates a candidate URL against every rule the bridge requires before
 * it is allowed to be fetched: HTTPS only, no embedded credentials, not
 * localhost, hostname on the fixed approved list, default port only, and
 * (defense against DNS rebinding) the hostname's resolved address(es) must
 * not be private/loopback/link-local.
 *
 * Called once for the initial URL, then again for every redirect hop —
 * nothing about a redirect is trusted more than the original request.
 */
async function validateCandidateUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, code: 'invalid_url', message: 'Malformed URL.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, code: 'non_https', message: 'Only https:// URLs are allowed.' };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, code: 'credentials_in_url', message: 'URLs with embedded credentials are rejected.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === 'localhost') {
    return { ok: false, code: 'localhost_rejected', message: 'localhost is not an approved source host.' };
  }

  if (!APPROVED_HOSTNAMES.includes(hostname)) {
    return { ok: false, code: 'hostname_not_approved', message: `Hostname "${hostname}" is not on the approved list.` };
  }

  if (parsed.port && parsed.port !== '443') {
    return { ok: false, code: 'port_not_allowed', message: 'Only the default HTTPS port is allowed.' };
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    return { ok: false, code: 'dns_failure', message: 'Could not resolve hostname.' };
  }

  for (const { address } of addresses) {
    if (isPrivateOrLoopbackIp(address)) {
      return { ok: false, code: 'private_ip_target', message: 'Resolved address is a private/loopback/link-local IP.' };
    }
  }

  return { ok: true, url: parsed };
}

module.exports = { validateCandidateUrl, isPrivateOrLoopbackIp, APPROVED_HOSTNAMES, MAX_REDIRECTS };
