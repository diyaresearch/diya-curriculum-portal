import React, { useState } from "react";
import ForTeachersSection from "./ForTeachersSection";
import ForStudentsSection from "./ForStudentsSection";


const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
};

const modalStyle = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "24px 32px",
  maxWidth: "900px",
  width: "95%",
  maxHeight: "80vh",
  overflowY: "auto",          // allow scroll if content is tall
  boxShadow: "0 18px 45px rgba(0,0,0,0.15)",
};

const AudienceModal = ({ type, onClose }) => {
  const isTeacher = type === "teacher";
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="border-0 bg-transparent text-[1.2rem] float-right cursor-pointer"
        >
          ×
        </button>

        {isTeacher ? <ForTeachersSection /> : <ForStudentsSection />}
      </div>
    </div>
  );
};

const AudienceOverviewSection = () => {
  const [open, setOpen] = useState(null); // "teacher" | "student" | null

  return (
    <section
      className="py-14 px-[10%] bg-[#f5f7fb] text-center"
    >
      <h2 className="text-[2rem] font-bold mb-2">
        Who is this portal for?
      </h2>
      <p className="mb-8 text-[#555]">
        Explore what we offer for teachers and students.
      </p>

      <div
        className="flex gap-12 justify-center flex-wrap max-w-300 mt-10 mx-auto mb-0"
      >
        {/* Teachers card – navy + gold */}
        <div
          onClick={() => setOpen("teacher")}
          className="flex-[1_1_260px] max-w-125 min-h-70 rounded-[20px] p-6 cursor-pointer text-white [background:linear-gradient(135deg,rgb(70,_156,_159)_0%,rgb(28,_124,_119)_100%)] flex flex-col justify-between"
        >
          <div className="text-left">
            <h3 className="text-[2.1rem] font-bold">
              For Teachers
            </h3>
            <p className="mt-2 text-[1.28rem]">
              Planning tools
            </p>
            <p className="mt-2 text-[1.28rem]">
              Classroom management
            </p>
            <p className="mt-2 text-[1.28rem]">
              Ready-made modules.
            </p>
          </div>
          <span className="mt-4 text-left">
            Learn More →
          </span>
        </div>

        {/* Students card – blue + soft gold */}
        <div
          onClick={() => setOpen("student")}
          className="flex-[1_1_260px] max-w-125 min-h-70 rounded-[20px] p-6 cursor-pointer text-black [background:linear-gradient(135deg,rgb(243,_230,_113)_0%,_#ffd56b_100%)] flex flex-col justify-between"
        >
          <div className="text-left">
            <h3 className="text-[2.1rem] font-bold">
              For Students
            </h3>
            <p className="mt-2 text-[1.28rem]">
              Interactive modules
            </p>
            <p className="mt-2 text-[1.28rem]">
              Projects
            </p>
            <p className="mt-2 text-[1.28rem]">
              Science fair ideas
            </p>
          </div>
          <span className="mt-4 text-left">
            Learn More →
          </span>
        </div>
      </div>

      {open && <AudienceModal type={open} onClose={() => setOpen(null)} />}
    </section>
  );
};

export default AudienceOverviewSection;

