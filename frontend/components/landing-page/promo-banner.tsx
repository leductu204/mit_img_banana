"use client"

import { useEffect, useState } from "react"
import { Gift, ArrowRight } from "lucide-react"
import Link from "next/link"

export function PromoBanner() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 22,
    seconds: 41,
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev
        if (hours === 0 && minutes === 0 && seconds === 0) {
          // Reset or stop? Let's loop for demo purposes
          return { hours: 0, minutes: 22, seconds: 41 }
        }

        if (seconds > 0) {
          seconds--
        } else {
          seconds = 59
          if (minutes > 0) {
            minutes--
          } else {
            minutes = 59
            if (hours > 0) {
              hours--
            }
          }
        }
        return { hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (val: number) => val.toString().padStart(2, "0")

  return (
    <div className="bg-[#020817] text-white py-1.5 px-2 sm:px-4 flex flex-row flex-wrap sm:flex-nowrap items-center justify-center gap-x-4 gap-y-1 text-[10px] sm:text-xs md:text-sm border-b border-white/5">
      <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
        <Gift className="w-3.5 h-3.5 text-[#00BCD4]" />
        <span className="font-medium">
          <span className="text-[#00BCD4] font-bold">Miễn phí</span> <span className="hidden xs:inline">lên tới</span> 100 ảnh + 50 video<span className="hidden sm:inline">/tháng</span>
        </span>
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-2 bg-[#1A1F2E] px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-white/10">
        <span className="text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-wide">Kết thúc:</span>
        <div className="flex items-center gap-0.5 sm:gap-1 font-mono text-[#00BCD4] font-bold text-[10px] sm:text-xs">
          <span>{formatTime(timeLeft.hours)}</span>
           <span className="text-white/30">:</span>
          <span>{formatTime(timeLeft.minutes)}</span>
           <span className="text-white/30 hidden sm:inline">:</span>
          <span className="hidden sm:inline">{formatTime(timeLeft.seconds)}</span>
        </div>
      </div>

      <Link 
        href="image"
        className="flex items-center gap-1 text-[#00BCD4] font-bold hover:text-white transition-colors group ml-auto sm:ml-0 whitespace-nowrap"
      >
        Trải nghiệm <span className="hidden sm:inline">ngay</span>
        <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  )
}
