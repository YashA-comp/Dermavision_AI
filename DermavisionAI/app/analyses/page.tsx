'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Analysis {
  id: string;
  symptoms: string;
  riskLevel: 'low' | 'medium' | 'high';
  skinConditions: string;
  aiResponse: string;
  confidence: number;
  analysisDate: string;
  notes?: string;
}

const riskLevelColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [riskFilter, setRiskFilter] = useState<string>('');

  useEffect(() => {
    fetchAnalyses();
  }, [page, riskFilter]);

  async function fetchAnalyses() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (riskFilter) params.append('riskLevel', riskFilter);

      const response = await fetch(`/api/analyses?${params}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setAnalyses(data.data);
      setTotal(data.pagination.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analyses');
      setAnalyses([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAnalysis(id: string) {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    try {
      const response = await fetch(`/api/analyses/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      
      setAnalyses(analyses.filter(a => a.id !== id));
      setTotal(total - 1);
    } catch (err: any) {
      alert('Error deleting analysis: ' + err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Analysis History</h1>
          <p className="text-slate-400">View all saved skin analyses</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            ← Back to Scanner
          </Link>
          <select
            value={riskFilter}
            onChange={(e) => {
              setRiskFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600"
          >
            <option value="">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <p className="text-slate-400 mt-4">Loading analyses...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-300 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && analyses.length === 0 && (
          <div className="text-center py-12 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-slate-400 text-lg">No analyses found</p>
            <Link
              href="/"
              className="mt-4 inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              Create your first analysis
            </Link>
          </div>
        )}

        {/* Analyses List */}
        {!loading && analyses.length > 0 && (
          <div>
            <div className="grid gap-4 mb-6">
              {analyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 hover:bg-slate-700 transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            riskLevelColors[analysis.riskLevel]
                          }`}
                        >
                          {analysis.riskLevel.toUpperCase()} RISK
                        </span>
                        <span className="text-slate-400 text-sm">
                          {new Date(analysis.analysisDate).toLocaleDateString()} at{' '}
                          {new Date(analysis.analysisDate).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-300">
                        <strong>Symptoms:</strong> {analysis.symptoms || 'None reported'}
                      </p>
                      <p className="text-slate-300 mt-2">
                        <strong>Conditions:</strong> {JSON.parse(analysis.skinConditions)[0] || 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteAnalysis(analysis.id)}
                      className="ml-4 px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-sm transition"
                    >
                      Delete
                    </button>
                  </div>

                  {/* AI Response Preview */}
                  <div className="mb-3 p-3 bg-slate-800/50 rounded border border-slate-600">
                    <p className="text-slate-200 text-sm">
                      <strong>AI Analysis:</strong> {analysis.aiResponse.substring(0, 150)}...
                    </p>
                  </div>

                  {/* Notes */}
                  {analysis.notes && (
                    <div className="text-slate-300 text-sm">
                      <strong>Notes:</strong> {analysis.notes}
                    </div>
                  )}

                  {/* ID */}
                  <p className="text-xs text-slate-500 mt-3">ID: {analysis.id}</p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {Math.ceil(total / 10) > 1 && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-slate-700 disabled:opacity-50 text-white rounded hover:bg-slate-600 transition"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-slate-400">
                  Page {page} of {Math.ceil(total / 10)}
                </span>
                <button
                  onClick={() => setPage(Math.min(Math.ceil(total / 10), page + 1))}
                  disabled={page >= Math.ceil(total / 10)}
                  className="px-4 py-2 bg-slate-700 disabled:opacity-50 text-white rounded hover:bg-slate-600 transition"
                >
                  Next
                </button>
              </div>
            )}

            {/* Summary */}
            <div className="mt-8 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
              <p className="text-slate-300">
                <strong>Total Analyses:</strong> {total}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
