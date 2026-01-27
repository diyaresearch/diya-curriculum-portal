import React from "react";
import useUserData from "../hooks/useUserData";
import HeroSection from "../components/HeroSection";
import AudienceOverviewSection from "../components/AudienceOverviewSection";
import ExploreModulesSection from "../components/ExploreModulesSection";
import TestimonialsSection from "../components/TestimonialsSection";

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
