'use client';

import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { ErrorBanner } from '../ui';

/**
 * Shell principal : header, sidebar de parcours, contenu central crème.
 * `children` reçoit le contenu de l'étape courante.
 */
export default function AppShell({
  user,
  currentStep,
  maxUnlocked,
  onNavigate,
  error,
  onCloseError,
  sessionLabel,
  children,
}) {
  return (
    <div className="min-h-screen bg-cream-100 text-teal-900 flex flex-col">
      <Header user={user} sessionLabel={sessionLabel} />

      <div className="flex-1 flex">
        <Sidebar
          currentStep={currentStep}
          maxUnlocked={maxUnlocked}
          onNavigate={onNavigate}
        />

        <div className="flex-1 flex flex-col">
          <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8 max-w-[1024px] mx-auto w-full">
            {error && <ErrorBanner message={error} onClose={onCloseError} />}
            {children}
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
