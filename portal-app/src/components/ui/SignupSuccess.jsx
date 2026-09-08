import React from "react";

export default function SignupSuccess({ name, type, onLogin }) {
  return (
    <div className="signup-success flex min-h-screen flex-col items-center justify-center bg-[#232a3d]">
      <h1 className="mb-6 text-center text-[3.2rem] font-bold text-white">
        Welcome, <span className="text-accent-strong">{name}</span>
      </h1>
      <p className="mb-9 max-w-[520px] text-center text-[1.45rem] leading-normal text-white">
        Thank you for creating a {type} Account with DIYA Education Portal!
        <br />
        Click below to get started!
      </p>
      <button
        className="mt-[18px] w-[180px] cursor-pointer rounded-[10px] border-0 bg-accent-strong py-2.5 text-[1.2rem] font-bold text-ink shadow-[0_4px_0_#bfa12e] transition-colors"
        onClick={onLogin}
      >
        Log in here!
      </button>
    </div>
  );
}
