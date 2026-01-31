"use client";

import React, { useState } from "react";
import { useAnalysisHistory } from "@/hooks/use-analysis-history";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { TrashIcon, ExternalLinkIcon } from "lucide-react";

export function AnalysisHistoryPage() {
  const {
    analyses,
    loading,
    error,
    pagination,
    fetchAnalyses,
    deleteAnalysis,
  } = useAnalysisHistory();

  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleFilterByRisk = (risk: string) => {
    setSelectedRiskLevel(risk === selectedRiskLevel ? undefined : risk);
    fetchAnalyses(1, risk === selectedRiskLevel ? undefined : risk);
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading && analyses.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analysis History</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all your previous skin analyses
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Filter Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedRiskLevel ? "outline" : "default"}
          onClick={() => {
            setSelectedRiskLevel(undefined);
            fetchAnalyses(1);
          }}
        >
          All
        </Button>
        <Button
          variant={selectedRiskLevel === "low" ? "default" : "outline"}
          className={selectedRiskLevel === "low" ? "bg-green-600 hover:bg-green-700" : ""}
          onClick={() => handleFilterByRisk("low")}
        >
          Low Risk
        </Button>
        <Button
          variant={selectedRiskLevel === "medium" ? "default" : "outline"}
          className={selectedRiskLevel === "medium" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
          onClick={() => handleFilterByRisk("medium")}
        >
          Medium Risk
        </Button>
        <Button
          variant={selectedRiskLevel === "high" ? "default" : "outline"}
          className={selectedRiskLevel === "high" ? "bg-red-600 hover:bg-red-700" : ""}
          onClick={() => handleFilterByRisk("high")}
        >
          High Risk
        </Button>
      </div>

      {/* Analyses List */}
      <div className="space-y-4">
        {analyses.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No analyses found</p>
            </CardContent>
          </Card>
        ) : (
          analyses.map((analysis) => (
            <Card
              key={analysis.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() =>
                setExpandedId(expandedId === analysis.id ? null : analysis.id)
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        Analysis from{" "}
                        {new Date(analysis.analysisDate).toLocaleDateString()}
                      </CardTitle>
                      <Badge className={getRiskLevelColor(analysis.riskLevel)}>
                        {analysis.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription>
                      {new Date(analysis.analysisDate).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteAnalysis(analysis.id);
                    }}
                  >
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardHeader>

              {expandedId === analysis.id && (
                <CardContent className="space-y-4">
                  {/* Symptoms */}
                  <div>
                    <h3 className="font-semibold mb-2">Symptoms</h3>
                    <p className="text-sm text-muted-foreground">
                      {analysis.symptoms || "No symptoms recorded"}
                    </p>
                  </div>

                  {/* Skin Conditions */}
                  <div>
                    <h3 className="font-semibold mb-2">Detected Conditions</h3>
                    <div className="flex gap-2 flex-wrap">
                      {JSON.parse(analysis.skinConditions || "[]").map(
                        (condition: string, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {condition}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>

                  {/* AI Response */}
                  <div>
                    <h3 className="font-semibold mb-2">AI Analysis</h3>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto bg-muted p-3 rounded">
                      {analysis.aiResponse}
                    </p>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="font-semibold mb-2">Recommendations</h3>
                    <ul className="text-sm list-disc list-inside space-y-1">
                      {JSON.parse(analysis.recommendations || "[]").map(
                        (rec: string, idx: number) => (
                          <li key={idx} className="text-muted-foreground">
                            {rec}
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  {/* Notes */}
                  {analysis.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <p className="text-sm text-muted-foreground italic">
                        {analysis.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() => fetchAnalyses(pagination.page - 1, selectedRiskLevel)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchAnalyses(pagination.page + 1, selectedRiskLevel)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
