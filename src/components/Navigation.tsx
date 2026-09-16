import React, { useState } from 'react';
import {
  Globe,
  ChevronDown,
  Plus,
  Check,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';
import { Website, User } from '../types';
import { FlowerLogo } from './landing/FlowerLogo';
import { WebhookEnvToggle } from './WebhookEnvToggle';

interface NavigationProps {
  currentTab?: 'dashboard' | 'content' | 'settings';
  currentView?: string;
  onSelectTab?: (tab: 'dashboard' | 'content' | 'settings') => void;
  onViewChange?: (view: any) => void;
  onCreateClick?: () => void;
  onStartCreate?: () => void;
  website: Website;
  onSwitchWebsite?: (website: Website) => void;
  onConnectNewWebsite?: () => void;
  user: User;
  onLogout: () => void;
  onGoToLanding?: () => void;
  isAgentWorking?: boolean;
  agentWorkingProgress?: number;
  agentWorkingTopic?: string;
  onOpenAgentWorking?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  currentView,
  onSelectTab,
  onViewChange,
  onCreateClick,
  onStartCreate,
  website,
  onSwitchWebsite,
  onConnectNewWebsite,
  user,
  onLogout,
  onGoToLanding,
  isAgentWorking,
  agentWorkingProgress,
  agentWorkingTopic,
  onOpenAgentWorking,
}) => {
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Compute active tab safely
  const activeTab: 'dashboard' | 'content' | 'settings' =
    currentTab ||
    (currentView === 'content'
      ? 'content'
      : currentView === 'settings'
      ? 'settings'
      : 'dashboard');

  const handleSelectTab = (tab: 'dashboard' | 'content' | 'settings') => {
    if (typeof onSelectTab === 'function') {
      onSelectTab(tab);
    }
    if (typeof onViewChange === 'function') {
      onViewChange(tab);
    }
  };

  const handleCreate = () => {
    if (typeof onCreateClick === 'function') {
      onCreateClick();
    }
    if (typeof onStartCreate === 'function') {
      onStartCreate();
    }
  };

  const handleConnectNew = () => {
    if (typeof onConnectNewWebsite === 'function') {
      onConnectNewWebsite();
    } else {
      handleSelectTab('settings');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 bg-white/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo & Navigation tabs */}
        <div className="flex items-center gap-6 sm:gap-8">
          <button
            id="nav-logo-btn"
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#ef4d23]/10 border border-[#ef4d23]/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FlowerLogo className="w-5 h-5" />
            </div>
            <span className="font-semibold text-base tracking-tight text-neutral-900 group-hover:text-neutral-700">
              IntentWrite
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-neutral-100/80 p-1 rounded-full border border-neutral-200/60">
            <button
              id="nav-dashboard-tab"
              onClick={() => handleSelectTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'text-white bg-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
              }`}
            >
              Dashboard
            </button>
            <button
              id="nav-content-tab"
              onClick={() => handleSelectTab('content')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'content'
                  ? 'text-white bg-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
              }`}
            >
              Content
            </button>
            <button
              id="nav-settings-tab"
              onClick={() => handleSelectTab('settings')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'text-white bg-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Right side: Website selector, Quick Create CTA, Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Agent working button - Shown on top whenever article crafting is in progress */}
          {isAgentWorking && (
            <button
              id="nav-agent-working-btn"
              type="button"
              onClick={() => {
                if (typeof onOpenAgentWorking === 'function') {
                  onOpenAgentWorking();
                }
              }}
              title={
                agentWorkingTopic
                  ? `Agent working on: "${agentWorkingTopic}". Click to view progress.`
                  : 'Agent working on article. Click to view progress.'
              }
              className={`flex items-center gap-2 rounded-full px-3 sm:px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs border ${
                currentView === 'generating'
                  ? 'bg-[#ef4d23] text-white border-[#ef4d23] ring-2 ring-[#ef4d23]/25 shadow-sm'
                  : 'bg-[#ef4d23]/10 text-[#ef4d23] border-[#ef4d23]/30 hover:bg-[#ef4d23]/20 hover:border-[#ef4d23]/50'
              }`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    currentView === 'generating' ? 'bg-white' : 'bg-[#ef4d23]'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    currentView === 'generating' ? 'bg-white' : 'bg-[#ef4d23]'
                  }`}
                />
              </span>
              <span className="whitespace-nowrap font-medium">Agent working</span>
              {agentWorkingProgress !== undefined && agentWorkingProgress > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none ${
                    currentView === 'generating'
                      ? 'bg-white/25 text-white'
                      : 'bg-[#ef4d23]/15 text-[#ef4d23]'
                  }`}
                >
                  {Math.round(agentWorkingProgress)}%
                </span>
              )}
            </button>
          )}

          {/* Webhook Environment Mode Toggle (Test vs Production) */}
          <WebhookEnvToggle />

          {/* Website selector dropdown */}
          <div className="relative">
            <button
              id="website-selector-dropdown-btn"
              onClick={() => {
                setIsSiteDropdownOpen(!isSiteDropdownOpen);
                setIsUserDropdownOpen(false);
              }}
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50/80 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-300 transition-all shadow-2xs"
            >
              <Globe className="h-3.5 w-3.5 text-neutral-500" />
              <span className="font-medium max-w-[110px] sm:max-w-[150px] truncate">
                {website.name || 'Select Website'}
              </span>
              <ChevronDown className="h-3 w-3 text-neutral-400" />
            </button>

            {isSiteDropdownOpen && (
              <div
                id="website-dropdown-panel"
                className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-neutral-200/90 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Connected Websites
                </div>

                <button
                  onClick={() => {
                    setIsSiteDropdownOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs text-neutral-900 bg-neutral-100/80 font-medium"
                >
                  <div className="truncate">
                    <p className="text-xs text-neutral-900 font-semibold">{website.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{website.url}</p>
                  </div>
                  <Check className="h-3.5 w-3.5 text-[#ef4d23] shrink-0 ml-2" />
                </button>

                <div className="my-1.5 h-px bg-neutral-100" />

                <button
                  id="connect-new-site-btn"
                  onClick={() => {
                    setIsSiteDropdownOpen(false);
                    handleConnectNew();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Connect Another Website</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Create CTA in Header */}
          <button
            id="nav-quick-create-btn"
            onClick={handleCreate}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#ef4d23] hover:bg-[#e0431b] active:scale-[0.98] text-white px-3.5 py-1.5 text-xs font-medium shadow-sm transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create</span>
          </button>

          {/* User profile button */}
          <div className="relative">
            <button
              id="user-profile-btn"
              onClick={() => {
                setIsUserDropdownOpen(!isUserDropdownOpen);
                setIsSiteDropdownOpen(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white border border-neutral-200 text-xs font-semibold hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>

            {isUserDropdownOpen && (
              <div
                id="user-dropdown-panel"
                className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-neutral-200/90 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-2 border-b border-neutral-100 mb-1">
                  <p className="text-xs font-semibold text-neutral-900">{user.name}</p>
                  <p className="text-[11px] text-neutral-500 truncate">{user.email}</p>
                  <span className="mt-1.5 inline-block rounded-full bg-[#ef4d23]/10 px-2 py-0.5 text-[10px] font-medium text-[#ef4d23] border border-[#ef4d23]/20">
                    {user.plan} Plan
                  </span>
                </div>

                <button
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    handleSelectTab('settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  <UserIcon className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Account & Settings</span>
                </button>

                {onGoToLanding && (
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onGoToLanding();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                    <span>View Landing Page</span>
                  </button>
                )}

                <div className="my-1 h-px bg-neutral-100" />

                <button
                  id="sign-out-btn"
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger menu toggle */}
          <div className="flex md:hidden">
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-3 space-y-1 shadow-lg">
          {isAgentWorking && (
            <button
              id="mobile-drawer-agent-working-btn"
              onClick={() => {
                if (typeof onOpenAgentWorking === 'function') {
                  onOpenAgentWorking();
                }
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold bg-[#ef4d23]/10 text-[#ef4d23] border border-[#ef4d23]/30 mb-2"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4d23] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4d23]" />
                </span>
                <span>Agent working</span>
              </div>
              {agentWorkingProgress !== undefined && agentWorkingProgress > 0 && (
                <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded-full border border-[#ef4d23]/20">
                  {Math.round(agentWorkingProgress)}%
                </span>
              )}
            </button>
          )}

          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200/80 mb-2">
            <span className="text-[11px] font-medium text-neutral-600">Generation Webhook</span>
            <WebhookEnvToggle id="mobile-webhook-env-toggle-btn" />
          </div>

          <button
            onClick={() => {
              handleSelectTab('dashboard');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'text-white bg-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => {
              handleSelectTab('content');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'content'
                ? 'text-white bg-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => {
              handleSelectTab('settings');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-white bg-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            Settings
          </button>
          <div className="pt-2">
            <button
              onClick={() => {
                handleCreate();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ef4d23] text-white py-2 text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Article</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
