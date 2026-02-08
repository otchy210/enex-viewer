import { describe, expect, it } from "vitest";
import { parseEnex } from "./enexParserService.js";

describe("parseEnex", () => {
  it("returns notes from valid ENEX", () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
    <en-export>
      <note>
        <title>Sample Note</title>
        <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
        <en-note>hello</en-note>]]></content>
        <created>20240101T000000Z</created>
        <updated>20240102T000000Z</updated>
        <tag>demo</tag>
      </note>
    </en-export>`;

    const result = parseEnex(sample);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0]?.title).toBe("Sample Note");
      expect(result.notes[0]?.tags[0]).toBe("demo");
      expect(result.warnings).toHaveLength(0);
    }
  });

  it("returns error for invalid XML", () => {
    const result = parseEnex("<en-export><note></en-export>");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_XML");
    }
  });

  it("sanitizes note content", () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
    <en-export>
      <note>
        <title>Dangerous Note</title>
        <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
        <en-note><script>alert(1)</script><p>safe</p></en-note>]]></content>
      </note>
    </en-export>`;

    const result = parseEnex(sample);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes[0]?.content).toContain("<p>safe</p>");
      expect(result.notes[0]?.content).not.toContain("<script");
    }
  });
});
