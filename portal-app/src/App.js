import { BrowserRouter, Route, Routes, Link } from "react-router-dom";
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
import LessonDetailNew from "./pages/lesson_detail/LessonDetail";
import Layout from "./components/Layout";
import UserProfile from "./pages/profile_detail";
import ModuleDetail from "./pages/modules/ModuleDetail";
import AllLessonPlans from "./pages/all_lesson_plans";
import { TeacherSignup, StudentSignup } from './pages/sign_up';
import UpgradePage from './pages/upgrade_page/UpgradePage.jsx';


function App() {
  return (
    <BrowserRouter>
      <Layout>
        {/* Move your navigation here if you want it on every page */}




        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload-content" element={<UploadContent />} />
          <Route path="/edit-content/:id" element={<EditContent />} />
          <Route path="/view-content/:UnitID" element={<ViewContent />} />
          <Route path="/lesson-generator" element={<LessonGenerator />} />
          <Route path="/edit-lesson/:lessonId" element={<EditLesson />} />
          <Route path="/my-plans" element={<MyPlans />} />
          <Route path="/lesson/:lessonId" element={<LessonDetail />} />
          <Route path="/lesson/:moduleId/:lessonIndex" element={<LessonDetailNew />} />
          <Route path="/user-profile" element={<UserProfile />} />
          {/* Only keep this route */}
          <Route path="/modules/:moduleId" element={<ModuleDetail />} />
          <Route path="/all-lesson-plans/:moduleId" element={<AllLessonPlans />} />
          <Route path="/teacher-signup" element={<TeacherSignup />} />
          <Route path="/student-signup" element={<StudentSignup />} />
          <Route path="/upgrade" element={<UpgradePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;