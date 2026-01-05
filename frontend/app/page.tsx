import { Header } from "@/components/landing-page/landing-header"
import { HeroSection } from "@/components/landing-page/hero-section"
import { PersonasSection } from "@/components/landing-page/personas-section"
import { HowItWorksSection } from "@/components/landing-page/how-it-works-section"
import { PricingSection } from "@/components/landing-page/pricing-section"
import { CommunitySection } from "@/components/landing-page/community-section"
import { Footer } from "@/components/landing-page/landing-footer"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {/* Screen 1: Hero */}
        <HeroSection />
        {/* Screen 2: 3 Persona Cards */}
        <PersonasSection />
        {/* Screen 3: How it works + Multi-modal tools */}
        <HowItWorksSection />
        {/* Screen 4: Pricing */}
        <PricingSection />
        {/* Screen 5: Community + Final CTA */}
        <CommunitySection />
      </main>
      <Footer />
    </div>
  )
}
