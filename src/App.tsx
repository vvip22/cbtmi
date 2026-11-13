/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UnifiedLoginPage } from './components/auth/UnifiedLoginPage';
import { Navbar } from './components/Navbar';
import { SetupGuideModal } from './components/SetupGuideModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LiveProctoring } from './components/teacher/LiveProctoring';
import { ProktorSettings } from './components/proktor/ProktorSettings';
import { StudentPortal } from './components/student/StudentPortal';
import { ExamInterface } from './components/student/ExamInterface';
import { ExamResultView } from './components/student/ExamResultView';
import { Exam, Submission } from './types/cbt';
import { dbService } from './services/dbStore';

function MainApp() {
  const { currentUser, role, isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'exam' | 'monitoring' | 'settings'>('dashboard');
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Student exam flow states
  const [activeExamForTaking, setActiveExamForTaking] = useState<Exam | null>(null);
  const [completedSubmission, setCompletedSubmission] = useState<{ exam: Exam; submission: Submission } | null>(null);

  const exams = dbService.getExams();
  const settings = dbService.getSchoolSettings();

  const handleStartExam = (exam: Exam) => {
    setActiveExamForTaking(exam);
    setActiveView('exam');
  };

  const handleFinishExam = (submission: Submission) => {
    if (activeExamForTaking) {
      setCompletedSubmission({
        exam: activeExamForTaking,
        submission
      });
      setActiveExamForTaking(null);
    }
  };

  const handleBackToPortal = () => {
    setCompletedSubmission(null);
    setActiveView('dashboard');
  };

  const handleOpenLiveProctoring = (_examId: string) => {
    setActiveView('monitoring');
  };

  const isPeserta = role === 'PESERTA' || role === 'STUDENT';
  const isProktor = role === 'PROKTOR' || role === 'ADMIN';

  // 1. If not authenticated, render unified login page for Proktor, Pengawas, Peserta
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <UnifiedLoginPage onOpenSetupGuide={() => setIsSetupGuideOpen(true)} />
        <SetupGuideModal
          isOpen={isSetupGuideOpen}
          onClose={() => setIsSetupGuideOpen(false)}
        />
      </>
    );
  }

  // 2. If in active fullscreen exam mode (Peserta)
  if (activeView === 'exam' && activeExamForTaking && currentUser) {
    return (
      <ExamInterface
        exam={activeExamForTaking}
        currentUser={currentUser}
        onFinishExam={handleFinishExam}
        onExit={() => setActiveView('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Top Bar Navigation */}
      <Navbar
        onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3.5">
        {/* If Peserta just completed an exam and viewing results */}
        {isPeserta && completedSubmission ? (
          <ExamResultView
            exam={completedSubmission.exam}
            submission={completedSubmission.submission}
            onBackToPortal={handleBackToPortal}
          />
        ) : isPeserta ? (
          <StudentPortal
            currentUser={currentUser}
            onStartExam={handleStartExam}
          />
        ) : activeView === 'settings' && isProktor ? (
          <ProktorSettings
            onSettingsUpdated={() => setRefreshTrigger(prev => prev + 1)}
          />
        ) : activeView === 'monitoring' ? (
          <LiveProctoring exams={exams} />
        ) : (
          <AdminDashboard
            onOpenLiveProctoring={handleOpenLiveProctoring}
            onOpenSettings={() => setActiveView('settings')}
          />
        )}
      </main>

      {/* Footer Kompak & Rapi */}
      <footer className="border-t border-slate-200/90 bg-white py-2 sm:py-2.5 mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="font-extrabold text-emerald-800">{settings.schoolName}</span>
            <span>·</span>
            <span>NSM: {settings.nsm}</span>
            <span>·</span>
            <span>Tahun Pelajaran {settings.academicYear} ({settings.semester})</span>
          </div>
          <div className="text-slate-400 text-[11px] font-medium">
            CBT Madrasah
          </div>
        </div>
      </footer>

      {/* Setup Guide Modal */}
      <SetupGuideModal
        isOpen={isSetupGuideOpen}
        onClose={() => setIsSetupGuideOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
