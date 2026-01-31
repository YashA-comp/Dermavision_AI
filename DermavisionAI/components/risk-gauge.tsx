"use client"

interface RiskGaugeProps {
  percentage: number
  size?: number
}

export function RiskGauge({ percentage, size = 192 }: RiskGaugeProps) {
  const getColor = () => {
    if (percentage >= 90) return "#dc2626"
    if (percentage >= 75) return "#f97316"
    if (percentage >= 50) return "#eab308"
    return "#136C64"
  }

  const radius = size / 2 - 16
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E9DAA5" strokeWidth="16" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth="16"
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-5xl font-bold text-derma-teal-dark">{percentage}%</span>
      </div>
    </div>
  )
}
