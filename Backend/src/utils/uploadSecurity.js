const path = require("path");

const ALLOWED_IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

function extFromMime(mime) {
  const m = (mime || "").toLowerCase();
  return MIME_TO_EXT[m] || null;
}

/**
 * Validate uploaded image from express-fileupload.
 * @returns {{ ok: true, ext: string } | { ok: false, message: string }}
 */
function validateImageUpload(file) {
  if (!file || (!file.data && !file.tempFilePath)) {
    return { ok: false, message: "invalid_request" };
  }

  const mime = (file.mimetype || "").toLowerCase();
  let ext = path.extname(file.name || "").toLowerCase();

  if (!ext && mime) {
    ext = extFromMime(mime);
  }

  if (!ext || !ALLOWED_IMAGE_EXT.has(ext)) {
    if (mime && ALLOWED_IMAGE_MIME.has(mime)) {
      ext = extFromMime(mime) || ".jpg";
    } else {
      return { ok: false, message: "invalid_file_type" };
    }
  }

  if (mime && !ALLOWED_IMAGE_MIME.has(mime)) {
    return { ok: false, message: "invalid_file_type" };
  }

  return { ok: true, ext: ext || ".jpg" };
}

module.exports = { validateImageUpload, ALLOWED_IMAGE_EXT };
