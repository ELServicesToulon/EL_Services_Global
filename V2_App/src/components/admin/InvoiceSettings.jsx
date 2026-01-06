import { useState, useEffect } from 'react'
import { Settings, Hash, Save, Loader2, RefreshCw, CheckCircle } from 'lucide-react'
import { getInvoiceSettings, updateInvoiceSettings, previewNextInvoiceNumber } from '../../lib/billing'

export default function InvoiceSettings() {
  const [settings, setSettings] = useState({ prefix: 'FACT', year: 2026, sequence: 1 })
  const [preview, setPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    // Update preview when settings change
    const previewNum = `${settings.prefix}-${settings.year}-${String(settings.sequence).padStart(4, '0')}`
    setPreview(previewNum)
  }, [settings])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await getInvoiceSettings()
      setSettings(data)
      const num = await previewNextInvoiceNumber()
      setPreview(num)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateInvoiceSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: field === 'sequence' || field === 'year' ? parseInt(value) || 0 : value
    }))
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-purple-500" />
          Paramètres de Numérotation
        </h3>
        <button
          onClick={loadSettings}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualiser"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Preview */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-100">
          <p className="text-sm text-purple-600 font-medium mb-1">Prochain numéro de facture</p>
          <p className="text-2xl font-bold text-purple-700">{preview}</p>
        </div>

        {/* Settings Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Prefix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Préfixe
            </label>
            <input
              type="text"
              value={settings.prefix}
              onChange={(e) => handleChange('prefix', e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="FACT"
              maxLength={10}
            />
            <p className="text-xs text-gray-400 mt-1">Ex: FACT, INV, MED</p>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Année
            </label>
            <input
              type="number"
              value={settings.year}
              onChange={(e) => handleChange('year', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              min={2020}
              max={2099}
            />
            <p className="text-xs text-gray-400 mt-1">Reset auto au 1er janvier</p>
          </div>

          {/* Sequence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Hash className="w-4 h-4 mr-1" />
              Prochain numéro
            </label>
            <input
              type="number"
              value={settings.sequence}
              onChange={(e) => handleChange('sequence', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono"
              min={1}
            />
            <p className="text-xs text-gray-400 mt-1">Modifiable manuellement</p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/25'
            } disabled:opacity-50`}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : saved ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {saved ? 'Enregistré !' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
