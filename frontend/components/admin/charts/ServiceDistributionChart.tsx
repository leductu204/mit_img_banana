"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface ServiceDistributionChartProps {
  data: {
    service: string
    count: number
    percentage: number
  }[]
}

const COLORS = [
  "#2DD4BF", // Teal
  "#A78BFA", // Purple
  "#F472B6", // Pink
  "#60A5FA", // Blue
  "#FBBF24", // Amber
  "#34D399", // Green
]

export function ServiceDistributionChart({ data }: ServiceDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="count"
          nameKey="service"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="bg-gray-800 border border-gray-700 p-2 rounded-lg shadow-xl">
                  <p className="text-white font-medium mb-1 capitalize">{data.service}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">Count:</span>
                    <span className="text-white font-bold">{data.count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">Share:</span>
                    <span className="text-teal-400 font-bold">{data.percentage}%</span>
                  </div>
                </div>
              )
            }
            return null
          }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value) => <span className="text-gray-400 text-xs capitalize">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
