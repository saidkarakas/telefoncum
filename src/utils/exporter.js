// Export Utility for Phone Management System

export const exportToCSV = (data, headers, filename = 'export.csv') => {
  if (!data || !data.length) return;

  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = row.map(val => {
      if (val === null || val === undefined) return '';
      // Escape double quotes and wrap in quotes if there are commas or quotes
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\n'); // Add UTF-8 BOM for Turkish character support in Excel
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = (data, headers, filename = 'export.xls') => {
  if (!data || !data.length) return;

  let htmlTable = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="content-type" content="text/html; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Sayfa1</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        th { background-color: #4CAF50; color: white; font-weight: bold; }
        td, th { border: 0.5pt solid #ddd; padding: 5px; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
  `;

  // Headers
  headers.forEach(h => {
    htmlTable += `<th>${h}</th>`;
  });
  htmlTable += `</tr></thead><tbody>`;

  // Data rows
  data.forEach(row => {
    htmlTable += '<tr>';
    row.forEach(val => {
      const displayVal = val === null || val === undefined ? '' : val;
      htmlTable += `<td>${displayVal}</td>`;
    });
    htmlTable += '</tr>';
  });

  htmlTable += `</tbody></table></body></html>`;

  const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const printDataList = (title, headers, rows) => {
  const printWindow = window.open('', '_blank');
  
  let tableHeadersHtml = headers.map(h => `<th>${h}</th>`).join('');
  let tableRowsHtml = rows.map(row => {
    return `<tr>${row.map(val => `<td>${val === null || val === undefined ? '' : val}</td>`).join('')}</tr>`;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; background: white; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
          .business-title { font-size: 20px; font-weight: 700; color: #0f172a; }
          .print-title { font-size: 16px; font-weight: 600; color: #475569; }
          .date { font-size: 12px; color: #94a3b8; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #f1f5f9; color: #334155; font-weight: 600; font-size: 12px; border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 10px 8px; font-size: 12px; color: #334155; }
          tr:nth-child(even) { background-color: #f8fafc; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="business-title">${localStorage.getItem('tys_settings') ? JSON.parse(localStorage.getItem('tys_settings')).businessName : 'Telefon Yönetim Sistemi'}</div>
            <div class="print-title">${title}</div>
          </div>
          <div class="date">Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>
        </div>
        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const printCariEkstre = (contactName, contactType, balanceSummary, transactions, headers, rows) => {
  const printWindow = window.open('', '_blank');
  
  let tableHeadersHtml = headers.map(h => `<th>${h}</th>`).join('');
  let tableRowsHtml = rows.map(row => {
    return `<tr>${row.map(val => `<td>${val === null || val === undefined ? '' : val}</td>`).join('')}</tr>`;
  }).join('');

  const typeText = contactType === 'customer' ? 'Müşteri Cari Ekstresi' : 'Tedarikçi Cari Ekstresi';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cari Ekstre - ${contactName}</title>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; background: white; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
          .business-title { font-size: 20px; font-weight: 700; color: #0f172a; }
          .print-title { font-size: 16px; font-weight: 600; color: #475569; }
          .date { font-size: 12px; color: #94a3b8; }
          
          .info-block { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
          .contact-details { border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; }
          .contact-details h3 { margin: 0 0 8px 0; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .contact-details p { margin: 4px 0; font-size: 13px; }
          
          .balance-summary { border: 1px solid #cbd5e1; padding: 15px; border-radius: 6px; background-color: #f8fafc; display: flex; flex-direction: column; justify-content: center; }
          .balance-summary .label { font-size: 12px; color: #64748b; }
          .balance-summary .value { font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 4px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #f1f5f9; color: #334155; font-weight: 600; font-size: 12px; border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 10px 8px; font-size: 12px; color: #334155; }
          tr:nth-child(even) { background-color: #f8fafc; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="business-title">${localStorage.getItem('tys_settings') ? JSON.parse(localStorage.getItem('tys_settings')).businessName : 'Telefon Yönetim Sistemi'}</div>
            <div class="print-title">${typeText}</div>
          </div>
          <div class="date">Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>
        </div>
        
        <div class="info-block">
          <div class="contact-details">
            <h3>Cari Bilgileri</h3>
            <p><strong>Ad Soyad / Ünvan:</strong> ${contactName}</p>
            <p><strong>Telefon:</strong> ${balanceSummary.phone || '-'}</p>
            <p><strong>Adres:</strong> ${balanceSummary.address || '-'}</p>
          </div>
          <div class="balance-summary">
            <span class="label">Güncel Hesap Durumu</span>
            <span class="value" style="color: ${balanceSummary.balance > 0 ? '#ef4444' : balanceSummary.balance < 0 ? '#22c55e' : '#64748b'}">
              ${Math.abs(balanceSummary.balance).toLocaleString('tr-TR')} TL 
              ${balanceSummary.balance > 0 ? '(Borçlu / Alacaklıyız)' : balanceSummary.balance < 0 ? '(Alacaklı / Borçluyuz)' : '(Dengede)'}
            </span>
            <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 11px; color: #475569;">
              <span><strong>Top. Alış/Satış:</strong> ${Number(balanceSummary.totalSales || balanceSummary.totalPurchases || 0).toLocaleString('tr-TR')} TL</span>
              <span><strong>Kalan Bakiye:</strong> ${Math.abs(balanceSummary.balance).toLocaleString('tr-TR')} TL</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
