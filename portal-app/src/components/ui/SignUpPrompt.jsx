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
      <div style={{ textAlign: "center" }}>
        <p style={{ marginBottom: 24 }}>Please sign up or log in to access this page.</p>
        <Link to={isTeacher ? "/teacher-signup" : "/student-signup"}>
          <button
            type="button"
            style={{
              background: "#162040",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "12px 32px",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            {isTeacher ? "Sign Up as Teacher" : "Sign Up as Student"}
          </button>
        </Link>
      </div>
    </Modal>
  );
};

export default SignUpPrompt;
