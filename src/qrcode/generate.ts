import QRCode from "qrcode";

export type QrFormat = "png" | "svg" | "dataurl";
export type Ecc = "L" | "M" | "Q" | "H";

export interface QrOptions {
  format?: QrFormat;
  size?: number;
  margin?: number;
  ecc?: Ecc;
  dark?: string;
  light?: string;
}

function opts(o: QrOptions) {
  return {
    width: Math.min(Math.max(o.size ?? 300, 64), 1000),
    margin: Math.min(Math.max(o.margin ?? 2, 0), 10),
    errorCorrectionLevel: o.ecc ?? "M",
    color: { dark: o.dark ?? "#000000", light: o.light ?? "#ffffff" },
  };
}

export async function qrSvg(data: string, o: QrOptions = {}): Promise<string> {
  return QRCode.toString(data, { type: "svg", ...opts(o) });
}

export async function qrDataUrl(data: string, o: QrOptions = {}): Promise<string> {
  return QRCode.toDataURL(data, opts(o));
}

export async function qrPngBuffer(data: string, o: QrOptions = {}): Promise<Buffer> {
  return QRCode.toBuffer(data, { type: "png", ...opts(o) });
}
