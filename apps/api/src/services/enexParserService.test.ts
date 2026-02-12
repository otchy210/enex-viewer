import { describe, expect, it } from 'vitest';

import { parseEnex } from './enexParserService.js';

describe('parseEnex', () => {
  it('returns notes from valid ENEX', () => {
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
      expect(result.notes[0]?.title).toBe('Sample Note');
      expect(result.notes[0]?.tags[0]).toBe('demo');
      expect(result.warnings).toHaveLength(0);
    }
  });

  it('returns error for invalid XML', () => {
    const result = parseEnex('<en-export><note></en-export>');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_XML');
    }
  });

  it('sanitizes note content', () => {
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
      expect(result.notes[0]?.content).toContain('<p>safe</p>');
      expect(result.notes[0]?.content).not.toContain('<script');
    }
  });

  it('skips notes missing title or content and returns warnings', () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
    <en-export>
      <note>
        <title>Incomplete</title>
      </note>
      <note>
        <title>Complete</title>
        <content><![CDATA[<en-note>ok</en-note>]]></content>
      </note>
    </en-export>`;

    const result = parseEnex(sample);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes).toHaveLength(1);
      expect(result.notes[0]?.title).toBe('Complete');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]?.noteTitle).toBe('Incomplete');
    }
  });

  it('extracts resource size from whitespace-padded base64', () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
    <en-export>
      <note>
        <title>Whitespace Resource</title>
        <content><![CDATA[<en-note>asset</en-note>]]></content>
        <resource>
          <data encoding="base64"><![CDATA[AA
AA]]></data>
        </resource>
      </note>
    </en-export>`;

    const result = parseEnex(sample);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes[0]?.resources[0]?.size).toBe(3);
    }
  });

  it('returns undefined size for non-base64 resource data', () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
    <en-export>
      <note>
        <title>Invalid Resource</title>
        <content><![CDATA[<en-note>asset</en-note>]]></content>
        <resource>
          <data encoding="utf8"><![CDATA[plain-text]]></data>
        </resource>
      </note>
    </en-export>`;

    const result = parseEnex(sample);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes[0]?.resources[0]?.size).toBeUndefined();
    }
  });
  it('extracts resource metadata and size', () => {
    const sample = `<?xml version="1.0" encoding="UTF-8"?>
    <en-export>
      <note>
        <title>Resource Note</title>
        <content><![CDATA[<en-note>asset</en-note>]]></content>
        <resource>
          <data encoding="base64"><![CDATA[AAAA]]></data>
          <mime>image/png</mime>
          <resource-attributes>
            <file-name>image.png</file-name>
          </resource-attributes>
        </resource>
      </note>
    </en-export>`;

    const result = parseEnex(sample);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notes[0]?.resources).toEqual([
        {
          id: 'resource-1-1',
          fileName: 'image.png',
          mime: 'image/png',
          size: 3
        }
      ]);
    }
  });
});
