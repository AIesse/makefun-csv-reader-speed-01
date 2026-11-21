// A fast, exact replacement for csv-reader 1.0.0's readCsv.
//
// Same input {text, header}, same output {columns, rows, errors}.
// One left-to-right pass. Fields are sliced out of the text instead of
// built a character at a time: an unquoted field is scanned for its end
// and sliced once, a quoted field's closing quote is found with indexOf,
// and only a field that actually holds a doubled quote or a line break
// takes the slow path. No dependency, no state kept between calls.

/** How a field ended: 0 at a comma, 1 at a line break, 2 at the end of the text. */
const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = text.charCodeAt(0) === 0xFEFF ? 1 : 0;
  let line = 1;

  // The record being read: the line it starts on and the index in rows it takes (null: the header).
  let recordLine = 1;
  let recordRow = null;

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos += 1; line += 1; }
      else if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;

    while (true) {
      let value;
      let ended = -1;
      let prefix = null;
      quoted = text.charCodeAt(pos) === 34;

      if (quoted) {
        const open = pos;
        const openLine = line;
        let close = -1;
        const q = text.indexOf('"', pos + 1);
        if (q === -1) {
          // No closing quote: the quote is a literal character and the text after it is read again as unquoted.
          pos = open + 1;
          errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
          prefix = '"';
        } else {
          const doubled = text.charCodeAt(q + 1) === 34;
          let hasBreak = false;
          if (!doubled) {
            const nl = text.indexOf('\n', pos + 1);
            hasBreak = nl !== -1 && nl < q;
            if (!hasBreak) {
              const cr = text.indexOf('\r', pos + 1);
              hasBreak = cr !== -1 && cr < q;
            }
          }
          if (!doubled && !hasBreak) {
            // Plain quoted field: one slice.
            value = text.slice(pos + 1, q);
            close = q;
          } else {
            // Slow path: doubled quotes and/or line breaks inside.
            let val = '';
            let seg = pos + 1;
            let p = pos + 1;
            while (p < n) {
              const c = text.charCodeAt(p);
              if (c === 34) {
                if (text.charCodeAt(p + 1) === 34) {
                  val += text.slice(seg, p) + '"';
                  p += 2;
                  seg = p;
                  continue;
                }
                close = p;
                break;
              }
              if (c === 13) {
                val += text.slice(seg, p) + '\n';
                line += 1;
                p += text.charCodeAt(p + 1) === 10 ? 2 : 1;
                seg = p;
                continue;
              }
              if (c === 10) {
                val += text.slice(seg, p) + '\n';
                line += 1;
                p += 1;
                seg = p;
                continue;
              }
              p += 1;
            }
            if (close === -1) {
              // Never closed after all: literal quote, re-read as unquoted.
              pos = open + 1;
              line = openLine;
              errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
              prefix = '"';
            } else {
              value = val + text.slice(seg, close);
            }
          }
        }
        if (close !== -1) {
          // What follows the closing quote.
          const after = close + 1;
          if (after >= n) {
            pos = after;
            ended = END;
          } else {
            const c = text.charCodeAt(after);
            if (c === 44) { pos = after + 1; ended = COMMA; }
            else if (c === 10) { pos = after + 1; line += 1; ended = LINE_BREAK; }
            else if (c === 13 && text.charCodeAt(after + 1) === 10) { pos = after + 2; line += 1; ended = LINE_BREAK; }
            else {
              // Characters after the closing quote, appended as they stand.
              pos = after;
              let added = 0;
              let jstart = pos;
              let jbase = null;
              let jended = END;
              let jend = n;
              while (pos < n) {
                const c2 = text.charCodeAt(pos);
                if (c2 === 44) { jend = pos; pos += 1; jended = COMMA; break; }
                if (c2 === 10) { jend = pos; pos += 1; line += 1; jended = LINE_BREAK; break; }
                if (c2 === 13) {
                  if (text.charCodeAt(pos + 1) === 10) { jend = pos; pos += 2; line += 1; jended = LINE_BREAK; break; }
                  errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
                  jbase = jbase === null ? text.slice(jstart, pos) : jbase + text.slice(jstart, pos);
                  pos += 1;
                  jstart = pos;
                  continue;
                }
                pos += 1;
                added += 1;
              }
              value = value + (jbase === null ? text.slice(jstart, jend) : jbase + text.slice(jstart, jend));
              if (added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
              ended = jended;
            }
          }
        }
      }

      if (ended === -1) {
        // Unquoted field, or the re-read after an unterminated quote.
        let start = pos;
        let base = prefix;
        let end = n;
        ended = END;
        while (pos < n) {
          const c = text.charCodeAt(pos);
          if (c === 44) { end = pos; pos += 1; ended = COMMA; break; }
          if (c === 10) { end = pos; pos += 1; line += 1; ended = LINE_BREAK; break; }
          if (c === 13) {
            if (text.charCodeAt(pos + 1) === 10) { end = pos; pos += 2; line += 1; ended = LINE_BREAK; break; }
            errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
            base = base === null ? text.slice(start, pos) : base + text.slice(start, pos);
            pos += 1;
            start = pos;
            continue;
          }
          pos += 1;
        }
        value = base === null ? text.slice(start, end) : base + text.slice(start, end);
      }

      fields.push(value);
      if (ended !== COMMA) break;
    }

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) { columns = fields; continue; }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.slice(width) });
      fields.length = width;
    }
    rows.push(fields);
  }

  return { columns: header ? (columns ?? []) : null, rows, errors };
}
