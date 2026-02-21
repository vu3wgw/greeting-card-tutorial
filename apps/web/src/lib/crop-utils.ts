export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    // Only set crossOrigin for non-blob URLs
    if (!url.startsWith("blob:") && !url.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }
    image.src = url;
  });
}

export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
): Promise<{ blob: Blob; base64: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2d context");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ blob, base64: reader.result as string });
        };
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      0.85,
    );
  });
}

/** Convert a File to a base64 data URL */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Overlay message text onto the AI-generated card image.
 * Nano-banana already composites the person into the card,
 * so we only need to add the text here.
 */
export async function compositeCardImage(
  cardUrl: string,
  message: string,
  textColor: string,
): Promise<{ blob: Blob; url: string }> {
  const card = await createImage(cardUrl);

  const canvas = document.createElement("canvas");
  canvas.width = card.width;
  canvas.height = card.height;
  const ctx = canvas.getContext("2d")!;

  // 1. Draw the AI-generated card (already has person in it)
  ctx.drawImage(card, 0, 0);

  // 2. Render message text at the bottom
  if (message) {
    try {
      await document.fonts.load('400 24px "Geist"');
    } catch {
      // font not available — that's fine
    }

    const padding = Math.min(card.width, card.height) * 0.08;
    const fontSize = Math.max(16, Math.round(card.width / 28));
    const fontFamily = '"Geist", "Inter", system-ui, -apple-system, sans-serif';
    ctx.font = `500 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";

    const textY = card.height - padding;
    const maxTextW = card.width - padding * 2;

    // Subtle text shadow for readability
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = textColor;
    const lines = wrapText(ctx, message, maxTextW);
    for (let i = lines.length - 1; i >= 0; i--) {
      const y = textY - (lines.length - 1 - i) * (fontSize * 1.4);
      ctx.fillText(lines[i], card.width / 2, y);
    }

    ctx.shadowColor = "transparent";
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve({ blob, url: URL.createObjectURL(blob) });
      },
      "image/png",
    );
  });
}

/** Simple word-wrap helper for canvas text */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
