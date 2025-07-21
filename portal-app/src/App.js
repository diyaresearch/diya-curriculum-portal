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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Payment page without Layout (standalone page) */}
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/payment/premium" element={<PaymentPage />} />

        {/* All other pages with Layout */}
        <Route path="/" element={
          <Layout>
            <Home />
          </Layout>
        } />
        <Route path="/upload-content" element={
          <Layout>
            <UploadContent />
          </Layout>
        } />
        <Route path="/edit-content/:id" element={
          <Layout>
            <EditContent />
          </Layout>
        } />
        <Route path="/view-content/:UnitID" element={
          <Layout>
            <ViewContent />
          </Layout>
        } />
        <Route path="/lesson-generator" element={
          <Layout>
            <LessonGenerator />
          </Layout>
        } />
        <Route path="/edit-lesson/:lessonId" element={
          <Layout>
            <EditLesson />
          </Layout>
        } />
        <Route path="/my-plans" element={
          <Layout>
            <MyPlans />
          </Layout>
        } />
        <Route path="/lesson/:lessonId" element={
          <Layout>
            <LessonDetail />
          </Layout>
        } />
        <Route path="/lesson/:moduleId/:lessonIndex" element={
          <Layout>
            <LessonDetailNew />
          </Layout>
        } />
        <Route path="/user-profile" element={
          <Layout>
            <UserProfile />
          </Layout>
        } />
        <Route path="/modules/:moduleId" element={
          <Layout>
            <ModuleDetail />
          </Layout>
        } />
        <Route path="/all-lesson-plans/:moduleId" element={
          <Layout>
            <AllLessonPlans />
          </Layout>
        } />
        <Route path="/teacher-signup" element={
          <Layout>
            <TeacherSignup />
          </Layout>
        } />
        <Route path="/student-signup" element={
          <Layout>
            <StudentSignup />
          </Layout>
        } />
        <Route path="/upgrade" element={
          <Layout>
            <UpgradePage />
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;