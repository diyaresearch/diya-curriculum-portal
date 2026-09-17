import type { User } from "firebase/auth";

import useUserData from "@/hooks/useUserData";
import HeroSection from "./HeroSection";
import AudienceOverviewSection from "./AudienceOverviewSection";
import ExploreModulesSection from "./ExploreModulesSection";
import TestimonialsSection from "./TestimonialsSection";

export interface HomePageProps {
  /**
   * The signed-in user as the route already has it. This component reads the
   * same value out of the auth context anyway; the prop only lets the route
   * decide before the context has settled.
   */
  user?: User | null;
}

const HomePage = ({ user }: HomePageProps) => {
  const { user: fbUser, userData } = useUserData();
  const isLoggedIn = !!(user || fbUser || userData);

  return (
    <>
      <HeroSection />
      {!isLoggedIn && <AudienceOverviewSection />}
      {/* ExploreModulesSection reads the role it needs from the auth
          context itself; it has never taken a userData prop. */}
      <ExploreModulesSection />
      <TestimonialsSection />
    </>
  );
};

export default HomePage;
