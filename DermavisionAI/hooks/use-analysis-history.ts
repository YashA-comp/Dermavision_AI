"use client";

import { useState, useCallback, useEffect } from "react";

export interface Analysis {
  id: string;
  imageBase64: string;
  symptoms: string;
  riskLevel: string;
  skinConditions: string;
  recommendations: string;
  aiResponse: string;
  confidence?: number;
  analysisDate: string;
  updatedAt: string;
  notes?: string;
}

export function useAnalysisHistory() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Fetch all analyses
  const fetchAnalyses = useCallback(
    async (page = 1, riskLevel?: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });
        if (riskLevel) params.append("riskLevel", riskLevel);

        const response = await fetch(`/api/analyses?${params}`);
        if (!response.ok) throw new Error("Failed to fetch analyses");

        const { data, pagination: paginationData } = await response.json();
        setAnalyses(data);
        setPagination(paginationData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Get a single analysis
  const getAnalysis = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/analyses/${id}`);
      if (!response.ok) throw new Error("Failed to fetch analysis");
      return await response.json();
    } catch (err: any) {
      console.error(err.message);
      return null;
    }
  }, []);

  // Update analysis notes
  const updateNotes = useCallback(async (id: string, notes: string) => {
    try {
      const response = await fetch(`/api/analyses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error("Failed to update notes");
      return await response.json();
    } catch (err: any) {
      console.error(err.message);
      return null;
    }
  }, []);

  // Delete an analysis
  const deleteAnalysis = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/analyses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete analysis");
      // Refresh the list
      await fetchAnalyses();
      return true;
    } catch (err: any) {
      console.error(err.message);
      return false;
    }
  }, [fetchAnalyses]);

  // Load analyses on mount
  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  return {
    analyses,
    loading,
    error,
    pagination,
    fetchAnalyses,
    getAnalysis,
    updateNotes,
    deleteAnalysis,
  };
}
