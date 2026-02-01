'use client';

import { useEffect, useState } from 'react';
import { getAdminToken } from '@/contexts/AdminAuthContext';
import { NEXT_PUBLIC_API } from '@/lib/config';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  X
} from 'lucide-react';

interface Job {
  job_id: string;
  provider_job_id?: string;
  user_id: string;
  user_email?: string;
  type: string;
  model: string;
  prompt: string;
  status: string;
  credits_cost: number;
  created_at: string;
  input_params?: string;
  input_images?: string;
  output_url?: string;
  error_message?: string;
}

interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  pages: number;
}

export default function AdminJobsPage() {
  const [data, setData] = useState<JobsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const token = getAdminToken();
      const params = new URLSearchParams({ page: page.toString(), limit: '30' });
      if (status) params.append('status', status);
      if (model) params.append('model', model);
      if (search) params.append('user_search', search);

      const res = await fetch(`${NEXT_PUBLIC_API}/api/admin/stats/jobs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch jobs');
      const data = await res.json();
      setData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, status, model]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const statusOptions = ['', 'pending', 'processing', 'completed', 'failed'];
  const modelOptions = ['', 'nano-banana', 'nano-banana-pro', 'kling-2.5-turbo', 'kling-o1-video', 'kling-2.6'];

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Jobs</h1>
        <p className="text-gray-400 mt-1">Monitor all generation jobs</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user email..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
          </div>
        </form>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="">All Status</option>
          {statusOptions.slice(1).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        {/* Model Filter */}
        <select
          value={model}
          onChange={(e) => { setModel(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          <option value="">All Models</option>
          {modelOptions.slice(1).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">User</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Model</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Type</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Cost</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Time</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {data?.jobs.map((job) => (
                <tr key={job.job_id} className="hover:bg-gray-700/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <StatusIcon status={job.status} />
                      <span className={`text-sm ${
                        job.status === 'completed' ? 'text-green-400' :
                        job.status === 'failed' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white">{job.user_email || 'Unknown'}</td>
                  <td className="px-6 py-4 text-gray-300">{job.model}</td>
                  <td className="px-6 py-4 text-gray-400">{job.type}</td>
                  <td className="px-6 py-4 text-gray-400">-{job.credits_cost}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(job.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                        onClick={() => setSelectedJob(job)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium rounded-lg transition-colors"
                    >
                        <Eye className="w-3.5 h-3.5" />
                        View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Page {data.page} of {data.pages} ({data.total} jobs)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="p-2 rounded-lg bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setSelectedJob(null)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
             <div className="flex items-start justify-between">
                <div className="flex-1">
                   <h3 className="text-xl font-bold text-white mb-3">Job Details</h3>
                   <div className="space-y-2">
                      <div className="flex items-start gap-2">
                         <span className="text-gray-500 text-xs font-medium min-w-[100px]">Internal ID:</span>
                         <code className="text-gray-300 text-xs font-mono bg-gray-800 px-2 py-0.5 rounded">{selectedJob.job_id}</code>
                      </div>
                      {selectedJob.provider_job_id && (
                         <div className="flex items-start gap-2">
                            <span className="text-gray-500 text-xs font-medium min-w-[100px]">Provider ID:</span>
                            <code className="text-teal-400 text-xs font-mono bg-gray-800 px-2 py-0.5 rounded">{selectedJob.provider_job_id}</code>
                         </div>
                      )}
                   </div>
                </div>
                <button onClick={() => setSelectedJob(null)} className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
             </div>

             <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                    <p className="text-gray-500">Status</p>
                    <div className="flex items-center gap-2">
                        {selectedJob.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : selectedJob.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-red-400" />
                        ) : (
                            <Clock className="w-4 h-4 text-yellow-400" />
                        )}
                        <span className={`font-medium ${
                            selectedJob.status === 'completed' ? 'text-green-400' :
                            selectedJob.status === 'failed' ? 'text-red-400' :
                            'text-yellow-400'
                        }`}>{selectedJob.status}</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500">Model</p>
                    <p className="text-white font-mono bg-gray-800 px-2 py-1 rounded inline-block text-xs">{selectedJob.model}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500">Type</p>
                    <p className="text-white">{selectedJob.type.toUpperCase()}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500">Credits Cost</p>
                    <p className="text-white">-{selectedJob.credits_cost}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500">User</p>
                    <p className="text-white">{selectedJob.user_email || 'Unknown'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-gray-500">Created</p>
                    <p className="text-white text-xs">{new Date(selectedJob.created_at).toLocaleString()}</p>
                </div>
             </div>

             {selectedJob.prompt && (
                <div className="space-y-2">
                    <p className="text-gray-500 text-sm font-medium">Prompt</p>
                    <div className="bg-gray-950 rounded-lg p-4 text-sm text-gray-300 border border-gray-800">
                        {selectedJob.prompt}
                    </div>
                </div>
             )}

             {selectedJob.input_params && (
                <div className="space-y-2">
                    <p className="text-gray-500 text-sm font-medium">Input Parameters</p>
                    <div className="bg-gray-950 rounded-lg p-4 font-mono text-sm text-blue-300 overflow-x-auto border border-gray-800">
                        <pre>{JSON.stringify(JSON.parse(selectedJob.input_params), null, 2)}</pre>
                    </div>
                </div>
             )}

             {selectedJob.input_images && (() => {
                try {
                    const images = JSON.parse(selectedJob.input_images);
                    if (images && images.length > 0) {
                        return (
                            <div className="space-y-2">
                                <p className="text-gray-500 text-sm font-medium">Input Images ({images.length})</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {images.map((img: any, idx: number) => {
                                        const url = typeof img === 'string' ? img : img.url || img.public_url;
                                        return url ? (
                                            <div key={idx} className="bg-gray-950 rounded-lg p-3 border border-gray-800">
                                                <img 
                                                    src={url} 
                                                    alt={`Input ${idx + 1}`} 
                                                    className="w-full h-32 object-cover rounded-lg mb-2"
                                                />
                                                <a 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-teal-400 hover:text-teal-300 text-xs font-mono break-all underline"
                                                >
                                                    {url.slice(0, 50)}...
                                                </a>
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        );
                    }
                    return null;
                } catch {
                    return null;
                }
             })()}

             {selectedJob.output_url && (
                <div className="space-y-2">
                    <p className="text-gray-500 text-sm font-medium">Output URL</p>
                    <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
                        <a 
                            href={selectedJob.output_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-teal-400 hover:text-teal-300 text-sm font-mono break-all underline"
                        >
                            {selectedJob.output_url}
                        </a>
                    </div>
                </div>
             )}

             {selectedJob.error_message && (
                <div className="space-y-2">
                    <p className="text-gray-500 text-sm font-medium">Error Message</p>
                    <div className="bg-red-950/30 rounded-lg p-4 text-sm text-red-300 border border-red-800/50">
                        {selectedJob.error_message}
                    </div>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
