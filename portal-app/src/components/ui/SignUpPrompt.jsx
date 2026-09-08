import { Link } from "react-router-dom";

import Modal from "@/components/ui/Modal";

// Prompts a signed-out visitor to sign up before continuing. Previously
// duplicated verbatim in ForTeachersSection.jsx and ForStudentsSection.jsx
// (#409), and previously a hand-rolled fixed overlay with no focus trap, no
// Escape handling and no dialog role - now the shared Modal (#373).
const SignUpPrompt = ({ open, onClose, type }) => {
  const isTeacher = type === "teacher";
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="small"
      title={isTeacher ? "Sign Up for Teacher Account" : "Sign Up for Student Account"}
    >
      <div className="text-center">
        <p className="mb-6">Please sign up or log in to access this page.</p>
        <Link to={isTeacher ? "/teacher-signup" : "/student-signup"}>
          <button
            type="button"
            className="cursor-pointer rounded-md border-0 bg-navy px-8 py-3 text-base font-semibold text-white"
          >
            {isTeacher ? "Sign Up as Teacher" : "Sign Up as Student"}
          </button>
        </Link>
      </div>
    </Modal>
  );
};

export default SignUpPrompt;
