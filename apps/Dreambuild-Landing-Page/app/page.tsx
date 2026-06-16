import { getDreamBuildContent } from "@/lib/dreambuild-cms"
import { BlogsSection } from "@/components/landing/blogs-section"
import { ContactSection } from "@/components/landing/contact-section"
import { Footer } from "@/components/landing/footer"
import { GallerySection } from "@/components/landing/gallery-section"
import { HeroSection } from "@/components/landing/hero-section"
import { ProcessSection } from "@/components/landing/process-section"
import { ProjectsSection } from "@/components/landing/projects-section"
import { ServicesSection } from "@/components/landing/services-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { DreamBuildRealtimeRefresh } from "@/components/shared/dreambuild-realtime-refresh"
import { Header } from "@/components/shared/header"

export default async function Home() {
  const content = await getDreamBuildContent()

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <DreamBuildRealtimeRefresh />
      <Header />
      <HeroSection content={content.hero} />
      <ServicesSection services={content.services} header={content.servicesHeader} cta={content.servicesCta} />
      <GallerySection galleryItems={content.galleryItems} header={content.galleryHeader} />
      <ProjectsSection projects={content.projects} />
      <BlogsSection blogPosts={content.blogPosts} />
      <ProcessSection processSteps={content.processSteps} />
      <TestimonialsSection testimonials={content.testimonials} />
      <ContactSection contact={content.contact} />
      <Footer />
    </main>
  )
}
