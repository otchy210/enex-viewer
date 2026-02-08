import { JSDOM } from "jsdom";

const xmlPreamblePattern = /<\?xml[\s\S]*?\?>/gi;
const doctypePattern = /<!DOCTYPE[\s\S]*?>/gi;

const allowedTags = new Set([
  "en-note",
  "en-todo",
  "en-media",
  "div",
  "p",
  "br",
  "span",
  "a",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "s",
  "blockquote",
  "pre",
  "code",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
  "hr",
]);

const dropTags = new Set(["script", "style", "iframe", "object", "embed"]);

const allowedAttributes: Record<string, string[]> = {
  a: ["href", "name", "target", "rel", "title"],
  img: ["src", "alt", "title", "width", "height"],
  "en-media": ["hash", "type", "width", "height", "alt"],
  "en-todo": ["checked"],
};

const allowedSchemesByTag: Record<string, string[]> = {
  a: ["http", "https", "mailto"],
  img: ["http", "https", "data"],
};

const isAllowedUrl = (value: string, tagName: string) => {
  const trimmed = value.trim();
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return true;
  }
  const match = trimmed.match(/^([a-z0-9+.-]+):/i);
  if (!match) {
    return true;
  }
  const scheme = match[1]?.toLowerCase();
  if (!scheme) {
    return false;
  }
  const allowedSchemes = allowedSchemesByTag[tagName] ?? [];
  return allowedSchemes.includes(scheme);
};

const unwrapElement = (element: any) => {
  const parent = element.parentNode;
  if (!parent) {
    return;
  }
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  parent.removeChild(element);
};

export const sanitizeEnml = (raw: string): string => {
  const normalized = raw.replace(xmlPreamblePattern, "").replace(doctypePattern, "");
  const dom = new JSDOM(`<body>${normalized}</body>`);
  const { document } = dom.window;
  const body = document.body;
  const walker = document.createTreeWalker(body, dom.window.NodeFilter.SHOW_ELEMENT);

  const nodes: any[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as any);
    current = walker.nextNode();
  }

  nodes.forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    if (!allowedTags.has(tagName)) {
      if (dropTags.has(tagName)) {
        element.remove();
      } else {
        unwrapElement(element);
      }
      return;
    }

    const allowedForTag = allowedAttributes[tagName] ?? [];
    const allowedSet = new Set(allowedForTag);
    const attributes = Array.from(element.attributes ?? []) as Array<{ name: string; value: string }>;
    attributes.forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      if (!allowedSet.has(attrName)) {
        element.removeAttribute(attr.name);
        return;
      }
      if ((attrName === "href" || attrName === "src") && !isAllowedUrl(attr.value, tagName)) {
        element.removeAttribute(attr.name);
      }
    });
  });

  return body.innerHTML;
};
