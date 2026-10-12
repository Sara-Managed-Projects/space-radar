// data/columnar.js -- a saved catalogue that arrived as columns, turned back into its rows.
//
// scripts/columnar.py writes `<id>.cols.json` beside the big saved copies (internal #523): the same
// envelope as the verbatim file, with `columns: {keys, cols}` where `body` was, one array per key.
// CelesTrak's active catalogue is 7.0 MB as 16 683 objects repeating 17 keys, and about a third of
// that as columns. Nothing is rounded or dropped, so the rows this returns are the rows the
// verbatim file holds, key for key in the same order (tests/test_columnar.mjs holds that on a cut
// of a real snapshot), and every parser downstream is handed exactly what it was handed before.
//
// Loaded by data/sources.js only when the manifest names a column file: not part of a first visit.
//
// It THROWS on anything that does not add up (a column short of the others, a count that is not
// the file's own `rows`), and data/sources.js then reads the verbatim file, as it always did. A
// catalogue with one satellite's inclination under another's name must never be drawn.

export const COLUMNS_FORMAT = 'columns-1';

/**
 * @param {{format:string, rows:number, columns:{keys:string[], cols:Array<Array<*>>}}} file
 * @returns {Array<Object>} the rows
 */
export function decodeColumns(file) {
  if (!file || file.format !== COLUMNS_FORMAT) throw new Error('not a column file');
  const columns = file.columns;
  if (!columns || !Array.isArray(columns.keys) || !Array.isArray(columns.cols)) throw new Error('no columns');
  const { keys, cols } = columns;
  if (keys.length === 0 || keys.length !== cols.length) throw new Error('keys and columns differ in number');
  if (new Set(keys).size !== keys.length || keys.some((k) => typeof k !== 'string')) throw new Error('a key is repeated or not a name');
  const n = file.rows;
  if (!Number.isInteger(n) || n <= 0) throw new Error('no row count');
  for (let j = 0; j < cols.length; j++) {
    if (!Array.isArray(cols[j]) || cols[j].length !== n) throw new Error(`column ${keys[j]} is not ${n} long`);
  }
  const rows = new Array(n);
  const width = keys.length;
  for (let i = 0; i < n; i++) {
    const row = {};
    for (let j = 0; j < width; j++) row[keys[j]] = cols[j][i];
    rows[i] = row;
  }
  return rows;
}
