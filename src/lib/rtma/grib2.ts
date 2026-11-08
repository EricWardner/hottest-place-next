// Minimal GRIB2 decoder for a single RTMA field.
//
// RTMA's 2 m temperature uses grid templates 3.30 (Lambert, CONUS) and
// 3.10 (Mercator, Hawaii) with data template 5.0 (simple packing) and no
// bitmap. Anything else throws, so a format change on NOAA's side fails
// loudly instead of producing wrong temperatures.
import type { Grid } from './projection'

export type GribField = {
  grid: Grid
  /** reference (analysis) time */
  refTime: Date
  /** values in the field's native units (Kelvin for TMP), row-major from the SW corner */
  values: Float32Array
}

export function decodeGrib2(bytes: Uint8Array): GribField {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u8 = (o: number) => view.getUint8(o)
  const u16 = (o: number) => view.getUint16(o)
  const u32 = (o: number) => view.getUint32(o)
  // GRIB2 signed integers are sign-magnitude, not two's complement
  const s16 = (o: number) => {
    const v = u16(o)
    return v & 0x8000 ? -(v & 0x7fff) : v
  }
  const s32 = (o: number) => {
    const v = u32(o)
    return v & 0x80000000 ? -(v & 0x7fffffff) : v
  }

  if (String.fromCharCode(u8(0), u8(1), u8(2), u8(3)) !== 'GRIB' || u8(7) !== 2) {
    throw new Error('Not a GRIB2 message')
  }
  // Total length is a 64-bit int; the high word is always 0 for files this size.
  if (u32(8) !== 0) throw new Error('GRIB2 message too large')
  const total = u32(12)
  if (total > bytes.byteLength) {
    throw new Error(`Truncated GRIB2 message: have ${bytes.byteLength} of ${total} bytes`)
  }

  let refTime: Date | undefined
  let grid: Grid | undefined
  let npts = 0
  let pack: { r: number; e: number; d: number; bits: number } | undefined
  let dataStart = 0
  let dataEnd = 0

  for (let p = 16; p < total - 4; ) {
    const len = u32(p)
    const num = u8(p + 4)
    if (len < 5 || p + len > total) throw new Error(`Bad GRIB2 section ${num} length ${len}`)

    if (num === 1) {
      refTime = new Date(Date.UTC(u16(p + 12), u8(p + 14) - 1, u8(p + 15), u8(p + 16), u8(p + 17), u8(p + 18)))
    } else if (num === 3) {
      npts = u32(p + 6)
      grid = readGrid(u16(p + 12), p)
    } else if (num === 5) {
      const template = u16(p + 9)
      if (template !== 0) throw new Error(`Unsupported GRIB2 data template 5.${template}`)
      pack = { r: view.getFloat32(p + 11), e: s16(p + 15), d: s16(p + 17), bits: u8(p + 19) }
    } else if (num === 6) {
      if (u8(p + 5) !== 255) throw new Error('GRIB2 bitmaps are not supported')
    } else if (num === 7) {
      dataStart = p + 5
      dataEnd = p + len
    }
    p += len
  }

  if (!refTime || !grid || !pack || !dataStart) throw new Error('GRIB2 message missing sections')
  if (npts !== grid.nx * grid.ny) throw new Error('GRIB2 grid size mismatch')

  return { grid, refTime, values: unpackSimple(bytes, dataStart, dataEnd, npts, pack) }

  function readGrid(template: number, p: number): Grid {
    const scan = u8(p + (template === 30 ? 64 : 59))
    if (scan !== 64) throw new Error(`Unsupported GRIB2 scanning mode ${scan}`)
    if (template === 30) {
      return {
        kind: 'lambert',
        nx: u32(p + 30),
        ny: u32(p + 34),
        la1: s32(p + 38) / 1e6,
        lo1: s32(p + 42) / 1e6,
        lov: s32(p + 51) / 1e6,
        dx: u32(p + 55) / 1e3,
        dy: u32(p + 59) / 1e3,
        latin1: s32(p + 65) / 1e6,
        latin2: s32(p + 69) / 1e6,
        radius: earthRadius(p),
      }
    }
    if (template === 10) {
      return {
        kind: 'mercator',
        nx: u32(p + 30),
        ny: u32(p + 34),
        la1: s32(p + 38) / 1e6,
        lo1: s32(p + 42) / 1e6,
        la2: s32(p + 51) / 1e6,
        lo2: s32(p + 55) / 1e6,
      }
    }
    throw new Error(`Unsupported GRIB2 grid template 3.${template}`)
  }

  function earthRadius(p: number): number {
    const shape = u8(p + 14)
    if (shape === 0) return 6367470
    if (shape === 6) return 6371229
    if (shape === 1) return u32(p + 16) / Math.pow(10, u8(p + 15))
    throw new Error(`Unsupported GRIB2 earth shape ${shape}`)
  }
}

/** Simple packing: value = (R + X * 2^E) / 10^D, X packed MSB-first with `bits` bits each. */
function unpackSimple(
  bytes: Uint8Array,
  start: number,
  end: number,
  npts: number,
  { r, e, d, bits }: { r: number; e: number; d: number; bits: number },
): Float32Array {
  const out = new Float32Array(npts)
  const scale = Math.pow(2, e)
  const div = Math.pow(10, d)
  if (bits === 0) return out.fill(r / div)
  if (bits > 25) throw new Error(`Unsupported GRIB2 packing width ${bits}`)
  if (start + Math.ceil((npts * bits) / 8) > end) throw new Error('GRIB2 data section too short')

  const mask = (1 << bits) - 1
  const at = (o: number) => (o < end ? bytes[o] : 0)
  for (let k = 0, bit = 0; k < npts; k++, bit += bits) {
    const o = start + (bit >>> 3)
    // read a 32-bit window; with bits <= 25 the value never straddles it
    const word = ((at(o) << 24) | (at(o + 1) << 16) | (at(o + 2) << 8) | at(o + 3)) >>> 0
    const x = (word >>> (32 - (bit & 7) - bits)) & mask
    out[k] = (r + x * scale) / div
  }
  return out
}
