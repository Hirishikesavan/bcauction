/**
 * Image upload utility
 * - If valid Cloudinary credentials are present (either as CLOUDINARY_CLOUD_NAME +
 *   CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET, or as a single CLOUDINARY_URL)
 *   -> uploads go to Cloudinary (permanent, CDN-served).
 * - Otherwise -> falls back to local disk storage (ephemeral on most hosts,
 *   fine for local dev, NOT fine for production -- see the startup log).
 *
 * getImageUrl() always returns a usable URL string or null.
 *
 * FIX (placeholder-detection bug): isCloudinaryConfigured() and the old
 * config getter used to run two DIFFERENT checks that could disagree --
 * one didn't reject placeholders at all, while the other rejected ONE
 * specific hardcoded secret string lifted from .env.example. That meant:
 * (a) placeholder credentials in production could silently report as
 * "configured" in some code paths while actually falling back to disk in
 * others, and (b) a real-looking secret was baked directly into the
 * source code as a "thing to detect", which is itself a hardcoded-secret
 * hygiene problem. Both checks now share ONE validator below, which
 * rejects generic placeholder PATTERNS rather than one specific value.
 */

'use strict';

const PLACEHOLDER_PATTERNS = [
  /^your[_-]/i, /^xxx+$/i, /changeme/i, /placeholder/i, /^example/i, /^test[_-]?key$/i, /^<.*>$/,
];
const looksLikePlaceholder = (value) => {
  if (!value || typeof value !== 'string') return true;
  const v = value.trim();
  if (v.length < 6) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
};

const validateCredentials = (cloud_name, api_key, api_secret) => {
  if (!cloud_name || !api_key || !api_secret) return false;
  if (looksLikePlaceholder(cloud_name) || looksLikePlaceholder(api_key) || looksLikePlaceholder(api_secret)) return false;
  return true;
};

let _cachedConfig;   // undefined = not yet computed, null = invalid/unset, object = configured
let _loggedStartup = false;

const computeConfig = () => {
  if (process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_SECRET) {
    const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env;
    if (validateCredentials(cloud_name, api_key, api_secret)) {
      return { cloud_name, api_key, api_secret, source: 'CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET' };
    }
    return { invalid: true, reason: 'CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are set but look like placeholder values' };
  }

  if (process.env.CLOUDINARY_URL) {
    try {
      const url = new URL(process.env.CLOUDINARY_URL);
      if (url.protocol !== 'cloudinary:' || !url.hostname) {
        return { invalid: true, reason: 'CLOUDINARY_URL is not a valid cloudinary:// URL' };
      }
      const cloud_name = url.hostname;
      const api_key = decodeURIComponent(url.username || '');
      const api_secret = decodeURIComponent(url.password || '');
      if (validateCredentials(cloud_name, api_key, api_secret)) {
        return { cloud_name, api_key, api_secret, source: 'CLOUDINARY_URL' };
      }
      return { invalid: true, reason: 'CLOUDINARY_URL contains placeholder values (the example from .env.example was likely copied as-is)' };
    } catch (e) {
      return { invalid: true, reason: `CLOUDINARY_URL could not be parsed: ${e.message}` };
    }
  }

  return null;
};

const getCloudinaryConfig = () => {
  if (_cachedConfig === undefined) _cachedConfig = computeConfig();
  if (!_loggedStartup) {
    _loggedStartup = true;
    if (_cachedConfig && !_cachedConfig.invalid) {
      console.log(`Cloudinary configured (cloud_name: ${_cachedConfig.cloud_name}, via ${_cachedConfig.source}) -- uploads will be stored on Cloudinary.`);
    } else if (_cachedConfig && _cachedConfig.invalid) {
      console.warn(`Cloudinary is NOT configured: ${_cachedConfig.reason}. Falling back to local disk storage -- set real credentials from your Cloudinary dashboard (Settings -> API Keys) in .env to fix this.`);
    } else {
      console.log('Cloudinary not configured (no env vars set) -- using local disk storage. Fine for local dev; set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET in production.');
    }
  }
  return (_cachedConfig && !_cachedConfig.invalid) ? _cachedConfig : null;
};

const isCloudinaryConfigured = () => !!getCloudinaryConfig();

const getCloudinaryStatus = () => {
  const config = getCloudinaryConfig();
  return {
    configured: !!config,
    cloudName: config?.cloud_name || null,
    source: config?.source || null,
    reason: (_cachedConfig && _cachedConfig.invalid) ? _cachedConfig.reason : null,
  };
};

const getMulterStorage = (multer, uploadPath) => {
  const config = getCloudinaryConfig();
  if (config) {
    try {
      const cloudinary = require('cloudinary').v2;
      const { CloudinaryStorage } = require('multer-storage-cloudinary');
      cloudinary.config({ cloud_name: config.cloud_name, api_key: config.api_key, api_secret: config.api_secret });
      return new CloudinaryStorage({
        cloudinary,
        params: {
          folder:          'beast-cricket',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation:  [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
        },
      });
    } catch (e) {
      console.warn('Cloudinary packages not installed or failed to initialize, falling back to local storage:', e.message);
    }
  }
  return getLocalStorage(multer, uploadPath);
};

const getLocalStorage = (multer, uploadPath) => {
  const multerLib = require('multer');
  return multerLib.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename:    (req, file, cb) => {
      const ext  = require('path').extname(file.originalname).toLowerCase();
      const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
      cb(null, name);
    },
  });
};

const getImageUrl = (file) => {
  if (!file) return null;
  if (file.path && file.path.startsWith('http')) return file.path;
  if (file.filename) return `/uploads/${file.filename}`;
  if (file.path) return `/uploads/${require('path').basename(file.path)}`;
  return null;
};

/**
 * Deletes a previously-uploaded image, whether it lives on Cloudinary or on
 * local disk. Without this, deleting a player/team/sponsor whose image was
 * uploaded to Cloudinary would silently leave the asset orphaned on
 * Cloudinary forever (the old code only ever tried fs.unlinkSync, which is a
 * no-op for an https:// URL). Safe to call with any URL shape; failures are
 * logged but never throw, since image cleanup should never block the
 * primary delete operation.
 */
const deleteUploadedImage = async (imageUrl, uploadsDir) => {
  if (!imageUrl || typeof imageUrl !== 'string') return;

  if (imageUrl.startsWith('http')) {
    const config = getCloudinaryConfig();
    if (!config) return; // can't delete from Cloudinary without credentials
    try {
      // Cloudinary URLs look like:
      // https://res.cloudinary.com/<cloud>/image/upload/v123/beast-cricket/<public_id>.<ext>
      const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-zA-Z0-9]+$/);
      if (!match) return;
      const publicId = match[1];
      const cloudinary = require('cloudinary').v2;
      cloudinary.config({ cloud_name: config.cloud_name, api_key: config.api_key, api_secret: config.api_secret });
      await cloudinary.uploader.destroy(publicId);
    } catch (e) {
      console.warn('Cloudinary image cleanup failed (non-fatal):', e.message);
    }
    return;
  }

  // Local file path, e.g. "/uploads/169...-abc.png"
  try {
    const path = require('path');
    const fs = require('fs');
    const filename = imageUrl.replace(/^\/?uploads\//, '');
    const fullPath = path.join(uploadsDir, filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (e) {
    console.warn('Local image cleanup failed (non-fatal):', e.message);
  }
};

module.exports = { isCloudinaryConfigured, getMulterStorage, getImageUrl, getCloudinaryStatus, deleteUploadedImage };
