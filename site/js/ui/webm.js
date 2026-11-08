// ui/webm.js -- a WebM file from encoded video frames, written by hand (forge #156). Pure: bytes in, bytes out.
//
// Contract: muxWebm({ width, height, codec, fps, frames: [{ data, timeMs, key }] }) -> Uint8Array
//           vintSize(n) -> Uint8Array            an EBML size field, the shortest that holds n
//           CODEC_IDS                            WebCodecs codec string prefix -> Matroska CodecID
//
// WHY BY HAND. The frame-by-frame recording (ui/recorder.js) draws each frame on the film clock
// (ui/rendermode.js) and encodes it with WebCodecs at its own timestamp, so a slow device makes a slow
// recording and never a stuttering one. WebCodecs hands back encoded frames, not a file; MediaRecorder would
// stamp each frame with the wall clock it arrived at, which is the stutter put back. A muxing library is tens
// of kB and an npm install; WebM is EBML, a tag-length-value format, and the subset a player needs for one
// video track is the five elements below. tests/test_recorder.mjs reads the file back element by element.
//
// THE FILE. EBML header (DocType webm, version 4); one Segment of known size holding Info (1 ms timecodes, the
// duration), Tracks (one video track: VP8 or VP9, its size, its frame duration), one Cluster per keyframe
// (or every 30 s, the most a block's 16-bit relative timecode can reach) of SimpleBlocks, and Cues pointing at
// each cluster, so a player can seek. No audio track: the frame-by-frame path is silent, and says so.

export const CODEC_IDS = { vp8: 'V_VP8', vp09: 'V_VP9' };
const MAX_CLUSTER_MS = 30000;

const ID = {
  EBML: 0x1A45DFA3, EBMLVersion: 0x4286, EBMLReadVersion: 0x42F7, EBMLMaxIDLength: 0x42F2, EBMLMaxSizeLength: 0x42F3,
  DocType: 0x4282, DocTypeVersion: 0x4287, DocTypeReadVersion: 0x4285,
  Segment: 0x18538067, Info: 0x1549A966, TimecodeScale: 0x2AD7B1, MuxingApp: 0x4D80, WritingApp: 0x5741, Duration: 0x4489,
  Tracks: 0x1654AE6B, TrackEntry: 0xAE, TrackNumber: 0xD7, TrackUID: 0x73C5, TrackType: 0x83, FlagLacing: 0x9C,
  CodecID: 0x86, DefaultDuration: 0x23E383, Video: 0xE0, PixelWidth: 0xB0, PixelHeight: 0xBA,
  Cluster: 0x1F43B675, Timecode: 0xE7, SimpleBlock: 0xA3,
  Cues: 0x1C53BB6B, CuePoint: 0xBB, CueTime: 0xB3, CueTrackPositions: 0xB7, CueTrack: 0xF7, CueClusterPosition: 0xF1,
};

function idBytes(id) {
  const out = [];
  for (let v = id; v > 0; v = Math.floor(v / 256)) out.unshift(v % 256);
  return Uint8Array.from(out);
}

/** The shortest EBML size field that holds n (all ones in a length is "unknown", so it is never used). Pure. */
export function vintSize(n) {
  let len = 1;
  while (len < 8 && n >= 2 ** (7 * len) - 1) len += 1;
  const out = new Uint8Array(len);
  let v = n;
  for (let i = len - 1; i >= 0; i -= 1) { out[i] = v % 256; v = Math.floor(v / 256); }
  out[0] |= 1 << (8 - len);
  return out;
}

function concat(parts) {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

function element(id, payload) {
  return concat([idBytes(id), vintSize(payload.length), payload]);
}
function uint(id, n) {
  const bytes = [];
  let v = Math.max(0, Math.round(n));
  do { bytes.unshift(v % 256); v = Math.floor(v / 256); } while (v > 0);
  return element(id, Uint8Array.from(bytes));
}
function float(id, x) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, x);
  return element(id, b);
}
function text(id, s) {
  return element(id, Uint8Array.from(String(s), (c) => c.charCodeAt(0) & 0x7f));
}
function master(id, children) {
  return element(id, concat(children));
}

function simpleBlock(relMs, key, data) {
  const head = new Uint8Array(4);
  head[0] = 0x81; // track 1, as a one-byte vint
  new DataView(head.buffer).setInt16(1, relMs);
  head[3] = key ? 0x80 : 0x00;
  return element(ID.SimpleBlock, concat([head, data]));
}

/**
 * The whole file. `frames` in presentation order, each { data: Uint8Array, timeMs, key }; the first must be a
 * keyframe. `codec` is the WebCodecs string ('vp8', 'vp09.00.10.08'). Pure.
 */
export function muxWebm({ width, height, codec, fps, frames }) {
  const list = frames || [];
  if (!list.length || !list[0].key) throw new Error('muxWebm: the first frame must be a keyframe');
  const prefix = String(codec || '').split('.')[0];
  const codecId = CODEC_IDS[prefix];
  if (!codecId) throw new Error(`muxWebm: no Matroska id for ${codec}`);
  const frameMs = 1000 / (fps > 0 ? fps : 30);
  const durationMs = list[list.length - 1].timeMs + frameMs;

  const header = master(ID.EBML, [
    uint(ID.EBMLVersion, 1), uint(ID.EBMLReadVersion, 1), uint(ID.EBMLMaxIDLength, 4), uint(ID.EBMLMaxSizeLength, 8),
    text(ID.DocType, 'webm'), uint(ID.DocTypeVersion, 4), uint(ID.DocTypeReadVersion, 2),
  ]);
  const info = master(ID.Info, [
    uint(ID.TimecodeScale, 1000000), text(ID.MuxingApp, 'spaceradar.ai'), text(ID.WritingApp, 'spaceradar.ai'), float(ID.Duration, durationMs),
  ]);
  const tracks = master(ID.Tracks, [master(ID.TrackEntry, [
    uint(ID.TrackNumber, 1), uint(ID.TrackUID, 1), uint(ID.TrackType, 1), uint(ID.FlagLacing, 0), text(ID.CodecID, codecId),
    uint(ID.DefaultDuration, Math.round(frameMs * 1e6)),
    master(ID.Video, [uint(ID.PixelWidth, width), uint(ID.PixelHeight, height)]),
  ])]);

  // Clusters, each starting on a keyframe (or when a block's timecode would overflow), and where each one is.
  const body = [info, tracks];
  let offset = info.length + tracks.length;
  const cues = [];
  let i = 0;
  while (i < list.length) {
    const start = Math.round(list[i].timeMs);
    const blocks = [uint(ID.Timecode, start)];
    let j = i;
    while (j < list.length && (j === i || (!list[j].key && Math.round(list[j].timeMs) - start < MAX_CLUSTER_MS))) {
      blocks.push(simpleBlock(Math.round(list[j].timeMs) - start, list[j].key, list[j].data));
      j += 1;
    }
    const cluster = master(ID.Cluster, blocks);
    if (list[i].key) cues.push({ time: start, pos: offset });
    body.push(cluster);
    offset += cluster.length;
    i = j;
  }
  body.push(master(ID.Cues, cues.map((c) => master(ID.CuePoint, [
    uint(ID.CueTime, c.time), master(ID.CueTrackPositions, [uint(ID.CueTrack, 1), uint(ID.CueClusterPosition, c.pos)]),
  ]))));
  return concat([header, master(ID.Segment, body)]);
}
