import React, { useState } from "react";
import content_creator from "../assets/content_creator.png";
import educator from "../assets/educator.png";
import lesson_plans from "../assets/lesson_plans.png";
import { useNavigate } from "react-router-dom";
import useUserData from "../hooks/useUserData";
import HeroSection from "../components/HeroSection";
import ExploreModulesSection from "../components/ExploreModulesSection";

const HomePage = ({ user }) => {
  const navigate = useNavigate();
  const { userData } = useUserData();
  const [showUpgradePopup, setShowUpgradePopup] = useState(false);

  return (
    <>
      <HeroSection />
      <ExploreModulesSection />
      {/* Footer or any content you want to keep below */}
      
    </>
  );
};

export default HomePage;
