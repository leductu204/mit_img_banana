import { Workflow, Zap, BarChart3, Shield } from "lucide-react"

const features = [
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    description:
      "Create powerful automations with our drag-and-drop builder. No coding required. Connect apps and design workflows in minutes.",
  },
  {
    icon: Zap,
    title: "Lightning Fast Execution",
    description:
      "Run thousands of automated tasks per second. Our infrastructure ensures your workflows execute instantly, every time.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Track performance with detailed dashboards. Monitor task completion, identify bottlenecks, and optimize your processes.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Bank-grade encryption, SOC 2 compliance, and granular permissions. Your data stays secure and under your control.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-12 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Features</p>
          <h2 className="mt-2 text-balance text-3xl font-bold text-foreground sm:text-4xl">
            Everything you need to automate at scale
          </h2>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            Powerful features designed for teams who want to move fast and ship faster.
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-secondary/50"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
