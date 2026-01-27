import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";

import HomePage from "../../components/HomePage";
import useUserData from "../../hooks/useUserData";

const Home = () => {
  const { user, userData, loading } = useUserData();
  const role = userData?.role;

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

  // TeacherPlus users should land on their dashboard (Screenshot 1).
  if (!loading && role === "teacherPlus") {
    return <Navigate to="/teacherplus" replace />;
  }

  return (
    <div>
      <HomePage user={user} />
      {/*{user && <ListView content={content} />}*/}
    </div>
  );
};

export default Home;
