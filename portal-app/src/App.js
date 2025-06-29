import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import "./App.css";
import "./index.css";
import { EditContent } from "./pages/edit_content";
import Home from "./pages/home";
import { UploadContent } from "./pages/upload-content";
import ViewContent from "./pages/view-content";
import LessonGenerator from "./pages/lesson_generator";
import EditLesson from "./pages/edit_lesson";
import MyPlans from "./pages/my_plan";
import LessonDetail from "./pages/lesson_detail";
import Layout from "./components/Layout";
import UserProfile from "./pages/profile_detail";
import ModuleDetail from "./pages/module_detail";
import { TeacherSignup, StudentSignup } from './pages/sign_up'; // Importing the Teacher and Student Signup component
 

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload-content" element={<UploadContent />} />
          <Route path="/edit-content/:id" element={<EditContent />} />
          <Route path="/view-content/:UnitID" element={<ViewContent />} />
          <Route path="/lesson-generator" element={<LessonGenerator />} />
          <Route path="/edit-lesson/:lessonId" element={<EditLesson />} />
          <Route path="/my-plans" element={<MyPlans />} />
          <Route path="/lesson/:lessonId" element={<LessonDetail />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/module/:moduleId" element={<ModuleDetail />} />
          {/* Redirecting to teacher and student signup for the specific route */}
          <Route path="/teacher-signup" element={<TeacherSignup />} />
          <Route path="/student-signup" element={<StudentSignup />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
