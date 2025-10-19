'use server';

import { createClient } from '@/lib/supabase/server';

export interface CollabAttachment {
  id: string;
  user_id: string;
  kind: string;
  target_id: string;
  name: string;
  path: string;
  url: string | null;
  file_size: number | null;
  file_type: string | null;
  created_at: string;
}

export async function uploadCollabFile(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('file') as File;
  if (!file) return { error: 'No file provided' };

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { error: 'File size exceeds 50MB limit' };
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${sessionId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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

  const { data: attachment, error: dbError } = await supabase
    .from('collab_attachments')
    .insert({
      user_id: user.id,
      kind: 'session',
      target_id: sessionId,
      name: file.name,
      path: fileName,
      url: urlData.publicUrl,
      file_size: file.size,
      file_type: file.type,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from('collab-files').remove([fileName]);
    return { error: dbError.message };
  }

  return { data: attachment };
}

export async function getCollabFiles(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('collab_attachments')
    .select('*')
    .eq('kind', 'session')
    .eq('target_id', sessionId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function deleteCollabFile(id: string, path: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error: dbError } = await supabase
    .from('collab_attachments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (dbError) return { error: dbError.message };

  const { error: storageError } = await supabase.storage
    .from('collab-files')
    .remove([path]);

  if (storageError) {
    console.error('Storage delete failed:', storageError);
  }

  return { success: true };
}
