import { escapeHtml } from './security';

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
      let escaped = ('' + val).replace(/"/g, '""');
      // Prevent CSV Injection
      if (/^[=+\-@\t\r]/.test(escaped)) {
        escaped = "'" + escaped;
      }
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
    htmlTable += `<th>${escapeHtml(h)}</th>`;
  });
  htmlTable += `</tr></thead><tbody>`;

  // Data rows
  data.forEach(row => {
    htmlTable += '<tr>';
    row.forEach(val => {
      const displayVal = val === null || val === undefined ? '' : val;
      // Prevent Formula Injection in Excel export as well
      let safeVal = String(displayVal);
      if (/^[=+\-@\t\r]/.test(safeVal)) {
        safeVal = "'" + safeVal;
      }
      htmlTable += `<td>${escapeHtml(safeVal)}</td>`;
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
  const doc = printWindow.document;
  
  doc.head.innerHTML = `
    <title>${escapeHtml(title)}</title>
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
  `;

  const headerDiv = doc.createElement('div');
  headerDiv.className = 'header';
  
  const leftDiv = doc.createElement('div');
  const busTitle = doc.createElement('div');
  busTitle.className = 'business-title';
  busTitle.textContent = localStorage.getItem('tys_settings') ? JSON.parse(localStorage.getItem('tys_settings')).businessName : 'Telefon Yönetim Sistemi';
  const pTitle = doc.createElement('div');
  pTitle.className = 'print-title';
  pTitle.textContent = title;
  leftDiv.appendChild(busTitle);
  leftDiv.appendChild(pTitle);

  const rightDiv = doc.createElement('div');
  rightDiv.className = 'date';
  rightDiv.textContent = 'Tarih: ' + new Date().toLocaleDateString('tr-TR');

  headerDiv.appendChild(leftDiv);
  headerDiv.appendChild(rightDiv);
  doc.body.appendChild(headerDiv);

  const table = doc.createElement('table');
  const thead = doc.createElement('thead');
  const htr = doc.createElement('tr');
  headers.forEach(h => {
    const th = doc.createElement('th');
    th.textContent = h;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = doc.createElement('tbody');
  rows.forEach(row => {
    const tr = doc.createElement('tr');
    row.forEach(val => {
      const td = doc.createElement('td');
      td.textContent = (val === null || val === undefined) ? '' : val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  doc.body.appendChild(table);

  printWindow.onload = function() {
    printWindow.print();
    setTimeout(function() { printWindow.close(); }, 500);
  };
};

export const printCariEkstre = (contactName, contactType, balanceSummary, transactions, headers, rows) => {
  const printWindow = window.open('', '_blank');
  const typeText = contactType === 'customer' ? 'Müşteri Cari Ekstresi' : 'Tedarikçi Cari Ekstresi';
  
  const doc = printWindow.document;
  doc.head.innerHTML = `
    <title>Cari Ekstre - ${escapeHtml(contactName)}</title>
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
  `;

  // Build Header
  const headerDiv = doc.createElement('div');
  headerDiv.className = 'header';
  const leftDiv = doc.createElement('div');
  const busTitle = doc.createElement('div');
  busTitle.className = 'business-title';
  busTitle.textContent = localStorage.getItem('tys_settings') ? JSON.parse(localStorage.getItem('tys_settings')).businessName : 'Telefon Yönetim Sistemi';
  const pTitle = doc.createElement('div');
  pTitle.className = 'print-title';
  pTitle.textContent = typeText;
  leftDiv.appendChild(busTitle);
  leftDiv.appendChild(pTitle);
  const rightDiv = doc.createElement('div');
  rightDiv.className = 'date';
  rightDiv.textContent = 'Tarih: ' + new Date().toLocaleDateString('tr-TR');
  headerDiv.appendChild(leftDiv);
  headerDiv.appendChild(rightDiv);
  doc.body.appendChild(headerDiv);

  // Build Info Block
  const infoBlock = doc.createElement('div');
  infoBlock.className = 'info-block';
  
  const contactDetails = doc.createElement('div');
  contactDetails.className = 'contact-details';
  contactDetails.innerHTML = '<h3>Cari Bilgileri</h3>';
  
  const pName = doc.createElement('p');
  pName.innerHTML = '<strong>Ad Soyad / Ünvan:</strong> ';
  pName.appendChild(doc.createTextNode(contactName));
  const pPhone = doc.createElement('p');
  pPhone.innerHTML = '<strong>Telefon:</strong> ';
  pPhone.appendChild(doc.createTextNode(balanceSummary.phone || '-'));
  const pAddress = doc.createElement('p');
  pAddress.innerHTML = '<strong>Adres:</strong> ';
  pAddress.appendChild(doc.createTextNode(balanceSummary.address || '-'));
  contactDetails.appendChild(pName);
  contactDetails.appendChild(pPhone);
  contactDetails.appendChild(pAddress);

  const balanceSum = doc.createElement('div');
  balanceSum.className = 'balance-summary';
  const label = doc.createElement('span');
  label.className = 'label';
  label.textContent = 'Güncel Hesap Durumu';
  
  const val = doc.createElement('span');
  val.className = 'value';
  val.style.color = balanceSummary.balance > 0 ? '#ef4444' : balanceSummary.balance < 0 ? '#22c55e' : '#64748b';
  val.textContent = Math.abs(balanceSummary.balance).toLocaleString('tr-TR') + ' TL ' + 
    (balanceSummary.balance > 0 ? '(Borçlu / Alacaklıyız)' : balanceSummary.balance < 0 ? '(Alacaklı / Borçluyuz)' : '(Dengede)');
  
  const bottomStats = doc.createElement('div');
  bottomStats.style.cssText = 'display: flex; gap: 15px; margin-top: 8px; font-size: 11px; color: #475569;';
  const stat1 = doc.createElement('span');
  stat1.innerHTML = '<strong>Top. Alış/Satış:</strong> ' + Number(balanceSummary.totalSales || balanceSummary.totalPurchases || 0).toLocaleString('tr-TR') + ' TL';
  const stat2 = doc.createElement('span');
  stat2.innerHTML = '<strong>Kalan Bakiye:</strong> ' + Math.abs(balanceSummary.balance).toLocaleString('tr-TR') + ' TL';
  bottomStats.appendChild(stat1);
  bottomStats.appendChild(stat2);

  balanceSum.appendChild(label);
  balanceSum.appendChild(val);
  balanceSum.appendChild(bottomStats);

  infoBlock.appendChild(contactDetails);
  infoBlock.appendChild(balanceSum);
  doc.body.appendChild(infoBlock);

  // Build Table
  const table = doc.createElement('table');
  const thead = doc.createElement('thead');
  const htr = doc.createElement('tr');
  headers.forEach(h => {
    const th = doc.createElement('th');
    th.textContent = h;
    htr.appendChild(th);
  });
  thead.appendChild(htr);
  table.appendChild(thead);

  const tbody = doc.createElement('tbody');
  rows.forEach(row => {
    const tr = doc.createElement('tr');
    row.forEach(val => {
      const td = doc.createElement('td');
      td.textContent = (val === null || val === undefined) ? '' : val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  doc.body.appendChild(table);

  printWindow.onload = function() {
    printWindow.print();
    setTimeout(function() { printWindow.close(); }, 500);
  };
};
