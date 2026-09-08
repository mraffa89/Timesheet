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

  // Period Name (large)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text((periodLabel || 'MÊS ATUAL').toUpperCase(), rightX, 25, { align: 'right' });

  // Dates: Emissão | Referência
  const todayStr = new Date().toLocaleDateString('pt-BR');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Emissão: ${todayStr}  |  Ref: ${periodLabel || 'Período'}`, rightX, 30, { align: 'right' });

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
  const targetRate = freelancer?.hourlyRate ? formatCurrency(freelancer.hourlyRate) + '/h' : 'Valor sob demanda';

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

  // Right Column
  doc.text(`Chave PIX: ${targetPix}`, rightX - 5, prestadorTopY + 12, { align: 'right' });
  doc.text(`Valor da Hora Técnica: ${targetRate}`, rightX - 5, prestadorTopY + 17, { align: 'right' });
  doc.text(`Total de Demandas: ${tasks.length}`, rightX - 5, prestadorTopY + 21.5, { align: 'right' });

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
          formatDate(t.requestDate),
          formatDate(t.actualDeliveryDate),
          `${h.toFixed(1).replace('.', ',')}h`,
          fRate > 0 ? formatCurrency(subtotal) : '-',
          statusLabel
        ];
      });

  const totalHoursStr = `${totalHours.toFixed(1).replace('.', ',')}h`;
  const totalAmountStr = fRate > 0 ? formatCurrency(totalAmount) : '-';

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    head: [['Demanda / Atividade', 'Cliente', 'Categoria', 'Solicitado', 'Entregue', 'Horas', 'Subtotal', 'Status']],
    body: tableRows,
    foot: [['Total de Horas Realizadas:', '', '', '', '', totalHoursStr, totalAmountStr, '']],
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
      0: { cellWidth: 44, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'left' },
      2: { cellWidth: 24, halign: 'left' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }
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
      fontSize: 8,
      cellPadding: 3.2
    },
    didParseCell: function (data) {
      if (data.section === 'foot') {
        if (data.column.index === 0) {
          data.cell.colSpan = 5;
          data.cell.styles.halign = 'right';
        }
      }
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
  const summaryBoxHeight = allPaid ? 36 : 32;
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

  // Right Box: Totais
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

  if (freelancer?.hourlyRate > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Valor da Hora:', summaryBoxX + 4, boxesTopY + 15);
    doc.text(`${formatCurrency(freelancer.hourlyRate)}/h`, summaryBoxX + summaryBoxWidth - 4, boxesTopY + 15, { align: 'right' });
  }

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.3);
  doc.line(summaryBoxX + 4, boxesTopY + 20, summaryBoxX + summaryBoxWidth - 4, boxesTopY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  doc.text(allPaid ? 'Total Quitado:' : 'Total a Pagar:', summaryBoxX + 4, boxesTopY + 27);
  doc.setFontSize(11.5);
  doc.text(formatCurrency(totalAmount), summaryBoxX + summaryBoxWidth - 4, boxesTopY + 27, { align: 'right' });

  // ═══════ SEÇÃO 5: FOOTER WATERMARK ═══════
  const footerY = 284;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(marginX, footerY, rightX, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(`${company.brandName || 'Matheus Raffa'} | ${company.brandSubtitle || 'Inteligência Digital'} | ${company.website || 'matheusraffa.com.br'}`, marginX, footerY + 5);
  doc.text(`${company.email || 'contato@matheusraffa.com.br'} | ${company.phone || ''}`, rightX, footerY + 5, { align: 'right' });

  return doc;
}
