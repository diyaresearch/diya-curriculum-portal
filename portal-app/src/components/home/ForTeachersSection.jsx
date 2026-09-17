import React, { useState } from "react";
import { Link } from "react-router-dom";
import barchartImg from "@/assets/barchart.png";
import laptopImg from "@/assets/laptop.png";
import teacherImg from "@/assets/teacher.png";
import pencilImg from "@/assets/finpencil.png";
import useUserRole from "@/hooks/useUserRole";
import SignUpPrompt from "@/components/ui/SignUpPrompt";
import { ROLES } from "@/constants/roles";

// --- SquareSection Component ---
// buttonText/buttonLink were never passed by any caller, and the button they
// rendered navigated with window.location.href (#442). Both removed.
const SquareSection = ({ title, description, children }) => (
  <section
    className="w-full bg-surface-subtle pt-15 pr-0 pb-15 pl-0 flex flex-col items-center justify-start"
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

// --- TeacherRectangles with role check ---
const TeacherRectangles = () => {
  const { user, role } = useUserRole();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleClick = (e) => {
    if (
      !user ||
      ![ROLES.TEACHER_DEFAULT, ROLES.TEACHER_PLUS, ROLES.ADMIN].includes(role)
    ) {
      e.preventDefault();
      setShowPrompt(true);
    }
  };

  return (
    <div
      className="flex flex-wrap justify-center gap-10 mt-12 mb-8 w-full max-w-275"
    >
      {/* Rectangle 1 */}
      <a href="#explore-modules" className="no-underline" onClick={handleClick}>
        <div
          className="bg-[#f3f3f1] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e0dfdb] w-120 min-h-40 p-0 flex flex-row items-center cursor-pointer"
        >
          <div className="w-22.5 h-22.5 ml-8 mr-6 rounded-lg bg-[#e0dfdb] flex items-center justify-center overflow-hidden">
            <img
              src={barchartImg}
              alt="Barchart"
              className="w-20 h-20 object-contain block"
            />
          </div>
          <div>
            <span className="font-bold text-section-title text-navy">
              Ready-to-use Modules
            </span>
            <div className="mt-2.5 text-ink text-label max-w-70">
              Access a library of pre-built modules.
            </div>
          </div>
        </div>
      </a>
      {/* Rectangle 2 */}
      <Link to="/my-plans" className="no-underline" onClick={handleClick}>
        <div
          className="bg-[#f3f3f1] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e0dfdb] w-120 min-h-40 p-0 flex flex-row items-center cursor-pointer"
        >
          <div className="w-22.5 h-22.5 ml-8 mr-6 rounded-lg bg-[#e0dfdb] flex items-center justify-center overflow-hidden">
            <img
              src={laptopImg}
              alt="Laptop"
              className="w-full h-full object-cover block"
            />
          </div>
          <div>
            <span className="font-bold text-section-title text-navy">
              Lesson Plan Builder
            </span>
            <div className="mt-2.5 text-ink text-label max-w-70">
              Create and customize your lesson plans.
            </div>
          </div>
        </div>
      </Link>
      {/* Rectangle 3 */}
      <Link to="/coming-soon?feature=Classroom%20Management" className="no-underline" onClick={handleClick}>
        <div
          className="bg-[#f3f3f1] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e0dfdb] w-120 min-h-40 p-0 flex flex-row items-center cursor-pointer"
        >
          <div className="w-22.5 h-22.5 ml-8 mr-6 rounded-lg bg-[#e0dfdb] flex items-center justify-center overflow-hidden">
            <img
              src={teacherImg}
              alt="Teacher"
              className="w-20 h-20 object-contain block"
            />
          </div>
          <div>
            <span className="font-bold text-section-title text-navy">
              Classroom Management
            </span>
            <div className="mt-2.5 text-ink text-label max-w-70">
              Control content visibility for students.
            </div>
          </div>
        </div>
      </Link>
      {/* Rectangle 4 */}
      <Link to="/coming-soon?feature=Community" className="no-underline" onClick={handleClick}>
        <div
          className="bg-[#f3f3f1] rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#e0dfdb] w-120 min-h-40 p-0 flex flex-row items-center cursor-pointer"
        >
          <div className="w-22.5 h-22.5 ml-8 mr-6 rounded-lg bg-[#e0dfdb] flex items-center justify-center overflow-hidden">
            <img
              src={pencilImg}
              alt="Pencil"
              className="w-20 h-20 object-contain block"
            />
          </div>
          <div>
            <span className="font-bold text-section-title text-navy">
              Share with Community
            </span>
            <div className="mt-2.5 text-ink text-label max-w-70">
              Make the lesson plan public to the community.
            </div>
          </div>
        </div>
      </Link>
      <SignUpPrompt open={showPrompt} onClose={() => setShowPrompt(false)} type="teacher" />
    </div>
  );
};

const ForTeachersSection = () => {
  const { role } = useUserRole();
  const isTeacherDefault = role === ROLES.TEACHER_DEFAULT;

  // Only show For Teachers if NOT a student and NOT teacherDefault
  if (!isTeacherDefault && (!role || ![ROLES.STUDENT_DEFAULT, ROLES.CONSUMER].includes(role))) {
    return (
      <div className="w-full">
        <SquareSection
          title="For Teachers"
          description="Unlock powerful tools to enhance your teaching."
        >
          <TeacherRectangles />
        </SquareSection>
      </div>
    );
  }

  return null;
};

export default ForTeachersSection;