/**
 * Universal High-Performance Barcode & QR Code Scanner Engine
 * 1. Uses Native Chrome/Android BarcodeDetector API (Google Lens Vision Engine) if available.
 * 2. Falls back to Html5Qrcode with all 1D/2D format decoders.
 * 3. Supports High-Res File/Photo Snapshot decoding.
 */

export interface ScannerController {
  stop: () => Promise<void>;
}

export const SUPPORTED_1D_2D_FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'qr_code',
  'itf',
  'data_matrix',
  'codabar',
];

/**
 * Scan a high-resolution image file / camera photo directly
 */
export async function decodeBarcodeFromFile(file: File): Promise<string> {
  // 1. Try Native BarcodeDetector
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: SUPPORTED_1D_2D_FORMATS,
      });
      const bitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(bitmap);
      if (barcodes && barcodes.length > 0) {
        return barcodes[0].rawValue.trim();
      }
    } catch (e) {
      console.warn('Native BarcodeDetector file scan failed, falling back to html5-qrcode:', e);
    }
  }

  // 2. Fallback to Html5Qrcode file scan
  const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
  const formats = [
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.CODE_93,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
  ];

  const html5QrCode = new Html5Qrcode('scanner-file-detector-temp', {
    formatsToSupport: formats,
    verbose: false,
  });

  try {
    const result = await html5QrCode.scanFile(file, true);
    html5QrCode.clear();
    return result.trim();
  } catch (err: any) {
    html5QrCode.clear();
    throw new Error('Could not detect barcode from image. Please ensure the barcode is clearly visible and well-lit.');
  }
}
