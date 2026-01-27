import React, { useEffect } from "react";

import HomePage from "../../components/HomePage";
import useUserData from "../../hooks/useUserData";

const Home = () => {
  const { user } = useUserData();

  useEffect(() => {
    if (user) {
      // Fetch content from the backend API
      (async () => {
        try {
          const baseUrl = process.env.REACT_APP_SERVER_ORIGIN_URL || "";
          const response = await fetch(`${baseUrl}/api/units`);
          if (!response.ok) {
            throw new Error(`Failed to fetch units: ${response.status}`);
          }
          await response.json();
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      })();
    }
  }, [user]);
  return (
    <div>
      <HomePage user={user} />
      {/*{user && <ListView content={content} />}*/}
    </div>
  );
};

export default Home;
