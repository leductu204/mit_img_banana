import { Sparkles } from "lucide-react"
import Image from "next/image"

const footerLinks = {
  "Sản phẩm": ["Tạo ảnh AI", "Tạo video AI", "Automation", "API", "Pricing"],
  "Hỗ trợ": ["Hướng dẫn", "FAQ", "Zalo Group", "Email Support"],
  "Công ty": ["Về chúng tôi", "Blog", "Liên hệ"],
  "Pháp lý": ["Điều khoản", "Bảo mật", "Chính sách hoàn tiền"],
}

const socialLinks = [
  { name: "Facebook", href: "#" },
  { name: "Zalo", href: "#" },
  { name: "TikTok", href: "#" },
  { name: "YouTube", href: "#" },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-background-dark">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-6">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-2">
              <div className="relative h-9 w-9 overflow-hidden">
                <Image src="/icon.png" alt="Logo" fill className="object-contain" />
              </div>
              <span className="text-xl font-semibold text-foreground">Trạm Sáng Tạo</span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Nền tảng tạo ảnh & video AI giá rẻ nhất Việt Nam. Được tin dùng bởi 10,000+ creator.
            </p>
            {/* Social Links */}
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  aria-label={social.name}
                >
                  {social.name}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground">{category}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Trạm Sáng Tạo. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">Made with ❤️ for Vietnamese creators</p>
        </div>
      </div>
    </footer>
  )
}
