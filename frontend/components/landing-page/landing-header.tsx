"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X, User } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { LoginModal } from "@/components/auth/LoginModal"

const navLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Ảnh", href: "/image" },
  { label: "Video", href: "/video" },
  { label: "Motion Control", href: "/motion-control" },
  { label: "Studio", href: "/studio" },
  { label: "Tiện ích", href: "/tools" },
]

import { PromoBanner } from "./promo-banner"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, isAuthenticated } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex flex-col">
       <PromoBanner />
       <div className="border-b border-border bg-background/80 backdrop-blur-xl w-full">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-9 w-9 overflow-hidden">
            <Image 
              src="/icon.png" 
              alt="TramSangTao Logo" 
              fill
              className="object-contain"
            />
          </div>
          <span className="font-manrope text-2xl font-bold tracking-tight text-white">Trạm Sáng Tạo</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side: User Icon / Login */}
        <div className="hidden items-center gap-4 md:flex">
          {isAuthenticated ? (
             <Link href="/image">
               <div 
                  className="h-10 w-10 rounded-full bg-cover bg-center border-2 border-white/10 cursor-pointer hover:border-[#00BCD4] transition-colors overflow-hidden"
                  style={{ 
                    backgroundImage: user?.avatar_url 
                      ? `url('${user.avatar_url}')` 
                      : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB1KxYmdvPTReXmusUu1jCkzaaZmGIiBSY-a59exHdU6qN-sKGwIc-TYs-IkSV92P57e9_NQCiCPvmc8c_yyOcCCPqDMd2q4INysTASevcJZyQeYNIEf9-0U7JFyS3kc5LdqMOTusXt_DuYMNobC2HIKgawNPUrpUb5jWv7Uelfe0PBsQ6szvupgEPK5gymWgOV155NXImA7hS-PXkrKtdoPOe6qTQRVAwSog1DrrG6JfqARJu8M7nw-sCSpbUXe98XVxGSiDpYqkg')" 
                  }}
                />
             </Link>
          ) : (
            <LoginModal>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-secondary">
                <User className="h-5 w-5 text-foreground" />
              </Button>
            </LoginModal>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
          {mobileMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col gap-1 p-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-4 py-3 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex justify-between items-center px-4">
               <span className="text-sm text-muted-foreground">Tài khoản</span>
               {isAuthenticated ? (
                 <Link href="/image" onClick={() => setMobileMenuOpen(false)}>
                    <div 
                      className="h-10 w-10 rounded-full bg-cover bg-center border-2 border-white/10 cursor-pointer"
                      style={{ 
                        backgroundImage: user?.avatar_url 
                          ? `url('${user.avatar_url}')` 
                          : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB1KxYmdvPTReXmusUu1jCkzaaZmGIiBSY-a59exHdU6qN-sKGwIc-TYs-IkSV92P57e9_NQCiCPvmc8c_yyOcCCPqDMd2q4INysTASevcJZyQeYNIEf9-0U7JFyS3kc5LdqMOTusXt_DuYMNobC2HIKgawNPUrpUb5jWv7Uelfe0PBsQ6szvupgEPK5gymWgOV155NXImA7hS-PXkrKtdoPOe6qTQRVAwSog1DrrG6JfqARJu8M7nw-sCSpbUXe98XVxGSiDpYqkg')" 
                      }}
                    />
                 </Link>
               ) : (
                 <LoginModal>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <User className="h-5 w-5" />
                    </Button>
                 </LoginModal>
               )}
            </div>
          </nav>
        </div>
      )}
      </div>
    </header>
  )
}
