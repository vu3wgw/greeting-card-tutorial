import { supabase } from "./supabase";

export interface CardRecord {
  id: string;
  user_id: string;
  image_path: string;
  image_url: string | null;
  message: string;
  created_at: string;
}

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

/**
 * Upload the composited card blob to Supabase Storage
 * and insert a metadata row into the cards table.
 */
export async function saveCard(blob: Blob, message: string): Promise<CardRecord> {
  const userId = await getUserId();
  const filename = `${userId}/${Date.now()}.png`;

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
      user_id: userId,
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
 * Fetch card history for the current user, newest first.
 */
export async function fetchCardHistory(): Promise<CardRecord[]> {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Fetch failed: ${error.message}`);
  }

  return (data ?? []) as CardRecord[];
}
