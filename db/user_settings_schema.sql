CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  theme text DEFAULT 'neutral' CHECK (theme IN ('neutral', 'minimalist', 'light', 'dark')),
  font_style text DEFAULT 'inter' CHECK (font_style IN ('inter', 'roboto', 'open-sans', 'lato', 'poppins')),
  text_size text DEFAULT 'medium' CHECK (text_size IN ('small', 'medium', 'large', 'extra-large')),
  
  primary_color text DEFAULT '#0F3D73',
  secondary_color text DEFAULT '#3AAFA9',
  accent_color text DEFAULT '#2E3A59',
  background_color text DEFAULT '#F9FAFB',
  text_color text DEFAULT '#2E3A59',
  
  dashboard_layout jsonb DEFAULT '[]'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

CREATE TABLE IF NOT EXISTS public.custom_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  label_type text NOT NULL CHECK (label_type IN ('assignment', 'exam', 'clinical', 'general')),
  name text NOT NULL,
  color text DEFAULT '#3AAFA9',
  icon text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, label_type, name)
);

CREATE INDEX idx_custom_labels_user_id ON public.custom_labels(user_id);
CREATE INDEX idx_custom_labels_type ON public.custom_labels(label_type);

CREATE TABLE IF NOT EXISTS public.custom_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  category_type text NOT NULL CHECK (category_type IN ('assignment', 'exam', 'clinical', 'note', 'general')),
  name text NOT NULL,
  color text DEFAULT '#0F3D73',
  icon text,
  sort_order int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, category_type, name)
);

CREATE INDEX idx_custom_categories_user_id ON public.custom_categories(user_id);
CREATE INDEX idx_custom_categories_type ON public.custom_categories(category_type);

CREATE OR REPLACE FUNCTION set_updated_at_settings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_settings();

CREATE TRIGGER custom_labels_set_updated_at
  BEFORE UPDATE ON public.custom_labels
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_settings();

CREATE TRIGGER custom_categories_set_updated_at
  BEFORE UPDATE ON public.custom_categories
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at_settings();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_select_own ON public.user_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY user_settings_insert_own ON public.user_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_settings_update_own ON public.user_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY custom_labels_select_own ON public.custom_labels
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY custom_labels_insert_own ON public.custom_labels
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY custom_labels_update_own ON public.custom_labels
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY custom_labels_delete_own ON public.custom_labels
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY custom_categories_select_own ON public.custom_categories
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY custom_categories_insert_own ON public.custom_categories
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY custom_categories_update_own ON public.custom_categories
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY custom_categories_delete_own ON public.custom_categories
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_settings();
