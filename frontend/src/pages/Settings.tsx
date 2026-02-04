import { useStore } from '../store';
import { Moon, Sun, FolderOpen, Save, Database, Monitor } from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, addToast } = useStore();

  const handleSave = () => {
    // In a real app, this might persist to backend
    addToast('success', 'Settings saved successfully');
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-nvidia-text-secondary mt-1">
          Customize your NVIDIA Nexus experience
        </p>
      </div>

      <div className="grid gap-6">
        {/* Appearance */}
        <section className="nvidia-card p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-nvidia-gray-light pb-4">
            <Monitor className="w-5 h-5 text-nvidia-green" />
            Appearance
          </h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-nvidia-text-secondary">Choose your preferred color scheme</p>
              </div>
              <div className="flex bg-nvidia-gray rounded-lg p-1">
                {(['dark', 'light'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSettings({ theme })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${settings.theme === theme
                      ? 'bg-nvidia-green text-nvidia-black shadow-lg'
                      : 'text-nvidia-text-secondary hover:text-nvidia-white'
                      }`}
                  >
                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Font Size</p>
                <p className="text-sm text-nvidia-text-secondary">Adjust the interface text size</p>
              </div>
              <div className="flex bg-nvidia-gray rounded-lg p-1">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateSettings({ fontSize: size })}
                    className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${settings.fontSize === size
                      ? 'bg-nvidia-green text-nvidia-black shadow-lg'
                      : 'text-nvidia-text-secondary hover:text-nvidia-white'
                      }`}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="nvidia-card p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 border-b border-nvidia-gray-light pb-4">
            <Database className="w-5 h-5 text-nvidia-green" />
            Preferences
          </h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-Organize</p>
                <p className="text-sm text-nvidia-text-secondary">Automatically sort new files into categories</p>
              </div>
              <button
                onClick={() => updateSettings({ autoOrganize: !settings.autoOrganize })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoOrganize ? 'bg-nvidia-green' : 'bg-nvidia-gray'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.autoOrganize ? 'left-7' : 'left-1'
                  }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-nvidia-text-secondary">Enable desktop notifications for tasks</p>
              </div>
              <button
                onClick={() => updateSettings({ notifications: !settings.notifications })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.notifications ? 'bg-nvidia-green' : 'bg-nvidia-gray'
                  }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${settings.notifications ? 'left-7' : 'left-1'
                  }`} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="font-medium block">Default Directory</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nvidia-text-secondary" />
                  <input
                    type="text"
                    value={settings.defaultDirectory}
                    onChange={(e) => updateSettings({ defaultDirectory: e.target.value })}
                    placeholder="/home/user/documents"
                    className="nvidia-input w-full pl-10"
                  />
                </div>
              </div>
              <p className="text-xs text-nvidia-text-secondary">
                This directory will be opened by default when you start the app
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          className="nvidia-button flex items-center gap-2 px-8"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
