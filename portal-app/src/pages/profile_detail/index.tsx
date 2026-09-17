import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import useUserData from "@/hooks/useUserData";
import { api } from "@/utils/apiClient";
import defaultProfileIcon from "@/assets/default_user_icon.png";
import { useToast } from "@/components/ui/ToastProvider";
import { toUserMessage } from "@/utils/errorMessage";
import { ROLES } from "@/constants/roles";
import type {
  AdminUserListData,
  AdminUserListEntry,
  ApiEnvelope,
  UserDocument,
} from "@/types/models";

/**
 * The form's own state. Every field is a string because each is bound to a
 * controlled input - including `subjects`, which the stored document keeps
 * as a list but this form edits one at a time through a single-select.
 */
interface ProfileFormState {
  firstName: string;
  lastName: string;
  institution: string;
  userType: string;
  jobTitle: string;
  subjects: string;
  role: string;
}

const EMPTY_FORM: ProfileFormState = {
  firstName: "",
  lastName: "",
  institution: "",
  userType: "Teacher",
  jobTitle: "",
  subjects: "",
  role: "",
};

function toFormState(user: UserDocument): ProfileFormState {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    institution: user.institution ?? "",
    userType: user.userType ?? "Teacher",
    jobTitle: user.jobTitle ?? "",
    subjects: user.subjects?.[0] ?? "",
    role: user.role ?? "",
  };
}

const ADMIN_TABS = ["Users", "Content", "Notifications"] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

/** Nothing writes these yet; see the notifications state below. */
interface AdminNotification {
  message?: string;
  date?: string;
}

const UserProfile = () => {
  const toast = useToast();
  const { user } = useUserData();

  const [formData, setFormData] = useState<ProfileFormState>(EMPTY_FORM);

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("Users");
  const [users, setUsers] = useState<AdminUserListEntry[]>([]);
  // No setter: /api/admin/notifications isn't implemented yet (#443), and the
  // tab already reads "coming soon" — this stays empty until that's built.
  const [notifications] = useState<AdminNotification[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ role: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchUserProfile = async () => {
      if (user) {
        try {
          // /api/user/me is one of the few routes that goes through
          // responseHelpers, so the profile is under `.data`. Assigning the
          // whole response here left every field undefined: the form rendered
          // blank, and `role` being undefined also meant the admin section
          // below never appeared for an admin.
          const response = await api.get<ApiEnvelope<UserDocument>>("/api/user/me");
          if (cancelled || !response?.data) return;
          setFormData(toFormState(response.data));
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
        }
      }
    };

    fetchUserProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Inline rather than a useCallback called from the effect (#525): the rule
  // cannot see past the call, and this had no cancellation either.
  useEffect(() => {
    if (!user) return;
    if (formData.role !== ROLES.ADMIN) return;

    let cancelled = false;
    const fetchAdminData = async () => {
      try {
        // Enveloped, and the list itself is under `.data.users` alongside
        // the pagination block.
        const response = await api.get<ApiEnvelope<AdminUserListData>>("/api/user/users");
        if (cancelled) return;
        setUsers(response?.data?.users ?? []);

        // /api/admin/notifications was never implemented server-side (#443) —
        // the Notifications tab already says "coming soon"; this just stopped
        // that tab's data fetch from 404ing and failing the whole admin load.
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
      }
    };
    fetchAdminData();

    return () => {
      cancelled = true;
    };
  }, [formData.role, user]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { firstName, lastName, institution, userType, jobTitle, subjects } = formData;
    if (!firstName || !lastName || !institution || !userType || !jobTitle || !subjects) {
      toast.error("Please fill in all fields before updating the profile.");
      return;
    }

    try {
      // PUT /api/user/update rejects a non-array `subjects` with a 400, so
      // the single-select's value goes back as the one-element list the
      // stored document holds.
      await api.put("/api/user/update", { ...formData, subjects: subjects ? [subjects] : [] });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      // A non-2xx throws now, so the old "else -> Failed to update" branch
      // and this catch are the same path.
      toast.error(toUserMessage(error, "Failed to update profile"));
      console.error("Error updating profile:", error);
    }
  };

  const handleManageUser = (userId: string, userName: string) => {
    setSelectedUser({ id: userId, name: userName });
  };

  const confirmRoleChange = (role: string) => {
    setConfirmation({ role });
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser || !confirmation) return;
    try {
      await api.put("/api/user/updateRole", {
        userId: selectedUser.id,
        newRole: confirmation.role,
      });
      toast.success(`Role updated to ${confirmation.role}`);
      setUsers(
        users.map((u) => (u.id === selectedUser.id ? { ...u, role: confirmation.role } : u))
      );
    } catch (error) {
      toast.error(toUserMessage(error, "Failed to update role"));
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

      <label className="block text-center text-gray-700 font-semibold mb-1">
        User Role: {formData.role}
      </label>

      <label className="block text-center text-gray-700 font-semibold mb-6">
        User Type: {formData.userType}
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

        {/* userType dropdown, hide this for now and add more in the future */}
        {/* <div>
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
        </div> */}

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
      {formData.role === ROLES.ADMIN && (
        <div className="mt-10">
          <h3 className="text-xl font-bold mb-4">Admin Settings</h3>
          <div className="flex space-x-4 border-b">
            {ADMIN_TABS.map((tab) => (
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
                            onClick={() => handleManageUser(user.id, user.fullName ?? user.email ?? user.id)}
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
                          onClick={() => confirmRoleChange(ROLES.TEACHER_DEFAULT)}
                        >
                          Set as TeacherDefault
                        </button>
                        <button
                          className="w-full bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600"
                          onClick={() => confirmRoleChange(ROLES.TEACHER_PLUS)}
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

                {confirmation && selectedUser && (
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

            {activeTab === "Content" && (
              <div className="max-w-5xl mx-auto bg-white p-10 rounded-lg shadow-md">
                <h4 className="font-semibold mb-4">Content management for admin, comming soon</h4>
                <table className="min-w-full table-auto border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-4 py-2 text-center">User Email</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Lesson Plan</th>
                      <th className="border border-gray-300 px-4 py-2 text-center">Visibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* The content of the tavle will be updated later */}
                    {/* {content.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-100 text-center">
                        <td className="border border-gray-300 px-4 py-2">{item.Author}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.userEmail}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.Title}</td>
                        <td className="border border-gray-300 px-4 py-2">{item.isPublic}</td>
                      </tr>
                    ))} */}
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
