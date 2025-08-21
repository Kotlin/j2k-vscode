import { parse } from "java-parser";

type CstNode = { name: string; children: Record<string, any[]> };

function child<T = any>(node: CstNode | undefined, key: string): T | undefined {
  return node?.children?.[key]?.[0];
}
function children<T = any>(node: CstNode | undefined, key: string): T[] {
  return (node?.children?.[key] ?? []) as T[];
}

const GENERIC = /<[^<>]*>/g;
const ANNOT = /@\w+(?:\([^()]*\))?/g;
const QUAL  = /([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)/g;

function normType(s: string): string {
  if (!s) {return "";}
  s = s.replace(ANNOT, "");
  while (GENERIC.test(s)) {s = s.replace(GENERIC, "");}
  s = s.replace(/\s+/g, "");
  s = s.replace(QUAL, (_m, g1) => String(g1).split(".").pop()!);
  return s;
}

function flatText(n: any): string {
  if (!n) {return "";}
  if (Array.isArray(n)) {return n.map(flatText).join("");}
  if (typeof n === "object") {
    if ("image" in n && typeof n.image === "string") {return n.image;}
    if ("children" in n && n.children) {return Object.values(n.children).map(flatText).join("");}
    return Object.values(n).map(flatText).join("");
  }
  return String(n ?? "");
}

function findFirstTypeNode(n: CstNode | undefined): CstNode | undefined {
  if (!n) {return undefined;}
  const queue: CstNode[] = [n];
  const TYPE_KEYS = new Set(["unannType", "type", "typeType"]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (TYPE_KEYS.has(cur.name)) {return cur;}
    for (const arr of Object.values(cur.children)) {
      for (const c of arr) {if (c && typeof c === "object" && "name" in c) {queue.push(c);}}
    }
  }
  return undefined;
}

function extractParams(paramListNode: CstNode | undefined): string[] {
  if (!paramListNode) {return [];}
  const out: string[] = [];

  for (const p of children<CstNode>(paramListNode, "formalParameter")) {
    const tNode = findFirstTypeNode(p);
    out.push(normType(flatText(tNode)));
  }

  const last = child<CstNode>(paramListNode, "lastFormalParameter");
  if (last) {
    const varArg = child<CstNode>(last, "variableArityParameter");
    if (varArg) {
      const tNode = findFirstTypeNode(varArg);
      out.push(normType(flatText(tNode)) + "...");
    } else {
      const fp = child<CstNode>(last, "formalParameter");
      const tNode = findFirstTypeNode(fp);
      out.push(normType(flatText(tNode)));
    }
  }

  return out;
}

export function extractAddresses(javaCode: string): string[] {
  const root = parse(javaCode) as unknown as CstNode;

  const out: string[] = [];
  const stack: string[] = [];

  function currentTypeChain(): string {
    return stack.length ? stack.join(".") : "<no-type>";
  }

  function pushTypeName(n: CstNode): void {
    const typeId = child<CstNode>(n, "typeIdentifier");
    const ident = child<any>(typeId, "Identifier") ?? child<any>(n as any, "Identifier");
    const name = ident?.image ?? "<anon>";
    stack.push(name);
  }

  function visit(node: CstNode): void {
    const name = node.name;

    // enter types
    if (name === "normalClassDeclaration" || name === "interfaceDeclaration" ||
        name === "enumDeclaration" || name === "recordDeclaration") {
      pushTypeName(node);
    }

    // methods
    if (name === "methodDeclaration") {
      const header = child<CstNode>(node, "methodHeader");
      const decl   = child<CstNode>(header, "methodDeclarator");
      const idTok  = child<any>(decl, "Identifier");
      const methodName = idTok?.image ?? "<unnamed>";
      const paramList  = child<CstNode>(decl, "formalParameterList");
      const params = extractParams(paramList);
      out.push(`${currentTypeChain()}#${methodName}(${params.join(",")})`);
    }

    // constructors
    if (name === "constructorDeclaration") {
      const decl  = child<CstNode>(node, "constructorDeclarator");
      const paramList = child<CstNode>(decl, "formalParameterList");
      const params = extractParams(paramList);
      out.push(`${currentTypeChain()}#<init>(${params.join(",")})`);
    }

    // recurse
    for (const arr of Object.values(node.children)) {
      for (const c of arr) {if (c && typeof c === "object" && "name" in c) {visit(c);}}
    }

    // exit types
    if (name === "normalClassDeclaration" || name === "interfaceDeclaration" ||
        name === "enumDeclaration" || name === "recordDeclaration") {
      stack.pop();
    }
  }

  visit(root);
  return out;
}
