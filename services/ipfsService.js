const fs = require('fs');
const path = require('path');
const { Blob } = require('buffer');
const config = require('../config');

/**
 * Pin a local file to IPFS.
 * Providers:
 *  - pinata  (PINATA_JWT)
 *  - kubo    (IPFS_API_URL, default http://127.0.0.1:5001)
 *  - auto    (pinata if JWT set, else kubo)
 */
async function pinFile(filePath, options = {}) {
  const provider = resolveProvider();
  if (provider === 'none') {
    return {
      ok: false,
      skipped: true,
      error:
        'IPFS not configured. Set PINATA_JWT or IPFS_API_URL (and optionally IPFS_PROVIDER).',
    };
  }

  try {
    if (provider === 'pinata') {
      return await pinWithPinata(filePath, options);
    }
    return await pinWithKubo(filePath, options);
  } catch (err) {
    return {
      ok: false,
      provider,
      error: err.message || 'IPFS pin failed',
    };
  }
}

function resolveProvider() {
  const explicit = String(config.IPFS_PROVIDER || 'auto').toLowerCase();
  if (explicit === 'none' || explicit === 'off' || explicit === 'false') {
    return 'none';
  }
  if (explicit === 'pinata') {
    return config.PINATA_JWT ? 'pinata' : 'none';
  }
  if (explicit === 'kubo' || explicit === 'ipfs') {
    return 'kubo';
  }
  // auto
  if (config.PINATA_JWT) return 'pinata';
  if (config.IPFS_API_URL) return 'kubo';
  // Try default local Kubo only when explicitly enabled
  if (config.IPFS_ENABLED) return 'kubo';
  return 'none';
}

function gatewayUrlForCid(cid) {
  const gateway = (config.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs').replace(
    /\/$/,
    '',
  );
  return `${gateway}/${cid}`;
}

function toResult(cid, provider) {
  return {
    ok: true,
    provider,
    cid,
    ipfsUri: `ipfs://${cid}`,
    gatewayUrl: gatewayUrlForCid(cid),
  };
}

async function pinWithPinata(filePath, options = {}) {
  if (!config.PINATA_JWT) {
    throw new Error('PINATA_JWT is required for Pinata provider');
  }

  const buf = fs.readFileSync(filePath);
  const filename = options.filename || path.basename(filePath);
  const mime = options.mimeType || 'application/octet-stream';

  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime }), filename);

  if (options.name || options.keyvalues) {
    form.append(
      'pinataMetadata',
      JSON.stringify({
        name: options.name || filename,
        keyvalues: options.keyvalues || {},
      }),
    );
  }

  form.append(
    'pinataOptions',
    JSON.stringify({ cidVersion: 1 }),
  );

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.PINATA_JWT}`,
    },
    body: form,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      body.error || body.message || `Pinata upload failed (${res.status})`,
    );
  }

  const cid = body.IpfsHash || body.cid;
  if (!cid) throw new Error('Pinata response missing IpfsHash');
  return toResult(cid, 'pinata');
}

async function pinWithKubo(filePath, options = {}) {
  // Note: Kubo API defaults to :5001 — same as this app's default PORT.
  // Set IPFS_API_URL=http://127.0.0.1:5001 only when Kubo owns that port,
  // or run Kubo API on another port (e.g. 5002).
  const apiBase = (config.IPFS_API_URL || 'http://127.0.0.1:5001').replace(
    /\/$/,
    '',
  );
  const filename = options.filename || path.basename(filePath);
  const mime = options.mimeType || 'application/octet-stream';
  const buf = fs.readFileSync(filePath);

  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime }), filename);

  const url = `${apiBase}/api/v0/add?cid-version=1&pin=true`;
  const res = await fetch(url, {
    method: 'POST',
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Kubo IPFS add failed (${res.status}): ${text.slice(0, 200)}`);
  }

  // Kubo may return NDJSON; take the last JSON object
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const last = JSON.parse(lines[lines.length - 1]);
  const cid = last.Hash || last.Cid?.['/'] || last.cid;
  if (!cid) throw new Error('Kubo response missing Hash');
  return toResult(cid, 'kubo');
}

module.exports = {
  pinFile,
  resolveProvider,
  gatewayUrlForCid,
};
