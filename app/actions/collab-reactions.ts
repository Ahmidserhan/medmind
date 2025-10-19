'use server';

import { createClient } from '@/lib/supabase/server';

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export async function addReaction(messageId: string, emoji: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('collab_message_reactions')
    .insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'You already reacted with this emoji' };
    }
    return { error: error.message };
  }

  return { data };
}

export async function removeReaction(messageId: string, emoji: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('collab_message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getMessageReactions(messageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('collab_message_reactions')
    .select('*')
    .eq('message_id', messageId);

  if (error) return { error: error.message };
  return { data };
}

export async function sendImageMessage(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('image') as File;
  const content = formData.get('content') as string || '';

  if (!file) return { error: 'No image provided' };

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { error: 'Image size exceeds 10MB limit' };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${sessionId}/images/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('collab-files')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: urlData } = supabase.storage
    .from('collab-files')
    .getPublicUrl(fileName);

  const { data: message, error: dbError } = await supabase
    .from('collab_messages')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      content: content || '📷 Image',
      image_url: urlData.publicUrl,
      image_path: fileName,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from('collab-files').remove([fileName]);
    return { error: dbError.message };
  }

  return { data: message };
}
