"use client"

interface PieChartProps {
  data: { label: string; value: number; color: string }[]
  size?: number
  showLabels?: boolean
  title?: string
}

export function PieChart({ data, size = 200, showLabels = true, title }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = -90

  const createSlicePath = (startAngle: number, percentage: number) => {
    const angle = (percentage / 100) * 360
    const endAngle = startAngle + angle
    const radius = size / 2 - 10
    const cx = size / 2
    const cy = size / 2

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)

    const largeArc = angle > 180 ? 1 : 0

    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <h4 className="text-sm font-bold text-black">{title}</h4>}
      <svg width={size} height={size} className="drop-shadow-lg">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100
          const path = createSlicePath(currentAngle, percentage)
          currentAngle += (percentage / 100) * 360

          return (
            <path
              key={index}
              d={path}
              fill={item.color}
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-all duration-500 hover:opacity-80"
            />
          )
        })}
        <circle cx={size / 2} cy={size / 2} r={size / 4} fill="#FFFFFF" />
      </svg>

      {showLabels && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-[10px]">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-black font-medium truncate">
                {item.label}: {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
