'use client';

import { useEffect, useState } from 'react';
import { getAdminToken } from '@/contexts/AdminAuthContext';
import { Loader2, Save, RotateCcw } from 'lucide-react';

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
      const res = await fetch('http://localhost:8000/admin/model-costs', {
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

  const handleSave = async (model: string, configKey: string) => {
    const key = `${model}/${configKey}`;
    const newCredits = editedCosts[key];
    if (newCredits === undefined) return;

    setSaving(key);
    try {
      const token = getAdminToken();
      const res = await fetch('http://localhost:8000/admin/model-costs', {
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

  const seedDefaults = async () => {
    try {
      const token = getAdminToken();
      await fetch('http://localhost:8000/admin/model-costs/seed-defaults', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchCosts();
    } catch (err) {
      console.error(err);
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
      const res = await fetch('http://localhost:8000/admin/model-costs/bulk', {
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
    'kling-2.6': 'Kling 2.6'
  };

  const hasChanges = Object.keys(editedCosts).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
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

            {costs.length === 0 && (
              <button
                onClick={seedDefaults}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                <RotateCcw className="w-4 h-4" />
                Seed Default Costs
              </button>
            )}
        </div>
      </div>

      {/* Models */}
      <div className="space-y-6">
        {Object.entries(costsByModel).map(([model, modelCosts]) => (
          <div key={model} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modelDisplayNames[model] || model}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modelCosts.map((cost) => {
                const key = `${cost.model}/${cost.config_key}`;
                const isEdited = editedCosts[key] !== undefined;
                const currentValue = isEdited ? editedCosts[key] : cost.credits;

                return (
                  <div 
                    key={cost.config_key}
                    className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
                  >
                    <span className="text-gray-300">{cost.config_key}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={currentValue}
                        onChange={(e) => handleEdit(cost.model, cost.config_key, parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-1.5 bg-gray-600 border border-gray-500 rounded text-white text-center"
                      />
                      {isEdited && (
                        <button
                          onClick={() => handleSave(cost.model, cost.config_key)}
                          disabled={saving === key}
                          className="p-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded"
                        >
                          {saving === key ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
