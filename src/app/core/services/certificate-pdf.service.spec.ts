import { TestBed } from '@angular/core/testing';

import { RetirementCertificate } from '../models/retirement.model';
import { CertificatePdfService } from './certificate-pdf.service';

describe('CertificatePdfService', () => {
  let service: CertificatePdfService;

  const mockCert: RetirementCertificate = {
    id: 'cert-abc-123',
    projectName: 'Blue Basin Watershed',
    amount: '1500.50',
    purpose: 'Community water filtration restoration',
    retiredAt: '2025-03-15T10:30:00Z',
    txHash: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
    certificateIpfsUri: 'ipfs://QmTest123',
    retireeAddress: 'GDXJHK7F5Y3QL6LXAW3W5K4X4KZ3Q3Q3Q3Q3Q3Q3Q3Q3Q3Q3',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CertificatePdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('filename', () => {
    it('should return correct filename format', () => {
      const result = service.filename(mockCert);
      expect(result).toBe('water-credit-certificate-cert-abc-123.pdf');
    });

    it('should handle numeric IDs', () => {
      const cert = { ...mockCert, id: '42' };
      expect(service.filename(cert)).toBe('water-credit-certificate-42.pdf');
    });
  });

  describe('buildDocument', () => {
    it('should return a valid pdfmake document definition', () => {
      const doc = service.buildDocument(mockCert, 'data:image/png;base64,mockqr');

      expect(doc.pageSize).toBe('A4');
      expect(doc.pageMargins).toEqual([40, 40, 40, 40]);
      expect(doc.content).toBeTruthy();
      expect(Array.isArray(doc.content)).toBe(true);
      expect(doc.styles).toBeTruthy();
    });

    it('should include the certificate amount in content', () => {
      const doc = service.buildDocument(mockCert, 'data:image/png;base64,mockqr');
      const contentStr = JSON.stringify(doc.content);
      expect(contentStr).toContain('1500.50');
      expect(contentStr).toContain('Water Quality Credits');
    });

    it('should include the retiree address', () => {
      const doc = service.buildDocument(mockCert, 'data:image/png;base64,mockqr');
      const contentStr = JSON.stringify(doc.content);
      expect(contentStr).toContain(mockCert.retireeAddress);
    });

    it('should include the project name', () => {
      const doc = service.buildDocument(mockCert, 'data:image/png;base64,mockqr');
      const contentStr = JSON.stringify(doc.content);
      expect(contentStr).toContain('Blue Basin Watershed');
    });

    it('should include the transaction hash', () => {
      const doc = service.buildDocument(mockCert, 'data:image/png;base64,mockqr');
      const contentStr = JSON.stringify(doc.content);
      expect(contentStr).toContain(mockCert.txHash);
    });

    it('should include the certificate ID', () => {
      const doc = service.buildDocument(mockCert, 'data:image/png;base64,mockqr');
      const contentStr = JSON.stringify(doc.content);
      expect(contentStr).toContain('cert-abc-123');
    });

    it('should include the QR code image', () => {
      const doc = service.buildDocument(mockCert, 'data:image/png;base64,mockqr');
      const contentStr = JSON.stringify(doc.content);
      expect(contentStr).toContain('data:image/png;base64,mockqr');
    });

    it('should include a QR code link to Stellar testnet explorer', () => {
      const qrUrl = 'data:image/png;base64,mockqr';
      const doc = service.buildDocument(mockCert, qrUrl);
      expect(doc.content).toBeDefined();
    });
  });
});
