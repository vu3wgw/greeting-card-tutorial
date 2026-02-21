export interface CardStyle {
  id: string;
  name: string;
  /** Snippet appended to the AI frame prompt */
  framePrompt: string;
  /** Text color used on the final composited card */
  textColor: string;
  /** CSS gradient shown on the picker thumbnail */
  previewGradient: string;
}

export const CARD_STYLES: CardStyle[] = [
  {
    id: "minimal",
    name: "Minimal",
    framePrompt:
      "Soft ivory gradient background with thin geometric line borders, clean minimalist design, elegant simplicity",
    textColor: "#1a1a2e",
    previewGradient: "linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)",
  },
  {
    id: "botanical",
    name: "Botanical",
    framePrompt:
      "Watercolor leaves and flowers along the edges, soft green botanical illustrations, organic and natural feel",
    textColor: "#2d4a3e",
    previewGradient: "linear-gradient(135deg, #e6f0e8 0%, #a8d5a2 100%)",
  },
  {
    id: "festive",
    name: "Festive",
    framePrompt:
      "Warm gold and burgundy tones, confetti accents, celebratory and joyful decorative elements",
    textColor: "#5c2018",
    previewGradient: "linear-gradient(135deg, #fceabb 0%, #c2395a 100%)",
  },
  {
    id: "elegant",
    name: "Elegant",
    framePrompt:
      "Dark moody gradient background, subtle gold foil accents, luxurious and sophisticated design",
    textColor: "#f0e6d3",
    previewGradient: "linear-gradient(135deg, #2c3e50 0%, #1a1a2e 100%)",
  },
];

export const DEFAULT_STYLE = CARD_STYLES[0];
