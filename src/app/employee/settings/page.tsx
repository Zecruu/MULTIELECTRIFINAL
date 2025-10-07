"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
  store: {
    name: string;
    address: string;
    email: string;
    phone: string;
    logo_url: string;
  };
  security: {
    password_min_length: number;
    require_2fa: boolean;
  };
};

type Category = {
  id: string;
  name: string;
  created_at: string;
};

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  const cls = type === "success" ? "bg-emerald-600/80" : "bg-red-600/80";
  return <div className={`fixed top-4 right-4 z-[60] px-3 py-2 rounded-md text-sm ${cls}`}>{msg}</div>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"store" | "security" | "categories">("store");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<{ role: string } | null>(null);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategoriesTab, setLoadingCategoriesTab] = useState(false);
  const [newCategoryNameTab, setNewCategoryNameTab] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Check if user is admin
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/employee/me");
        if (!res.ok) {
          router.push("/employee/login");
          return;
        }
        const meData = await res.json();
        if (meData.me.role !== "admin") {
          router.push("/employee");
          return;
        }
        setMe(meData.me);
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/employee/login");
      }
    }
    checkAuth();
  }, [router]);

  // Load settings
  useEffect(() => {
    if (!me) return;
    loadSettings();
  }, [me]);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Categories management functions
  async function loadCategories() {
    setLoadingCategoriesTab(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Failed to load categories:", err);
      showToast("Failed to load categories", "error");
    } finally {
      setLoadingCategoriesTab(false);
    }
  }

  async function createCategory() {
    if (!newCategoryNameTab.trim()) {
      showToast("Category name cannot be empty", "error");
      return;
    }

    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryNameTab.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create category");
      }

      const data = await res.json();
      setCategories([...categories, data.category]);
      setNewCategoryNameTab("");
      showToast("Category created successfully", "success");
    } catch (err) {
      console.error("Failed to create category:", err);
      showToast(err instanceof Error ? err.message : "Failed to create category", "error");
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete category");
      }

      setCategories(categories.filter(c => c.id !== id));
      showToast("Category deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete category:", err);
      showToast(err instanceof Error ? err.message : "Failed to delete category", "error");
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      alert("Settings saved successfully!");
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!me) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#D4AF37] mb-2">Settings</h1>
        <p className="text-gray-400">Store configuration and integrations</p>
      </div>

      {/* Toast Notification */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Tabs */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg mb-6">
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setActiveTab("store")}
            className={`px-6 py-3 font-medium transition ${
              activeTab === "store"
                ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Store Info
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-6 py-3 font-medium transition ${
              activeTab === "security"
                ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Security
          </button>
          <button
            onClick={() => {
              setActiveTab("categories");
              loadCategories();
            }}
            className={`px-6 py-3 font-medium transition ${
              activeTab === "categories"
                ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Categories
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading settings...</div>
        ) : settings ? (
          <div className="p-6">
            {/* Store Info Tab */}
            {activeTab === "store" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">Store Information</h2>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Store Name</label>
                  <input
                    type="text"
                    value={settings.store.name}
                    onChange={(e) =>
                      setSettings({ ...settings, store: { ...settings.store, name: e.target.value } })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Business Address</label>
                  <input
                    type="text"
                    value={settings.store.address}
                    onChange={(e) =>
                      setSettings({ ...settings, store: { ...settings.store, address: e.target.value } })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={settings.store.email}
                      onChange={(e) =>
                        setSettings({ ...settings, store: { ...settings.store, email: e.target.value } })
                      }
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      value={settings.store.phone}
                      onChange={(e) =>
                        setSettings({ ...settings, store: { ...settings.store, phone: e.target.value } })
                      }
                      className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Logo URL</label>
                  <input
                    type="text"
                    value={settings.store.logo_url}
                    onChange={(e) =>
                      setSettings({ ...settings, store: { ...settings.store, logo_url: e.target.value } })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">Security Policies</h2>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Minimum Password Length</label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={settings.security.password_min_length}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, password_min_length: parseInt(e.target.value) },
                      })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="require2fa"
                    checked={settings.security.require_2fa}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        security: { ...settings.security, require_2fa: e.target.checked },
                      })
                    }
                    className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]"
                  />
                  <label htmlFor="require2fa" className="text-sm text-gray-300">
                    Require Two-Factor Authentication for Employees/Admins
                  </label>
                </div>
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-200">
                    ℹ️ Note: 2FA implementation is a placeholder. Full implementation coming soon.
                  </p>
                </div>
              </div>
            )}

            {/* Categories Tab */}
            {activeTab === "categories" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">Product Categories</h2>
                <p className="text-sm text-gray-400 mb-4">
                  Manage the main product categories used in your inventory. These categories are used when creating or editing products.
                </p>

                {/* Add New Category */}
                <div className="bg-neutral-800/40 border border-neutral-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-200 mb-3">Add New Category</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryNameTab}
                      onChange={(e) => setNewCategoryNameTab(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && createCategory()}
                      placeholder="Enter category name (e.g., Electrical, Lighting, Tools)..."
                      className="flex-1 px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                    <button
                      onClick={createCategory}
                      className="px-6 py-2 bg-[#D4AF37] text-neutral-950 font-semibold rounded-md hover:bg-[#C4A037] transition"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Categories List */}
                <div className="bg-neutral-800/40 border border-neutral-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-200 mb-3">Existing Categories</h3>
                  {loadingCategoriesTab ? (
                    <div className="text-center py-4 text-gray-400">Loading categories...</div>
                  ) : categories.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No categories yet. Add your first category above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between p-3 bg-neutral-800 rounded-md hover:bg-neutral-700 transition"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-200">{category.name}</div>
                            <div className="text-xs text-gray-500">
                              Created {new Date(category.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="px-3 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save Button (only for store and security tabs) */}
            {(activeTab === "store" || activeTab === "security") && (
              <div className="mt-6 pt-6 border-t border-neutral-800">
                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="px-6 py-2 bg-[#D4AF37] text-neutral-950 font-semibold rounded-md hover:bg-[#C4A037] transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">No settings available</div>
        )}
      </div>
    </div>
  );
}
