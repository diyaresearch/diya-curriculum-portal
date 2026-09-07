import React from "react";
import useUserData from "@/hooks/useUserData";
import HeroSection from "./HeroSection";
import AudienceOverviewSection from "./AudienceOverviewSection";
import ExploreModulesSection from "./ExploreModulesSection";
import TestimonialsSection from "./TestimonialsSection";

const HomePage = ({ user }) => {
  
  const { user: fbUser, userData } = useUserData();
  const isLoggedIn = !!(user || fbUser || userData);

  return (
    <>
      <HeroSection />
      {!isLoggedIn && <AudienceOverviewSection />}     
      <ExploreModulesSection userData={userData} />
      <TestimonialsSection />
      {/* Footer or any content you want to keep below */}
    </>
  );
};

export default HomePage;
