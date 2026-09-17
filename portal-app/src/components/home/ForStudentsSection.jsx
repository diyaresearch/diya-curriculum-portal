import React, { useState } from "react";
import textbooksImg from "@/assets/textbooks.png";
import microscopeImg from "@/assets/microscope.png";
import useUserRole from "@/hooks/useUserRole";
import SignUpPrompt from "@/components/ui/SignUpPrompt";
import { ROLES } from "@/constants/roles";

// --- SquareSection Component ---
// buttonText/buttonLink were never passed by any caller, and the button they
// rendered navigated with window.location.href (#442). Both removed.
const SquareSection = ({ title, description, children }) => (
  <section
    className="w-full bg-surface pt-15 pr-0 pb-15 pl-0 flex flex-col items-center justify-start"
  >
    <h2
      className="text-page-title font-bold text-ink-strong font-sans text-center m-0 tracking-[1px]"
    >
      {title}
    </h2>
    {description && (
      <p
        className="mt-4.5 text-[1.15rem] text-ink text-center max-w-150 font-medium"
      >
        {description}
      </p>
    )}
    {children}
  </section>
);

// --- StudentRectangles with role check ---
const StudentRectangles = () => {
  const { user, role } = useUserRole();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleClick = (e) => {
    if (
      !user ||
      ![ROLES.STUDENT_DEFAULT, ROLES.CONSUMER].includes(role)
    ) {
      e.preventDefault();
      setShowPrompt(true);
    }
  };

  return (
    <div
    className="flex flex-col items-center gap-8 mt-12 mb-8 w-full max-w-150 mx-auto"
    >
      {/* Rectangle 1 */}
      <a href="#explore-modules" className="no-underline" onClick={handleClick}>
        <div
          className="bg-[#f3f3f1] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e0dfdb] w-120 min-h-40 p-0 flex flex-row items-center cursor-pointer"
        >
          <div className="w-22.5 h-22.5 ml-8 mr-6 rounded-lg bg-[#e0dfdb] flex items-center justify-center overflow-hidden">
            <img
              src={textbooksImg}
              alt="Textbooks"
              className="w-20 h-20 object-contain block"
            />
          </div>
          <div>
            <span className="font-bold text-section-title text-navy">
              Learning Modules
            </span>
            <div className="mt-2.5 text-ink text-label max-w-70">
              Interactive content to enhance your understanding.
            </div>
          </div>
        </div>
      </a>
      {/* Rectangle 2 */}
      <a href="#explore-modules" className="no-underline" onClick={handleClick}>
        <div
          className="bg-[#f3f3f1] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e0dfdb] w-120 min-h-40 p-0 flex flex-row items-center cursor-pointer"
        >
          <div className="w-22.5 h-22.5 ml-8 mr-6 rounded-lg bg-[#e0dfdb] flex items-center justify-center overflow-hidden">
            <img
              src={microscopeImg}
              alt="Microscope"
              className="w-20 h-20 object-contain block"
            />
          </div>
          <div>
            <span className="font-bold text-section-title text-navy">
              Project Ideas for Science Fair
            </span>
            <div className="mt-2.5 text-ink text-label max-w-70">
              Get inspired with creative project ideas.
            </div>
          </div>
        </div>
      </a>
      <SignUpPrompt open={showPrompt} onClose={() => setShowPrompt(false)} type="student" />
    </div>
  );
};

const ForStudentsSection = () => {
  const { role } = useUserRole();

  // Only show For Students if NOT a teacher
  if (!role || ![ROLES.TEACHER_DEFAULT, ROLES.TEACHER_PLUS, ROLES.ADMIN].includes(role)) {
    return (
      <div className="w-full">
        <SquareSection
          title="For Students"
          description="Discover engaging content tailored for your learning."
        >
          <StudentRectangles />
        </SquareSection>
      </div>
    );
  }

  return null;
};

export default ForStudentsSection;