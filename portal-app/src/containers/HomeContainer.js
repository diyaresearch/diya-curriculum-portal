import React from "react";
import HomePage from "../components/HomePage";
import Navbar from "../components/Navbar";
import ResourcesPage from "../components/ResourcesPage";
const HomeContainer = ({user}) => {
  return (
    <div>
      <Navbar user={user}/>
      <HomePage />
      <ResourcesPage />
    </div>
  );
};
export default HomeContainer;
