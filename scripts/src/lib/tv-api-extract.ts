/**
 * Extracts documented members from react-native-tvos' generated TypeScript.
 *
 * Parses with the TypeScript compiler API rather than matching text. The
 * generated types contain multi-line unions holding tuples and quoted string
 * literals, and nested generics such as `Readonly<Omit<ViewProps, ...> & {...}>`;
 * a text extractor would need a string-aware, nesting-aware lexer. The AST also
 * binds each doc comment to its own property, which regexes get wrong as soon as
 * a property has two comment blocks or none.
 *
 * No `createProgram` and no typechecker, so the inputs' relative imports are
 * never resolved and react-native's node_modules is not needed.
 */

import assert from 'node:assert';
import ts from 'typescript';

export type Member = {
  name: string;
  required: boolean;
  type: string;
  description: string;
  platforms: string[];
  deprecated: string | null;
};

export function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS
  );
}

/** Unwraps `Readonly<T>` and returns every `{...}` in an intersection. */
function typeLiteralsOf(node: ts.TypeNode): ts.TypeLiteralNode[] {
  if (ts.isTypeLiteralNode(node)) {
    return [node];
  }
  if (ts.isIntersectionTypeNode(node)) {
    return node.types.flatMap(typeLiteralsOf);
  }
  if (ts.isParenthesizedTypeNode(node)) {
    return typeLiteralsOf(node.type);
  }
  if (
    ts.isTypeReferenceNode(node) &&
    ts.isIdentifier(node.typeName) &&
    node.typeName.text === 'Readonly' &&
    node.typeArguments?.length === 1
  ) {
    return typeLiteralsOf(node.typeArguments[0]);
  }
  return [];
}

/** Finds the type node that a named declaration contributes members from. */
function declaredTypeNode(
  sf: ts.SourceFile,
  name: string
): ts.TypeNode | undefined {
  for (const stmt of sf.statements) {
    if (ts.isTypeAliasDeclaration(stmt) && stmt.name.text === name) {
      return stmt.type;
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === name &&
          decl.type
        ) {
          return decl.type;
        }
      }
    }
    if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === name) {
      // Synthesise a type literal from the interface body.
      return ts.factory.createTypeLiteralNode(stmt.members);
    }
    if (ts.isClassDeclaration(stmt) && stmt.name?.text === name) {
      const heritage = stmt.heritageClauses?.[0]?.types?.[0];
      const propsArg = heritage?.typeArguments?.[0];
      if (propsArg) {
        return propsArg;
      }
    }
  }
  return undefined;
}

function docCommentText(member: ts.TypeElement, sf: ts.SourceFile): string {
  const ranges = ts.getLeadingCommentRanges(sf.text, member.pos) ?? [];
  const block = ranges
    .filter(r => sf.text.slice(r.pos, r.pos + 3) === '/**')
    .at(-1);
  if (!block) {
    return '';
  }
  return sf.text
    .slice(block.pos, block.end)
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map(line => line.replace(/^[ \t]*\*[ \t]?/, '').trimEnd())
    .join('\n')
    .trim();
}

function splitTags(raw: string) {
  const lines = raw.split('\n');
  const description: string[] = [];
  const platforms: string[] = [];
  let deprecated: string | null = null;
  let current: 'desc' | 'deprecated' = 'desc';

  for (const line of lines) {
    const platform = /^@platform\s+(.+)$/.exec(line);
    if (platform) {
      platforms.push(...platform[1].split(/[,\s]+/).filter(Boolean));
      current = 'desc';
      continue;
    }
    const dep = /^@deprecated\s*(.*)$/.exec(line);
    if (dep) {
      deprecated = dep[1].trim();
      current = 'deprecated';
      continue;
    }
    const other = /^@(\w+)\s*(.*)$/.exec(line);
    if (other) {
      // Keep @default and friends as plain prose; drop the tag marker.
      description.push(
        other[1] === 'default' ? `Defaults to ${other[2]}.` : other[2]
      );
      current = 'desc';
      continue;
    }
    if (current === 'deprecated' && deprecated !== null) {
      deprecated = `${deprecated} ${line}`.trim();
    } else {
      description.push(line);
    }
  }

  return {
    description: description
      .join('\n')
      .replace(/\n{2,}/g, '\n')
      .trim(),
    platforms,
    deprecated,
  };
}

/** Collapses a type node's source text onto one line. */
function typeText(node: ts.TypeNode | undefined, sf: ts.SourceFile): string {
  if (!node) {
    return 'unknown';
  }
  return node
    .getText(sf)
    .replace(/\s*\|\s*undefined$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Members of the named declaration, alphabetically.
 *
 * `only`, when given, restricts output to those member names and asserts every
 * one of them was found — so a prop renamed upstream fails loudly instead of
 * vanishing from the docs.
 */
export function extractMembers(
  sf: ts.SourceFile,
  declName: string,
  only?: string[]
): Member[] {
  const typeNode = declaredTypeNode(sf, declName);
  assert(typeNode, `Declaration '${declName}' not found in ${sf.fileName}`);

  const literals = typeLiteralsOf(typeNode);
  assert(
    literals.length > 0,
    `Declaration '${declName}' in ${sf.fileName} contributes no object members`
  );

  const members: Member[] = [];
  for (const literal of literals) {
    for (const member of literal.members) {
      if (!member.name || !ts.isIdentifier(member.name)) {
        continue;
      }
      const name = member.name.text;
      if (only && !only.includes(name)) {
        continue;
      }
      const questionToken = (
        member as ts.PropertySignature | ts.MethodSignature
      ).questionToken;
      const {description, platforms, deprecated} = splitTags(
        docCommentText(member, sf)
      );
      members.push({
        name,
        required: questionToken === undefined,
        type: ts.isPropertySignature(member)
          ? typeText(member.type, sf)
          : member.getText(sf).replace(/\s+/g, ' '),
        description,
        platforms,
        deprecated,
      });
    }
  }

  if (only) {
    const found = new Set(members.map(m => m.name));
    const missing = only.filter(n => !found.has(n));
    assert(
      missing.length === 0,
      `Declaration '${declName}' in ${sf.fileName} is missing expected ` +
        `members: ${missing.join(', ')}. They may have been renamed upstream.`
    );
  }

  return members.sort((a, b) => a.name.localeCompare(b.name));
}
