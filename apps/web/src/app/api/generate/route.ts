import { NextResponse } from "next/server";
import Replicate from "replicate";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(request: Request) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Server misconfigured: missing API token" }, { status: 500 });
  }

  let body: { message?: string; stylePrompt?: string; croppedImage?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { message, stylePrompt, croppedImage } = body;

  const replicate = new Replicate({ auth: token });

  const basePrompt = `Take the person from this photo and place them into a beautiful greeting card. Extract the person and compose them into a professionally designed card with a decorative frame, ornate borders, and artistic styling around the edges. The person should be the centerpiece of the card.`;

  const styleSnippet = stylePrompt ? ` Style: ${stylePrompt}.` : "";
  const moodSnippet = message ? ` The card message is: "${message}". Match the mood and theme to this message.` : "";

  const prompt = basePrompt + styleSnippet + moodSnippet;

  try {
    const cardUrl = await runCardGeneration(replicate, prompt, croppedImage);

    // Proxy the image through our server to avoid CORS issues on the client canvas
    const imageRes = await fetch(cardUrl);
    if (!imageRes.ok) {
      throw new Error("Failed to fetch generated image");
    }
    const imageBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    const base64 = `data:${contentType};base64,${Buffer.from(imageBuffer).toString("base64")}`;

    return NextResponse.json({ cardImageBase64: base64 });
  } catch (err: unknown) {
    console.error("Replicate error:", err);
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function runCardGeneration(replicate: Replicate, prompt: string, imageBase64?: string): Promise<string> {
  const input: Record<string, unknown> = { prompt };
  if (imageBase64) {
    // Upload to Supabase bucket to get a public URL for Replicate
    const raw = imageBase64.includes(",") ? imageBase64.split(",")[1]! : imageBase64;
    const mime = imageBase64.match(/^data:([^;]+);/)?.[1] || "image/jpeg";
    const ext = mime === "image/png" ? "png" : "jpg";
    const filename = `tmp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer = Buffer.from(raw, "base64");

    const { error: uploadErr } = await supabase.storage
      .from("Greeting cards")
      .upload(filename, buffer, { contentType: mime, upsert: true });

    if (uploadErr) throw new Error(`Image upload failed: ${uploadErr.message}`);

    const { data: urlData } = supabase.storage.from("Greeting cards").getPublicUrl(filename);
    input.image_input = [urlData.publicUrl];
  }

  let prediction = await replicate.predictions.create({
    model: "google/nano-banana",
    input,
  });

  while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
    await new Promise((r) => setTimeout(r, 2000));
    prediction = await replicate.predictions.get(prediction.id);
  }

  if (prediction.status !== "succeeded") {
    throw new Error(prediction.error as string || "Card generation failed");
  }

  const output = prediction.output;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0];
  throw new Error("No image URL in model output");
}
