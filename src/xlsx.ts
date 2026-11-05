// A minimal .xlsx writer: inline-string worksheets inside an uncompressed ZIP. No dependency, and the
// output opens in Excel, Numbers, LibreOffice and Google Sheets.

// Dates and clock times are Excel serials (days since 1899-12-30; a time is a fraction of a day).
export type Cell = string | number | { value: number; format: 'date' | 'time' | 'duration' } | null

export type Sheet = { name: string; header: string[]; widths: number[]; rows: Cell[][] }

export const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

const main = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const officeRel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const packageRel = 'http://schemas.openxmlformats.org/package/2006/relationships'
const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// Index into cellXfs in styles.xml below.
const styleId = { header: 1, date: 2, time: 3, duration: 4 }

const styles = `${head}<styleSheet xmlns="${main}">
<numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="hh:mm"/><numFmt numFmtId="166" formatCode="[h]:mm"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

// XML 1.0 rejects most control characters, so a stray one in a note would corrupt the file.
function escape(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function column(index: number): string {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  return name
}

function cellXml(cell: Cell, ref: string, style = 0): string {
  if (cell == null || cell === '') return ''
  const s = style ? ` s="${style}"` : ''
  if (typeof cell === 'string') return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${escape(cell)}</t></is></c>`
  if (typeof cell === 'number') return `<c r="${ref}"${s}><v>${cell}</v></c>`
  return `<c r="${ref}" s="${styleId[cell.format]}"><v>${cell.value}</v></c>`
}

function sheetXml(sheet: Sheet): string {
  const last = `${column(sheet.header.length - 1)}${sheet.rows.length + 1}`
  const cols = sheet.widths
    .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('')
  const header = `<row r="1">${sheet.header.map((name, index) => cellXml(name, `${column(index)}1`, styleId.header)).join('')}</row>`
  const body = sheet.rows
    .map((row, rowIndex) => {
      const r = rowIndex + 2
      return `<row r="${r}">${row.map((cell, index) => cellXml(cell, `${column(index)}${r}`)).join('')}</row>`
    })
    .join('')
  return (
    `${head}<worksheet xmlns="${main}" xmlns:r="${officeRel}"><dimension ref="A1:${last}"/>` +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${header}${body}</sheetData>` +
    `<autoFilter ref="A1:${last}"/></worksheet>`
  )
}

// Excel sheet names: at most 31 characters and none of []:*?/\.
function sheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, '-').slice(0, 31) || 'Sheet'
}

function workbookXml(sheets: Sheet[]): string {
  const list = sheets
    .map((sheet, index) => `<sheet name="${escape(sheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('')
  // Excel expects this hidden name alongside each <autoFilter>.
  const filters = sheets
    .map((sheet, index) => {
      const range = `$A$1:$${column(sheet.header.length - 1)}$${sheet.rows.length + 1}`
      const quoted = `'${escape(sheetName(sheet.name).replace(/'/g, "''"))}'`
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">${quoted}!${range}</definedName>`
    })
    .join('')
  return `${head}<workbook xmlns="${main}" xmlns:r="${officeRel}"><sheets>${list}</sheets><definedNames>${filters}</definedNames></workbook>`
}

function parts(sheets: Sheet[]): [string, string][] {
  const sheetTypes = sheets
    .map(
      (_, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')
  const sheetRels = sheets
    .map(
      (_, index) =>
        `<Relationship Id="rId${index + 1}" Type="${officeRel}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('')
  return [
    [
      '[Content_Types].xml',
      `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        `${sheetTypes}</Types>`,
    ],
    [
      '_rels/.rels',
      `${head}<Relationships xmlns="${packageRel}"><Relationship Id="rId1" Type="${officeRel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    ['xl/workbook.xml', workbookXml(sheets)],
    [
      'xl/_rels/workbook.xml.rels',
      `${head}<Relationships xmlns="${packageRel}">${sheetRels}<Relationship Id="rId${sheets.length + 1}" Type="${officeRel}/styles" Target="styles.xml"/></Relationships>`,
    ],
    ['xl/styles.xml', styles],
    ...sheets.map((sheet, index): [string, string] => [`xl/worksheets/sheet${index + 1}.xml`, sheetXml(sheet)]),
  ]
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

// Stored (uncompressed) entries keep the writer small; a year of rows is only ~100 KB.
function zip(files: [string, string][]): Uint8Array {
  const encoder = new TextEncoder()
  const entries = files.map(([name, content]) => {
    const data = encoder.encode(content)
    return { name: encoder.encode(name), data, crc: crc32(data) }
  })
  const localSize = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.data.length, 0)
  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.name.length, 0)
  const out = new Uint8Array(localSize + centralSize + 22)
  const view = new DataView(out.buffer)
  const dosDate = (1 << 5) | 1 // 1980-01-01: content is the same whenever it is made.
  let at = 0
  const offsets: number[] = []

  for (const entry of entries) {
    offsets.push(at)
    view.setUint32(at, 0x04034b50, true)
    view.setUint16(at + 4, 20, true)
    view.setUint16(at + 12, dosDate, true)
    view.setUint32(at + 14, entry.crc, true)
    view.setUint32(at + 18, entry.data.length, true)
    view.setUint32(at + 22, entry.data.length, true)
    view.setUint16(at + 26, entry.name.length, true)
    out.set(entry.name, at + 30)
    out.set(entry.data, at + 30 + entry.name.length)
    at += 30 + entry.name.length + entry.data.length
  }

  entries.forEach((entry, index) => {
    view.setUint32(at, 0x02014b50, true)
    view.setUint16(at + 4, 20, true)
    view.setUint16(at + 6, 20, true)
    view.setUint16(at + 14, dosDate, true)
    view.setUint32(at + 16, entry.crc, true)
    view.setUint32(at + 20, entry.data.length, true)
    view.setUint32(at + 24, entry.data.length, true)
    view.setUint16(at + 28, entry.name.length, true)
    view.setUint32(at + 42, offsets[index], true)
    out.set(entry.name, at + 46)
    at += 46 + entry.name.length
  })

  view.setUint32(at, 0x06054b50, true)
  view.setUint16(at + 8, entries.length, true)
  view.setUint16(at + 10, entries.length, true)
  view.setUint32(at + 12, centralSize, true)
  view.setUint32(at + 16, localSize, true)
  return out
}

export function toXlsx(sheets: Sheet[]): Uint8Array {
  return zip(parts(sheets))
}
