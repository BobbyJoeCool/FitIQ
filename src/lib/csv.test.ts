import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from './csv'

describe('csv', () => {
  it('quotes only when needed', () => {
    expect(csvCell('plain')).toBe('plain')
    expect(csvCell('a, b')).toBe('"a, b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('two\nlines')).toBe('"two\nlines"')
    expect(csvCell(null)).toBe('')
    expect(csvCell(135.5)).toBe('135.5')
    expect(csvCell(false)).toBe('false')
  })

  it('neutralises spreadsheet formulas but keeps negative numbers', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('@cmd')).toBe("'@cmd")
    expect(csvCell('-2.5')).toBe('-2.5')
    expect(csvCell(-2.5)).toBe('-2.5')
  })

  it('builds a file with a BOM and CRLF rows', () => {
    expect(toCsv(['a', 'b'], [[1, 'x,y']])).toBe('﻿a,b\r\n1,"x,y"\r\n')
  })
})
