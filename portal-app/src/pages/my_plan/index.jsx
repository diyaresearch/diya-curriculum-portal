import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getAuth } from "firebase/auth";

export const MyPlans = () => {
  const [plans, setPlans] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const navigate = useNavigate();

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const TileItem = ({
    id,
    title,
    subject,
    type,
    level,
    duration,
    date,
    onClick,
  }) => {
    return (
      <div
        className="border p-4 rounded-md shadow-sm hover:bg-gray-100 hover:shadow-lg transition duration-200"
        onClick={() => onClick(id)}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600">Type: {type}</p>
        <p className="text-sm text-gray-600">Subject: {subject}</p>
        <p className="text-sm text-gray-600">Grade Level: {level}</p>
        <p className="text-sm text-gray-600">Duration: {duration}</p>
        <p className="text-sm text-gray-600">
          Date: {formatDate(date) || "N/A"}
        </p>
      </div>
    );
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          navigate("/lesson-generator");
          return;
        }

        const token = await user.getIdToken();
        const response = await axios.get("https://curriculum-portal-api.uc.r.appspot.com/api/lessons", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userPlans = response.data.filter(
          (plan) => plan.authorId === user.uid
        );
        setPlans(userPlans);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };

    fetchPlans();
  }, [navigate]);

  const handlePageChange = (direction) => {
    if (direction === "prev" && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (
      direction === "next" &&
      currentPage < Math.ceil(plans.length / itemsPerPage)
    ) {
      setCurrentPage(currentPage + 1);
    }
  };

  const paginatedPlans = plans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExit = () => {
    navigate("/lesson-generator");
  };

  return (
    <div className="min-h-screen bg-blue-100 flex flex-col items-center justify-center">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 w-full max-w-3xl relative flex-grow">
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            type="button"
            className="bg-white text-black py-2 px-4 rounded border border-black hover:bg-gray-100"
            onClick={handleExit}
          >
            Exit
          </button>
        </div>
        <h2 className="text-2xl mb-4 text-center">My Plans</h2>
        <br />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPlans.map((plan, index) => (
            <TileItem
              key={index}
              id={plan.id}
              title={plan.title}
              subject={plan.subject}
              type="Lesson Plan"
              level={plan.level}
              duration={`${plan.duration} minutes`}
              date={plan.createdAt}
              onClick={() => navigate(`/lesson/${plan.id}`)}
            />
          ))}
        </div>
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => handlePageChange("prev")}
            disabled={currentPage === 1}
            className="p-2 bg-gray-300 rounded"
          >
            Prev
          </button>
          <span className="p-2">Page {currentPage}</span>
          <button
            onClick={() => handlePageChange("next")}
            disabled={currentPage === Math.ceil(plans.length / itemsPerPage)}
            className="p-2 bg-gray-300 rounded"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPlans;
