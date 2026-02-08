import { describe, expect, it } from "vitest";

import { sanitizeEnml } from "./sanitizeEnml.js";

describe("sanitizeEnml", () => {
  it("removes dangerous tags and attributes", () => {
    const raw = `<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
      <en-note>
        <p>Hello<script>alert("xss")</script></p>
        <img src="https://example.com/test.png" onerror="alert('xss')" />
      </en-note>`;

    const sanitized = sanitizeEnml(raw);

    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).toContain("<img");
  });
});
