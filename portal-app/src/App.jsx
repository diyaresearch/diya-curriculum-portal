import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import "./index.css";
import { EditContent } from "./pages/edit_content";
import Home from "./pages/home";
import { UploadContent } from "./pages/upload-content";
import EditLesson from "./pages/edit_lesson";
import MyPlans from "./pages/my_plan";
import LessonDetail from "./pages/lesson_detail";
import LessonDetailNew from "./pages/lesson_detail/LessonDetail";
import Layout from "@/components/layout/Layout";
import { AuthProvider } from "@/context/AuthProvider";
import RouteErrorBoundary from "@/components/ui/RouteErrorBoundary";
import { ToastProvider } from "@/components/ui/ToastProvider";
import UserProfile from "./pages/profile_detail";
import ModuleDetail from "./pages/module_detail"; // This one fetches from Firestore
import NotFound from "./pages/not_found";
import ComingSoon from "./pages/coming_soon";
import ProtectedRoute from "@/components/ui/ProtectedRoute";
import { ROLES } from "@/constants/roles";
// Import the editing component with a different name
import { TeacherSignup, StudentSignup } from './pages/sign_up';
import UpgradePage from './pages/upgrade_page/UpgradePage.jsx';
import PaymentPage from './pages/payment/PaymentPage';
import LessonPlanBuilder from "./pages/lesson-plans/builder";
import NuggetDetails from "./pages/nugget-details";
import LessonPlanDrafts from "./pages/lesson-plans/drafts";
import ModuleDrafts from "./pages/module_builder/drafts";
import LessonDetailsPage from "./pages/lesson-details/LessonDetailsPage";
import NuggetBuilderPage from "./pages/nugget-builder";
import TeacherPlusPage from "./pages/teacherplus/teacherplusPage";
import ContentDetails from '@/components/content/ContentDetails';
import CancelSubscriptionPage from './pages/cancel-subscription/CancelSubscriptionPage';
import YearlyPaymentPage from './pages/payment/YearlyPaymentPage';
import ModuleBuilder from "./pages/module_builder/builder";

function App() {
  return (
    // ToastProvider sits ABOVE the router so a toast raised right before a
    // navigate() survives the transition instead of unmounting with the page
    // that raised it. RouteErrorBoundary wraps only the routed content, so a
    // component that throws during render loses that page but keeps the
    // navbar - the user can always get somewhere else (#367), and reaching
    // another page clears the error rather than carrying it along (#378).
    // index.jsx holds a second boundary above all of this, for a throw in the
    // providers themselves.
    <ToastProvider>
      <BrowserRouter>
        {/* AuthProvider is inside the router (its logout navigates) and
            outside Layout, so the navbar and every route read the same one
            auth listener and the same one user document (#368). */}
        <AuthProvider>
          <Layout>
            <RouteErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/upload-content" element={<UploadContent />} />
                <Route path="/edit-content/:id" element={<EditContent />} />

                {/* Signed-in-only. The guard lives here rather than in each page
                    (#444): every one of these used to redirect from its own
                    useEffect, after rendering a frame of signed-in-only UI. */}
                <Route path="/payment" element={<ProtectedRoute requireAuth><PaymentPage /></ProtectedRoute>} />
                <Route path="/payment/premium" element={<ProtectedRoute requireAuth><PaymentPage /></ProtectedRoute>} />
                <Route path="/payment/yearly" element={<ProtectedRoute requireAuth><YearlyPaymentPage /></ProtectedRoute>} />
                <Route path="/edit-lesson/:lessonId" element={<ProtectedRoute requireAuth redirectTo="/my-plans"><EditLesson /></ProtectedRoute>} />
                <Route path="/my-plans" element={<ProtectedRoute requireAuth><MyPlans /></ProtectedRoute>} />
                <Route path="/lesson/:lessonId" element={<ProtectedRoute requireAuth><LessonDetail /></ProtectedRoute>} />
                <Route path="/user-profile" element={<ProtectedRoute requireAuth><UserProfile /></ProtectedRoute>} />

                {/* A featured module's lesson: those modules live in code, so
                    their resources have no lesson id to route by. */}
                <Route path="/lesson/:moduleId/:lessonIndex" element={<LessonDetailNew />} />

                {/* Use the correct component for viewing modules */}
                <Route path="/module/:moduleId" element={<ModuleDetail />} />
                <Route path="/teacher-signup" element={<TeacherSignup />} />
                <Route path="/student-signup" element={<StudentSignup />} />
                <Route path="/upgrade" element={<UpgradePage />} />
                <Route path="/nugget-builder" element={<NuggetBuilderPage />} />
                <Route path="/nugget-details/:id" element={<NuggetDetails />} />
                <Route path="/lesson-plans/builder" element={<LessonPlanBuilder />} />
                <Route path="/view-content/:id" element={<NuggetDetails />} />
                <Route path="/lesson-plans/drafts" element={<LessonPlanDrafts />} />
                {/* #442: component already existed, was never wired to a route */}
                <Route path="/module_builder/drafts" element={<ModuleDrafts />} />
                <Route path="/lesson-details/:id" element={<LessonDetailsPage />} />

                {/* TeacherPlus dashboard, under both spellings that exist in links */}
                <Route
                  path="/teacher-plus"
                  element={
                    <ProtectedRoute allowedRoles={[ROLES.TEACHER_PLUS, ROLES.ADMIN]}>
                      <TeacherPlusPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacherplus"
                  element={
                    <ProtectedRoute allowedRoles={[ROLES.TEACHER_PLUS, ROLES.ADMIN]}>
                      <TeacherPlusPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/content/:id" element={<ContentDetails />} />
                <Route
                  path="/cancel-subscription"
                  element={
                    <ProtectedRoute allowedRoles={[ROLES.TEACHER_PLUS]}>
                      <CancelSubscriptionPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/module-builder" element={<ModuleBuilder />} />
                {/* Advertised on the home page but not built yet (#442) - better
                    than a 404, which reads as broken rather than unfinished. */}
                <Route path="/coming-soon" element={<ComingSoon />} />
                {/* Catch-all: render a real 404 rather than an empty page (#421) */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouteErrorBoundary>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;