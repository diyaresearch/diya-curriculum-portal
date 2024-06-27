import React from "react";
import HomePage from "../components/HomePage";
import Navbar from "../components/Navbar";
import ResourcesPage from "../components/ResourcesPage";
const HomeContainer = ({}) => {
  return (
    <div>
      <Navbar />
      <HomePage />
      <ResourcesPage />
    </div>
  );
};
export default HomeContainer;
