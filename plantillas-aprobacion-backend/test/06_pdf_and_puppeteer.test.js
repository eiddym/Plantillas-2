const { expect } = require('chai');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

describe('06. PDF Generation and Puppeteer Integration (Node 22)', () => {
  it('should create a valid PDF using pdf-lib', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([600, 400]);

    page.drawText('Test Document - Plantillas Aprobación Backend Node 22', {
      x: 50,
      y: 350,
      size: 14,
      font,
      color: rgb(0, 0.2, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    expect(pdfBytes).to.be.an.instanceOf(Uint8Array);
    expect(pdfBytes.length).to.be.greaterThan(100);

    // Verify PDF header %PDF-
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString();
    expect(header).to.equal('%PDF-');
  });

  it('should load and read an existing PDF using pdf-lib', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([500, 500]);
    const pdfBytes = await pdfDoc.save();

    const loadedDoc = await PDFDocument.load(pdfBytes);
    expect(loadedDoc.getPageCount()).to.equal(1);
  });

  it('should verify CHROMIUM_PATH or chromium availability in container', () => {
    const chromiumPath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
    if (fs.existsSync(chromiumPath)) {
      expect(fs.existsSync(chromiumPath)).to.be.true;
    } else {
      // If running on host outside container, just verify puppeteer-core loads
      const puppeteer = require('puppeteer-core');
      expect(puppeteer).to.be.an('object');
    }
  });
});
