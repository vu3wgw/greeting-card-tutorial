import { supabase, getDeviceId } from "./supabase";

export interface CardRecord {
  id: string;
  device_id: string;
  image_path: string;
  image_url: string | null;
  message: string;
  created_at: string;
}

/**
 * Upload the composited card blob to Supabase Storage
 * and insert a metadata row into the cards table.
 */
export async function saveCard(blob: Blob, message: string): Promise<CardRecord> {
  const deviceId = getDeviceId();
  const filename = `${deviceId}/${Date.now()}.png`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("Greeting cards")
    .upload(filename, blob, { contentType: "image/png" });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from("Greeting cards").getPublicUrl(filename);

  // Insert metadata row
  const { data, error: insertError } = await supabase
    .from("cards")
    .insert({
      device_id: deviceId,
      image_path: filename,
      image_url: urlData.publicUrl,
      message,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Save failed: ${insertError.message}`);
  }

  return data as CardRecord;
}

/**
 * Fetch card history for the current device, newest first.
 */
export async function fetchCardHistory(): Promise<CardRecord[]> {
  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }

  return (data ?? []) as CardRecord[];
}
