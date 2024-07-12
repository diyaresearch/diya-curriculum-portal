import React, { useState, useEffect } from "react";
import axios from "axios";
import HomePage from "../components/HomePage";
import Navbar from "../components/Navbar";
import ResourcesPage from "../components/ResourcesPage";
import ListView from "../components/ListView";

const HomeContainer = ({ user }) => {
  const [content, setContent] = useState([]);

  useEffect(() => {
    if (user) {
      // Fetch content from the backend API
      axios.get('http://localhost:3001/api/units')
        .then(response => {
          console.log('Fetched data:', response.data); // Debugging: Log fetched data
          setContent(response.data);
        })
        .catch(error => {
          console.error('Error fetching data:', error);
        });
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
