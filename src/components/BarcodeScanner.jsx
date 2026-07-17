import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    // Create scanner instance
    const html5QrcodeScanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: {width: 250, height: 100}, supportedScanTypes: [0] },
      false
    );

    // Render it
    html5QrcodeScanner.render(
      (decodedText) => {
        onScan(decodedText);
        html5QrcodeScanner.clear();
      },
      (err) => {
        // Ignored, happens constantly while scanning
      }
    );

    scannerRef.current = html5QrcodeScanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Failed to clear scanner", e));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Camera size={18} className="text-indigo-600" />
            Barkod / QR Okut
          </h3>
          <button 
            onClick={() => {
              if (scannerRef.current) scannerRef.current.clear();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-950">
          <div id="qr-reader" className="w-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden border-2 border-dashed border-indigo-200 dark:border-indigo-900/50"></div>
          <p className="text-center text-[11px] text-slate-500 mt-4">
            Kameranızı IMEI veya barkod üzerine hizalayın.
          </p>
        </div>
      </div>
    </div>
  );
}
