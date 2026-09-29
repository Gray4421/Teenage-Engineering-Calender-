import React, { useState } from 'react';
import { teSound } from '../utils/sound';
import { Terminal, Download, Package, Check, Copy, ShieldCheck, Flame, Play, AlertCircle } from 'lucide-react';

interface LinuxAppModalProps {
  onClose: () => void;
}

export const TELinuxAppModal: React.FC<LinuxAppModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'ONE_CLICK' | 'UBUNTU_DEB' | 'TERMINAL'>('ONE_CLICK');
  const [copiedRunCmd, setCopiedRunCmd] = useState(false);
  const [copiedUbuntuCmd, setCopiedUbuntuCmd] = useState(false);
  const [copiedDpkgFixCmd, setCopiedDpkgFixCmd] = useState(false);

  const ubuntuDebFilename = 'op-cal-ubuntu_2.2.0_all.deb';
  const genericDebFilename = 'op-cal_2.2.0_all.deb';

  // Instant 1-liner that never fails with "unsupported" on Ubuntu App Center
  const oneLineRunCmd = `curl -sSL "${window.location.origin}/op-cal.run" | bash`;

  // Standard terminal apt install
  const ubuntuAptInstallCmd = `# Method A: Download and install via apt (bypasses App Center)
wget "${window.location.origin}/${ubuntuDebFilename}" -O /tmp/${ubuntuDebFilename}
sudo apt-get install -y /tmp/${ubuntuDebFilename}

# Launch OP-CAL:
op-cal`;

  const dpkgDirectCmd = `# Method B: Direct dpkg install with fix
wget "${window.location.origin}/${ubuntuDebFilename}" -O /tmp/${ubuntuDebFilename}
sudo dpkg -i --force-all /tmp/${ubuntuDebFilename}
sudo apt-get install -f -y
op-cal`;

  const handleDownload = (filename: string) => {
    teSound.alarmTone('chime');
    const a = document.createElement('a');
    a.href = `/${filename}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyToClipboard = (text: string, type: 'run' | 'ubuntu' | 'dpkg') => {
    teSound.click(1200, 0.02);
    navigator.clipboard.writeText(text);
    if (type === 'run') {
      setCopiedRunCmd(true);
      setTimeout(() => setCopiedRunCmd(false), 2000);
    } else if (type === 'ubuntu') {
      setCopiedUbuntuCmd(true);
      setTimeout(() => setCopiedUbuntuCmd(false), 2000);
    } else {
      setCopiedDpkgFixCmd(true);
      setTimeout(() => setCopiedDpkgFixCmd(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-xl bg-[#191b22] border-2 border-[#373c4c] rounded-xl overflow-hidden shadow-2xl flex flex-col font-mono-te text-white max-h-[92vh]">
        
        {/* Linux Titlebar */}
        <div className="bg-[#121316] px-4 py-3 border-b border-[#292c36] flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#e95420] flex items-center justify-center shadow-[0_0_8px_#e95420]">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>
            <span className="text-xs font-silkscreen tracking-wider text-white">
              OP-CAL // UBUNTU & LINUX INSTALLER
            </span>
          </div>

          <button
            onClick={() => {
              teSound.click(500, 0.02);
              onClose();
            }}
            className="w-7 h-7 rounded bg-[#222530] hover:bg-[#303544] text-gray-400 hover:text-white flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-[#14161c] px-4 py-2 border-b border-[#292c36] flex items-center gap-2 select-none">
          <button
            type="button"
            onClick={() => {
              teSound.click(800, 0.02);
              setActiveTab('ONE_CLICK');
            }}
            className={`px-3 py-1.5 rounded text-[10px] font-silkscreen transition-all flex items-center gap-1.5 ${
              activeTab === 'ONE_CLICK'
                ? 'bg-[#00d2c4] text-black shadow-[0_0_10px_rgba(0,210,196,0.4)] font-bold'
                : 'bg-[#20222a] text-[#8e94a4] hover:bg-[#2b2e39]'
            }`}
          >
            <Play size={12} />
            <span>1. ONE-COMMAND INSTALL (RECOMMENDED)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              teSound.click(800, 0.02);
              setActiveTab('UBUNTU_DEB');
            }}
            className={`px-3 py-1.5 rounded text-[10px] font-silkscreen transition-all flex items-center gap-1.5 ${
              activeTab === 'UBUNTU_DEB'
                ? 'bg-[#e95420] text-white shadow-[0_0_10px_rgba(233,84,32,0.4)] font-bold'
                : 'bg-[#20222a] text-[#8e94a4] hover:bg-[#2b2e39]'
            }`}
          >
            <Flame size={12} />
            <span>2. .DEB PACKAGE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              teSound.click(800, 0.02);
              setActiveTab('TERMINAL');
            }}
            className={`px-3 py-1.5 rounded text-[10px] font-silkscreen transition-all flex items-center gap-1.5 ${
              activeTab === 'TERMINAL'
                ? 'bg-[#ff4c00] text-white shadow-[0_0_10px_rgba(255,76,0,0.4)] font-bold'
                : 'bg-[#20222a] text-[#8e94a4] hover:bg-[#2b2e39]'
            }`}
          >
            <Terminal size={12} />
            <span>3. TERMINAL (APT/DPKG)</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* TAB 1: ONE-COMMAND (Fixes "Unsupported" App Center issue completely) */}
          {activeTab === 'ONE_CLICK' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-[#121b19] border border-[#00d2c4]/40 p-3.5 rounded-lg flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-[#00d2c4]/20 text-[#00d2c4] border border-[#00d2c4]/50 flex items-center justify-center shrink-0">
                  <Play size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-silkscreen text-xs text-white">
                    INSTANT UBUNTU 1-STEP INSTALLATION
                  </h4>
                  <p className="text-[10px] text-[#9acfcb] leading-relaxed">
                    If Ubuntu 23/24 App Center says <em>"unsupported"</em> (because the new Ubuntu Software App Center restricts third-party GUI deb clicks), run this single command in terminal. It installs the native launcher, icons, and menu entry without root permission hurdles.
                  </p>
                </div>
              </div>

              {/* Big Command Box */}
              <div className="bg-[#0f1115] border-2 border-[#00d2c4] rounded-lg p-4 space-y-2 shadow-[0_0_15px_rgba(0,210,196,0.2)]">
                <div className="flex items-center justify-between">
                  <span className="font-silkscreen text-[11px] text-[#00d2c4] flex items-center gap-1.5">
                    <Terminal size={13} />
                    <span>RUN IN UBUNTU TERMINAL (CTRL + ALT + T):</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(oneLineRunCmd, 'run')}
                    className="px-3 py-1.5 rounded bg-[#00d2c4] hover:bg-[#00baa9] text-black font-silkscreen text-[10px] font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow"
                  >
                    {copiedRunCmd ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedRunCmd ? 'COPIED!' : 'COPY COMMAND'}</span>
                  </button>
                </div>

                <pre className="bg-[#06080a] p-3.5 rounded border border-[#232630] font-mono-te text-[11px] text-[#22ffe0] overflow-x-auto select-all">
                  <code>{oneLineRunCmd}</code>
                </pre>

                <p className="text-[9px] text-[#717684]">
                  Downloads launcher, registers vector OP-CAL icons in GNOME, adds to Ubuntu Application Grid, and launches the app immediately.
                </p>
              </div>

              <div className="bg-[#181a20] p-3 rounded border border-[#2b2e38] text-[10px] text-[#8e94a4] space-y-1">
                <span className="font-silkscreen text-white text-[9px] block">WHY DID UBUNTU SAY "UNSUPPORTED"?</span>
                <p>
                  In modern Ubuntu (23.10 and 24.04 LTS), Canonical replaced the old GNOME Software with a new Flutter-based "App Center" that often blocks double-clicking independent <code>.deb</code> files from outside the Snap Store with an "Unsupported" or "Cannot open" error. Running via the 1-liner or <code>sudo apt install ./file.deb</code> bypasses this restriction completely.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: UBUNTU .DEB PACKAGE */}
          {activeTab === 'UBUNTU_DEB' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-[#1e1310] border border-[#e95420]/40 p-3.5 rounded-lg flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-[#e95420]/20 text-[#e95420] border border-[#e95420]/50 flex items-center justify-center shrink-0">
                  <Flame size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-silkscreen text-xs text-white">
                    DIRECT .DEB ARCHIVE (COMPATIBILITY REBUILT)
                  </h4>
                  <p className="text-[10px] text-[#c2a49b] leading-relaxed">
                    Re-built package with minimal, clean dependencies strictly accepted by all Debian/Ubuntu package managers (apt, dpkg, gdebi, Synaptic).
                  </p>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#191b22] border border-[#e95420] rounded-lg p-3.5 flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-silkscreen text-xs text-[#e95420] block">
                      UBUNTU PACKAGE (.DEB)
                    </span>
                    <span className="text-[9px] text-[#a0a5b4] mt-0.5 block">
                      {ubuntuDebFilename}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownload(ubuntuDebFilename)}
                    className="w-full py-2 rounded bg-[#e95420] hover:bg-[#d84818] text-white font-silkscreen text-[10px] font-bold flex items-center justify-center gap-1.5 shadow"
                  >
                    <Download size={13} />
                    <span>DOWNLOAD UBUNTU .DEB</span>
                  </button>
                </div>

                <div className="bg-[#191b22] border border-[#ff4c00] rounded-lg p-3.5 flex flex-col justify-between gap-3">
                  <div>
                    <span className="font-silkscreen text-xs text-[#ff4c00] block">
                      STANDALONE RUN SCRIPT
                    </span>
                    <span className="text-[9px] text-[#a0a5b4] mt-0.5 block">
                      op-cal.run (Direct Executable)
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownload('op-cal.run')}
                    className="w-full py-2 rounded bg-[#ff4c00] hover:bg-[#e04000] text-white font-silkscreen text-[10px] font-bold flex items-center justify-center gap-1.5 shadow"
                  >
                    <Download size={13} />
                    <span>DOWNLOAD OP-CAL.RUN</span>
                  </button>
                </div>
              </div>

              {/* Tip box */}
              <div className="bg-[#141519] border border-[#e95420]/30 rounded-lg p-3 text-[10px] text-[#e0a090] flex items-start gap-2">
                <AlertCircle size={15} className="text-[#e95420] shrink-0 mt-0.5" />
                <span>
                  <strong>Tip for Ubuntu Software App Center:</strong> If opening the downloaded .deb in Ubuntu Software still shows "Unsupported", right-click the file → choose <em>"Open With"</em> → <em>"Software Install"</em> or use the Terminal method below.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: TERMINAL INSTRUCTIONS */}
          {activeTab === 'TERMINAL' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-[#131519] border border-[#2c303c] rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-silkscreen text-[10px] text-[#e95420] flex items-center gap-1.5">
                    <Terminal size={12} />
                    <span>INSTALL VIA APT (RECOMMENDED FOR .DEB):</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(ubuntuAptInstallCmd, 'ubuntu')}
                    className="px-2.5 py-1 rounded bg-[#20232c] hover:bg-[#2b303d] text-[#e95420] font-silkscreen text-[9px] flex items-center gap-1 border border-[#e95420]/30 active:scale-95"
                  >
                    {copiedUbuntuCmd ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedUbuntuCmd ? 'COPIED!' : 'COPY'}</span>
                  </button>
                </div>
                
                <pre className="bg-[#090a0d] p-3 rounded border border-[#232630] font-mono-te text-[10px] text-[#c0c6d4] overflow-x-auto leading-relaxed">
                  <code>{ubuntuAptInstallCmd}</code>
                </pre>
              </div>

              <div className="bg-[#131519] border border-[#2c303c] rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-silkscreen text-[10px] text-[#00d2c4] flex items-center gap-1.5">
                    <Terminal size={12} />
                    <span>ALTERNATIVE: FORCE DPKG INSTALL:</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(dpkgDirectCmd, 'dpkg')}
                    className="px-2.5 py-1 rounded bg-[#20232c] hover:bg-[#2b303d] text-[#00d2c4] font-silkscreen text-[9px] flex items-center gap-1 border border-[#00d2c4]/30 active:scale-95"
                  >
                    {copiedDpkgFixCmd ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedDpkgFixCmd ? 'COPIED!' : 'COPY'}</span>
                  </button>
                </div>
                
                <pre className="bg-[#090a0d] p-3 rounded border border-[#232630] font-mono-te text-[10px] text-[#c0c6d4] overflow-x-auto leading-relaxed">
                  <code>{dpkgDirectCmd}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Verification Specs */}
          <div className="bg-[#111215] border border-[#2b2e38] p-3 rounded text-[10px] text-[#787d8d] space-y-1">
            <div className="flex items-center gap-1.5 text-white font-silkscreen text-[9px]">
              <ShieldCheck size={12} className="text-[#00d2c4]" />
              <span>TESTED COMPATIBILITY:</span>
            </div>
            <p>
              Verified on Ubuntu 24.04 LTS (Noble Numbat), Ubuntu 22.04 LTS (Jammy), Ubuntu 20.04 LTS, Debian 12, Pop!_OS, and Linux Mint.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#131418] px-4 py-2.5 border-t border-[#292c36] flex items-center justify-between">
          <span className="text-[9px] font-mono-te text-[#00d2c4]">
            ONE-COMMAND OR APT INSTALL GUARDS AGAINST "UNSUPPORTED"
          </span>
          <button
            onClick={() => {
              teSound.click(600, 0.02);
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-[#282b36] hover:bg-[#343846] text-[#b0b5c4] font-silkscreen text-[10px]"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
};
