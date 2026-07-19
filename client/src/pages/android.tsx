import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Download, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { isNative } from '@/utils/platform';

/**
 * /android — "Get the Android app" sideload page.
 *
 * Direct-link only: intentionally NOT in the tab bar or any in-app nav, so
 * the iOS build never surfaces it. As a second guard, the native Capacitor
 * shell redirects straight home.
 */
export default function AndroidPage() {
  const router = useRouter();

  // Never show alternate-distribution content inside the native shell.
  useEffect(() => {
    if (isNative()) router.replace('/');
  }, [router]);

  return (
    <Layout>
      <Head>
        <title>Get the Android App · Be With Me</title>
        <meta
          name="description"
          content="Download Be With Me for Android — live streams, reels, and real connection with your favorite creators."
        />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-10 pb-24 safe-area-pb">
        {/* ─── Celebration header ─── */}
        <header className="relative overflow-hidden celebration-canvas rounded-4xl border border-white/10 px-6 py-7 sm:px-8 mb-6 animate-rise">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px gradient-celebration opacity-70" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50 mb-2">
            Android
          </p>
          <h1 className="font-sans text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Get the <span className="text-celebration">Android app</span>
          </h1>
          <p className="mt-2 text-sm text-white/50">
            The full Be With Me experience — live streams, reels, gifts — on your Android phone.
          </p>
        </header>

        <div className="glass-card px-5 py-8 sm:px-8 sm:py-10 space-y-10 text-[15px] leading-7 text-white/70">

          {/* ─── Direct download ─── */}
          <section>
            <h2 className="font-sans text-base sm:text-lg font-bold tracking-tight mb-3 text-accent-green">
              Download the app
            </h2>
            <a
              href="/downloads/bewithme.apk"
              download
              className="glimmer relative w-full min-h-[52px] py-3.5 rounded-2xl overflow-hidden bg-gradient-to-r from-brand-500/90 via-brand-600/85 to-violet-deep/85 backdrop-blur-md border border-white/20 shadow-glow text-white text-[15px] font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" aria-hidden="true" />
              Download Be With Me (.apk)
            </a>
            <p className="mt-3 text-[13px] text-white/40">
              Free · Android 8.0+ · If the download doesn&apos;t start, a new build is being
              published — check back in a few minutes.
            </p>
          </section>

          {/* ─── Install steps ─── */}
          <section>
            <h2 className="font-sans text-base sm:text-lg font-bold tracking-tight mb-4 text-accent-cyan">
              How to install
            </h2>
            <ol className="space-y-3">
              <Step n={1} title="Download the APK">
                Tap the download button above. Chrome may warn about APK files — choose{' '}
                <strong>Download anyway</strong>.
              </Step>
              <Step n={2} title="Allow the install">
                Open the downloaded file. If Android asks, enable{' '}
                <strong>Install unknown apps</strong> for your browser (Settings → Apps →
                Special app access → Install unknown apps), then go back and tap{' '}
                <strong>Install</strong>.
              </Step>
              <Step n={3} title="Open Be With Me">
                Find the heart on your home screen, sign in, and you&apos;re live.
              </Step>
            </ol>
          </section>

          {/* ─── Safety note ─── */}
          <section>
            <div className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4">
              <ShieldCheck className="w-5 h-5 text-accent-green flex-shrink-0 mt-1" aria-hidden="true" />
              <p className="text-[14px] leading-6">
                <strong className="font-semibold text-white/90">Stay safe:</strong> only download
                Be With Me from <strong className="font-semibold text-white/90">bewithme.live</strong>.
                APKs from anywhere else may be modified and are not ours.
              </p>
            </div>
          </section>

          {/* ─── Google Play — coming soon ─── */}
          <section>
            <h2 className="font-sans text-base sm:text-lg font-bold tracking-tight mb-4 text-accent-violet">
              Prefer the Play Store?
            </h2>
            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 opacity-80">
              <Smartphone className="w-6 h-6 text-white/50 flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-white/90 text-[14px]">Get it on Google Play</p>
                <p className="text-[13px] text-white/50">Coming soon — we&apos;re on it.</p>
              </div>
            </div>
          </section>

          {/* ─── Web app fallback ─── */}
          <section>
            <h2 className="font-sans text-base sm:text-lg font-bold tracking-tight mb-3 text-accent-pink">
              No install needed
            </h2>
            <p>
              Everything also works right here in your browser. In Chrome, open{' '}
              <strong>bewithme.live</strong> and choose{' '}
              <strong>Add to Home screen</strong> for the full-screen app experience —{' '}
              <Sparkles className="inline w-4 h-4 text-accent-yellow align-[-2px]" aria-hidden="true" />{' '}
              no download required.
            </p>
          </section>

        </div>
      </div>
    </Layout>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4">
      <span
        className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-violet-deep text-white text-[13px] font-bold flex items-center justify-center flex-shrink-0"
        aria-hidden="true"
      >
        {n}
      </span>
      <div>
        <h3 className="font-sans font-semibold text-white/90 text-[15px] mb-1">{title}</h3>
        <div className="text-white/60 text-[14px] leading-6">{children}</div>
      </div>
    </li>
  );
}
