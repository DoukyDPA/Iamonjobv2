'use client';

// ════════════════════════════════════════════════════════════════════════════
// Inscription ouverte désactivée.
//
// On ne crée plus de compte librement : l'accès passe soit par un code
// (personne accompagnée), soit par la liste d'autorisation (conseiller). Cette
// page redirige donc vers /login, qui propose les deux chemins.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SignupRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/login'); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100">
      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
    </div>
  );
}
