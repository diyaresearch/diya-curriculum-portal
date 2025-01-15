import React, { useState, useEffect } from "react";
import axios from "axios";

import HomePage from "../../components/HomePage";
import Navbar from "../../components/Navbar";
import Resources from "../../components/Resources";
import ListView from "../../components/ListView";
import useUserData from "../../hooks/useUserData";

const Home = () => {
  const { user } = useUserData();
  const [content, setContent] = useState([]);

  useEffect(() => {
    if (user) {
      // Fetch content from the backend API
      axios
        // .get("https://curriculum-portal-api.uc.r.appspot.com/api/units")
        .get(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/units`)
        .then((response) => {
          // console.log("Fetched data:", response.data); Debugging: Log fetched data
          setContent(response.data);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        });
    }
  }, [user]);
  return (
    <div>
      <Navbar user={user} />
      <HomePage user={user} />
      {user ? <ListView content={content} /> : <Resources />}
    </div>
  );
};

export default Home;
