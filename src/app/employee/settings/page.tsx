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
  integrations: {
    stripe_public_key: string;
    stripe_secret_key: string;
    aws_s3_bucket: string;
    aws_access_key: string;
  };
  security: {
    password_min_length: number;
    require_2fa: boolean;
  };
};

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"store" | "integrations" | "security">("store");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<{ role: string } | null>(null);

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
            onClick={() => setActiveTab("integrations")}
            className={`px-6 py-3 font-medium transition ${
              activeTab === "integrations"
                ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Integrations
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

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">API Integrations</h2>
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-200">
                    ⚠️ Warning: Keep these credentials secure. Never share them publicly.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Stripe Public Key</label>
                  <input
                    type="text"
                    value={settings.integrations.stripe_public_key}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, stripe_public_key: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    placeholder="pk_..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Stripe Secret Key</label>
                  <input
                    type="password"
                    value={settings.integrations.stripe_secret_key}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, stripe_secret_key: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    placeholder="sk_..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">AWS S3 Bucket Name</label>
                  <input
                    type="text"
                    value={settings.integrations.aws_s3_bucket}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, aws_s3_bucket: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">AWS Access Key</label>
                  <input
                    type="password"
                    value={settings.integrations.aws_access_key}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        integrations: { ...settings.integrations, aws_access_key: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
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

            {/* Save Button */}
            <div className="mt-6 pt-6 border-t border-neutral-800">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-6 py-2 bg-[#D4AF37] text-neutral-950 font-semibold rounded-md hover:bg-[#C4A037] transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">No settings available</div>
        )}
      </div>
    </div>
  );
}
