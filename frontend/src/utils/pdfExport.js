import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from './calculations';
import { format } from 'date-fns';

export async function exportLoanPDF(loan, payments, computed) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // ── Background ──────────────────────────────────────────────────────────────
  doc.setFillColor(2, 4, 8);
  doc.rect(0, 0, pageW, 297, 'F');

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(0, 229, 255);
  doc.rect(0, 0, pageW, 18, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(2, 4, 8);
  doc.text('VAULTLEDGER', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Loan Statement Report', pageW - 14, 12, { align: 'right' });

  // ── Meta row ────────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 14, 26);
  doc.text(`Ref: #${String(loan._id || '').slice(-8).toUpperCase() || 'N/A'}`, pageW - 14, 26, { align: 'right' });

  // ── Borrower card ───────────────────────────────────────────────────────────
  doc.setFillColor(10, 22, 40);
  doc.roundedRect(14, 31, pageW - 28, 32, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(0, 229, 255);
  doc.text(loan.borrowerName, 20, 43);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 180, 180);

  let contactY = 51;
  if (loan.borrowerPhone) {
    doc.text(`Phone: ${loan.borrowerPhone}`, 20, contactY);
    contactY += 6;
  }
  if (loan.borrowerAddress) {
    doc.text(`Address: ${loan.borrowerAddress}`, 20, contactY);
  }

  // ── Status badge ────────────────────────────────────────────────────────────
  const statusColors = {
    active:   [0, 230, 118],
    closed:   [120, 120, 120],
    paused:   [255, 187, 51],
    defaulted:[255, 77, 109],
  };
  const sc = statusColors[loan.status] || [120, 120, 120];
  doc.setFillColor(...sc);
  doc.roundedRect(pageW - 52, 36, 34, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 4, 8);
  doc.text((loan.status || 'ACTIVE').toUpperCase(), pageW - 35, 42.5, { align: 'center' });

  // ── Loan parameters table ───────────────────────────────────────────────────
  doc.autoTable({
    startY: 69,
    head: [['Loan Parameter', 'Value']],
    body: [
      ['Principal Amount',    formatCurrency(loan.principal)],
      ['Interest Rate',       `${loan.interestRate}% per annum`],
      ['Interest Type',       loan.interestType === 'SI'
        ? 'Simple Interest'
        : `Compound Interest (${loan.compoundingFrequency || 'monthly'})`],
      ['Start Date',          format(new Date(loan.startDate), 'dd MMM yyyy')],
      ['EMI',                 loan.emiEnabled
        ? `${formatCurrency(loan.emiAmount)} / month`
        : 'Not Applicable'],
      ['Tenure',              loan.tenure ? `${loan.tenure} months` : 'Not Applicable'],
      ['Penalty',             loan.penaltyEnabled
        ? `${loan.penaltyRate}% (${loan.penaltyType})`
        : 'None'],
    ],
    styles: {
      fillColor:   [6, 13, 21],
      textColor:   [210, 210, 210],
      fontSize:    9,
      font:        'helvetica',
      cellPadding: 4,
    },
    headStyles: {
      fillColor:  [15, 32, 64],
      textColor:  [0, 229, 255],
      fontStyle:  'bold',
      fontSize:   9,
    },
    alternateRowStyles: { fillColor: [10, 22, 40] },
    columnStyles: { 1: { textColor: [255, 255, 255], fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
    tableLineColor: [25, 45, 75],
    tableLineWidth: 0.1,
  });

  // ── Financial summary cards ──────────────────────────────────────────────────
  const summaryY = doc.lastAutoTable.finalY + 10;
  const summaryItems = [
    { label: 'Principal',        value: formatCurrency(loan.principal),             color: [0, 229, 255]  },
    { label: 'Interest Earned',  value: formatCurrency(computed?.interest || 0),    color: [255, 187, 51] },
    { label: 'Total Amount Due', value: formatCurrency(computed?.totalAmount || 0), color: [0, 229, 255]  },
    { label: 'Total Recovered',  value: formatCurrency(computed?.totalPaid || 0),   color: [0, 230, 118]  },
    { label: 'Remaining Balance',value: formatCurrency(computed?.remaining || 0),   color: [255, 77, 109] },
    { label: 'Recovery %',       value: `${(computed?.recoveryPercent || 0).toFixed(1)}%`, color: [180, 180, 180] },
  ];

  const colW  = (pageW - 28) / 3;
  const rowH  = 20;
  summaryItems.forEach((item, i) => {
    const x = 14 + (i % 3) * colW;
    const y = summaryY + Math.floor(i / 3) * (rowH + 3);
    doc.setFillColor(10, 22, 40);
    doc.roundedRect(x, y, colW - 3, rowH, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(item.label.toUpperCase(), x + 4, y + 6.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...item.color);
    doc.text(item.value, x + 4, y + 15);
  });

  // ── Notes ───────────────────────────────────────────────────────────────────
  if (loan.notes) {
    const notesY = summaryY + Math.ceil(summaryItems.length / 3) * (rowH + 3) + 6;
    doc.setFillColor(10, 22, 40);
    doc.roundedRect(14, notesY, pageW - 28, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('NOTES', 18, notesY + 5.5);
    doc.setTextColor(180, 180, 180);
    doc.text(loan.notes.slice(0, 100), 18, notesY + 11);
  }

  // ── Payment history ──────────────────────────────────────────────────────────
  if (payments && payments.length > 0) {
    const payHeaderY = doc.lastAutoTable
      ? doc.lastAutoTable.finalY + (loan.notes ? 30 : 10)
      : summaryY + Math.ceil(summaryItems.length / 3) * (rowH + 3) + 20;

    // Section heading
    const phY = summaryY + Math.ceil(summaryItems.length / 3) * (rowH + 3) + (loan.notes ? 28 : 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 229, 255);
    doc.text('Payment History', 14, phY);

    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

    doc.autoTable({
      startY: phY + 4,
      head: [['#', 'Date', 'Amount', 'Type', 'Note']],
      body: payments.map((p, i) => [
        i + 1,
        format(new Date(p.paymentDate), 'dd MMM yyyy'),
        formatCurrency(p.amount),
        p.type.replace('_', ' ').toUpperCase(),
        p.note || '—',
      ]),
      foot: [['', 'Total Paid', formatCurrency(totalPaid), '', '']],
      styles: {
        fillColor:   [6, 13, 21],
        textColor:   [200, 200, 200],
        fontSize:    8.5,
        font:        'helvetica',
        cellPadding: 3.5,
      },
      headStyles: {
        fillColor:  [15, 32, 64],
        textColor:  [0, 229, 255],
        fontStyle:  'bold',
      },
      footStyles: {
        fillColor:  [10, 22, 40],
        textColor:  [0, 230, 118],
        fontStyle:  'bold',
      },
      alternateRowStyles: { fillColor: [10, 22, 40] },
      columnStyles: {
        0: { cellWidth: 10 },
        2: { textColor: [0, 230, 118], fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
      tableLineColor: [25, 45, 75],
      tableLineWidth: 0.1,
    });
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fY = doc.internal.pageSize.getHeight() - 12;
    doc.setFillColor(0, 229, 255);
    doc.rect(0, fY - 1, pageW, 0.4, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text('VaultLedger — Private Loan Management System', 14, fY + 5);
    doc.text(`Page ${i} of ${totalPages}  |  Confidential`, pageW - 14, fY + 5, { align: 'right' });
  }

  doc.save(`loan-${loan.borrowerName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
