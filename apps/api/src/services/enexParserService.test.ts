import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEnex } from "./enexParserService.js";

test("parseEnex returns notes from valid ENEX", () => {
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

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.notes.length, 1);
    assert.equal(result.notes[0]?.title, "Sample Note");
    assert.equal(result.notes[0]?.tags[0], "demo");
    assert.equal(result.warnings.length, 0);
  }
});

test("parseEnex returns error for invalid XML", () => {
  const result = parseEnex("<en-export><note></en-export>");

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "INVALID_XML");
  }
});
