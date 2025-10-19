'use client';

import { useEffect, useState } from 'react';
import { getUserSettings, type UserSettings } from '@/app/actions/settings';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadAndApplySettings = async () => {
      const settingsRes = await getUserSettings();

      // Apply user settings
      if ('data' in settingsRes && settingsRes.data) {
        applySettings(settingsRes.data);
      }

      setLoaded(true);
    };

    loadAndApplySettings();
    
    // Listen for settings updates
    const handleSettingsUpdate = () => {
      loadAndApplySettings();
    };
    
    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySettings = (settings: UserSettings) => {
    const root = document.documentElement;

    // Apply colors as CSS variables
    root.style.setProperty('--color-primary', settings.primary_color);
    root.style.setProperty('--color-secondary', settings.secondary_color);
    root.style.setProperty('--color-accent', settings.accent_color);
    root.style.setProperty('--color-background', settings.background_color);
    root.style.setProperty('--color-text', settings.text_color);

    // Apply font family
    const fontMap: Record<string, string> = {
      'inter': 'Inter, system-ui, sans-serif',
      'roboto': 'Roboto, system-ui, sans-serif',
      'open-sans': '"Open Sans", system-ui, sans-serif',
      'lato': 'Lato, system-ui, sans-serif',
      'poppins': 'Poppins, system-ui, sans-serif',
    };
    root.style.setProperty('--font-family', fontMap[settings.font_style] || fontMap['poppins']);

    // Apply text size
    const sizeMap: Record<string, string> = {
      'small': '14px',
      'medium': '16px',
      'large': '18px',
      'extra-large': '20px',
    };
    root.style.setProperty('--text-base-size', sizeMap[settings.text_size] || sizeMap['medium']);

    // Apply theme class to body
    const currentClasses = document.body.className.split(' ').filter(c => !c.startsWith('theme-'));
    document.body.className = [...currentClasses, `theme-${settings.theme}`].join(' ');

    // Inject dynamic styles for better color application
    injectDynamicStyles(settings);
  };

  const injectDynamicStyles = (settings: UserSettings) => {
    // Remove existing dynamic styles
    const existingStyle = document.getElementById('dynamic-theme-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create new style element
    const style = document.createElement('style');
    style.id = 'dynamic-theme-styles';
    style.textContent = `
      /* Dynamic theme styles */
      .bg-gradient-to-br.from-\\[\\#0F3D73\\] {
        background-image: linear-gradient(to bottom right, ${settings.primary_color}, ${settings.accent_color}) !important;
      }
      
      .bg-gradient-to-r.from-\\[\\#0F3D73\\] {
        background-image: linear-gradient(to right, ${settings.primary_color}, ${settings.accent_color}) !important;
      }
      
      .bg-\\[\\#0F3D73\\], .bg-blue-600 {
        background-color: ${settings.primary_color} !important;
      }
      
      .text-\\[\\#0F3D73\\], .text-blue-600 {
        color: ${settings.primary_color} !important;
      }
      
      .border-\\[\\#0F3D73\\], .border-blue-600 {
        border-color: ${settings.primary_color} !important;
      }
      
      .bg-\\[\\#3AAFA9\\] {
        background-color: ${settings.secondary_color} !important;
      }
      
      .text-\\[\\#3AAFA9\\] {
        color: ${settings.secondary_color} !important;
      }
      
      .from-\\[\\#3AAFA9\\] {
        --tw-gradient-from: ${settings.secondary_color} !important;
      }
      
      .bg-\\[\\#2E3A59\\] {
        background-color: ${settings.accent_color} !important;
      }
      
      /* Apply to common button gradients */
      button[class*="from-[#0F3D73]"],
      a[class*="from-[#0F3D73]"] {
        background-image: linear-gradient(to right, ${settings.primary_color}, ${settings.accent_color}) !important;
      }
      
      /* Keep text white on colored backgrounds */
      .bg-gradient-to-br.from-\\[\\#0F3D73\\] *,
      .bg-gradient-to-r.from-\\[\\#0F3D73\\] *,
      .bg-\\[\\#0F3D73\\] *,
      .text-white,
      [class*="text-white"] {
        color: #FFFFFF !important;
      }
      
      /* Ensure header text stays white */
      .bg-gradient-to-br h1,
      .bg-gradient-to-br h2,
      .bg-gradient-to-br h3,
      .bg-gradient-to-br p,
      .bg-gradient-to-br span,
      .bg-gradient-to-r h1,
      .bg-gradient-to-r h2,
      .bg-gradient-to-r h3,
      .bg-gradient-to-r p,
      .bg-gradient-to-r span {
        color: #FFFFFF !important;
      }
      
      /* Button text should stay white */
      button.text-white,
      a.text-white {
        color: #FFFFFF !important;
      }
    `;
    
    document.head.appendChild(style);
  };


  // Show loading state briefly to prevent flash
  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9FAFB' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200" style={{ borderTopColor: '#0F3D73' }}></div>
      </div>
    );
  }

  return <>{children}</>;
}
