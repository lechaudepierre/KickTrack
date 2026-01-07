import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/5 to-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-lg">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-7xl mb-4">⚽</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
            KickTrack
          </h1>
          <p className="text-slate-400 mt-3 text-lg">
            Le tracker de babyfoot ultime
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm text-slate-300">Statistiques</p>
          </div>
          <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
            <div className="text-2xl mb-2">🏆</div>
            <p className="text-sm text-slate-300">Classements</p>
          </div>
          <div className="p-4 bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/30">
            <div className="text-2xl mb-2">👥</div>
            <p className="text-sm text-slate-300">Multijoueur</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-700 transition-all active:scale-[0.98]"
          >
            Commencer à jouer
          </Link>
          <Link
            href="/login"
            className="block w-full py-4 px-6 bg-slate-800/50 backdrop-blur-sm text-white font-semibold rounded-xl border border-slate-700 hover:bg-slate-700/50 transition-all"
          >
            J&apos;ai déjà un compte
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-12 text-slate-500 text-sm">
          Trackez vos parties • Grimpez le classement • Devenez champion 🏅
        </p>
      </div>
    </div>
  );
}
