import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Navbar } from './Navbar';
import { DashboardPreview } from './DashboardPreview';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn }) => {
  return (
    <div className="min-h-screen w-full bg-[#ededed] p-3 sm:p-4 font-inter antialiased flex flex-col justify-center items-center">
      {/* Hero container (clips everything inside) */}
      <div className="relative w-full h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] overflow-hidden bg-[#d9d9d9] rounded-2xl sm:rounded-3xl shadow-sm flex flex-col">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          disableRemotePlayback
          poster="https://images.unsplash.com/photo-1557683316-973673baf926?w=1600&q=60"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260424_064411_9e9d7f84-9277-41f4-ab10-59172d89e6be.mp4"
            type="video/mp4"
          />
        </video>

        {/* Above the video: absolute inset-0 bg-white/10 overlay */}
        <div className="absolute inset-0 bg-white/10 pointer-events-none" />

        {/* Foreground content wrapper: relative z-10 */}
        <div className="relative z-10 w-full h-full flex flex-col overflow-y-auto scrollbar-none">
          {/* Floating Navbar */}
          <Navbar onGetStarted={onGetStarted} onSignIn={onSignIn} />

          {/* Hero Content (centered) */}
          <div className="flex flex-col items-center px-4 pt-8 sm:pt-14 pb-6 sm:pb-8 text-center shrink-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 shadow-sm text-[13px] font-medium text-neutral-800">
              <span className="w-2 h-2 rounded-full bg-[#ef4d23]" />
              <span>AI Content Automation</span>
            </div>

            {/* Headline <h1> */}
            <h1
              className="mt-5 sm:mt-6 max-w-4xl text-neutral-900 tracking-tight"
              style={{
                fontSize: 'clamp(36px, 8vw, 72px)',
                lineHeight: 1.05,
                fontWeight: 500,
                letterSpacing: '-0.02em',
              }}
            >
              Turn Ideas Into{' '}
              <span
                style={{
                  fontFamily: "'Instrument Serif', serif",
                  fontStyle: 'italic',
                  fontWeight: 400,
                }}
              >
                Content
              </span>
              <br />
              That Gets Found
            </h1>

            {/* Subtitle <p> */}
            <p
              className="mt-4 sm:mt-5 text-neutral-700 px-2 max-w-xl font-normal leading-relaxed"
              style={{
                fontSize: 'clamp(13px, 3.5vw, 16px)',
              }}
            >
              Research-backed SEO and AEO content, created by AI and ready to publish on your
              website.
            </p>

            {/* CTA button */}
            <button
              id="hero-create-first-article-btn"
              type="button"
              onClick={onGetStarted}
              className="mt-6 sm:mt-8 inline-flex items-center gap-3 bg-[#0b0f1a] hover:bg-neutral-800 active:scale-[0.98] text-white rounded-full pl-6 sm:pl-7 pr-2 py-2 sm:py-2.5 text-[14px] font-medium shadow-md transition-all group"
            >
              <span>Create Your First Article</span>
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ChevronRight className="w-4 h-4 text-white" />
              </span>
            </button>

            {/* Subtext below CTA */}
            <p className="mt-3 text-xs text-neutral-500 font-medium">
              No complicated SEO tools. Just give us a topic.
            </p>
          </div>

          {/* Dashboard Preview - bleeds down inside the rounded container */}
          <div className="w-full pb-8 sm:pb-12 mt-auto">
            <DashboardPreview onActionClick={onGetStarted} />
          </div>
        </div>
      </div>
    </div>
  );
};
