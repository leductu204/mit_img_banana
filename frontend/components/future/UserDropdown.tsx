"use client"

import { User } from "lucide-react"

interface UserDropdownProps {
  user?: any
}

export function UserDropdown({ user }: UserDropdownProps) {
  return (
    <button className="w-8 h-8 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/50">
      {user?.avatar ? (
        <img src={user.avatar} alt="User" className="w-full h-full rounded-full object-cover" />
      ) : (
        <User className="w-4 h-4 text-brand-primary" />
      )}
    </button>
  )
}
