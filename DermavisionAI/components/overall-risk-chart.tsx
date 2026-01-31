"use client"

import { PieChart } from "./pie-chart"

interface OverallRiskChartProps {
  riskScore: number // 0-1
  labels: {
    riskLevel: string
    safe: string
  }
  riskColor: string
}

export function OverallRiskChart({ riskScore, labels, riskColor }: OverallRiskChartProps) {
  const percentage = riskScore * 100
  const safePercentage = 100 - percentage

  const data = [
    { label: labels.riskLevel, value: percentage, color: riskColor },
    { label: labels.safe, value: safePercentage, color: "#E0E0E0" }, // light gray for safe
  ]

  return (
    <div className="flex flex-col items-center">
      <PieChart data={data} size={180} showLabels={false} />
      <div className="mt-4 text-center">
        <p className="text-4xl font-bold text-black">{percentage.toFixed(0)}%</p>
        <p className="text-sm text-gray-600 mt-1">{labels.riskLevel}</p>
      </div>
    </div>
  )
}
