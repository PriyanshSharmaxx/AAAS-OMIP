/**
 * src/lib/zip.ts
 *
 * Minimal ZIP archive builder using only Node.js built-ins.
 * Uses the STORE method (method=0, no compression) — suitable for small
 * text-based packages like CLI/Docker agent bundles.
 *
 * ZIP specification reference: PKWARE APPNOTE.TXT 6.3.10
 */

// ---------------------------------------------------------------------------
// CRC-32 (ISO 3309 polynomial)
// ---------------------------------------------------------------------------

const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ZipEntry {
  name: string;
  data: string | Buffer;
}

/**
 * Build a ZIP buffer from an array of {name, data} entries.
 * All entries are stored uncompressed (DEFLATE method 0 / STORE).
 */
export function createZip(entries: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const data = typeof entry.data === "string"
      ? Buffer.from(entry.data, "utf8")
      : entry.data;
    const name = Buffer.from(entry.name, "utf8");
    const checksum = crc32(data);
    const size = data.length;

    // ── Local file header (30 bytes + name) ──────────────────────────────────
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);   // signature
    local.writeUInt16LE(20, 4);            // version needed (2.0)
    local.writeUInt16LE(0, 6);             // general purpose bit flag
    local.writeUInt16LE(0, 8);             // compression method: STORE
    local.writeUInt16LE(0, 10);            // last mod file time
    local.writeUInt16LE(0, 12);            // last mod file date
    local.writeUInt32LE(checksum, 14);     // crc-32
    local.writeUInt32LE(size, 18);         // compressed size
    local.writeUInt32LE(size, 22);         // uncompressed size
    local.writeUInt16LE(name.length, 26);  // file name length
    local.writeUInt16LE(0, 28);            // extra field length
    name.copy(local, 30);

    // ── Central directory header (46 bytes + name) ────────────────────────────
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);  // signature
    central.writeUInt16LE(20, 4);           // version made by
    central.writeUInt16LE(20, 6);           // version needed
    central.writeUInt16LE(0, 8);            // general purpose bit flag
    central.writeUInt16LE(0, 10);           // compression method: STORE
    central.writeUInt16LE(0, 12);           // last mod file time
    central.writeUInt16LE(0, 14);           // last mod file date
    central.writeUInt32LE(checksum, 16);    // crc-32
    central.writeUInt32LE(size, 20);        // compressed size
    central.writeUInt32LE(size, 24);        // uncompressed size
    central.writeUInt16LE(name.length, 28); // file name length
    central.writeUInt16LE(0, 30);           // extra field length
    central.writeUInt16LE(0, 32);           // file comment length
    central.writeUInt16LE(0, 34);           // disk number start
    central.writeUInt16LE(0, 36);           // internal file attributes
    central.writeUInt32LE(0, 38);           // external file attributes
    central.writeUInt32LE(localOffset, 42); // relative offset of local header
    name.copy(central, 46);

    localHeaders.push(local, data);
    centralHeaders.push(central);
    localOffset += 30 + name.length + size;
  }

  const centralDir = Buffer.concat(centralHeaders);
  const centralDirSize = centralDir.length;
  const centralDirOffset = localOffset;

  // ── End of central directory record (22 bytes) ─────────────────────────────
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);           // signature
  eocd.writeUInt16LE(0, 4);                     // number of this disk
  eocd.writeUInt16LE(0, 6);                     // disk with start of central dir
  eocd.writeUInt16LE(entries.length, 8);        // entries on this disk
  eocd.writeUInt16LE(entries.length, 10);       // total entries
  eocd.writeUInt32LE(centralDirSize, 12);       // size of central dir
  eocd.writeUInt32LE(centralDirOffset, 16);     // offset of start of central dir
  eocd.writeUInt16LE(0, 20);                    // comment length

  return Buffer.concat([...localHeaders, centralDir, eocd]);
}
