import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { AppShell } from "@/app/AppShell";
import { RoleGuard } from "@/app/RoleGuard";
import { LoginPage } from "@/views/LoginPage";
import { DashboardPage } from "@/views/DashboardPage";
import { ForbiddenPage } from "@/views/ForbiddenPage";
import { NotFoundPage } from "@/views/NotFoundPage";
import { MyFormsPage } from "@/views/MyFormsPage";
import { CreateFormPage } from "@/views/CreateFormPage";
import { FormDetailsPage } from "@/views/FormDetailsPage";
import { ManagerInboxPage } from "@/views/ManagerInboxPage";
import { EditorInboxPage } from "@/views/EditorInboxPage";
import { HrInboxPage } from "@/views/HrInboxPage";
import { AdminPage } from "@/views/AdminPage";
import { TrainingProposalsPage } from "@/views/TrainingProposalsPage";
import { MandatoryTrainingsPage } from "@/views/MandatoryTrainingsPage";
import { ForgotPasswordPage } from "@/views/ForgotPasswordPage";
import { ResetPasswordPage } from "@/views/ResetPasswordPage";
import { ActivateAccountPage } from "@/views/ActivateAccountPage";
import { HelpPage } from "@/views/HelpPage";
import { AboutPage } from "@/views/AboutPage";
import { PublicAboutPage } from "@/views/PublicAboutPage";
import { PublicHelpPage } from "@/views/PublicHelpPage";
import { ProfilePage } from "@/views/ProfilePage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/activate-account", element: <ActivateAccountPage /> },
  { path: "/about-public", element: <PublicAboutPage /> },
  { path: "/help-public", element: <PublicHelpPage /> },
  { path: "/forbidden", element: <ForbiddenPage /> },
  { path: "/", element: <ProtectedRoute><AppShell /></ProtectedRoute>, children: [
      { index: true, element: <DashboardPage /> },
      { path: "forms/my", element: <MyFormsPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "forms/new", element: <CreateFormPage /> },
      { path: "help", element: <HelpPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "editor/inbox", element: <RoleGuard allow={["EDITOR", "ADMIN"]}><EditorInboxPage /></RoleGuard> },
      { path: "manager/inbox", element: <RoleGuard allow={["MANAGER", "ADMIN"]}><ManagerInboxPage /></RoleGuard> },
      { path: "hr/inbox", element: <RoleGuard allow={["HR", "ADMIN"]}><HrInboxPage /></RoleGuard> },
      { path: "admin", element: <RoleGuard allow={["HR", "ADMIN"]}><AdminPage /></RoleGuard> },
      { path: "forms/:id", element: <FormDetailsPage /> },
      { path: "mandatory-trainings", element: <RoleGuard allow={["EDITOR", "MANAGER", "HR", "ADMIN"]}><MandatoryTrainingsPage /></RoleGuard> },
      { path: "training-proposals", element: <RoleGuard allow={["EDITOR", "MANAGER", "HR", "ADMIN"]}><TrainingProposalsPage /></RoleGuard> },
      { path: "*", element: <NotFoundPage /> },
  ] },
]);
