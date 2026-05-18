'use client';

import { ChevronLeft } from 'lucide-react';
import { BrandLogo } from '../brand';
import Footer from './Footer';

/**
 * Layout minimal pour les pages légales (publiques, sans sidebar parcours).
 */
export default function LegalShell({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen bg-cream-100 text-teal-900 flex flex-col">
      {/* Header minimal */}
      <header className="bg-cream-50 border-b border-cream-200">
        <div className="max-w-[1024px] mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
            <BrandLogo size="md" />
          </a>
          <a
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline"
          >
            <ChevronLeft className="w-4 h-4" /> Retour à l'accueil
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-[800px] mx-auto w-full px-6 py-10">
        <h1 className="text-3xl font-extrabold text-teal-800 mb-2">{title}</h1>
        {lastUpdated && (
          <p className="text-sm text-teal-700/60 mb-8">
            Dernière mise à jour : {lastUpdated}
          </p>
        )}
        <article className="prose-iamj space-y-6 text-teal-800/90 leading-relaxed">
          {children}
        </article>
      </main>

      <Footer />
    </div>
  );
}
