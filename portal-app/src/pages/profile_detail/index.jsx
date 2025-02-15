import React, { useState, useEffect } from "react";
import axios from "axios";
import useUserData from "../../hooks/useUserData";
import { useNavigate } from "react-router-dom";
import defaultProfileIcon from "../../assets/default_user_icon.png";

const UserProfile = () => {
  const { user, loading } = useUserData();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    institution: "",
    userType: "Teacher",
    jobTitle: "",
    subjects: "",
    role: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Users");
  const [users, setUsers] = useState([]);
  const [content, setContent] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

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
          const response = await axios.get(
            `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/me`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setFormData(response.data);
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
        } finally {
          setProfileLoading(false);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (formData.role === "admin") {
      fetchAdminData();
    }
  }, [formData.role]);

  const fetchAdminData = async () => {
    try {
      const token = await user.getIdToken();
      const usersRes = await axios.get(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUsers(usersRes.data);

      const contentRes = await axios.get(`${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/units`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setContent(contentRes.data);
      console.log(111111111, contentRes.data);

      const notificationsRes = await axios.get(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/admin/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotifications(notificationsRes.data);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
    }
  };

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
      const response = await axios.put(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/update`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.status === 200) {
        alert("Profile updated successfully!");
        setIsEditing(false);
      } else {
        alert("Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleManageUser = (userId, userName) => {
    setSelectedUser({ id: userId, name: userName });
  };

  const confirmRoleChange = (role) => {
    setConfirmation({ role });
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser || !confirmation) return;
    const token = await user.getIdToken();
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_SERVER_ORIGIN_URL}/api/user/updateRole`,
        {
          userId: selectedUser.id,
          newRole: confirmation.role,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.status === 200) {
        alert(`Role updated to ${confirmation.role}`);
        setUsers(
          users.map((u) => (u.id === selectedUser.id ? { ...u, role: confirmation.role } : u))
        );
      } else {
        alert("Failed to update role");
      }
    } catch (error) {
      console.error("Failed to update user role:", error);
    }
    setConfirmation(null);
    setSelectedUser(null);
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-center items-center mb-4">
        <div className="flex justify-center mb-4 bg-black rounded-full w-24 h-24">
          <img src={defaultProfileIcon} alt="User Profile" className="w-24 h-24 rounded-full" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-center mb-1">User Profile</h2>

      <label className="block text-center text-gray-700 font-semibold mb-6">
        User Role: {formData.role}
      </label>

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

      {/* Admin setting */}
      {formData.role === "admin" && (
        <div className="mt-10">
          <h3 className="text-xl font-bold mb-4">Admin Settings</h3>
          <div className="flex space-x-4 border-b">
            {["Users", "Content", "Notifications"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 ${
                  activeTab === tab ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {/* {activeTab === 'Users' && (
              <div>
                <h4 className="font-semibold mb-2">All Users</h4>
                <ul className="list-disc pl-5">
                  {users.map((user) => (
                    <li key={user.id}>{user.fullName} - {user.email}</li>
                  ))}
                </ul>
              </div>
            )} */}
            {activeTab === "Users" && (
              <div>
                <h4 className="font-semibold mb-4">All Users</h4>
                <table className="min-w-full table-auto border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-4 py-2">Name</th>
                      <th className="border border-gray-300 px-4 py-2">Email</th>
                      <th className="border border-gray-300 px-4 py-2">Role</th>
                      <th className="border border-gray-300 px-4 py-2">Management</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-100">
                        <td className="border border-gray-300 px-4 py-2">{user.fullName}</td>
                        <td className="border border-gray-300 px-4 py-2">{user.email}</td>
                        <td className="border border-gray-300 px-4 py-2">{user.role}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <button
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                            onClick={() => handleManageUser(user.id, user.fullName)}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {selectedUser && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded shadow-md w-80">
                      <h3 className="text-lg font-semibold mb-4">Manage User Role</h3>
                      <p className="mb-4">Change role for {selectedUser.name}</p>
                      <div className="space-y-2">
                        <button
                          className="w-full bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
                          onClick={() => confirmRoleChange("teacherDefault")}
                        >
                          Set as TeacherDefault
                        </button>
                        <button
                          className="w-full bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600"
                          onClick={() => confirmRoleChange("teacherPlus")}
                        >
                          Set as TeacherPlus
                        </button>
                      </div>
                      <button
                        className="mt-4 w-full bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
                        onClick={() => setSelectedUser(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {confirmation && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-6 rounded shadow-md w-80">
                      <h4 className="text-lg font-semibold mb-4">Confirm Role Change</h4>
                      <p className="mb-4">
                        Are you sure you want to change the role of {selectedUser.name} to{" "}
                        {confirmation.role}?
                      </p>
                      <div className="flex justify-between">
                        <button
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                          onClick={handleRoleUpdate}
                        >
                          Confirm
                        </button>
                        <button
                          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                          onClick={() => setConfirmation(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* {activeTab === "Content" && (
              <div>
                <h4 className="font-semibold mb-2">Content Overview</h4>
                <ul className="list-disc pl-5">
                  {content.map((item) => (
                    <li key={item.id}>
                      {item.title} - {item.type} - {item.isPublic ? "Public" : "Private"} -{" "}
                      {item.createdAt}
                    </li>
                  ))}
                </ul>
              </div>
            )} */}
            {activeTab === "Content" && (
              <div className="max-w-5xl mx-auto bg-white p-10 rounded-lg shadow-md">
                <h4 className="font-semibold mb-4">Content management for admin, comming soon</h4>
                <table className="min-w-full table-auto border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-4 py-2 text-center">User Name</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Email</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Lesson Plan</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Visibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-100 text-center">
                        <td className="border border-gray-300 px-4 py-2">{item.Author}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.userEmail}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.Title}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.isPublic}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "Notifications" && (
              <div>
                <h4 className="font-semibold mb-2">Notifications for admin, comming soon</h4>
                <ul className="list-disc pl-5">
                  {notifications.map((note, index) => (
                    <li key={index}>
                      {note.message} - {note.date}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
