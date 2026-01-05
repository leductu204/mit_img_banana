import { Button } from "@/components/ui/button"
import { Check, Zap, Clock, ImageIcon, Video, Layers, Bell } from "lucide-react"

const plans = [
  {
    name: "GÓI TRẢI NGHIỆM",
    badge: "BONUS",
    badgeColor: "bg-blue-500",
    price: "99.000",
    originalCredits: "1500",
    credits: "2000",
    duration: "1 tháng",
    features: [
      { icon: ImageIcon, text: "400 Ảnh/tháng" },
      { icon: Video, text: "100 Video/tháng" },
      { icon: Layers, text: "2 luồng xử lý song song", sub: "5 Hàng đợi" },
      { icon: Zap, text: "Fast Mode" },
    ],
    cta: "Đăng ký ngay",
    popular: false,
    comingSoon: false,
  },
  {
    name: "GÓI TIẾT KIỆM",
    badge: "PHỔ BIẾN",
    badgeColor: "bg-pink-500",
    price: "199.000",
    originalCredits: "3000",
    credits: "4500",
    duration: "1 tháng",
    features: [
      { icon: ImageIcon, text: "900 Ảnh/tháng" },
      { icon: Video, text: "250 Video/tháng" },
      { icon: Layers, text: "4 luồng xử lý song song", sub: "15 Hàng đợi" },
      { icon: Zap, text: "Fast Mode (Ưu tiên)" },
    ],
    cta: "ĐĂNG KÝ NGAY",
    popular: true,
    comingSoon: false,
  },
  {
    name: "GÓI SÁNG TẠO",
    badge: "EXTRA",
    badgeColor: "bg-green-500",
    price: "499.000",
    originalCredits: "7500",
    credits: "13000",
    duration: "1 tháng",
    features: [
      { icon: ImageIcon, text: "2600 Ảnh/tháng" },
      { icon: Video, text: "700 Video/tháng" },
      { icon: Layers, text: "6 luồng xử lý song song", sub: "30 Hàng đợi" },
      { icon: Zap, text: "Fast Mode" },
    ],
    cta: "Đăng ký ngay",
    popular: false,
    comingSoon: false,
  },
  {
    name: "UNLIMITED",
    subName: "(SẮP RA MẮT)",
    badge: "INCOMING",
    badgeColor: "bg-orange-500",
    price: "INCOMING",
    credits: "Toàn bộ",
    duration: "1 Năm",
    features: [
      { icon: Check, text: "Không giới hạn Credit" },
      { icon: Check, text: "Full tính năng Pro" },
      { icon: Check, text: "Hỗ trợ VIP 24/7" },
      { icon: Check, text: "Tốc độ xử lý tối đa" },
    ],
    cta: "Nhận thông báo",
    popular: false,
    comingSoon: true,
  },
] as {
  name: string
  badge?: string
  badgeColor?: string
  price: string
  originalCredits?: string
  credits: string
  duration: string
  features: { icon: any; text: string; sub?: string }[]
  cta: string
  popular: boolean
  comingSoon: boolean
  subName?: string
}[]

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-20 sm:py-28">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-primary/8 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Chọn gói <span className="gradient-text">phù hợp</span> với bạn
          </h2>
          <p className="text-primary text-lg">Bắt đầu từ 99K - Giảm 60% so với các công cụ khác</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card p-6 flex flex-col relative transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group ${
                plan.popular
                  ? "border-2 border-pink-500/50 scale-105 z-10 shadow-[0_0_40px_rgba(236,72,153,0.2)] hover:shadow-[0_0_60px_rgba(236,72,153,0.4)]"
                  : plan.comingSoon
                    ? "opacity-90 hover:opacity-100"
                    : "hover:border-primary/30 hover:bg-card/60"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute -top-3 right-4 ${plan.badgeColor} text-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  {plan.badge}
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6 text-center">
                <h3 className="text-sm font-bold text-muted-foreground tracking-wider mb-1 group-hover:text-foreground transition-colors">{plan.name}</h3>
                {plan.subName && <span className="text-xs text-success font-medium">{plan.subName}</span>}

                {/* Price */}
                <div className="mt-4">
                  {plan.comingSoon ? (
                    <div className="text-3xl font-bold text-warning">{plan.price}</div>
                  ) : (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl sm:text-4xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">VND</span>
                    </div>
                  )}
                </div>

                {/* Credits */}
                <div className="mt-2 flex items-center justify-center gap-2">
                  {plan.originalCredits && (
                    <span className="text-muted-foreground line-through text-sm">{plan.originalCredits}</span>
                  )}
                  <span className="text-primary font-bold">{plan.credits} Credits</span>
                </div>

                {/* Duration */}
                <div className="mt-2 flex items-center justify-center gap-1 text-muted-foreground text-sm">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{plan.duration}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, idx) => {
                  const Icon = feature.icon
                  return (
                    <div key={idx} className="flex items-start gap-3 bg-secondary rounded-xl p-3 transition-colors duration-300 hover:bg-white/10">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary group-hover:text-primary-foreground transition-colors" />
                      <div>
                        <span className="text-sm text-foreground">
                          {(() => {
                            const match = feature.text.match(/^(\d+)\s+(.*)$/)
                            if (match) {
                              return (
                                <>
                                  <span className="text-primary font-bold text-base">{match[1]}</span> {match[2]}
                                </>
                              )
                            }
                            return feature.text
                          })()}
                        </span>
                        {feature.sub && <span className="block text-xs text-muted-foreground">{feature.sub}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* CTA */}
              <Button
                className={`w-full rounded-xl py-5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                  plan.popular
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-foreground hover:from-pink-600 hover:to-purple-600 font-bold shadow-pink-500/20 hover:shadow-pink-500/40"
                    : plan.comingSoon
                      ? "bg-transparent border border-warning/50 text-warning hover:bg-warning/10"
                      : "bg-transparent border border-primary/50 text-primary hover:bg-primary hover:text-white hover:border-primary shadow-primary/10 hover:shadow-primary/30"
                }`}
              >
                {plan.comingSoon && <Bell className="h-4 w-4 mr-2" />}
                {plan.popular && <Check className="h-4 w-4 mr-2" />}
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* Bottom text */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Tất cả gói đều hỗ trợ các model AI mới nhất: Kling 2.0, Veo3, FLUX, Midjourney Style, Remove BG, Upscale 4K
          </p>
          <a
            href="#"
            className="text-primary hover:text-primary-hover text-sm font-medium inline-flex items-center gap-1"
          >
            Xem tất cả tính năng
            <span>→</span>
          </a>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Thanh toán Momo, Bank</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Hoàn tiền 7 ngày</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span>Hủy bất cứ lúc nào</span>
          </div>
        </div>
      </div>
    </section>
  )
}
