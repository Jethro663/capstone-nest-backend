import { announcementPreview, normalizeAnnouncementContent } from "../announcementContent";

describe("announcement content", () => {
  it.each([
    '<p>Hello <strong>class</strong></p>',
    '&lt;p&gt;Hello &lt;strong&gt;class&lt;/strong&gt;&lt;/p&gt;',
    '&amp;lt;p&amp;gt;Hello &amp;lt;strong&amp;gt;class&amp;lt;/strong&amp;gt;&amp;lt;/p&amp;gt;',
  ])("keeps formatting and produces a clean preview for %s", content => {
    expect(normalizeAnnouncementContent(content)).toBe('<p>Hello <strong>class</strong></p>');
    expect(announcementPreview(content)).toBe('Hello class');
  });

  it("preserves paragraphs and literal examples in ordinary content", () => {
    expect(announcementPreview('<p>First</p><p>Second &amp; third</p>')).toBe('First\nSecond & third');
    expect(normalizeAnnouncementContent('Use &lt;p&gt; to start a paragraph.')).toBe('Use &lt;p&gt; to start a paragraph.');
    expect(normalizeAnnouncementContent('<p>Use &lt;p&gt; in HTML.</p>')).toBe('<p>Use &lt;p&gt; in HTML.</p>');
    expect(announcementPreview(null)).toBe('');
  });
});
