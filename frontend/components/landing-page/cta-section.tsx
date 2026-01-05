import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTASection() {
  return (
    <section className="py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary/10 px-6 py-16 sm:px-16 sm:py-24">
          {/* Background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-primary/20 blur-[100px]" />

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold text-foreground sm:text-4xl">
              Ready to streamline your workflow?
            </h2>
            <p className="mt-4 text-pretty text-lg text-muted-foreground">
              Join thousands of teams already automating their work. Start your free trial today — no credit card
              required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                Talk to Sales
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
