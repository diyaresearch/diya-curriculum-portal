import React from 'react';

export function TeacherSignup() {
  return (
    <div className="teacher-signup-page">
      <div className="signup-hero">
        <h1>Sign Up as a Teacher</h1>
        <p>
          Join our platform to access AI and Data Science resources for your classrooms.
        </p>
        <div className="auth-buttons">
          <button>Already have an account? Log in</button>
        </div>
      </div>
      <div className="form-barrier">
        <main className="teacher-form-section">
          <div className="form-left">
            <h2>Teacher Profile Information</h2>
            <p>Please fill in the following information to create your teacher profile.</p>
          </div>
          <form className="form-right">
            <label>Full Name</label>
            <input type="text" placeholder="Enter your full name (auto-filled)" />


            <label>Email</label>
            <input type="email" placeholder="Your gmail (auto-filled)" />


            <label>School or Organization Name</label>
            <input type="text" placeholder="Enter your school or organization" />


            <label>What Subjects do you teach?</label>
            <div className="subjects">
              {["CS", "AI & DS", "Math", "Physics", "Chemistry", "Biology", "Economics"].map(subject => (
                <label key={subject}>
                  <input type="checkbox" value={subject} />
                  {subject}
                </label>
              ))}
            </div>


            <label>What Grade level do you teach?</label>
            <div className="grades">
              {["5 or lower", "6–8", "9–12"].map(level => (
                <label key={level}>
                  <input type="checkbox" value={level} />
                  {level}
                </label>
              ))}
            </div>


            <div className="confirm">
              <input type="checkbox" />
              <label>I confirm that I am a teacher</label>
            </div>


            <button type="submit" className="register-btn">Register</button>
          </form>
        </main>
      </div>
    </div>
  );
}


// Student Signup Page
export function StudentSignup() {
  return (
    <div className="teacher-signup-page">
      <div className="signup-hero">
        <h1>Sign Up as a Student</h1>
        <p>
          Join our platform to access AI and Data Science resources. Connect with
your teacher's class or learn on your own.

        </p>
        <div className="auth-buttons">
          <button>Already have an account? Log in</button>
        </div>
      </div>
      <div className="form-barrier">
        <main className="teacher-form-section">
          <div className="form-left">
            <h2>Student Profile Information</h2>
            <p>Please fill in the following information to create your student profile.</p>
          </div>
           <form className="form-right">
          <label>Full Name</label>
          <input type="text" placeholder="Enter your full name (auto-filled)" />


          <label>Email</label>
          <input type="email" placeholder="Your email (auto-filled)" />


          <label>Grade Level</label>
          <div className="grades">
            {["6th", "7th", "8th", "9th", "10th", "11th", "12th"].map(level => (
              <label key={level}>
                <input type="checkbox" value={level} />
                {level}
              </label>
            ))}
          </div>
          <span className="helper-text">Select your current grade level.</span>


          <label>Class Code</label>
          <input type="text" placeholder="If you have one" />


          <div className="confirm">
            <input type="checkbox" />
            <label>I confirm that I am a student</label>
          </div>


          <button type="submit" className="register-btn">Register</button>
        </form>
        </main>
      </div>
    </div>
  );
}