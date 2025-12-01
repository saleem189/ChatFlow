// ================================
// Admin Settings Page
// ================================

"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Settings,
  Database,
  Server,
  Bell,
  Shield,
  Save,
  RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowRegistrations: true,
    maxRoomSize: 50,
    messageRetentionDays: 30,
    enableNotifications: true,
    enableAnalytics: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Settings saved!");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Settings
        </h1>
        <p className="text-surface-500 dark:text-surface-400">
          Configure application settings and preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              General Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-surface-900 dark:text-white">
                  Maintenance Mode
                </p>
                <p className="text-sm text-surface-500">
                  Temporarily disable the application
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenanceMode: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-surface-900 dark:text-white">
                  Allow New Registrations
                </p>
                <p className="text-sm text-surface-500">
                  Enable or disable user registration
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowRegistrations}
                  onChange={(e) =>
                    setSettings({ ...settings, allowRegistrations: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Maximum Room Size
              </label>
              <input
                type="number"
                value={settings.maxRoomSize}
                onChange={(e) =>
                  setSettings({ ...settings, maxRoomSize: parseInt(e.target.value) })
                }
                className="input w-32"
                min="2"
                max="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Message Retention (days)
              </label>
              <input
                type="number"
                value={settings.messageRetentionDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    messageRetentionDays: parseInt(e.target.value),
                  })
                }
                className="input w-32"
                min="1"
                max="365"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-500 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Notifications
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-surface-900 dark:text-white">
                  Enable Notifications
                </p>
                <p className="text-sm text-surface-500">
                  Send notifications for important events
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableNotifications}
                  onChange={(e) =>
                    setSettings({ ...settings, enableNotifications: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 border border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              System Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
              <p className="text-xs text-surface-500 mb-1">Database</p>
              <p className="font-medium text-surface-900 dark:text-white">PostgreSQL</p>
            </div>
            <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
              <p className="text-xs text-surface-500 mb-1">Socket Server</p>
              <p className="font-medium text-surface-900 dark:text-white">Running</p>
            </div>
            <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
              <p className="text-xs text-surface-500 mb-1">Environment</p>
              <p className="font-medium text-surface-900 dark:text-white">
                {process.env.NODE_ENV || "development"}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-surface-50 dark:bg-surface-800">
              <p className="text-xs text-surface-500 mb-1">Version</p>
              <p className="font-medium text-surface-900 dark:text-white">1.0.0</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

