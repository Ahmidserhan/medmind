'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
  getUserSettings,
  updateUserSettings,
  getCustomLabels,
  getCustomCategories,
  createCustomCategory,
  deleteCustomCategory,
  type UserSettings,
  type CustomLabel,
  type CustomCategory,
} from '@/app/actions/settings';

export default function SettingsClient() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [labels, setLabels] = useState<CustomLabel[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'appearance' | 'layout' | 'labels' | 'categories'>('appearance');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [settingsRes, labelsRes, categoriesRes] = await Promise.all([
      getUserSettings(),
      getCustomLabels(),
      getCustomCategories(),
    ]);

    if ('error' in settingsRes) {
      Swal.fire({ icon: 'error', title: 'Error', text: settingsRes.error });
    } else {
      setSettings(settingsRes.data);
    }

    if ('error' in labelsRes) {
      Swal.fire({ icon: 'error', title: 'Error', text: labelsRes.error });
    } else {
      setLabels(labelsRes.data || []);
    }

    if ('error' in categoriesRes) {
      Swal.fire({ icon: 'error', title: 'Error', text: categoriesRes.error });
    } else {
      setCategories(categoriesRes.data || []);
    }

    setLoading(false);
  };

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const formData = new FormData(e.currentTarget);
    const res = await updateUserSettings(formData);
    
    if ('error' in res) {
      Swal.fire({ icon: 'error', title: 'Error', text: res.error });
    } else {
      setSettings(res.data);
      // Trigger theme update
      window.dispatchEvent(new Event('settingsUpdated'));
      Swal.fire({ icon: 'success', title: 'Settings saved!', text: 'Your changes have been applied.', timer: 2000 });
    }
  };

  const handleAddCategory = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Add Custom Category',
      html: `
        <div class="space-y-4 text-left">
          <div>
            <label class="block text-sm font-semibold mb-2">Category Type</label>
            <select id="category_type" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg">
              <option value="assignment">Assignment</option>
              <option value="exam">Exam</option>
              <option value="clinical">Clinical</option>
              <option value="note">Note</option>
              <option value="general">General</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold mb-2">Name</label>
            <input id="name" class="w-full px-3 py-2 border-2 border-gray-200 rounded-lg" placeholder="e.g., Pharmacology">
          </div>
          <div>
            <label class="block text-sm font-semibold mb-2">Color</label>
            <input id="color" type="color" value="#0F3D73" class="w-full h-10 border-2 border-gray-200 rounded-lg">
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const category_type = (document.getElementById('category_type') as HTMLSelectElement).value;
        const name = (document.getElementById('name') as HTMLInputElement).value;
        const color = (document.getElementById('color') as HTMLInputElement).value;
        if (!name) {
          Swal.showValidationMessage('Name is required');
          return false;
        }
        return { category_type, name, color };
      }
    });

    if (formValues) {
      const formData = new FormData();
      formData.append('category_type', formValues.category_type);
      formData.append('name', formValues.name);
      formData.append('color', formValues.color);

      const res = await createCustomCategory(formData);
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      } else {
        setCategories([...categories, res.data]);
        Swal.fire({ icon: 'success', title: 'Category created!', timer: 1500 });
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete category?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete'
    });

    if (result.isConfirmed) {
      const res = await deleteCustomCategory(id);
      if ('error' in res) {
        Swal.fire({ icon: 'error', title: 'Error', text: res.error });
      } else {
        setCategories(categories.filter(c => c.id !== id));
        Swal.fire({ icon: 'success', title: 'Category deleted!', timer: 1500 });
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center shadow-lg">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#0F3D73] mb-4"></div>
        <div className="text-gray-600 font-medium">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-8 rounded-2xl bg-red-50 border border-red-200 text-center shadow-lg">
        <div className="text-red-600 font-semibold">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'appearance'
                  ? 'text-[#0F3D73] border-b-2 border-[#0F3D73] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('layout')}
              className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'layout'
                  ? 'text-[#0F3D73] border-b-2 border-[#0F3D73] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Layout & Typography
            </button>
            <button
              onClick={() => setActiveTab('labels')}
              className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'labels'
                  ? 'text-[#0F3D73] border-b-2 border-[#0F3D73] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Custom Labels
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-4 font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'text-[#0F3D73] border-b-2 border-[#0F3D73] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Custom Categories
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'appearance' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Theme & Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Theme</label>
                    <select
                      name="theme"
                      defaultValue={settings.theme}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white transition-all"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="minimalist">Minimalist</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Primary Color</label>
                    <input
                      type="color"
                      name="primary_color"
                      defaultValue={settings.primary_color}
                      className="w-full h-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Secondary Color</label>
                    <input
                      type="color"
                      name="secondary_color"
                      defaultValue={settings.secondary_color}
                      className="w-full h-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Accent Color</label>
                    <input
                      type="color"
                      name="accent_color"
                      defaultValue={settings.accent_color}
                      className="w-full h-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Background Color</label>
                    <input
                      type="color"
                      name="background_color"
                      defaultValue={settings.background_color}
                      className="w-full h-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Text Color</label>
                    <input
                      type="color"
                      name="text_color"
                      defaultValue={settings.text_color}
                      className="w-full h-12 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl hover:shadow-lg font-semibold transition-all shadow-md"
                >
                  Save Appearance
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-all"
                >
                  Reset
                </button>
              </div>
            </form>
          )}

          {activeTab === 'layout' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Typography & Layout</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Font Style</label>
                    <select
                      name="font_style"
                      defaultValue={settings.font_style}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white transition-all"
                    >
                      <option value="inter">Inter</option>
                      <option value="roboto">Roboto</option>
                      <option value="open-sans">Open Sans</option>
                      <option value="lato">Lato</option>
                      <option value="poppins">Poppins</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Text Size</label>
                    <select
                      name="text_size"
                      defaultValue={settings.text_size}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D73] focus:border-[#0F3D73] bg-white transition-all"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="extra-large">Extra Large</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <div className="font-semibold mb-1">Dashboard Widget Customization</div>
                    <div>Drag-and-drop dashboard widgets will be available in the Dashboard page. Configure your layout there.</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-[#0F3D73] to-[#2E3A59] text-white rounded-xl hover:shadow-lg font-semibold transition-all shadow-md"
                >
                  Save Layout
                </button>
              </div>
            </form>
          )}

          {activeTab === 'labels' && (
            <div className="space-y-6">
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="font-medium text-lg mb-2">Custom Labels</p>
                <p className="text-sm">This feature is coming soon!</p>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Custom Categories</h3>
                  <p className="text-sm text-gray-600 mt-1">Organize your content with custom categories</p>
                </div>
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg font-semibold transition-all shadow-md flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="p-4 border-2 border-gray-200 rounded-xl hover:border-[#0F3D73] transition-all">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-semibold text-gray-900">{category.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                      {category.category_type}
                    </span>
                  </div>
                ))}
              </div>

              {categories.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="font-medium">No custom categories yet</p>
                  <p className="text-sm mt-1">Click &quot;Add Category&quot; to create your first custom category</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
