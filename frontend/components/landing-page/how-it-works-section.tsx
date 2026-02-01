import { Upload, Wand2, Download, Sparkles } from "lucide-react"

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload hoặc mô tả",
    description: "Tải ảnh lên hoặc viết prompt mô tả ý tưởng của bạn. Có 10k+ prompts mẫu sẵn có.",
  },
  {
    icon: Wand2,
    step: "02",
    title: "AI xử lý",
    description: "Chọn model AI phù hợp (FLUX, Kling, Veo3...). Hệ thống tự động tối ưu cho kết quả tốt nhất.",
  },
  {
    icon: Download,
    step: "03",
    title: "Download & Sử dụng",
    description: "Tải về ảnh/video chất lượng cao. Export đa định dạng, không watermark.",
  },
]

const tools = [
  { name: "Nano Banana Pro", type: "Image", tag: "Mới" },
  { name: "Kling 2.6", type: "Video", tag: "Hot" },
  { name: "Veo3", type: "Video", tag: "Mới" },
  { name: "Sora 2 Pro", type: "Video", tag: "Hot" },
  { name: "Fashional Style", type: "Image", tag: null },
  { name: "Upscale 4K", type: "Tool", tag: null },
]

export function HowItWorksSection() {
  return (
    <section className="relative py-12 sm:py-28">
      <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-primary/8 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Cách <span className="gradient-text">hoạt động</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            3 bước đơn giản để tạo content AI chất lượng cao
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={step.step} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/50 to-transparent" />
                )}

                <div className="glass-card p-8 text-center relative transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/30 group">
                  {/* Step number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
                    {step.step}
                  </div>

                  {/* Icon */}
                  <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-6 mt-4 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/25">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Multi-modal Tools */}
        <div className="glass-card p-8 sm:p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Multi-modal Tools</h3>
              <p className="text-muted-foreground text-sm">Model AI mới nhất, cập nhật liên tục</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className="bg-secondary hover:bg-secondary/80 border border-border rounded-xl p-4 text-center transition-all duration-300 cursor-pointer group hover:scale-105 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="text-foreground font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                  {tool.name}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-muted-foreground text-xs">{tool.type}</span>
                  {tool.tag && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                      {tool.tag}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
