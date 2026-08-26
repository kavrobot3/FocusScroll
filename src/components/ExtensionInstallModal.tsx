import { useState } from 'react';
import {
  X,
  Download,
  FolderArchive,
  FolderOpen,
  ToggleRight,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  Chrome,
  AlertTriangle,
  FileCode2,
  FolderCheck,
  FolderX
} from 'lucide-react';
import { generateAndDownloadExtensionZip } from '@/lib/extensionZip';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExtensionInstallModal({ isOpen, onClose }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const totalSteps = 6;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRedownload = async () => {
    try {
      setIsDownloading(true);
      await generateAndDownloadExtensionZip();
    } finally {
      setTimeout(() => setIsDownloading(false), 600);
    }
  };

  const steps = [
    {
      step: 1,
      title: 'Extract the Downloaded ZIP Archive',
      tag: 'Step 1 • Unzip Archive',
      desc: 'The extension ZIP file has downloaded to your computer. You must extract (unzip) it before Chrome can load it.',
      icon: <FolderArchive className="text-cyan-400" size={24} />,
      visual: (
        <div className="bg-black/40 rounded-2xl p-4 border border-white/10 flex flex-col gap-3 font-sans">
          <div className="flex items-center justify-between text-xs text-white/60 border-b border-white/10 pb-2.5">
            <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
              <FolderArchive size={14} /> File Explorer / Finder &rarr; Downloads
            </span>
            <span className="text-[11px] text-white/40">Windows / Mac / Linux</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 shrink-0">
              <FolderArchive size={26} />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-xs font-bold text-white">FocusScroll-Extension.zip (or dist.zip)</div>
              <div className="text-[11px] text-white/50 mt-0.5">
                Right click &rarr; <span className="text-cyan-300 font-semibold">"Extract All..."</span> (Windows) or double-click (Mac)
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                <FolderOpen size={12} /> Extracted Folder
              </div>
            </div>
          </div>

          <div className="text-[11px] text-white/60 bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/20 flex items-center justify-between">
            <span>Need another copy of the ZIP?</span>
            <button
              onClick={handleRedownload}
              disabled={isDownloading}
              className="text-xs text-cyan-300 hover:text-cyan-200 font-bold underline flex items-center gap-1 cursor-pointer"
            >
              <Download size={12} /> {isDownloading ? 'Downloading...' : 'Re-download ZIP'}
            </button>
          </div>
        </div>
      )
    },
    {
      step: 2,
      title: 'Crucial: Use the INNER Folder (with manifest.json)',
      tag: 'Step 2 • Folder Structure Warning',
      desc: 'When unzipping, archivers often create an outer wrapper folder containing another inner folder. You MUST select the inner folder containing manifest.json.',
      icon: <AlertTriangle className="text-amber-400" size={24} />,
      visual: (
        <div className="bg-black/40 rounded-2xl p-4 border border-amber-400/30 flex flex-col gap-3 font-sans">
          {/* Warning Banner */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs font-semibold">
            <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            <span>Do NOT select the outer parent folder! Pick the inner folder directly containing files.</span>
          </div>

          {/* Visual Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* WRONG Selection */}
            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-red-400 font-bold">
                <FolderX size={15} />
                <span>❌ WRONG: Outer Wrapper</span>
              </div>
              <div className="font-mono text-[11px] bg-black/50 p-2 rounded-lg text-white/50 space-y-1">
                <div>📁 FocusScroll-Extension/</div>
                <div className="pl-4 text-white/70">📁 dist/ <span className="text-red-400 text-[10px]">(nested inside)</span></div>
              </div>
              <p className="text-[10px] text-red-300/80 leading-snug">
                Causes Chrome error: <em>"Manifest file is missing or unreadable"</em>
              </p>
            </div>

            {/* CORRECT Selection */}
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <FolderCheck size={15} />
                <span>✅ CORRECT: Inner Folder</span>
              </div>
              <div className="font-mono text-[11px] bg-black/50 p-2 rounded-lg text-white/80 space-y-1">
                <div className="text-emerald-300 font-bold">📁 dist/</div>
                <div className="pl-4 text-cyan-300 flex items-center gap-1">
                  <FileCode2 size={11} /> manifest.json
                </div>
                <div className="pl-4 text-white/50 text-[10px]">background.js, content-scripts...</div>
              </div>
              <p className="text-[10px] text-emerald-300/80 leading-snug">
                Directly contains <strong>manifest.json</strong> & scripts.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      step: 3,
      title: 'Open Chrome Extensions Page',
      tag: 'Step 3 • Extensions Manager',
      desc: 'Open Google Chrome and navigate to the extensions management screen.',
      icon: <Chrome className="text-cyan-400" size={24} />,
      visual: (
        <div className="bg-black/40 rounded-2xl p-4 border border-white/10 flex flex-col gap-3 font-sans">
          {/* Simulated Chrome Address Bar */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <div className="flex-1 bg-black/60 rounded-lg px-3 py-1.5 border border-white/15 flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-300 font-semibold">
                chrome://extensions
              </span>
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded transition-all cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-white/70">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="font-bold text-white block mb-0.5">Method A (Fastest)</span>
              Copy the URL above, open a new tab in Chrome, paste and press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono text-white">Enter</kbd>.
            </div>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
              <span className="font-bold text-white block mb-0.5">Method B (Menu)</span>
              Click Chrome menu (<strong className="text-white">⋮</strong>) &rarr; <strong className="text-white">Extensions</strong> &rarr; <strong className="text-white">Manage Extensions</strong>.
            </div>
          </div>
        </div>
      )
    },
    {
      step: 4,
      title: 'Turn On "Developer mode"',
      tag: 'Step 4 • Toggle Switch',
      desc: 'In the top-right corner of the Chrome Extensions page, flip the toggle switch to enable Developer mode.',
      icon: <ToggleRight className="text-purple-400" size={24} />,
      visual: (
        <div className="bg-black/40 rounded-2xl p-4 border border-white/10 flex flex-col gap-3 font-sans">
          {/* Simulated Header of Chrome Extensions */}
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Chrome size={18} className="text-cyan-400" />
              <span className="text-xs font-bold text-white">Extensions</span>
            </div>

            {/* Glowing Developer Mode Toggle */}
            <div className="flex items-center gap-2 bg-purple-500/20 border border-purple-400/50 rounded-xl px-3 py-1.5 shadow-lg shadow-purple-500/20 animate-pulse">
              <span className="text-xs font-bold text-purple-200">Developer mode</span>
              <div className="w-8 h-4 bg-purple-500 rounded-full relative flex items-center px-0.5">
                <div className="w-3 h-3 bg-white rounded-full absolute right-0.5 shadow" />
              </div>
            </div>
          </div>

          <div className="text-xs text-white/70 bg-purple-950/30 p-3 rounded-xl border border-purple-500/20 flex items-start gap-2">
            <Sparkles size={16} className="text-purple-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              Turning on Developer Mode unlocks the <strong>"Load unpacked"</strong> button in Chrome's top toolbar.
            </p>
          </div>
        </div>
      )
    },
    {
      step: 5,
      title: 'Click "Load unpacked" & Pick the Inner Folder',
      tag: 'Step 5 • Load Extension',
      desc: 'Click "Load unpacked" in the top-left toolbar, then select the inner folder that contains manifest.json.',
      icon: <Upload className="text-emerald-400" size={24} />,
      visual: (
        <div className="bg-black/40 rounded-2xl p-4 border border-white/10 flex flex-col gap-3 font-sans">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-ink-950 text-xs font-bold shadow-lg shadow-emerald-500/25 border border-emerald-400 animate-bounce">
              <Upload size={14} />
              <span>Load unpacked</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs font-semibold">
              Pack extension
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs font-semibold">
              Update
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-[11px] text-white/70">
            <div className="flex items-center gap-2 text-white font-bold">
              <FolderOpen size={14} className="text-cyan-400" />
              <span>Select the inner "dist" folder (where manifest.json lives)</span>
            </div>
            <p className="text-white/50 text-[10px] pl-5">
              Remember: If you see another folder inside your extracted folder, open it and select that inner folder!
            </p>
          </div>
        </div>
      )
    },
    {
      step: 6,
      title: 'Done! Focus Scroll is Active',
      tag: 'Step 6 • Protection Ready',
      desc: 'Whenever you open YouTube Shorts or Instagram Reels, Focus Scroll will lock rapid scrolling until your focus target is reached!',
      icon: <CheckCircle2 className="text-cyan-400" size={24} />,
      visual: (
        <div className="bg-gradient-to-br from-cyan-950/40 via-ink-900 to-black rounded-2xl p-5 border border-cyan-400/30 flex flex-col items-center text-center gap-3 font-sans shadow-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 shadow-lg shadow-cyan-500/20">
            <Shield size={28} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Scroll Intervention Active</h3>
            <p className="text-xs text-white/60 mt-1 max-w-sm">
              You can now browse YouTube & Instagram Reels. The extension blocks instant swipe-aways and helps rebuild your attention span.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <div className="px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-red-500" /> YouTube Shorts
            </div>
            <div className="px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-pink-500" /> Instagram Reels
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto scrollbar-hide rounded-3xl bg-ink-900 border border-white/15 p-5 sm:p-7 shadow-2xl flex flex-col gap-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 shadow-lg shadow-cyan-500/20">
              <Chrome size={22} />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-400 text-[9px] font-bold text-ink-950">
                ★
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">Install Chrome Extension</h2>
                <span className="text-[10px] font-bold bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-400/30">
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
              <p className="text-xs text-white/50">Rebuild your attention directly inside YouTube & Instagram</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
          {steps.map((s) => {
            const isCompleted = s.step < currentStep;
            const isCurrent = s.step === currentStep;
            return (
              <button
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-cyan-400/15 border-cyan-400/60 text-cyan-300 shadow-md ring-1 ring-cyan-400/30'
                    : isCompleted
                    ? 'bg-white/10 border-white/20 text-white/80 hover:bg-white/15'
                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center text-[11px] font-bold">
                  {isCompleted ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <span>0{s.step}</span>
                  )}
                </div>
                <span className="text-[9.5px] font-medium hidden sm:inline truncate max-w-full px-0.5">
                  {s.step === 1 && 'Extract'}
                  {s.step === 2 && 'Inner Folder'}
                  {s.step === 3 && 'Extensions'}
                  {s.step === 4 && 'Dev Mode'}
                  {s.step === 5 && 'Load'}
                  {s.step === 6 && 'Done'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Current Step Card */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 shrink-0">
              {currentStepData.icon}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                {currentStepData.tag}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                {currentStepData.title}
              </h3>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                {currentStepData.desc}
              </p>
            </div>
          </div>

          {/* Step Visual Guide */}
          <div>{currentStepData.visual}</div>
        </div>

        {/* Navigation & Action Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentStep === 1
                ? 'opacity-30 cursor-not-allowed text-white/40'
                : 'bg-white/10 hover:bg-white/20 text-white cursor-pointer'
            }`}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRedownload}
              disabled={isDownloading}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download size={13} />
              <span>{isDownloading ? 'Downloading...' : 'Re-download ZIP'}</span>
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(totalSteps, prev + 1))}
                className="px-5 py-2 rounded-xl bg-cyan-400 text-ink-950 font-bold text-xs hover:bg-cyan-300 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
              >
                <span>Next Step</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-ink-950 font-bold text-xs hover:opacity-90 transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer active:scale-95"
              >
                <CheckCircle2 size={14} />
                <span>Finish & Start</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
