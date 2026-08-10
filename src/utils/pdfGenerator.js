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

  // Document Title (Top Right) – Badge "TIMESHEET"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(120, 80, 0);
  const badgeText = 'TIMESHEET';
  const badgeWidth = doc.getTextWidth(badgeText) + 6;
  const badgeX = rightX - badgeWidth;
  doc.setFillColor(255, 247, 220);
  doc.setDrawColor(200, 170, 70);
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
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(200, 215, 230);
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
    doc.setTextColor(15, 23, 42);
    doc.text('Pagamento via PIX ou Boleto (Asaas)', payInfoX + textOffset, boxesTopY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Escaneie o QR Code ao lado para pagar via PIX.', payInfoX + textOffset, boxesTopY + 12);
    doc.text(`Vencimento: ${dueDateStr}`, payInfoX + textOffset, boxesTopY + 17);

    if (asaasBilling.invoiceUrl) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 58, 138);
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
