import { formatDate, formatRupiah } from './format';

// Font bawaan PDF tidak mengenal spasi khusus (non-breaking space) dari Intl -> ganti spasi biasa
const clean = (text) => String(text).replace(/ | /g, ' ');

function describe(trx) {
  if (trx.type === 'TOPUP') return 'Top-up saldo';
  return trx.direction === 'IN' ? `Transfer dari ${trx.sender}` : `Transfer ke ${trx.receiver}`;
}

// Membuat & mengunduh file PDF mutasi rekening.
// Library PDF di-import saat tombol diklik saja (dynamic import),
// supaya halaman lain tidak ikut berat.
export async function downloadMutasiPdf({ user, transactions, periodLabel, typeLabel, totals }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // ----- Kop -----
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Mini Wallet', 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Laporan Mutasi Rekening', 14, 20);

  // ----- Info pemilik & periode -----
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10);
  const info = [
    ['Nama', user.username],
    ['Email', user.email],
    ['No. HP', user.phone],
    ['Periode', periodLabel],
    ['Jenis', typeLabel],
    ['Dicetak', clean(formatDate(new Date()))],
  ];
  info.forEach(([label, value], i) => {
    doc.text(label, 14, 38 + i * 6);
    doc.text(`: ${value}`, 40, 38 + i * 6);
  });

  // ----- Ringkasan -----
  const summaryY = 38 + info.length * 6 + 4;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Masuk  : ${clean(formatRupiah(totals.in))}`, 14, summaryY);
  doc.text(`Total Keluar : ${clean(formatRupiah(totals.out))}`, 14, summaryY + 6);
  doc.text(`Jumlah Transaksi : ${transactions.length}`, 110, summaryY);

  // ----- Tabel -----
  autoTable(doc, {
    startY: summaryY + 12,
    head: [['No', 'Waktu', 'Keterangan', 'Catatan', 'Masuk', 'Keluar']],
    body: transactions.map((trx, i) => [
      i + 1,
      clean(formatDate(trx.created_at)),
      describe(trx),
      trx.type === 'TRANSFER' ? trx.description || '-' : '-',
      trx.direction === 'IN' ? clean(formatRupiah(trx.amount)) : '',
      trx.direction === 'OUT' ? clean(formatRupiah(trx.amount)) : '',
    ]),
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 118, 110] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      4: { halign: 'right', textColor: [21, 128, 61] },
      5: { halign: 'right', textColor: [220, 38, 38] },
    },
    // Nomor halaman di setiap halaman
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Halaman ${doc.getNumberOfPages()}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  doc.save(`mutasi-${user.username}-${today}.pdf`);
}
