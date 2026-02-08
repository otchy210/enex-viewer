import { describe, expect, it } from "vitest";

import { sanitizeEnml } from "./sanitizeEnml.js";

describe("sanitizeEnml", () => {
  it("removes dangerous tags and attributes while keeping allowed elements", () => {
    const raw = `<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
      <en-note>
        <p>Hello<script>alert("xss")</script></p>
        <a href="javascript:alert('xss')" title="bad-link">unsafe</a>
        <a href="https://example.com" title="safe-link">safe</a>
        <en-media hash="abc" type="image/png" width="100" height="200" alt="img"></en-media>
        <img src="https://example.com/test.png" onerror="alert('xss')" />
      </en-note>`;

    const sanitized = sanitizeEnml(raw);

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).toContain("<img");
    expect(sanitized).toContain("<a href=\"https://example.com\"");
    expect(sanitized).toContain("<en-media");
  });
});
