'use client';

import { useState } from 'react';
import { Plus, Terminal, BookOpen, ChevronRight, Code } from 'lucide-react';
import Header from '@/components/layout/Header';
import APIKeyList from '@/components/developers/APIKeyList';
import CreateKeyModal from '@/components/developers/CreateKeyModal';
import { useAuthContext } from '@/contexts/AuthContext';

export default function DevelopersPage() {
  const { user } = useAuthContext();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-emerald-400">
              Developer Dashboard
            </h1>
            <p className="text-gray-400 mt-2 text-lg">
              Manage API keys, monitor usage, and integrate our AI models.
            </p>
          </div>
          
          <div className="flex gap-3">
            <a 
              href="/docs" 
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 rounded-lg flex items-center gap-2 border border-gray-800 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Documentation
            </a>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all font-medium"
            >
              <Plus className="w-4 h-4" />
              Create New Key
            </button>
          </div>
        </div>

        {/* Stats / Overview Cards (Placeholder for now) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl">
            <div className="p-3 bg-purple-500/10 w-fit rounded-lg mb-4">
              <Terminal className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">API Endpoint</h3>
            <p className="font-mono text-sm text-gray-400">api.dtmanotool.io.vn/v1</p>
          </div>

          <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl">
            <div className="p-3 bg-blue-500/10 w-fit rounded-lg mb-4">
              <Code className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Integration</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
              Node.js SDK 
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
          
          <div className="p-6 bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-xl">
             <div className="p-3 bg-emerald-500/10 w-fit rounded-lg mb-4">
              <div className="w-6 h-6 font-bold text-emerald-400 flex items-center justify-center border-2 border-emerald-400 rounded-full text-xs">
                $
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Total Balance</h3>
             <p className="text-2xl font-bold text-white">{user?.credits || 0}</p>
             <p className="text-xs text-gray-500">Available to transfer</p>
          </div>
        </div>

        {/* API Keys List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Your API Keys</h2>
          </div>
          
          <APIKeyList refreshTrigger={refreshTrigger} />
        </section>
      </main>

      {showCreateModal && (
        <CreateKeyModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            // Don't close immediately, let user see the secret!
            // Actually, CreateKeyModal handles showing secret and then "Close" button.
            // But we passed onSuccess to refresh list in background.
          }} 
        />
      )}
    </div>
  );
}
