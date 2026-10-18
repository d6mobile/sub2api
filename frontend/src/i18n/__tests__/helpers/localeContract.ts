import { baseCompile } from '@intlify/message-compiler'
import type { ResourceNode } from '@intlify/message-compiler'

type MessageContract = Record<'named' | 'list' | 'linked', Set<string>>

function isBranch(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function childPath(path: string, key: string): string {
  return path ? `${path}.${key}` : key
}

function leafPaths(value: unknown, path: string): string[] {
  if (isBranch(value) && Object.keys(value).length > 0) {
    return Object.entries(value).flatMap(([key, child]) => leafPaths(child, childPath(path, key)))
  }
  return [path || '<root>']
}

function extractContract(ast: ResourceNode): MessageContract {
  const contract: MessageContract = { named: new Set(), list: new Set(), linked: new Set() }
  // NodeTypes is a declaration-only const enum in this compiler release. Numeric
  // discriminants narrow the exported AST types without importing a missing value.
  const messages = ast.body.type === 1 /* Plural */ ? ast.body.cases : [ast.body]
  for (const message of messages) {
    for (const item of message.items) {
      switch (item.type) {
        case 4: // Named
          contract.named.add(item.key)
          break
        case 5: // List
          contract.list.add(String(item.index))
          break
        case 6: { // Linked
          const key = item.key
          if (key.type === 4 /* Named */) {
            contract.named.add(key.key)
            contract.linked.add(`named:${key.key}`)
          } else if (key.type === 5 /* List */) {
            contract.list.add(String(key.index))
            contract.linked.add(`list:${key.index}`)
          } else {
            // Literal and LinkedKey nodes name the same static target.
            contract.linked.add(`static:${key.value ?? ''}`)
          }
          break
        }
      }
    }
  }
  return contract
}

function compileContract(
  source: string,
  side: 'reference' | 'translated',
  path: string,
  issues: string[]
): MessageContract | undefined {
  let failed = false
  try {
    const { ast } = baseCompile(source, {
      onError: error => {
        failed = true
        issues.push(`${path}: ${side} message does not compile: ${error.message}`)
      }
    })
    if (failed) return undefined
    // Compiler 9.14.5 can silently discard a final bare opening brace or accept
    // an unclosed placeholder whose span reaches EOF. Check the original source
    // spans; never append a sentinel or otherwise repair the message.
    const messages = ast.body.type === 1 ? ast.body.cases : [ast.body]
    const incompletePlaceholder = messages.some(message => message.items.some(item => {
      const node = item.type === 6 /* Linked */ ? item.key : item
      if (node.type !== 4 /* Named */ && node.type !== 5 /* List */ && node.type !== 9 /* Literal */) {
        return false
      }
      return node.start === undefined || node.end === undefined ||
        !source.slice(node.start, node.end).trimEnd().endsWith('}')
    }))
    if (incompletePlaceholder) {
      issues.push(`${path}: ${side} message does not compile: unterminated placeholder`)
      return undefined
    }
    const lastMessage = messages[messages.length - 1]
    const lastItem = lastMessage.items[lastMessage.items.length - 1]
    const consumedEnd = lastItem?.end ?? lastMessage.start ?? 0
    if (source.slice(consumedEnd).trim() !== '') {
      issues.push(`${path}: ${side} message does not compile: unparsed trailing message syntax`)
      return undefined
    }
    return extractContract(ast)
  } catch (error) {
    issues.push(`${path}: ${side} message does not compile: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  }
}

/** Test-only schema, compiler and interpolation contract check, independent of runtime registration. */
export function validateLocaleContract(reference: unknown, translated: unknown): string[] {
  const issues: string[] = []

  function compare(expected: unknown, actual: unknown, path: string): void {
    const expectedBranch = isBranch(expected)
    const actualBranch = isBranch(actual)
    if (expectedBranch && actualBranch) {
      const keys = new Set([...Object.keys(expected), ...Object.keys(actual)])
      for (const key of keys) {
        const nextPath = childPath(path, key)
        if (!Object.prototype.hasOwnProperty.call(actual, key)) {
          issues.push(...leafPaths(expected[key], nextPath).map(leaf => `${leaf}: missing key`))
        } else if (!Object.prototype.hasOwnProperty.call(expected, key)) {
          issues.push(...leafPaths(actual[key], nextPath).map(leaf => `${leaf}: extra key`))
        } else {
          compare(expected[key], actual[key], nextPath)
        }
      }
      return
    }
    if (expectedBranch || actualBranch) {
      const paths = new Set([...leafPaths(expected, path), ...leafPaths(actual, path)])
      issues.push(...[...paths].map(leaf => `${leaf}: nested-key structure differs`))
      return
    }

    const leaf = path || '<root>'
    if (typeof expected !== 'string' || expected.trim() === '') {
      issues.push(`${leaf}: reference leaf must be a non-empty string`)
    }
    if (typeof actual !== 'string' || actual.trim() === '') {
      issues.push(`${leaf}: translated leaf must be a non-empty string`)
    }
    if (typeof expected !== 'string' || typeof actual !== 'string') return

    const expectedContract = compileContract(expected, 'reference', leaf, issues)
    const actualContract = compileContract(actual, 'translated', leaf, issues)
    if (!expectedContract || !actualContract) return
    for (const kind of ['named', 'list', 'linked'] as const) {
      const expectedValues = JSON.stringify([...expectedContract[kind]].sort())
      const actualValues = JSON.stringify([...actualContract[kind]].sort())
      if (expectedValues !== actualValues) {
        issues.push(`${leaf}: ${kind} set differs (reference ${expectedValues}; translated ${actualValues})`)
      }
    }
  }

  compare(reference, translated, '')
  return issues.sort()
}
