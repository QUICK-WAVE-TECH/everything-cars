import {
  HeroSection,
  BrandMarquee,
  AboutSection,
  ServicesSection,
  TestimonialsSection,
  FAQSection,
  LoyaltyBand,
} from "@/features/website/sections";
import { ScrollReveal } from "@/shared/motion/scroll-reveal";

export default function LandingPage() {
  return (
    <>
      {/* Hero animates itself on load; the brand strip loops on its own. The
          remaining sections unfold as they scroll into view. */}
      <HeroSection />
      <BrandMarquee />
      <ScrollReveal>
        <AboutSection />
      </ScrollReveal>
      <ScrollReveal>
        <ServicesSection />
      </ScrollReveal>
      <ScrollReveal>
        <TestimonialsSection />
      </ScrollReveal>
      <ScrollReveal>
        <FAQSection />
      </ScrollReveal>
      <ScrollReveal>
        <LoyaltyBand />
      </ScrollReveal>
    </>
  );
}
