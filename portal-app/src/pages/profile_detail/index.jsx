import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useUserData from "../../hooks/useUserData";
import { useNavigate } from "react-router-dom";
import defaultProfileIcon from '../../assets/default_user_icon.png';

const UserProfile = () => {
  const { user, loading } = useUserData();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    institution: '',
    userType: 'Teacher',
    jobTitle: '',
    subjects: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const response = await axios.get(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFormData(response.data);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        } finally {
            setProfileLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    const { firstName, lastName, institution, userType, jobTitle, subjects } = formData;
    if (!firstName || !lastName || !institution || !userType || !jobTitle || !subjects) {
      alert("Please fill in all fields before updating the profile.");
      return;
    } 

    try {
      const token = await user.getIdToken();
      const response = await axios.put(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/update`, formData,
        {
        headers: { Authorization: `Bearer ${token}` },
        });
      if (response.status === 200) {
        alert('Profile updated successfully!');
        setIsEditing(false);
      } else {
        alert('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-center items-center mb-4">
        <div className="flex justify-center mb-4 bg-black rounded-full w-24 h-24">
          <img src={defaultProfileIcon} alt="User Profile" className="w-24 h-24 rounded-full" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-center mb-6">User Profile</h2>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="flex space-x-4">
          <div className="w-1/2">
            <label className="block text-gray-700">First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg"
              disabled={!isEditing}
            />
          </div>
          <div className="w-1/2">
            <label className="block text-gray-700">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-lg"
              disabled={!isEditing}
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700">Institution</label>
          <input
            type="text"
            name="institution"
            value={formData.institution}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg"
            disabled={!isEditing}
          />
        </div>

        <div>
          <label className="block text-gray-700">User Type</label>
          <select
            name="userType"
            value={formData.userType}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg"
            disabled={!isEditing}
          >
            <option value="Teacher">Teacher</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-700">Job Title</label>
          <input
            type="text"
            name="jobTitle"
            value={formData.jobTitle}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg"
            disabled={!isEditing}
          />
        </div>

        <div>
          <label className="block text-gray-700">Subjects</label>
          <select
            name="subjects"
            value={formData.subjects}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg"
            disabled={!isEditing}
          >
            <option value="">Select a subject</option>
            <option value="Python">Python</option>
            <option value="Physics">Physics</option>
            <option value="Chemistry">Chemistry</option>
            <option value="Biology">Biology</option>
            <option value="Earth Science">Earth Science</option>
          </select>
        </div>

        {isEditing ? (
          <div className="flex justify-between">
            <button
              type="submit"
              className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
            >
              Update Profile
            </button>
            <button
              type="button"
              className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </button>
        )}
      </form>
    </div>
  );
};

export default UserProfile;