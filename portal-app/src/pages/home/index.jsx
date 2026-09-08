import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";

import HomePage from "@/components/home/HomePage";
import useUserData from "@/hooks/useUserData";
import { api } from "@/utils/apiClient";
import { ROLES } from "@/constants/roles";

const Home = () => {
  const { user, userData, loading } = useUserData();
  const role = userData?.role;

  useEffect(() => {
    if (user) {
      // Fetch content from the backend API
      (async () => {
        try {
          await api.get("/api/units", { auth: false });
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      })();
    }
  }, [user]);

  // TeacherPlus users should land on their dashboard (Screenshot 1).
  if (!loading && role === ROLES.TEACHER_PLUS) {
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
