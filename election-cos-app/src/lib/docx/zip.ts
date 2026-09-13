/**
 * Election Campaign OS — minimal ZIP writer (store-only)
 *
 * A `.docx` is a ZIP of XML parts. This is the smallest writer that
 * produces one, with the same properties the PDF writer has and for the
 * same reasons:
 *
 *  - **No dependency.** The only archives this product writes are its own
 *    documents, a few kilobytes of XML each.
 *  - **Deterministic.** Entries are stored, not deflated, and every
 *    timestamp is fixed, so the same document produces the same bytes. A
 *    subscriber can be told which version they hold, and a diff of two
 *    builds shows content changes rather than clock noise.
 *
 * Stored (compression method 0) is deliberate: a few KB of XML gains
 * almost nothing from deflate, and stored entries keep this file short
 * enough to audit in one sitting.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** Path inside the archive, forward slashes, no leading slash. */
  path: string;
  data: Uint8Array;
}

/**
 * Fixed MS-DOS timestamp: 1 January 1980, 00:00:00 — the epoch of the
 * format itself, and the only value that cannot be mistaken for a real
 * build time.
 */
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

class Bytes {
  private readonly out: number[] = [];

  get length(): number {
    return this.out.length;
  }

  u8(v: number): void {
    this.out.push(v & 0xff);
  }

  u16(v: number): void {
    this.u8(v);
    this.u8(v >>> 8);
  }

  u32(v: number): void {
    this.u16(v & 0xffff);
    this.u16(v >>> 16);
  }

  raw(bytes: Uint8Array): void {
    for (const b of bytes) this.out.push(b);
  }

  ascii(text: string): void {
    for (let i = 0; i < text.length; i += 1) this.u8(text.charCodeAt(i));
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.out);
  }
}

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const out = new Bytes();
  const central: { path: Uint8Array; crc: number; size: number; offset: number }[] = [];
  const encoder = new TextEncoder();

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const crc = crc32(entry.data);
    const offset = out.length;

    out.u32(0x04034b50); // local file header
    out.u16(20); // version needed
    out.u16(0x0800); // UTF-8 filename flag
    out.u16(0); // stored
    out.u16(DOS_TIME);
    out.u16(DOS_DATE);
    out.u32(crc);
    out.u32(entry.data.length);
    out.u32(entry.data.length);
    out.u16(name.length);
    out.u16(0);
    out.raw(name);
    out.raw(entry.data);

    central.push({ path: name, crc, size: entry.data.length, offset });
  }

  const centralStart = out.length;
  for (const e of central) {
    out.u32(0x02014b50); // central directory header
    out.u16(20); // version made by
    out.u16(20); // version needed
    out.u16(0x0800);
    out.u16(0);
    out.u16(DOS_TIME);
    out.u16(DOS_DATE);
    out.u32(e.crc);
    out.u32(e.size);
    out.u32(e.size);
    out.u16(e.path.length);
    out.u16(0); // extra
    out.u16(0); // comment
    out.u16(0); // disk
    out.u16(0); // internal attrs
    out.u32(0); // external attrs
    out.u32(e.offset);
    out.raw(e.path);
  }
  const centralSize = out.length - centralStart;

  out.u32(0x06054b50); // end of central directory
  out.u16(0);
  out.u16(0);
  out.u16(central.length);
  out.u16(central.length);
  out.u32(centralSize);
  out.u32(centralStart);
  out.u16(0);

  return out.toUint8Array();
}
