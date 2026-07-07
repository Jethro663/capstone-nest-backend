import JSZip from 'jszip';
import { parsePptxSlides } from './pptx-viewer';

async function makePptxBlob() {
  const zip = new JSZip();
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <p:sldIdLst>
        <p:sldId id="256" r:id="rId2"/>
        <p:sldId id="257" r:id="rId3"/>
      </p:sldIdLst>
    </p:presentation>`,
  );
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<?xml version="1.0" encoding="UTF-8"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
      <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
    </Relationships>`,
  );
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree>
        <p:sp><p:txBody><a:p><a:r><a:t>First title</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:txBody><a:p><a:r><a:t>First bullet</a:t></a:r></a:p></p:txBody></p:sp>
      </p:spTree></p:cSld>
    </p:sld>`,
  );
  zip.file(
    'ppt/slides/slide2.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
    <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree>
        <p:sp><p:txBody><a:p><a:r><a:t>Second title</a:t></a:r></a:p></p:txBody></p:sp>
      </p:spTree></p:cSld>
    </p:sld>`,
  );

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
}

describe('parsePptxSlides', () => {
  it('extracts ordered slide text from a PPTX package', async () => {
    const slides = await parsePptxSlides(await makePptxBlob());

    expect(slides).toEqual([
      {
        slideNumber: 1,
        title: 'First title',
        lines: ['First title', 'First bullet'],
      },
      {
        slideNumber: 2,
        title: 'Second title',
        lines: ['Second title'],
      },
    ]);
  });
});
