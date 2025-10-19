'use server';

import { createClient } from '@/lib/supabase/server';

export interface UserSettings {
  id: string;
  user_id: string;
  theme: string;
  font_style: string;
  text_size: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  dashboard_layout: unknown[];
  created_at: string;
  updated_at: string;
}

export interface CustomLabel {
  id: string;
  user_id: string;
  label_type: string;
  name: string;
  color: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomCategory {
  id: string;
  user_id: string;
  category_type: string;
  name: string;
  color: string;
  icon?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function getUserSettings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert({ user_id: user.id })
        .select()
        .single();
      
      if (insertError) return { error: insertError.message };
      return { data: newSettings };
    }
    return { error: error.message };
  }

  return { data };
}

export async function updateUserSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const updates: Record<string, unknown> = {};
  
  const theme = formData.get('theme');
  const font_style = formData.get('font_style');
  const text_size = formData.get('text_size');
  const primary_color = formData.get('primary_color');
  const secondary_color = formData.get('secondary_color');
  const accent_color = formData.get('accent_color');
  const background_color = formData.get('background_color');
  const text_color = formData.get('text_color');
  const dashboard_layout = formData.get('dashboard_layout');

  if (theme) updates.theme = theme;
  if (font_style) updates.font_style = font_style;
  if (text_size) updates.text_size = text_size;
  if (primary_color) updates.primary_color = primary_color;
  if (secondary_color) updates.secondary_color = secondary_color;
  if (accent_color) updates.accent_color = accent_color;
  if (background_color) updates.background_color = background_color;
  if (text_color) updates.text_color = text_color;
  if (dashboard_layout) {
    try {
      updates.dashboard_layout = JSON.parse(dashboard_layout as string);
    } catch {
      return { error: 'Invalid dashboard layout JSON' };
    }
  }

  const { data, error } = await supabase
    .from('user_settings')
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getCustomLabels() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('custom_labels')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message };
  return { data };
}

export async function createCustomLabel(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const label_type = formData.get('label_type') as string;
  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const icon = formData.get('icon') as string;

  if (!label_type || !name) return { error: 'Label type and name are required' };

  const { data, error } = await supabase
    .from('custom_labels')
    .insert({
      user_id: user.id,
      label_type,
      name,
      color: color || '#3AAFA9',
      icon: icon || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteCustomLabel(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('custom_labels')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getCustomCategories() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('custom_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (error) return { error: error.message };
  return { data };
}

export async function createCustomCategory(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const category_type = formData.get('category_type') as string;
  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const icon = formData.get('icon') as string;
  const sort_order = formData.get('sort_order') as string;

  if (!category_type || !name) return { error: 'Category type and name are required' };

  const { data, error } = await supabase
    .from('custom_categories')
    .insert({
      user_id: user.id,
      category_type,
      name,
      color: color || '#0F3D73',
      icon: icon || null,
      sort_order: sort_order ? parseInt(sort_order) : 0,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function deleteCustomCategory(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('custom_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}
