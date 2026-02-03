"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Area } from "recharts"

interface CreditUsageChartProps {
  data: {
    date: string
    value: number
  }[]
}

export function CreditUsageChart({ data }: CreditUsageChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis 
          dataKey="date" 
          stroke="#9CA3AF" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false}
        />
        <YAxis 
          stroke="#9CA3AF" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-gray-800 border border-gray-700 p-2 rounded-lg shadow-xl">
                  <p className="text-gray-400 text-xs mb-1">{label}</p>
                  <p className="text-teal-400 font-bold">
                    {payload[0].value} credits
                  </p>
                </div>
              )
            }
            return null
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#2DD4BF"
          strokeWidth={3}
          activeDot={{ r: 6, fill: "#2DD4BF", stroke: "#fff", strokeWidth: 2 }}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
