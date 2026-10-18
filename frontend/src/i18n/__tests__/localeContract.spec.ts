import { describe, expect, it } from 'vitest'

import { validateLocaleContract } from './helpers/localeContract'

describe('independent locale contract', () => {
  it('accepts matching named parameters, list positions and linked targets', () => {
    expect(validateLocaleContract(
      { greeting: 'Hello {name}', count: '{0} requests', linked: '@:common.save' },
      { greeting: 'Xin chào {name}', count: '{0} yêu cầu', linked: '@:common.save' }
    )).toEqual([])
  })

  it('rejects a renamed named parameter', () => {
    expect(validateLocaleContract({ value: '{name}' }, { value: '{count}' })).not.toEqual([])
  })

  it('rejects a changed list position', () => {
    expect(validateLocaleContract({ value: '{0}' }, { value: '{1}' })).not.toEqual([])
  })

  it('rejects a changed linked target', () => {
    expect(validateLocaleContract(
      { value: '@:common.save' }, { value: '@:common.delete' }
    )).not.toEqual([])
  })

  it('rejects malformed translation syntax without repairing it', () => {
    const issues = validateLocaleContract({ value: 'Hello {name}' }, { value: 'Xin chào {' })
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining('value: translated message')]))
  })

  it('rejects malformed reference syntax rather than trusting an invalid baseline', () => {
    expect(validateLocaleContract({ value: 'Hello {' }, { value: 'Xin chào' })).not.toEqual([])
  })

  describe.each([
    ['named parameter', '{name}', '{name '],
    ['list parameter', '{0}', '{0 '],
    ['literal at-sign', "{'@'}", "{'@'"]
  ])('unterminated EOF %s', (_description, valid, malformed) => {
    it.each(['reference', 'translated'] as const)('reports path-qualified syntax failure on the %s side', side => {
      const reference = { section: { value: side === 'reference' ? malformed : valid } }
      const translated = { section: { value: side === 'translated' ? malformed : valid } }
      expect(validateLocaleContract(reference, translated)).toEqual(expect.arrayContaining([
        expect.stringContaining(`section.value: ${side} message does not compile:`)
      ]))
    })
  })

  it('accepts complete placeholders with trailing whitespace and escaped brace and at-sign literals', () => {
    expect(validateLocaleContract(
      { value: "{name} {0} {'{'} {'}'} {'@'} \n\t " },
      { value: "{'@'} {'}'} {'{'} {0} {name} \t\n " }
    )).toEqual([])
  })

  it('does not mistake escaped literal braces for parameters', () => {
    expect(validateLocaleContract(
      { value: "JSON: {'{'}x{'}'}" }, { value: "JSON: {'{'}x{'}'}" }
    )).toEqual([])
    expect(validateLocaleContract(
      { value: "JSON: {'{'}name{'}'}" }, { value: 'JSON mẫu' }
    )).toEqual([])
  })

  it('allows fewer plural branches when the union of parameters is preserved', () => {
    expect(validateLocaleContract(
      { value: 'one | {count} things' }, { value: '{count} mục' }
    )).toEqual([])
  })

  it('rejects parameters lost from a plural branch', () => {
    expect(validateLocaleContract(
      { value: '{name} has one | {name} has {count} things' }, { value: '{name} có mục' }
    )).not.toEqual([])
  })

  it('treats parameters as sets rather than depending on order or repetition', () => {
    expect(validateLocaleContract(
      { value: '{name}: {0} / {count}' }, { value: '{count} / {0} cho {name} {name}' }
    )).toEqual([])
  })

  it('rejects added parameters even when all original parameters remain', () => {
    expect(validateLocaleContract(
      { value: '{name}' }, { value: '{name} {extra} {0}' }
    )).not.toEqual([])
  })

  it('retains every missing nested leaf path', () => {
    expect(validateLocaleContract(
      { section: { title: 'Title', action: 'Save' } }, {}
    )).toEqual(['section.action: missing key', 'section.title: missing key'])
  })

  it('retains every extra nested leaf path', () => {
    expect(validateLocaleContract(
      {}, { section: { title: 'Tiêu đề', action: 'Lưu' } }
    )).toEqual(['section.action: extra key', 'section.title: extra key'])
  })

  it('rejects a moved nested key rather than comparing only leaf names', () => {
    expect(validateLocaleContract(
      { first: { label: 'Label' } }, { second: { label: 'Nhãn' } }
    )).toEqual(['first.label: missing key', 'second.label: extra key'])
  })

  it('rejects replacing a nested object with a string and the reverse', () => {
    for (const [reference, translated] of [
      [{ section: { label: 'Label' } }, { section: 'Nhãn' }],
      [{ section: 'Label' }, { section: { label: 'Nhãn' } }]
    ]) {
      const issues = validateLocaleContract(reference, translated)
      expect(issues).not.toEqual([])
      expect(issues.some(issue => issue.includes('section.label:'))).toBe(true)
    }
  })

  it('does not flatten dotted keys into an apparently identical nested schema', () => {
    expect(validateLocaleContract(
      { 'section.label': 'Label' }, { section: { label: 'Nhãn' } }
    )).not.toEqual([])
  })

  it('checks empty object keys instead of silently dropping them', () => {
    expect(validateLocaleContract({ section: {} }, {})).toEqual(['section: missing key'])
    expect(validateLocaleContract({}, { section: {} })).toEqual(['section: extra key'])
  })

  it.each([
    ['empty string', ''],
    ['whitespace string', ' \n\t '],
    ['number', 42],
    ['boolean', false],
    ['null', null],
    ['undefined', undefined],
    ['array', ['Nhãn']]
  ])('rejects a translated %s leaf', (_description, value) => {
    const issues = validateLocaleContract({ section: { label: 'Label' } }, { section: { label: value } })
    expect(issues).toEqual(expect.arrayContaining([expect.stringContaining('section.label:')]))
  })

  it('rejects an invalid reference leaf', () => {
    expect(validateLocaleContract({ value: null }, { value: 'Nhãn' })).not.toEqual([])
  })

  it('checks dynamic named and list linked targets as well as their parameters', () => {
    expect(validateLocaleContract(
      { value: '@:{target} @:{0}' }, { value: '@:{target} @:{0}' }
    )).toEqual([])
    expect(validateLocaleContract(
      { value: '@:{first} {second}' }, { value: '{first} @:{second}' }
    )).not.toEqual([])
    expect(validateLocaleContract(
      { value: '@:{0} {1}' }, { value: '{0} @:{1}' }
    )).not.toEqual([])
  })

  it('compares literal linked target values rather than their spelling or modifiers', () => {
    expect(validateLocaleContract(
      { value: '@:common.save' }, { value: "@.upper:{'common.save'}" }
    )).toEqual([])
  })

  it('keeps all distinct issues with leaf paths in deterministic sorted order', () => {
    const reference = { z: '{name}', a: '{0}', m: '@:common.save' }
    const translated = { m: '@:common.delete', a: '{1}', z: '{count}' }
    const issues = validateLocaleContract(reference, translated)
    expect(issues).toHaveLength(3)
    expect(issues[0]).toContain('a:')
    expect(issues[1]).toContain('m:')
    expect(issues[2]).toContain('z:')
    expect(issues).toEqual([...issues].sort())
    expect(validateLocaleContract(
      { m: '@:common.save', a: '{0}', z: '{name}' },
      { z: '{count}', a: '{1}', m: '@:common.delete' }
    )).toEqual(issues)
  })
})
