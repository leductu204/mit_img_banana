import { Users, TrendingUp, Settings, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const personas = [
  {
    icon: TrendingUp,
    title: "Affiliate Marketing",
    tagline: "1 ảnh → 100 video review tự động",
    description: "Tạo video review sản phẩm hàng loạt từ 1 ảnh. Tối ưu cho TikTok Shop, Shopee Affiliate.",
    features: ["Auto review video", "Bulk export", "Template có sẵn", "Watermark tùy chỉnh"],
    cta: "Bắt đầu Affiliate",
  },
  {
    icon: Users,
    title: "Content Creator",
    tagline: "Ảnh/banner ads trong 2 phút",
    description: "Tạo content chất lượng cao cho mọi nền tảng. Facebook, Instagram, TikTok, YouTube.",
    features: ["Ảnh AI chất lượng cao", "Banner ads mọi size", "Remove background", "Upscale 4K"],
    cta: "Bắt đầu Create",
    featured: true,
  },
  {
    icon: Settings,
    title: "Automation Lovers",
    tagline: "10k prompts + workflow hàng loạt",
    description: "Xử lý hàng ngàn task cùng lúc. Tích hợp API, workflow tự động, export đa định dạng.",
    features: ["10,000+ prompts", "Batch processing", "API integration", "Scheduled tasks"],
    cta: "Bắt đầu Automation",
  },
]

export function PersonasSection() {
  return (
    <section id="features" className="relative py-12 sm:py-28">
      <div className="absolute top-1/2 left-0 -translate-y-1/2 h-[500px] w-[300px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Bạn là <span className="gradient-text">ai?</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Studio AI được thiết kế cho 3 nhóm người dùng chính. Chọn profile cho bạn.
          </p>
        </div>

        {/* Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {personas.map((persona) => {
            const Icon = persona.icon
            return (
              <div
                key={persona.title}
                className={`glass-card glass-card-hover p-8 flex flex-col transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-primary/40 ${persona.featured ? "border-primary/40 relative shadow-primary/10" : "hover:bg-card/60"}`}
              >
                {persona.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    PHỔ BIẾN NHẤT
                  </div>
                )}

                {/* Icon */}
                <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
                  <Icon className="h-7 w-7 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-2">{persona.title}</h3>
                <p className="text-primary font-medium text-sm mb-3">{persona.tagline}</p>
                <p className="text-muted-foreground text-sm mb-6 flex-grow">{persona.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-8">
                  {persona.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className={`w-full rounded-xl gap-2 ${persona.featured ? "bg-primary text-primary-foreground hover:bg-primary-hover btn-glow" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                >
                  {persona.cta}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
