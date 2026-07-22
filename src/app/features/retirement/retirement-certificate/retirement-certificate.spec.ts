import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { RetirementCertificateComponent } from './retirement-certificate';
import { CertificatePdfService } from '../../../core/services/certificate-pdf.service';
import { RetirementCertificate } from '../../../core/models/retirement.model';

describe('RetirementCertificateComponent', () => {
  let component: RetirementCertificateComponent;
  let fixture: ComponentFixture<RetirementCertificateComponent>;

  const mockCert: RetirementCertificate = {
    id: 'cert-001',
    projectName: 'Test Project',
    amount: '100',
    purpose: 'Testing',
    retiredAt: '2025-01-01T00:00:00Z',
    txHash: 'tx123hash',
    certificateIpfsUri: '',
    retireeAddress: 'GTEST123ADDRESS',
  };

  const initialState = {
    retirement: {
      certificate: mockCert,
      loading: false,
    },
  };

  const certPdfMock = {
    generate: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [RetirementCertificateComponent],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState }),
        { provide: CertificatePdfService, useValue: certPdfMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RetirementCertificateComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asAny = (obj: unknown): any => obj;

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have download button in template', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    const downloadBtn = Array.from(buttons).find((b) => b.textContent?.includes('Download PDF'));
    expect(downloadBtn).toBeTruthy();
  });

  it('should call certPdf.generate when downloadCertificate is called', async () => {
    await asAny(component).downloadCertificate(mockCert);
    expect(certPdfMock.generate).toHaveBeenCalledWith(mockCert);
  });

  it('should set downloading to true during generation', async () => {
    let resolveGenerate!: () => void;
    certPdfMock.generate.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveGenerate = resolve;
      }),
    );

    const promise = asAny(component).downloadCertificate(mockCert) as Promise<void>;
    expect(asAny(component).downloading).toBe(true);

    resolveGenerate();
    await promise;
    expect(asAny(component).downloading).toBe(false);
  });

  it('should reset downloading on error', async () => {
    certPdfMock.generate.mockRejectedValue(new Error('fail'));

    try {
      await asAny(component).downloadCertificate(mockCert);
    } catch {
      // expected
    }
    expect(asAny(component).downloading).toBe(false);
  });

  it('should not call generate if already downloading', async () => {
    certPdfMock.generate.mockReturnValue(new Promise(() => {}));

    const p1 = asAny(component).downloadCertificate(mockCert) as Promise<void>;
    asAny(component).downloadCertificate(mockCert);

    expect(certPdfMock.generate).toHaveBeenCalledTimes(1);

    void p1;
  });
});
