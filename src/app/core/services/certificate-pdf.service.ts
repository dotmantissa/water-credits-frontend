import { Injectable } from '@angular/core';
import type {
  TCreatedPdf,
  TDocumentDefinitions,
  Content,
  StyleDictionary,
  TVirtualFileSystem,
} from 'pdfmake/interfaces';

import { RetirementCertificate } from '../models/retirement.model';

interface PdfMakeApi {
  addVirtualFileSystem(vfs: TVirtualFileSystem): void;
  createPdf(documentDefinitions: TDocumentDefinitions): TCreatedPdf;
}

const STELLAR_EXPLORER = 'https://testnet.stellarchain.io/tx/';
const PRIMARY_BLUE = '#1a56db';
const TEXT_DARK = '#1e293b';
const TEXT_MID = '#475569';
const TEXT_LIGHT = '#94a3b8';
const BORDER_COLOR = '#cbd5e1';

@Injectable({ providedIn: 'root' })
export class CertificatePdfService {
  async generate(cert: RetirementCertificate): Promise<void> {
    const [pdfMakeModule, vfsModule] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ]);

    // The UMD builds expose their API on the namespace `default` when loaded
    // through a bundler, so unwrap it and register the bundled Roboto fonts.
    const pdfMake = this.asPdfMake(pdfMakeModule);
    const vfs = (vfsModule as { default?: TVirtualFileSystem }).default;
    if (vfs) {
      pdfMake.addVirtualFileSystem(vfs);
    }

    const docDef = this.buildDocument(cert, await this.buildQrDataUrl(cert.txHash));
    pdfMake.createPdf(docDef).download(this.filename(cert));
  }

  async buildQrDataUrl(txHash: string): Promise<string> {
    const QRCode = await import('qrcode');
    return QRCode.toDataURL(STELLAR_EXPLORER + txHash, { width: 120, margin: 0 });
  }

  private asPdfMake(module: unknown): PdfMakeApi {
    const withDefault = module as { default?: PdfMakeApi };
    return (withDefault.default ?? module) as PdfMakeApi;
  }

  buildDocument(cert: RetirementCertificate, qrDataUrl: string): TDocumentDefinitions {
    const dateStr = new Date(cert.retiredAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40],
      content: [
        this.header(),
        this.titleBlock(),
        this.separator(),
        this.certifiesSection(cert),
        this.detailsGrid(cert),
        this.purposeBlock(cert),
        this.txSection(cert, dateStr),
        this.qrBlock(qrDataUrl),
      ],
      styles: this.styles(),
    };
  }

  private header(): Content {
    return {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'WATER CREDITS', style: 'brandTitle' },
            { text: 'Verified Environmental Impact', style: 'brandSubtitle' },
          ],
        },
        {
          width: 'auto',
          text: 'CERTIFICATE',
          style: 'certificateLabel',
        },
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number],
    };
  }

  private titleBlock(): Content {
    return { text: 'Certificate of Carbon Credit Retirement', style: 'title' };
  }

  private separator(): Content {
    return {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: BORDER_COLOR },
      ],
      margin: [0, 10, 0, 10] as [number, number, number, number],
    };
  }

  private certifiesSection(cert: RetirementCertificate): Content {
    return {
      stack: [
        { text: 'This certifies that', style: 'label' },
        { text: cert.retireeAddress, style: 'addressValue' },
        {
          text: 'has permanently retired',
          style: 'label',
          margin: [0, 4, 0, 0] as [number, number, number, number],
        },
        { text: `${cert.amount} Water Quality Credits`, style: 'amountValue' },
      ],
      margin: [0, 0, 0, 16] as [number, number, number, number],
    };
  }

  private detailsGrid(cert: RetirementCertificate): Content {
    const field = (label: string, value: string): Content => ({
      stack: [
        { text: label.toUpperCase(), style: 'fieldLabel' },
        { text: value, style: 'fieldValue' },
      ],
    });

    return {
      columns: [
        {
          width: '*',
          stack: [field('Project', cert.projectName)],
          margin: [0, 0, 10, 10] as [number, number, number, number],
        },
        {
          width: '*',
          stack: [field('Amount Retired', `${cert.amount} credits`)],
          margin: [0, 0, 10, 10] as [number, number, number, number],
        },
      ],
      columnGap: 10,
    };
  }

  private purposeBlock(cert: RetirementCertificate): Content {
    return {
      stack: [
        { text: 'PURPOSE', style: 'fieldLabel' },
        { text: cert.purpose, style: 'fieldValue' },
      ],
      margin: [0, 0, 0, 16] as [number, number, number, number],
    };
  }

  private txSection(cert: RetirementCertificate, dateStr: string): Content {
    return {
      stack: [
        { text: 'Transaction Hash', style: 'fieldLabel' },
        { text: cert.txHash, style: 'monoValue' },
        {
          text: `Retirement Date: ${dateStr}`,
          style: 'idValue',
          margin: [0, 4, 0, 0] as [number, number, number, number],
        },
        {
          text: `Certificate ID: ${cert.id}`,
          style: 'idValue',
          margin: [0, 2, 0, 0] as [number, number, number, number],
        },
      ],
      margin: [0, 0, 0, 16] as [number, number, number, number],
    };
  }

  private qrBlock(qrDataUrl: string): Content {
    return {
      columns: [
        { width: '*', text: '' },
        {
          width: 130,
          stack: [
            { text: 'Scan to view on-chain transaction', style: 'qrLabel' },
            {
              image: qrDataUrl,
              width: 120,
              height: 120,
              margin: [0, 4, 0, 0] as [number, number, number, number],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number],
    };
  }

  private styles(): StyleDictionary {
    return {
      brandTitle: {
        fontSize: 18,
        bold: true,
        color: PRIMARY_BLUE,
        margin: [0, 0, 0, 2] as [number, number, number, number],
      },
      brandSubtitle: { fontSize: 9, color: TEXT_MID },
      certificateLabel: {
        fontSize: 10,
        bold: true,
        color: PRIMARY_BLUE,
        alignment: 'right',
        margin: [0, 4, 0, 0] as [number, number, number, number],
      },
      title: {
        fontSize: 16,
        bold: true,
        color: TEXT_DARK,
        alignment: 'center',
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },
      label: {
        fontSize: 9,
        color: TEXT_LIGHT,
        alignment: 'center',
        margin: [0, 8, 0, 4] as [number, number, number, number],
      },
      addressValue: { fontSize: 14, bold: true, color: TEXT_DARK, alignment: 'center' },
      amountValue: {
        fontSize: 20,
        bold: true,
        color: PRIMARY_BLUE,
        alignment: 'center',
        margin: [0, 8, 0, 4] as [number, number, number, number],
      },
      fieldLabel: {
        fontSize: 8,
        color: TEXT_LIGHT,
        margin: [0, 0, 0, 3] as [number, number, number, number],
      },
      fieldValue: { fontSize: 11, bold: true, color: TEXT_DARK },
      monoValue: { fontSize: 8, color: TEXT_MID },
      idValue: { fontSize: 8, color: TEXT_LIGHT },
      qrLabel: { fontSize: 7, color: TEXT_LIGHT, alignment: 'center' },
    };
  }

  filename(cert: RetirementCertificate): string {
    return `water-credit-certificate-${cert.id}.pdf`;
  }
}
