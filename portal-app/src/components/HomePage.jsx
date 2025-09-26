import React from "react";
import useUserData from "../hooks/useUserData";
import HeroSection from "../components/HeroSection";
import ForTeachersSection from "../components/ForTeachersSection";
import ForStudentsSection from "../components/ForStudentsSection";
import ExploreModulesSection from "../components/ExploreModulesSection";
import TestimonialsSection from "../components/TestimonialsSection";

const HomePage = ({ user }) => {
  const { userData } = useUserData();

  return (
    <>
      <HeroSection />
      <ForTeachersSection />
      <ForStudentsSection />
      <ExploreModulesSection userData={userData} />
      <TestimonialsSection />
      {/* Footer or any content you want to keep below */}
    </>
  );
};

export default HomePage;
