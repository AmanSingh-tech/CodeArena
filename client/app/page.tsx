import { Header } from "@/components/header"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { HeroSection } from "@/components/hero-section"
import { FeatureCards } from "@/components/feature-cards"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex min-h-screen w-full flex-1 flex-col">
        <Header />
        <main className="w-full flex-1 overflow-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-6xl">
            <HeroSection />
            <FeatureCards />
            <Footer />
          </div>
        </main>
      </SidebarInset>
    </>
  )
}
