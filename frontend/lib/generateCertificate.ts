/**
 * Certificate Generator for NUWA Digital Twin
 * Generates PDF certificates for EUDR compliance and Carbon baseline
 */

export interface CertificateData {
  farmName: string
  farmId: string
  owner: string
  location: string
  areaHa: number
  polygon: {
    type: string
    coordinates: number[][][]
  }
  analysis: {
    ndvi: {
      mean: number
      median: number
      calculatedAt: string
    }
    deforestation: {
      deforestationPercent: number
      compliant: boolean
      analyzedPeriod: { startDate: string; endDate: string }
      methodology: string
    }
    carbon: {
      baselineCarbonTCO2e: number
      agbTonnesPerHa: number
      methodology: string
      verraMethodology: string
    }
  }
  nft?: {
    tokenId: string
    txHash: string
    ipfsHash: string
    mintedAt: string
  }
}

export function generateCertificateHTML(data: CertificateData): string {
  const now = new Date().toISOString().split('T')[0]
  const eudrStatus = data.analysis.deforestation.compliant ? 'APROBADO' : 'NO CUMPLE'
  const eudrColor = data.analysis.deforestation.compliant ? '#16a34a' : '#dc2626'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificado NUWA - ${data.farmName}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
    }
    .certificate {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: white;
      padding: 40px;
      position: relative;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #16a34a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      font-size: 36px;
      font-weight: bold;
      color: #16a34a;
      letter-spacing: 4px;
    }
    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin-top: 5px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      margin: 30px 0;
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 8px 24px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      text-transform: uppercase;
      background: ${eudrColor}20;
      color: ${eudrColor};
      border: 2px solid ${eudrColor};
    }
    .section {
      margin: 25px 0;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #16a34a;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #16a34a;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .field {
      margin-bottom: 10px;
    }
    .field-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field-value {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .metric-box {
      text-align: center;
      padding: 15px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #16a34a;
    }
    .metric-label {
      font-size: 12px;
      color: #64748b;
    }
    .footer {
      position: absolute;
      bottom: 40px;
      left: 40px;
      right: 40px;
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      font-size: 10px;
      color: #94a3b8;
    }
    .qr-placeholder {
      width: 80px;
      height: 80px;
      background: #f1f5f9;
      border: 2px dashed #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 10px;
      font-size: 10px;
      color: #94a3b8;
    }
    .blockchain-hash {
      font-family: monospace;
      font-size: 10px;
      color: #64748b;
      word-break: break-all;
      background: #f1f5f9;
      padding: 8px;
      border-radius: 4px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">NUWA</div>
      <div class="subtitle">Digital Twin | Creditos de Carbono Verificados</div>
    </div>

    <div class="title">CERTIFICADO DE GEMELO DIGITAL</div>

    <div style="text-align: center; margin-bottom: 30px;">
      <span class="badge">EUDR: ${eudrStatus}</span>
    </div>

    <div class="section">
      <div class="section-title">Informacion de la Finca</div>
      <div class="grid">
        <div class="field">
          <div class="field-label">Nombre</div>
          <div class="field-value">${data.farmName}</div>
        </div>
        <div class="field">
          <div class="field-label">ID</div>
          <div class="field-value">${data.farmId}</div>
        </div>
        <div class="field">
          <div class="field-label">Propietario</div>
          <div class="field-value">${data.owner}</div>
        </div>
        <div class="field">
          <div class="field-label">Ubicacion</div>
          <div class="field-value">${data.location}</div>
        </div>
        <div class="field">
          <div class="field-label">Area Total</div>
          <div class="field-value">${data.areaHa} hectareas</div>
        </div>
        <div class="field">
          <div class="field-label">Fecha Certificacion</div>
          <div class="field-value">${now}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Metricas Ambientales</div>
      <div class="grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="metric-box">
          <div class="metric-value">${data.analysis.ndvi.mean.toFixed(2)}</div>
          <div class="metric-label">NDVI Promedio</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${data.analysis.deforestation.deforestationPercent.toFixed(1)}%</div>
          <div class="metric-label">Deforestacion</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${data.analysis.carbon.baselineCarbonTCO2e.toLocaleString()}</div>
          <div class="metric-label">tCO2e Baseline</div>
        </div>
        <div class="metric-box">
          <div class="metric-value">${data.analysis.carbon.agbTonnesPerHa}</div>
          <div class="metric-label">AGB t/ha</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Validacion EUDR</div>
      <div class="grid">
        <div class="field">
          <div class="field-label">Periodo Analizado</div>
          <div class="field-value">${data.analysis.deforestation.analyzedPeriod.startDate} - ${data.analysis.deforestation.analyzedPeriod.endDate}</div>
        </div>
        <div class="field">
          <div class="field-label">Metodologia</div>
          <div class="field-value">${data.analysis.deforestation.methodology}</div>
        </div>
        <div class="field">
          <div class="field-label">Estado Cumplimiento</div>
          <div class="field-value" style="color: ${eudrColor}">${eudrStatus}</div>
        </div>
        <div class="field">
          <div class="field-label">Metodologia Carbono</div>
          <div class="field-value">${data.analysis.carbon.verraMethodology}</div>
        </div>
      </div>
    </div>

    ${data.nft ? `
    <div class="section" style="border-left-color: #8b5cf6;">
      <div class="section-title" style="color: #8b5cf6;">NFT Digital Twin - Cardano</div>
      <div class="field">
        <div class="field-label">Token ID</div>
        <div class="field-value">${data.nft.tokenId}</div>
      </div>
      <div class="blockchain-hash">
        TX Hash: ${data.nft.txHash}<br/>
        IPFS: ${data.nft.ipfsHash}
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <div class="qr-placeholder">QR Code</div>
      <div class="footer-text">
        Este certificado fue generado automaticamente por la plataforma NUWA.<br/>
        Verificable en blockchain Cardano. Datos satelitales: Sentinel-2 via Google Earth Engine.<br/>
        Documento ID: NUWA-CERT-${data.farmId}-${Date.now()}
      </div>
    </div>
  </div>
</body>
</html>
`
}

export async function downloadCertificatePDF(data: CertificateData): Promise<void> {
  const html = generateCertificateHTML(data)

  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('No se pudo abrir la ventana de impresion')
  }

  printWindow.document.write(html)
  printWindow.document.close()

  // Wait for content to load then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }
}

export function downloadCertificateHTML(data: CertificateData): void {
  const html = generateCertificateHTML(data)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `certificado-nuwa-${data.farmId}-${Date.now()}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
