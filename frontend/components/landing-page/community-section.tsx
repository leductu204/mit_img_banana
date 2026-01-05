import { Button } from "@/components/ui/button"
import { ArrowRight, MessageCircle, Users, Gift, Sparkles } from "lucide-react"

const communityStats = [
  { icon: Users, value: "10,000+", label: "Thành viên" },
  { icon: MessageCircle, value: "24/7", label: "Hỗ trợ nhanh" },
  { icon: Gift, value: "FREE", label: "Tips & Prompts" },
]

export function CommunitySection() {
  return (
    <section id="community" className="relative py-20 sm:py-28">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-primary/10 blur-[150px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left: Community */}
          <div className="glass-card p-8 sm:p-12 transition-all duration-500 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-primary" />
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Cộng đồng <span className="gradient-text">Zalo</span>
            </h2>

            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              Tham gia 10k+ creators VN.
              <br />
              Share prompt hay, case study, trend mới.
              <br />
              Hỗ trợ 24/7 từ team.
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {communityStats.map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} className="bg-secondary rounded-xl p-4 text-center transition-transform duration-300 hover:scale-105 hover:bg-secondary/80">
                    <Icon className="h-5 w-5 text-primary mx-auto mb-2" />
                    <div className="text-lg font-bold text-foreground">{stat.value}</div>
                    <div className="text-muted-foreground text-xs">{stat.label}</div>
                  </div>
                )
              })}
            </div>

            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto gap-2 border-primary text-primary hover:bg-primary/10 rounded-full bg-transparent"
            >
              Tham gia cộng đồng Zalo
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Right: Final CTA */}
          <div className="glass-card p-8 sm:p-12 flex flex-col justify-center transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 group">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 leading-tight">
              Bắt đầu tạo content AI
              <br />
              <span className="gradient-text">ngay hôm nay</span>
            </h2>

            <p className="text-muted-foreground text-lg mb-8">
              Hỗ trợ tất cả cho công việc của bạn trong 1 Studio duy nhất.
            </p>

            <Button
              size="lg"
              className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground font-bold hover:bg-primary-hover btn-glow rounded-full text-lg px-10 py-6"
              asChild
            >
              <a href="#pricing">
                Bắt đầu - Chỉ từ 99K
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>

            <a href="#" className="mt-4 text-muted-foreground hover:text-primary text-sm transition-colors">
              Xem demo →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
