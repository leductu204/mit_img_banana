'use client';

import { useEffect, useState } from 'react';
import { getAdminToken } from '@/contexts/AdminAuthContext';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { Loader2, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { IMAGE_MODELS, VIDEO_MODELS, ModelConfig } from '@/lib/models-config';

interface ModelCost {
  model: string;
  config_key: string;
  credits: number;
  updated_at?: string;
  updated_by?: string;
}

interface CostsByModel {
  [model: string]: ModelCost[];
}

export default function AdminModelCostsPage() {
  const [costs, setCosts] = useState<ModelCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editedCosts, setEditedCosts] = useState<{[key: string]: number}>({});

  const fetchCosts = async () => {
    try {
      const token = getAdminToken();
      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/model-costs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch costs');
      const data = await res.json();
      setCosts(data.costs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, []);

  // Group costs by model
  const costsByModel: CostsByModel = costs.reduce((acc, cost) => {
    if (!acc[cost.model]) acc[cost.model] = [];
    acc[cost.model].push(cost);
    return acc;
  }, {} as CostsByModel);

  const handleEdit = (model: string, configKey: string, value: number) => {
    const key = `${model}/${configKey}`;
    setEditedCosts(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (model: string, configKey: string, valueOverride?: number) => {
    const key = `${model}/${configKey}`;
    const newCredits = valueOverride !== undefined ? valueOverride : editedCosts[key];
    if (newCredits === undefined) return;

    setSaving(key);
    try {
      const token = getAdminToken();
      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/model-costs`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          config_key: configKey,
          credits: newCredits
        })
      });

      if (!res.ok) throw new Error('Failed to save');
      
      // Clear edit state and refresh
      setEditedCosts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      fetchCosts();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  /* Removed seedDefaults */

  const syncFromConfig = async () => {
    try {
      if (costs.length === 0) return;
      setSaving('sync');

      // 1. Generate expected keys from frontend config
      const expectedCosts: { model: string, config_key: string, credits: number }[] = [];
      const DEFAULT_CREDITS = 10;

      // Helper to add if missing
      const addExpectation = (model: string, key: string, defaultCost: number = DEFAULT_CREDITS) => {
          // Check locally if it's already known to be in the DB (costs state)
          // We only want to identify MISSING keys to send to server
          const exists = costs.find(c => c.model === model && c.config_key === key);
          if (!exists) {
              expectedCosts.push({ model, config_key: key, credits: defaultCost });
          }
      };

      // Process Video Models
      VIDEO_MODELS.forEach((m: ModelConfig) => {
          // Status Flag
          addExpectation(m.value, 'is_enabled', 1);
          // Slow Mode Flag
          addExpectation(m.value, 'is_slow_mode_enabled', 1);

          if (m.qualities && m.qualities.length > 0) {
              m.qualities.forEach((q: string) => {
                  if (m.durations && m.durations.length > 0) {
                      m.durations.forEach((d: string) => {
                          addExpectation(m.value, `${q}-${d}-fast`, 15);
                          addExpectation(m.value, `${q}-${d}-slow`, 10);
                      });
                  } else {
                      addExpectation(m.value, `${q}-fast`, 15);
                      addExpectation(m.value, `${q}-slow`, 10);
                  }
              });
          } else if (m.durations && m.durations.length > 0) {
              m.durations.forEach((d: string) => {
                  addExpectation(m.value, `${d}-fast`, 15);
                  addExpectation(m.value, `${d}-slow`, 10);
              });
          } else {
              // Fallback for models like Veo (unless they have specific logic)
              // If it's Veo and has no duration config, checking if backend uses '8s'
              // but for new models "Wan", generic fallback is better.
              addExpectation(m.value, 'default-fast', 15);
              addExpectation(m.value, 'default-slow', 10);
          }
      });

      // Process Image Models
      IMAGE_MODELS.forEach((m: ModelConfig) => {
          // Status Flag
          addExpectation(m.value, 'is_enabled', 1);
          
          if (m.value === 'nano-banana') {
              addExpectation(m.value, 'is_slow_mode_enabled', 1);
          } else if (m.value === 'nano-banana-pro') {
              addExpectation(m.value, 'is_slow_mode_enabled_1k', 1);
              addExpectation(m.value, 'is_slow_mode_enabled_2k', 1);
              addExpectation(m.value, 'is_slow_mode_enabled_4k', 1);
          }

          if (m.resolutions && m.resolutions.length > 0) {
              m.resolutions.forEach((r: string) => {
                 addExpectation(m.value, `${r}-fast`, 5);
                 addExpectation(m.value, `${r}-slow`, 2);
              });
          } else {
              addExpectation(m.value, 'default-fast', 5);
              addExpectation(m.value, 'default-slow', 2);
          }
      });

      // 2. Identify strictly missing keys (already filtered above by checking 'costs')
      if (expectedCosts.length === 0) {
          // Nothing new to add
          setSaving(null);
          return;
      }

      console.log("Syncing new costs:", expectedCosts);

      // 3. Send to bulk endpoint
      const token = getAdminToken();
      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/model-costs/bulk`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(expectedCosts)
      });

      if (!res.ok) throw new Error('Failed to sync config');
      
      fetchCosts();
    } catch (err) {
      console.error(err);
    } finally {
        setSaving(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const handleSaveAll = async () => {
    if (Object.keys(editedCosts).length === 0) return;
    setSaving('bulk');

    try {
      const updates = Object.entries(editedCosts).map(([key, credits]) => {
          // Key is "model/config_key". Model usually has no slash, but let's be safe.
          // Current cost keys are safe.
          const splitIndex = key.indexOf('/');
          const model = key.substring(0, splitIndex);
          const configKey = key.substring(splitIndex + 1);
          return { model, config_key: configKey, credits };
      });

      const token = getAdminToken();
      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/model-costs/bulk`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!res.ok) throw new Error('Failed to save all');
      
      setEditedCosts({});
      fetchCosts();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const modelDisplayNames: {[key: string]: string} = {
    'nano-banana': 'Nano Banana',
    'nano-banana-pro': 'Nano Banana PRO',
    'kling-2.5-turbo': 'Kling 2.5 Turbo',
    'kling-o1-video': 'Kling O1 Video',
    'kling-2.6': 'Kling 2.6',
    'veo3.1-low': 'Veo 3.1 Low (Relaxed)',
    'veo3.1-fast': 'Veo 3.1 Fast',
    'veo3.1-high': 'Veo 3.1 High'
  };

  const hasChanges = Object.keys(editedCosts).length > 0;

  // Detect missing models (Config -> DB)
  const missingModels = [...VIDEO_MODELS, ...IMAGE_MODELS].filter(m => !costsByModel[m.value]);
  const hasMissingModels = missingModels.length > 0;

  // Detect obsolete models (DB -> Config)
  // These are models present in costs but NOT in the frontend config
  const knownModelValues = new Set([...VIDEO_MODELS, ...IMAGE_MODELS].map(m => m.value));
  const obsoleteModels = Object.keys(costsByModel).filter(model => !knownModelValues.has(model));
  const hasObsoleteModels = obsoleteModels.length > 0;

  const handlePrune = async () => {
      if (!confirm(`Are you sure you want to delete ${obsoleteModels.length} obsolete models? This cannot be undone.`)) return;

      setSaving('prune');
      try {
          // Gather all cost entries for obsolete models
          const itemsToDelete: { model: string, config_key: string }[] = [];
          obsoleteModels.forEach(model => {
              const modelCosts = costsByModel[model] || [];
              modelCosts.forEach(c => {
                  itemsToDelete.push({ model: c.model, config_key: c.config_key });
              });
          });

          const token = getAdminToken();
          const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/model-costs/delete-bulk`, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(itemsToDelete)
          });

          if (!res.ok) throw new Error('Failed to prune models');

          fetchCosts();
      } catch (err) {
          console.error(err);
          alert('Failed to delete obsolete models');
      } finally {
          setSaving(null);
      }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold text-white">Model Costs</h1>
            <p className="text-gray-400 mt-1">Configure credit pricing for each model</p>
            </div>
            
            <div className="flex gap-2">
                {hasChanges && (
                <button
                    onClick={handleSaveAll}
                    disabled={!!saving}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg shadow-lg shadow-teal-500/20 transition-all animate-in fade-in zoom-in duration-200"
                >
                    {saving === 'bulk' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                    <Save className="w-4 h-4" />
                    )}
                    Save All Changes ({Object.keys(editedCosts).length})
                </button>
                )}

                <button
                onClick={syncFromConfig}
                disabled={!!saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    hasMissingModels 
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white animate-pulse' 
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
                title="Adds missing costs defined in frontend config"
                >
                {saving === 'sync' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Sync Config
                </button>
            </div>
        </div>

        {/* Missing Models Alert */}
        {hasMissingModels && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/20 rounded-full">
                        <RotateCcw className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-yellow-500">New Models Detected</h3>
                        <p className="text-sm text-yellow-200/70">
                            The following models are in your config but missing from the database:
                            <span className="font-mono ml-2 text-white bg-yellow-900/50 px-2 py-0.5 rounded">
                                {missingModels.map(m => m.label).join(', ')}
                            </span>
                        </p>
                    </div>
                </div>
                <button 
                    onClick={syncFromConfig}
                    disabled={!!saving}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-md text-sm font-medium transition-colors"
                >
                    Sync Now
                </button>
            </div>
        )}

        {/* Obsolete Models Alert */}
        {hasObsoleteModels && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-full">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-red-500">Obsolete Models Detected</h3>
                        <p className="text-sm text-red-200/70">
                            The following models are in the database but have been removed from your config:
                            <span className="font-mono ml-2 text-white bg-red-900/50 px-2 py-0.5 rounded">
                                {obsoleteModels.join(', ')}
                            </span>
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handlePrune}
                    disabled={!!saving}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md text-sm font-medium transition-colors"
                >
                    {saving === 'prune' ? (
                        <div className="flex items-center gap-2">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             Pruning...
                        </div>
                    ) : (
                        "Cleanup Obsolete"
                    )}
                </button>
            </div>
        )}
      </div>

      {/* Models */}
      <div className="space-y-6">
        {Object.entries(costsByModel).map(([model, modelCosts]) => (
          <div key={model} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div key={model} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                    <h2 className="text-xl font-semibold capitalize text-white">
                      {model.replace(/-/g, ' ')}
                    </h2>
                    
                     {/* Active Toggle (Global for all models) */}
                    {modelCosts.find(c => c.config_key === 'is_enabled') && (
                      <div className="flex items-center gap-3 mr-6">
                         <span className="text-sm font-medium text-gray-300">Active</span>
                         <button
                           onClick={() => {
                             const cost = modelCosts.find(c => c.config_key === 'is_enabled');
                             if (cost) handleSave(model, 'is_enabled', cost.credits === 1 ? 0 : 1);
                           }}
                           disabled={saving === `${model}/is_enabled`}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                             modelCosts.find(c => c.config_key === 'is_enabled')?.credits === 1
                               ? 'bg-teal-500'
                               : 'bg-gray-600'
                           }`}
                         >
                           <span
                             className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                               modelCosts.find(c => c.config_key === 'is_enabled')?.credits === 1
                                 ? 'translate-x-6'
                                 : 'translate-x-1'
                             }`}
                           />
                         </button>
                         {saving === `${model}/is_enabled` && <Loader2 className="h-4 w-4 animate-spin text-teal-500" />}
                      </div>
                    )}
                    
                    {/* Slow Mode Toggle (Standard) */}
                    {modelCosts.find(c => c.config_key === 'is_slow_mode_enabled') && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-300">Slow Mode</span>
                        <button
                          onClick={() => {
                            const cost = modelCosts.find(c => c.config_key === 'is_slow_mode_enabled');
                            if (cost) handleSave(model, 'is_slow_mode_enabled', cost.credits === 1 ? 0 : 1);
                          }}
                          disabled={saving === `${model}/is_slow_mode_enabled`}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                            modelCosts.find(c => c.config_key === 'is_slow_mode_enabled')?.credits === 1
                              ? 'bg-teal-500'
                              : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              modelCosts.find(c => c.config_key === 'is_slow_mode_enabled')?.credits === 1
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                         </button>
                         {saving === `${model}/is_slow_mode_enabled` && <Loader2 className="h-4 w-4 animate-spin text-teal-500" />}
                      </div>
                    )}
                    
                    {/* Granular Slow Mode Toggles (Nano Banana Pro) */}
                    {model === 'nano-banana-pro' && (
                        <div className="flex items-center gap-6">
                            {['1k', '2k', '4k'].map(res => {
                                const key = `is_slow_mode_enabled_${res}`;
                                const cost = modelCosts.find(c => c.config_key === key);
                                if (!cost) return null;
                                
                                return (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-300 uppercase">{res} Slow</span>
                                    <button
                                      onClick={() => handleSave(model, key, cost.credits === 1 ? 0 : 1)}
                                      disabled={saving === `${model}/${key}`}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                                        cost.credits === 1 ? 'bg-teal-500' : 'bg-gray-600'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          cost.credits === 1 ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                );
                            })}
                        </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {modelCosts
                      .filter(c => {
                          if (c.config_key === 'is_slow_mode_enabled') return false;
                          if (c.config_key.startsWith('is_slow_mode_enabled_')) return false; // Hide granular flags
                          if (c.config_key === 'is_enabled') return false;
                          
                          // Check if slow mode is enabled for this model (Standard)
                          const slowModeConfig = modelCosts.find(mc => mc.config_key === 'is_slow_mode_enabled');
                          const isSlowModeEnabled = slowModeConfig ? slowModeConfig.credits === 1 : true;
                          
                          // Granular checks for Nano Banana Pro
                          if (model === 'nano-banana-pro' && c.config_key.endsWith('-slow')) {
                              if (c.config_key.startsWith('1k-')) {
                                  const cfg = modelCosts.find(mc => mc.config_key === 'is_slow_mode_enabled_1k');
                                  if (cfg && cfg.credits === 0) return false;
                              }
                              if (c.config_key.startsWith('2k-')) {
                                  const cfg = modelCosts.find(mc => mc.config_key === 'is_slow_mode_enabled_2k');
                                  if (cfg && cfg.credits === 0) return false;
                              }
                              if (c.config_key.startsWith('4k-')) {
                                  const cfg = modelCosts.find(mc => mc.config_key === 'is_slow_mode_enabled_4k');
                                  if (cfg && cfg.credits === 0) return false;
                              }
                          } else if (!isSlowModeEnabled && c.config_key.endsWith('-slow')) {
                              // Fallback for standard models
                              return false;
                          }

                          // Nano Banana & Kling Models: ONLY show fast/slow keys
                          // This hides legacy keys like '1k', '16:9', 'default', '720p-10s' (without suffix) etc.
                          // Allow new models to pass through by default or add them here if they follow the standard pattern
                          if (model.startsWith('nano-banana') || model.startsWith('kling') || model.startsWith('wand')) {
                              if (!c.config_key.endsWith('-fast') && !c.config_key.endsWith('-slow')) {
                                  return false;
                              }
                          }
                          
                          return true;
                      })
                      .sort((a, b) => a.config_key.localeCompare(b.config_key))
                      .map((cost) => {
                        // Format key for display (e.g., "1080p-10s (Fast)")
                        let displayKey = cost.config_key;
                        const parts = cost.config_key.split('-');
                        const speed = parts[parts.length - 1];
                        const params = parts.slice(0, -1).join('-');
                        
                        let speedLabel = "";
                        if (speed === 'fast') speedLabel = " (Fast)";
                        if (speed === 'slow') speedLabel = " (Slow)";
                        
                        if (speedLabel) {
                            displayKey = params + speedLabel;
                        }

                        // Specific formatting to match screenshots
                        if (model === 'nano-banana' && params === 'default') {
                            displayKey = 'Base Cost' + speedLabel;
                        }
                        if (model === 'nano-banana-pro') {
                            if (params === '1k') displayKey = '1K' + speedLabel;
                            if (params === '2k') displayKey = '2K' + speedLabel;
                            if (params === '4k') displayKey = '4K' + speedLabel;
                        }

                        return (
                          <div key={cost.config_key} className="flex flex-col gap-2 p-3 bg-gray-700/30 rounded-lg border border-gray-700/50">
                            <div className="text-sm font-medium text-gray-300 truncate" title={cost.config_key}>
                              {displayKey}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={editedCosts[`${cost.model}/${cost.config_key}`] ?? cost.credits}
                                onChange={(e) => handleEdit(cost.model, cost.config_key, parseInt(e.target.value) || 0)}
                                className="flex h-9 w-full rounded-md border border-gray-600 bg-gray-600 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-teal-500 text-white"
                              />
                              {editedCosts[`${cost.model}/${cost.config_key}`] !== undefined && (
                                <button
                                  onClick={() => handleSave(cost.model, cost.config_key)}
                                  disabled={!!saving}
                                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-teal-500 text-white shadow hover:bg-teal-600 h-9 w-9"
                                >
                                  {saving === `${cost.model}/${cost.config_key}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
          </div>
        ))}
      </div>

      {costs.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No model costs configured.</p>
          <p className="text-sm mt-2">Click "Seed Default Costs" to initialize with default values.</p>
        </div>
      )}
    </div>
  );
}
