import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCpfCnpj, formatPhone } from './cnpjLookup';

// Helper to convert images to grayscale Data URL
async function loadGrayscaleImage(src) {
  if (typeof window === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = avg;
          data[i + 1] = avg;
          data[i + 2] = avg;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

/**
 * Generates a 100% vector, monochrome, professional A4 PDF document
 * that mirrors the on-screen InvoiceView layout exactly:
 *   SEÇÃO 1 – Header (Empresa + Metadados)
 *   SEÇÃO 2 – Tomador / Cliente
 *   SEÇÃO 3 – Tabela de Serviços
 *   SEÇÃO 4 – Resumo Financeiro (boxes lado a lado)
 *   SEÇÃO 5 – Footer / Watermark
 */
export async function generateInvoicePdf({
  client,
  clientEntries = [],
  financials = {},
  selectedMonth = '',
  company = {},
  asaasBilling = null,
  issueDateStr = '',
  dueDateStr = '',
  monthName = ''
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2; // 180mm
  const rightX = marginX + contentWidth;

  // ═══════ SEÇÃO 1: HEADER ═══════
  // Logo (Grayscale)
  const logoData = await loadGrayscaleImage('/logo.png');
  let companyStartX = marginX;
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', marginX, 15, 17, 17);
      companyStartX = marginX + 21;
    } catch (e) {}
  }

  // Company Name & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(20, 20, 20);
  doc.text((company.brandName || 'Matheus Raffa').toUpperCase(), companyStartX, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`› ${(company.brandSubtitle || 'Inteligência Digital').toUpperCase()}`, companyStartX, 23.5);

  // Company Legal Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(company.legalName || 'MHB Raffa Design Estratégico LTDA', companyStartX, 28);
  doc.text(`CNPJ: ${formatCpfCnpj(company.cnpj || '')}  |  ${company.email || ''}`, companyStartX, 32);
  if (company.phone) {
    doc.text(`${company.phone}  |  ${company.city || ''}`, companyStartX, 36);
  }

  // Document Title (Top Right) – Badge "TIMESHEET" (100% Preto e Branco / Monocromático)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(50, 50, 50);
  const badgeText = 'TIMESHEET';
  const badgeWidth = doc.getTextWidth(badgeText) + 6;
  const badgeX = rightX - badgeWidth;
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, 14, badgeWidth, 5.5, 1, 1, 'FD');
  doc.text(badgeText, badgeX + 3, 17.8);

  // Period Name (large)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text((monthName || '').toUpperCase(), rightX, 25, { align: 'right' });

  // Dates: Emissão | Vencimento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Emissão: ${issueDateStr}  |  Vencimento: ${dueDateStr}`, rightX, 30, { align: 'right' });

  // Divider Line (matching on-screen border-b-2)
  const topDividerY = 40;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.5);
  doc.line(marginX, topDividerY, rightX, topDividerY);

  // ═══════ SEÇÃO 2: TOMADOR / CLIENTE ═══════
  const clientBoxY = 44;
  const clientBoxHeight = client?.address ? 28 : 24;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, clientBoxY, contentWidth, clientBoxHeight, 2, 2, 'FD');

  // Section Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('› TOMADOR DOS SERVIÇOS / CLIENTE', marginX + 5, clientBoxY + 5.5);

  // Client Name (prominent)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 15, 15);
  doc.text(client.name || 'Cliente', marginX + 5, clientBoxY + 12);

  // CNPJ & Address (Left Column)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  const formattedCnpj = formatCpfCnpj(client.cnpj || client.cpfCnpj || '');
  const formattedPhone = formatPhone(client.phone || '');
  doc.text(`CNPJ / CPF: ${formattedCnpj || 'Não informado'}`, marginX + 5, clientBoxY + 17);
  if (client.address) {
    const truncatedAddress = client.address.length > 75 ? client.address.substring(0, 72) + '...' : client.address;
    doc.text(`Endereço: ${truncatedAddress}`, marginX + 5, clientBoxY + 21.5);
  }

  // Email & Phone (Right Column)
  doc.text(`E-mail: ${client.email || 'Não informado'}`, rightX - 5, clientBoxY + 12, { align: 'right' });
  doc.text(`Telefone: ${formattedPhone || 'Não informado'}`, rightX - 5, clientBoxY + 17, { align: 'right' });

  // ═══════ SEÇÃO 3: TABELA DE SERVIÇOS ═══════
  const tableStartY = clientBoxY + clientBoxHeight + 8;

  // Section Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('› DETALHAMENTO DOS SERVIÇOS PRESTADOS', marginX, tableStartY - 2);

  // Entry count (right-aligned)
  const entryCountText = `${clientEntries.length} demanda${clientEntries.length === 1 ? ' faturável' : 's faturáveis'}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(entryCountText, rightX, tableStartY - 2, { align: 'right' });

  const tableRows = clientEntries.length === 0
    ? [['-', 'Nenhum lançamento faturável registrado neste período.', '0,00h']]
    : clientEntries.map(e => [
        formatDate(e.deliveryDate || e.requestDate),
        e.description || '',
        `${Number(e.hours || 0).toFixed(2).replace('.', ',')}h`
      ]);

  const billableHoursStr = `${Number(financials.billableHours || 0).toFixed(2).replace('.', ',')}h`;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    head: [['Data', 'Demanda / Atividade', 'Horas']],
    body: tableRows,
    foot: [['Total de Horas Técnicas:', '', billableHoursStr]],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3.2,
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'left', fontStyle: 'normal' },
      1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: 2.8
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248]
    },
    footStyles: {
      fillColor: [242, 242, 242],
      textColor: [20, 20, 20],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3.2
    },
    didParseCell: function (data) {
      if (data.section === 'foot') {
        if (data.column.index === 0) {
          data.cell.colSpan = 2;
          data.cell.styles.halign = 'right';
        }
      }
    }
  });

  const finalY = doc.lastAutoTable.finalY || 160;

  // ═══════ SEÇÃO 4: RESUMO FINANCEIRO ═══════
  const summaryTopY = finalY + 7;

  // Divider line (matching on-screen border-t-2)
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.5);
  doc.line(marginX, summaryTopY, rightX, summaryTopY);

  const sectionLabelY = summaryTopY + 7;

  // Section Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('› RESUMO FINANCEIRO', marginX, sectionLabelY);

  const boxesTopY = sectionLabelY + 4;
  const summaryBoxWidth = 68;
  const summaryBoxHeight = 32;
  const summaryBoxX = rightX - summaryBoxWidth;
  const payBoxWidth = summaryBoxX - marginX - 6;

  // Left Payment Info Box
  const payInfoX = marginX;

  if (asaasBilling) {
    // 100% Preto e Branco / Monocromático (sem azul)
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(payInfoX, boxesTopY, payBoxWidth, summaryBoxHeight, 2, 2, 'FD');

    let qrRendered = false;
    const qrSize = 27;
    if (asaasBilling.qrCodeImage) {
      try {
        doc.addImage(asaasBilling.qrCodeImage, 'PNG', payInfoX + 2.5, boxesTopY + 2.5, qrSize, qrSize);
        qrRendered = true;
      } catch (e) {}
    }

    const textOffset = qrRendered ? qrSize + 5.5 : 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    doc.text('Pagamento via PIX ou Boleto (Asaas)', payInfoX + textOffset, boxesTopY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text('Escaneie o QR Code ao lado para pagar via PIX.', payInfoX + textOffset, boxesTopY + 12);
    doc.text(`Vencimento: ${dueDateStr}`, payInfoX + textOffset, boxesTopY + 17);

    if (asaasBilling.invoiceUrl) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 30, 30);
      const shortUrl = asaasBilling.invoiceUrl.length > 42 ? asaasBilling.invoiceUrl.substring(0, 40) + '...' : asaasBilling.invoiceUrl;
      doc.textWithLink(`Fatura Online: ${shortUrl}`, payInfoX + textOffset, boxesTopY + 23, { url: asaasBilling.invoiceUrl });
    }
  } else {
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(payInfoX, boxesTopY, payBoxWidth, summaryBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    doc.text('Faturamento via link de cobrança digital', payInfoX + 4, boxesTopY + 8);
    doc.text('(Asaas / PIX / Boleto bancário).', payInfoX + 4, boxesTopY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(`Vencimento: ${dueDateStr}`, payInfoX + 4, boxesTopY + 21);
  }

  // Right Financial Box
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(summaryBoxX, boxesTopY, summaryBoxWidth, summaryBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Total de Horas Técnicas:', summaryBoxX + 4, boxesTopY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(billableHoursStr, summaryBoxX + summaryBoxWidth - 4, boxesTopY + 8, { align: 'right' });

  if (financials.hourlyRate > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Valor por Hora:', summaryBoxX + 4, boxesTopY + 15);
    doc.text(`${formatCurrency(financials.hourlyRate)}/h`, summaryBoxX + summaryBoxWidth - 4, boxesTopY + 15, { align: 'right' });
  }

  // Box Divider Line
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(summaryBoxX + 4, boxesTopY + 20, summaryBoxX + summaryBoxWidth - 4, boxesTopY + 20);

  // Total Amount
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text('Valor Total:', summaryBoxX + 4, boxesTopY + 27);
  doc.setFontSize(11.5);
  doc.text(formatCurrency(financials.totalAmount), summaryBoxX + summaryBoxWidth - 4, boxesTopY + 27, { align: 'right' });

  // ═══════ SEÇÃO 5: FOOTER WATERMARK ═══════
  const footerY = 284;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(marginX, footerY, rightX, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(`${company.brandName} | ${company.brandSubtitle} | ${company.website}`, marginX, footerY + 5);
  doc.text(`${company.email} | ${company.phone}`, rightX, footerY + 5, { align: 'right' });

  return doc;
}

/**
 * Generates a corporate, monochrome, professional A4 PDF for Freelancer Payroll / Fechamento
 * with the exact same visual structure, company header, table and footer watermark
 */
export async function generatePayrollPdf({
  freelancer = null,
  tasks = [],
  totalHours = 0,
  totalAmount = 0,
  periodLabel = '',
  company = {},
  getClientName = (id) => id,
  isPaid = false,
  paymentIds = [],
  paymentDates = [],
  paymentReceiptUrls = []
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const marginX = 15;
  const contentWidth = pageWidth - marginX * 2; // 180mm
  const rightX = marginX + contentWidth;

  // Analisa se todas as tarefas estão quitadas / pagas
  const allPaid = isPaid || (tasks.length > 0 && tasks.every(t => t.status === 'paid'));
  const hasAnyPaid = allPaid || tasks.some(t => t.status === 'paid');

  const collectedPaymentIds = paymentIds.length > 0 
    ? paymentIds 
    : Array.from(new Set(tasks.map(t => t.paymentId).filter(Boolean)));

  const collectedPaymentDates = paymentDates.length > 0 
    ? paymentDates 
    : Array.from(new Set(tasks.map(t => t.paymentDate).filter(Boolean)));

  const collectedReceiptUrls = paymentReceiptUrls.length > 0 
    ? paymentReceiptUrls 
    : Array.from(new Set(tasks.map(t => t.paymentReceiptUrl).filter(Boolean)));

  // ═══════ SEÇÃO 1: HEADER (EMPRESA + LOGO + METADADOS) ═══════
  const logoData = await loadGrayscaleImage('/logo.png');
  let companyStartX = marginX;
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', marginX, 15, 17, 17);
      companyStartX = marginX + 21;
    } catch (e) {}
  }

  // Company Name & Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(20, 20, 20);
  doc.text((company.brandName || 'Matheus Raffa').toUpperCase(), companyStartX, 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`› ${(company.brandSubtitle || 'Inteligência Digital').toUpperCase()}`, companyStartX, 23.5);

  // Company Legal Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(company.legalName || 'MHB Raffa Design Estratégico LTDA', companyStartX, 28);
  doc.text(`CNPJ: ${formatCpfCnpj(company.cnpj || '')}  |  ${company.email || ''}`, companyStartX, 32);
  if (company.phone) {
    doc.text(`${company.phone}  |  ${company.city || ''}`, companyStartX, 36);
  }

  // Document Title (Top Right) – Badge "FECHAMENTO PRESTADOR" ou "FECHAMENTO QUITADO (PIX)"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const badgeText = allPaid ? 'FECHAMENTO QUITADO (PIX)' : 'FECHAMENTO PRESTADOR';
  const badgeWidth = doc.getTextWidth(badgeText) + 6;
  const badgeX = rightX - badgeWidth;

  if (allPaid) {
    doc.setFillColor(30, 30, 30);
    doc.setTextColor(255, 255, 255);
    doc.setDrawColor(30, 30, 30);
  } else {
    doc.setFillColor(245, 245, 245);
    doc.setTextColor(50, 50, 50);
    doc.setDrawColor(200, 200, 200);
  }
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, 14, badgeWidth, 5.5, 1, 1, 'FD');
  doc.text(badgeText, badgeX + 3, 17.8);

  // Sanitiza o periodLabel para exibir apenas o Mês/Ano (ex: "Agosto de 2026"), removendo prefixos como "Mês Anterior (...)"
  const cleanPeriod = (periodLabel || 'Mês Atual')
    .replace(/^Mês (?:Anterior|Atual)\s*\((.*?)\)$/i, '$1')
    .trim();

  // Period Name (large)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(cleanPeriod.toUpperCase(), rightX, 25, { align: 'right' });

  // Dates: Emissão | Referência
  const todayStr = new Date().toLocaleDateString('pt-BR');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Emissão: ${todayStr}  |  Ref: ${cleanPeriod}`, rightX, 30, { align: 'right' });

  // Divider Line at Y = 40 (exact match to generateInvoicePdf)
  const topDividerY = 40;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.5);
  doc.line(marginX, topDividerY, rightX, topDividerY);

  // ═══════ SEÇÃO 2: DADOS DO PRESTADOR DE SERVIÇO ═══════
  const prestadorTopY = 44;
  const prestadorBoxHeight = 26;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, prestadorTopY, contentWidth, prestadorBoxHeight, 2, 2, 'FD');

  const targetName = freelancer ? freelancer.name : 'Todos os Prestadores';
  const targetSpecialty = freelancer?.specialty || 'Prestador de Serviço';
  const targetPhone = freelancer?.phone ? formatPhone(freelancer.phone) : 'Não informado';
  const targetPix = freelancer?.pixKey || 'Não cadastrada';

  // Section Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('› DADOS DO PRESTADOR DE SERVIÇO', marginX + 5, prestadorTopY + 5.5);

  // Prestador Name (prominent)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 15, 15);
  doc.text(targetName, marginX + 5, prestadorTopY + 12);

  // Left Column
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Função / Especialidade: ${targetSpecialty}`, marginX + 5, prestadorTopY + 17);
  doc.text(`Telefone / WhatsApp: ${targetPhone}`, marginX + 5, prestadorTopY + 21.5);

  // Right Column (Sem valor da hora técnica)
  doc.text(`Chave PIX: ${targetPix}`, rightX - 5, prestadorTopY + 14, { align: 'right' });
  doc.text(`Total de Demandas: ${tasks.length}`, rightX - 5, prestadorTopY + 19.5, { align: 'right' });

  // ═══════ SEÇÃO 3: TABELA DE DEMANDAS / TAREFAS ═══════
  const tableStartY = prestadorTopY + prestadorBoxHeight + 8;

  // Section Label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('› DETALHAMENTO DOS SERVIÇOS PRESTADOS', marginX, tableStartY - 2);

  // Demand Count (right-aligned)
  const entryCountText = `${tasks.length} demanda${tasks.length === 1 ? '' : 's'}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(entryCountText, rightX, tableStartY - 2, { align: 'right' });

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '-';
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length !== 3) return dateStr;
    const yearShort = parts[0].slice(-2);
    return `${parts[2]}/${parts[1]}/${yearShort}`;
  };

  const fRate = freelancer ? (parseFloat(freelancer.hourlyRate) || 0) : 0;
  const tableRows = tasks.length === 0
    ? [['-', 'Nenhum serviço registrado neste período.', '-', '-', '-', '0,0h', '-', '-']]
    : tasks.map(t => {
        const cName = getClientName ? getClientName(t.clientId) : (t.clientId || '-');
        const h = parseFloat(t.hours) || 0;
        const subtotal = h * fRate;
        const statusLabel = t.status === 'paid' ? 'Pago' : t.status === 'delivered' ? 'Entregue' : t.status === 'in_progress' ? 'Andamento' : 'Pendente';

        return [
          t.title || 'Sem título',
          cName,
          t.category || 'Digital',
          formatShortDate(t.requestDate),
          formatShortDate(t.actualDeliveryDate),
          `${h.toFixed(1).replace('.', ',')}h`,
          fRate > 0 ? formatCurrency(subtotal) : '-',
          statusLabel
        ];
      });

  const totalHoursStr = `${(Number(totalHours) || 0).toFixed(1).replace('.', ',')}h`;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    head: [['Demanda / Atividade', 'Cliente', 'Categoria', 'Solicitado', 'Entregue', 'Horas', 'Subtotal', 'Status']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 40, halign: 'left', fontStyle: 'bold', cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 } },
      1: { cellWidth: 28, halign: 'left', cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 } },
      2: { cellWidth: 28, halign: 'left', fontSize: 7, cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 } },
      3: { cellWidth: 15, halign: 'center', cellPadding: { top: 2.5, bottom: 2.5, left: 0.5, right: 0.5 } },
      4: { cellWidth: 15, halign: 'center', cellPadding: { top: 2.5, bottom: 2.5, left: 0.5, right: 0.5 } },
      5: { cellWidth: 12, halign: 'right', fontStyle: 'bold', cellPadding: { top: 2.5, bottom: 2.5, left: 0.5, right: 1.5 } },
      6: { cellWidth: 30, halign: 'right', fontStyle: 'bold', cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 2 } },
      7: { cellWidth: 14, halign: 'center', fontStyle: 'bold', cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 } }
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 }
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248]
    }
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : tableStartY + 40;

  // ═══════ SEÇÃO 4: RESUMO FINANCEIRO (BOXES LADO A LADO) ═══════
  const summaryTopY = finalY + 7;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.5);
  doc.line(marginX, summaryTopY, rightX, summaryTopY);

  const sectionLabelY = summaryTopY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('› RESUMO FINANCEIRO DO FECHAMENTO', marginX, sectionLabelY);

  const boxesTopY = sectionLabelY + 4;
  const summaryBoxWidth = 72;
  const summaryBoxHeight = allPaid ? 36 : 28;
  const summaryBoxX = rightX - summaryBoxWidth;
  const payBoxWidth = summaryBoxX - marginX - 6;

  // Left Box: Dados PIX e Quitação
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, boxesTopY, payBoxWidth, summaryBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);

  if (allPaid) {
    doc.text('Comprovante de Quitação PIX (Asaas)', marginX + 4, boxesTopY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text(`Favorecido: ${targetName}`, marginX + 4, boxesTopY + 12.5);
    doc.text(`Chave PIX: ${targetPix}`, marginX + 4, boxesTopY + 17.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('Status: PAGO / TRANSFERÊNCIA CONCLUÍDA', marginX + 4, boxesTopY + 22.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    const pDate = collectedPaymentDates.length > 0 ? formatDate(collectedPaymentDates[0]) : todayStr;
    const pId = collectedPaymentIds.length > 0 ? collectedPaymentIds.join(', ') : 'Asaas PIX';
    doc.text(`Data Quitação: ${pDate}  |  ID Asaas: ${pId}`, marginX + 4, boxesTopY + 27.5);

    if (collectedReceiptUrls.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 30, 30);
      const shortUrl = collectedReceiptUrls[0].length > 45 ? collectedReceiptUrls[0].substring(0, 43) + '...' : collectedReceiptUrls[0];
      doc.textWithLink(`Comprovante Asaas Online: ${shortUrl}`, marginX + 4, boxesTopY + 32, { url: collectedReceiptUrls[0] });
    }
  } else {
    doc.text('Dados para Pagamento via PIX (Asaas)', marginX + 4, boxesTopY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text(`Favorecido: ${targetName}`, marginX + 4, boxesTopY + 13);
    doc.text(`Chave PIX: ${targetPix}`, marginX + 4, boxesTopY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(hasAnyPaid ? 'Status: PARCIALMENTE PAGO' : 'Status: Fechamento Aprovado para Transferência', marginX + 4, boxesTopY + 24);
  }

  // Right Box: Totais (Sem valor da hora técnica)
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.roundedRect(summaryBoxX, boxesTopY, summaryBoxWidth, summaryBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text('Total de Horas Realizadas:', summaryBoxX + 4, boxesTopY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(totalHoursStr, summaryBoxX + summaryBoxWidth - 4, boxesTopY + 8, { align: 'right' });

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(summaryBoxX + 4, boxesTopY + 14, summaryBoxX + summaryBoxWidth - 4, boxesTopY + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(allPaid ? 'Total Quitado:' : 'Total a Pagar:', summaryBoxX + 4, boxesTopY + 21);
  doc.setFontSize(11.5);
  doc.text(formatCurrency(totalAmount), summaryBoxX + summaryBoxWidth - 4, boxesTopY + 21, { align: 'right' });

  // ═══════ SEÇÃO 5: FOOTER WATERMARK ═══════
  const footerY = 284;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(marginX, footerY, rightX, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  const p1PageLabel = (allPaid || hasAnyPaid || collectedPaymentIds.length > 0) ? 'Página 1 de 2' : 'Página 1 de 1';
  doc.text(`${company.brandName || 'Matheus Raffa'} | ${company.brandSubtitle || 'Inteligência Digital'} | ${p1PageLabel}`, marginX, footerY + 5);
  doc.text(`${company.email || 'contato@matheusraffa.com.br'} | ${company.phone || ''}`, rightX, footerY + 5, { align: 'right' });

  // ═══════ PÁGINA 2: COMPROVANTE OFICIAL PIX ASAAS (SE QUITADO) ═══════
  if (allPaid || hasAnyPaid || collectedPaymentIds.length > 0) {
    doc.addPage();

    const p2MarginX = 14;
    const p2RightX = 196;
    const p2Width = p2RightX - p2MarginX;

    // Header da Página 2
    if (logoData) {
      doc.addImage(logoData, 'PNG', p2MarginX, 14, 20, 20);
    }
    const headerTextX = logoData ? p2MarginX + 24 : p2MarginX;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text('Comprovante de Transferência PIX', headerTextX, 21);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Asaas Gestão Financeira  |  Sistema de Pagamentos Instantâneos (SPI / Bacen)', headerTextX, 26.5);
    doc.text(`Via do Favorecido / Documento de Quitação Oficial`, headerTextX, 31);

    // Badge "PAGO VIA PIX"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setFillColor(30, 30, 30);
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(p2RightX - 44, 15, 44, 6, 1, 1, 'FD');
    doc.text('TRANSFERÊNCIA PIX CONCLUÍDA', p2RightX - 42.5, 19.2);

    // Linha divisória do header
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.4);
    doc.line(p2MarginX, 36, p2RightX, 36);

    // Card de Destaque: Valor da Transferência
    const valueBoxY = 41;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(p2MarginX, valueBoxY, p2Width, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text('Valor Quitado / Transferido', p2MarginX + 6, valueBoxY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(20, 20, 20);
    doc.text(formatCurrency(totalAmount), p2MarginX + 6, valueBoxY + 17);

    const pDateStr = collectedPaymentDates.length > 0 ? formatDate(collectedPaymentDates[0]) : todayStr;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Data da Efetivação: ${pDateStr}`, p2RightX - 6, valueBoxY + 10, { align: 'right' });
    doc.text(`Canal de Liquidação: API / Internet Banking Asaas`, p2RightX - 6, valueBoxY + 16, { align: 'right' });

    // Seção Origem (Pagador)
    let currentY = valueBoxY + 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text('› DADOS DO PAGADOR (ORIGEM)', p2MarginX, currentY);

    currentY += 4;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(p2MarginX, currentY, p2Width, 24, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Nome / Razão Social:', p2MarginX + 5, currentY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(company.legalName || company.brandName || 'MHB Raffa', p2MarginX + 42, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('CNPJ:', p2MarginX + 5, currentY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(company.cnpj || 'Não informado', p2MarginX + 42, currentY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Instituição Liquidante:', p2MarginX + 5, currentY + 19);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('ASAAS IP S.A. (ISPB: 27855692)', p2MarginX + 42, currentY + 19);

    // Seção Destino (Favorecido)
    currentY += 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text('› DADOS DO FAVORECIDO (DESTINO)', p2MarginX, currentY);

    currentY += 4;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(p2MarginX, currentY, p2Width, 24, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Nome do Favorecido:', p2MarginX + 5, currentY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(targetName, p2MarginX + 42, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Chave PIX:', p2MarginX + 5, currentY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(targetPix, p2MarginX + 42, currentY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Finalidade do Pagamento:', p2MarginX + 5, currentY + 19);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`Fechamento de Serviços Prestados (${tasks.length} demandas / ${totalHoursStr})`, p2MarginX + 42, currentY + 19);

    // Seção Protocolo / Autenticação da Transação
    currentY += 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text('› AUTENTICAÇÃO DA TRANSAÇÃO & PROTOCOLO PIX', p2MarginX, currentY);

    currentY += 4;
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(p2MarginX, currentY, p2Width, 34, 1.5, 1.5, 'FD');

    const pIdStr = collectedPaymentIds.length > 0 ? collectedPaymentIds.join(', ') : 'pix_' + Date.now();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('ID da Transferência Asaas:', p2MarginX + 5, currentY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);
    doc.text(pIdStr, p2MarginX + 5, currentY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Status no Sistema Financeiro:', p2MarginX + 5, currentY + 22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('LIQUIDADO / TRANSFERIDO VIA PIX', p2MarginX + 48, currentY + 22);

    if (collectedReceiptUrls.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(20, 20, 20);
      const shortUrl = collectedReceiptUrls[0].length > 60 ? collectedReceiptUrls[0].substring(0, 58) + '...' : collectedReceiptUrls[0];
      doc.textWithLink(`› Acessar Comprovante Digital Asaas Oficial (Online): ${shortUrl}`, p2MarginX + 5, currentY + 29, { url: collectedReceiptUrls[0] });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(110, 110, 110);
      doc.text('Autenticação gerada pelo sistema de liquidação instantânea via API Asaas.', p2MarginX + 5, currentY + 29);
    }

    // Rodapé da Página 2
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(p2MarginX, footerY, p2RightX, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`Comprovante emitido eletronicamente  •  Página 2 de 2`, p2MarginX, footerY + 5);
    doc.text(`${company.brandName || 'Matheus Raffa'} | ${company.phone || ''}`, p2RightX, footerY + 5, { align: 'right' });
  }

  return doc;
}
