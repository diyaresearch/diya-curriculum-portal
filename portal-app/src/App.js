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
import LessonDetailNew from "./pages/lesson_detail/LessonDetail";
import Layout from "./components/Layout";
import UserProfile from "./pages/profile_detail";
import ModuleDetail from "./pages/modules/ModuleDetail";
import AllLessonPlans from "./pages/all_lesson_plans";
import { TeacherSignup, StudentSignup } from './pages/sign_up';
import UpgradePage from './pages/upgrade_page/UpgradePage.jsx';
import PaymentPage from './pages/payment/PaymentPage';
import LessonPlanBuilder from "./pages/lesson-plans/builder";
import NuggetDetails from "./pages/nugget-details";
import LessonPlanDrafts from "./pages/lesson-plans/drafts";
import NuggetBuilderPage from "./pages/nugget-builder";
import TeacherPlusPage from "./pages/teacherplus/teacherplusPage";
import ProtectedRoute from './components/ProtectedRoute';
// Remove this line since DashboardContainer doesn't exist
// import DashboardContainer from './components/DashboardContainer';
import ModuleBuilder from "./pages/module_builder/builder";
import ModuleDrafts from "./pages/module_builder/drafts";
import LessonDetailsPage from "./pages/lesson-details/LessonDetailsPage";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload-content" element={<UploadContent />} />
          <Route path="/edit-content/:id" element={<EditContent />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/premium" element={<PaymentPage />} />
          <Route path="/lesson-generator" element={<LessonGenerator />} />
          <Route path="/edit-lesson/:lessonId" element={<EditLesson />} />
          <Route path="/my-plans" element={<MyPlans />} />
          <Route path="/lesson/:lessonId" element={<LessonDetail />} />
          <Route path="/lesson/:moduleId/:lessonIndex" element={<LessonDetailNew />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/modules/:moduleId" element={<ModuleDetail />} />
          <Route path="/all-lesson-plans/:moduleId" element={<AllLessonPlans />} />
          <Route path="/teacher-signup" element={<TeacherSignup />} />
          <Route path="/student-signup" element={<StudentSignup />} />
          <Route path="/upgrade" element={<UpgradePage />} />
          <Route path="/nugget-builder" element={<NuggetBuilderPage />} />
          <Route path="/lesson-plans/builder" element={<LessonPlanBuilder />} />
          <Route path="/view-content/:id" element={<NuggetDetails />} />
          <Route path="/lesson-plans/drafts" element={<LessonPlanDrafts />} />
          {/* Simplified teacher-plus routes - removed duplicates and DashboardContainer */}
          <Route path="/teacher-plus" element={<TeacherPlusPage />} />
          <Route path="/teacherplus" element={<TeacherPlusPage />} />
          <Route path="/module-builder" element={<ModuleBuilder />} />
          <Route path="/module_builder/drafts" element={<ModuleDrafts />} />
          <Route path="/lesson-details/:id" element={<LessonDetailsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;