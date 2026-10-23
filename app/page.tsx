import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { ProblemBridge } from "@/components/sections/ProblemBridge";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { SpendingControl } from "@/components/sections/SpendingControl";
import { TrustSection } from "@/components/sections/TrustSection";
import { CallToAction } from "@/components/sections/CallToAction";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProblemBridge />
        <HowItWorks />
        <SpendingControl />
        <TrustSection />
        <CallToAction />
      </main>
      <Footer />
    </>
  );
}
