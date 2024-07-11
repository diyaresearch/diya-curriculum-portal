import React, { useState, useEffect } from "react";
import HomePage from "../components/HomePage";
import Navbar from "../components/Navbar";
import ResourcesPage from "../components/ResourcesPage";
import ListView from "../components/ListView";

const HomeContainer = ({ user }) => {
  const [content, setContent] = useState([]);
  useEffect(() => {
    // Fetch the content for logged-in users
    if (user) {
      // Replace with actual content fetching logic
      const fetchedContent = [
        {
          title: "Example one",
          category: "Science",
          type: "Quiz",
          level: "Advanced",
          duration: "30min",
          date: "2024-07-09",
        },
        {
          title: "Example two",
          category: "Mathematics",
          type: "Lecture",
          level: "Basic",
          duration: "45min",
          date: "2024-07-08",
        },
      ];
      setContent(fetchedContent);
    }
  }, [user]);
  return (
    <div>
      <Navbar user={user} />
      <HomePage user={user} />
      {user ? <ListView content={content} /> : <ResourcesPage />}
    </div>
  );
};
export default HomeContainer;
