import React, { useState } from 'react';
import { FileText, ChevronRight, Menu, X } from 'lucide-react';
import { FlowerLogo } from './FlowerLogo';

interface NavbarProps {
  onGetStarted: () => void;
  onSignIn?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onGetStarted, onSignIn }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignInClick = () => {
    if (onSignIn) {
      onSignIn();
    } else {
      onGetStarted();
    }
  };

  const navLinks = [
    { name: 'Home', isCurrent: true },
    { name: 'How It Works', isCurrent: false },
    { name: 'Features', isCurrent: false },
    { name: 'Publishing', isCurrent: false },
    { name: 'Pricing', isCurrent: false },
  ];

  return (
    <div className="w-full flex justify-center pt-4 sm:pt-6 px-3 sm:px-4">
      <div className="bg-white rounded-full shadow-sm border border-neutral-200 pl-2 pr-2 py-2 w-full max-w-[760px] relative flex items-center justify-between">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-2.5 pl-1.5 sm:pl-2">
          <FlowerLogo className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="font-semibold text-sm sm:text-base tracking-tight text-neutral-900 select-none">
            IntentWrite
          </span>
        </div>

        {/* Center: Desktop links */}
        <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-neutral-600">
          {navLinks.map((link) => (
            <button
              key={link.name}
              type="button"
              onClick={onGetStarted}
              className={`inline-flex items-center gap-1.5 transition-colors hover:text-neutral-900 ${
                link.isCurrent ? 'text-neutral-900 font-semibold' : ''
              }`}
            >
              {link.isCurrent && (
                <span className="inline-block w-[4px] h-[4px] rounded-full bg-neutral-900" />
              )}
              {link.name}
            </button>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          {/* Sign In button */}
          <button
            id="nav-signin-btn"
            type="button"
            onClick={handleSignInClick}
            className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs sm:text-[13px] font-medium text-neutral-700 hover:text-neutral-950 transition-colors rounded-full hover:bg-neutral-100"
          >
            Log in
          </button>

          {/* Orange #ef4d23 rounded-full button */}
          <button
            id="nav-start-creating-btn"
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] text-white rounded-full pl-3.5 sm:pl-4 pr-1.5 sm:pr-2 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium shadow-sm transition-all"
          >
            <span className="hidden sm:inline">Start Creating</span>
            <span className="sm:hidden">Create</span>
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </span>
          </button>

          {/* Mobile-only hamburger */}
          <button
            id="nav-mobile-menu-btn"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-full text-neutral-700 hover:bg-neutral-100 transition-colors ml-0.5"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile dropdown panel */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-2 right-2 mt-2 bg-white rounded-2xl shadow-lg border border-neutral-200 p-3 z-20 flex flex-col gap-1 text-left">
            {navLinks.map((link) => (
              <button
                key={link.name}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStarted();
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  link.isCurrent
                    ? 'bg-neutral-100 text-neutral-900 font-semibold'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <span>{link.name}</span>
                {link.isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ef4d23]" />
                )}
              </button>
            ))}
            <div className="pt-2 border-t border-neutral-100 mt-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignInClick();
                }}
                className="w-full flex items-center justify-center py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-xl"
              >
                <span>Log In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onGetStarted();
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#ef4d23] text-white rounded-xl py-2.5 text-sm font-medium shadow-sm"
              >
                <span>Start Creating (Free)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
