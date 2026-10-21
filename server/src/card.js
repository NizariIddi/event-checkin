// Draws a guest's invitation card: the design in assets/card/background.jpg
// + the guest's NAME on the dotted line + their QR code inside the outlined square.
// Everything else on the card stays exactly as designed.
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import QRCode from 'qrcode';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets/card');

// ---- Layout, in the design's own units (the card is 397 x 559, i.e. A6) ----
const CARD = { w: 397, h: 559 };
const SCALE = 3;                                   // output = 1191 x 1677 px (about 290 dpi at A6)
const NAME = {
  centerX: 207.7,                                  // middle of the dotted line
  baseline: 169.3,                                 // sits just above the dots
  maxWidth: 200,                                   // the dotted line is 208 wide
  maxSize: 16, minSize: 8,
  color: '#3b291e',                                // same brown as the card's own wording
};
const QR_BOX = { x: 183, y: 416.673, size: 55 };   // the outlined square in the design
const QR_COLOR = '#1a1412';
const SHOW_ID = true;                              // print the ID under the QR (for typing it in by hand)
const ID_TEXT = { baseline: 481, size: 7.5, spacing: 1.4, color: '#916461' };
const JPEG_QUALITY = 90;

GlobalFonts.registerFromPath(path.join(dir, 'fonts/CormorantGaramond_600SemiBold_Italic.ttf'), 'CardName');
GlobalFonts.registerFromPath(path.join(dir, 'fonts/SourceSans3_600SemiBold.ttf'), 'CardId');

let background = null;
const getBackground = async () => (background ||= await loadImage(path.join(dir, 'background.jpg')));

/** Shrinks the name until it fits on the line; as a last resort cuts it with "…" */
function fitName(ctx, rawName) {
  let text = String(rawName || '').replace(/\s+/g, ' ').trim();
  for (let size = NAME.maxSize; size >= NAME.minSize; size -= 0.25) {
    ctx.font = `${size * SCALE}px CardName`;
    if (ctx.measureText(text).width <= NAME.maxWidth * SCALE) return { text, size };
  }
  ctx.font = `${NAME.minSize * SCALE}px CardName`;
  while (text.length > 1 && ctx.measureText(`${text}…`).width > NAME.maxWidth * SCALE) text = text.slice(0, -1).trimEnd();
  return { text: `${text}…`, size: NAME.minSize };
}

/** QR modules drawn as crisp squares on whole pixels (so phones read it easily) */
function drawQr(ctx, code) {
  const qr = QRCode.create(code, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const boxPx = QR_BOX.size * SCALE - 3;           // a little less than the square, so the outline stays clear
  const cell = Math.max(2, Math.floor(boxPx / (n + 4)));   // keeps at least 2 empty modules around it
  const total = cell * n;
  const startX = Math.round((QR_BOX.x + QR_BOX.size / 2) * SCALE - total / 2);
  const startY = Math.round((QR_BOX.y + QR_BOX.size / 2) * SCALE - total / 2);
  ctx.fillStyle = QR_COLOR;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) ctx.fillRect(startX + c * cell, startY + r * cell, cell, cell);
    }
  }
}

/** Letters spaced out a little, centred on x */
function drawSpaced(ctx, text, centerX, y, spacing) {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let x = centerX - total / 2;
  [...text].forEach((ch, i) => { ctx.fillText(ch, x, y); x += widths[i] + spacing; });
}

/** Returns a JPEG (Buffer) of the finished card */
export async function renderCard({ name, code }) {
  const canvas = createCanvas(CARD.w * SCALE, CARD.h * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(await getBackground(), 0, 0, canvas.width, canvas.height);

  // Guest name (centred on the dotted line)
  const { text, size } = fitName(ctx, name);
  ctx.font = `${size * SCALE}px CardName`;
  ctx.fillStyle = NAME.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, NAME.centerX * SCALE, NAME.baseline * SCALE);

  // QR code inside the outlined square
  drawQr(ctx, code);

  // ID under the QR
  if (SHOW_ID) {
    ctx.font = `${ID_TEXT.size * SCALE}px CardId`;
    ctx.fillStyle = ID_TEXT.color;
    ctx.textAlign = 'left';
    drawSpaced(ctx, code, (QR_BOX.x + QR_BOX.size / 2) * SCALE, ID_TEXT.baseline * SCALE, ID_TEXT.spacing * SCALE);
  }

  return canvas.toBuffer('image/jpeg', JPEG_QUALITY);
}

export const cardFileName = (guest) => {
  const slug = String(guest.full_name || 'guest').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').slice(0, 40) || 'guest';
  return `${guest.code}_${slug}.jpg`;
};
