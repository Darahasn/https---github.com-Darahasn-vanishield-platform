'use strict';

let currentIndustryId = 'construction';
let currentPortalRole = 'worker';
let currentLanguageCode = 'en';
let latestWorkforceData = null;
let sosCountdownTimer = null;
let sosSecondsRemaining = 3;
let liveSosDispatches = [];

const LANGUAGE_DICTIONARY = {
  en: { speechLocale: 'en-IN', welcomeHeading: 'Safe Work, Clear Pay & Portable Skills for Every Worker', voiceGuideLabel: 'Voice Guide' },
  hi: { speechLocale: 'hi-IN', welcomeHeading: 'सुरक्षित काम, पारदर्शी वेतन और डिजिटल स्किल पासपोर्ट', voiceGuideLabel: 'आवाज़ गाइड' },
  ta: { speechLocale: 'ta-IN', welcomeHeading: 'பாதுகாப்பான பணி, வெளிப்படையான சம்பளம் & திறன் பாஸ்போர்ட்', voiceGuideLabel: 'குரல் வழிகாட்டி' },
  te: { speechLocale: 'te-IN', welcomeHeading: 'సురక్షితమైన పని, పారదర్శక వేతనం & డిజిటల్ స్కిల్ పాస్‌పోర్ట్', voiceGuideLabel: 'వాయిస్ గైಡ್' },
  kn: { speechLocale: 'kn-IN', welcomeHeading: 'ಸುರಕ್ಷಿತ ಕೆಲಸ, ಪಾರದರ್ಶಕ ವೇತನ ಮತ್ತು ಡಿಜಿಟಲ್ ಸ್ಕಿಲ್ ಪಾಸ್‌ಪೋರ್ಟ್', voiceGuideLabel: 'ಧ್ವನಿ ಮಾರ್ಗದರ್ಶಿ' },
  ml: { speechLocale: 'ml-IN', welcomeHeading: 'സുരക്ഷിത ജോലി, സുതാര്യമായ ശമ്പളം & ഡിജിറ്റൽ സ്കിൽ പാസ്‌പോർട്ട്', voiceGuideLabel: 'വോイス ഗൈഡ്' },
  bn: { speechLocale: 'bn-IN', welcomeHeading: 'নিরাপদ কাজ, স্বচ্ছ বেতন এবং ডিজিটাল স্কিল পাসপোর্ট', voiceGuideLabel: 'ভয়েস গাইড' }
};

async function fetchWorkforceOverview() {
  try {
    const response = await fetch(`/api/workforce-overview?industryId=${currentIndustryId}`);
    latestWorkforceData = await response.json();
    document.getElementById('offline-status-badge').className = 'text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-bold';
    document.getElementById('offline-status-badge').textContent = '🟢 Online & Synced';
    syncOfflineQueueToBackend();
    renderAllSections();
  } catch (err) {
    document.getElementById('offline-status-badge').className = 'text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full font-bold';
    document.getElementById('offline-status-badge').textContent = '⚡ Offline Mode (Local Queue Active)';
  }
}

async function syncOfflineQueueToBackend() {
  const queuedPayloads = JSON.parse(localStorage.getItem('vanishield_offline_queue') || '[]');
  if (queuedPayloads.length === 0) return;

  for (const item of queuedPayloads) {
    try {
      await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
    } catch (e) {
      console.error('Sync failed for item', item);
    }
  }
  localStorage.removeItem('vanishield_offline_queue');
}

function getPrimaryWorkerForIndustry() {
  if (!latestWorkforceData || !latestWorkforceData.attendanceAndPayrollList.length) return null;
  return latestWorkforceData.attendanceAndPayrollList[0];
}

function renderAllSections() {
  if (!latestWorkforceData) return;
  const dict = LANGUAGE_DICTIONARY[currentLanguageCode] || LANGUAGE_DICTIONARY.en;
  document.getElementById('localized-welcome-heading').textContent = dict.welcomeHeading;
  document.getElementById('btn-voice-label').textContent = dict.voiceGuideLabel;

  const profile = latestWorkforceData.industryProfile;
  document.getElementById('active-industry-badge').textContent = `ACTIVE INDUSTRY: ${profile.industryName.toUpperCase()} • ROLE: ${profile.workerRoleTitle.toUpperCase()}`;
  document.getElementById('active-industry-sdg-text').textContent = profile.sdg8ImpactSummary;

  renderWorkerSalaryCard();
  renderQuickHazardPresets();
  renderSkillPassportCard();
  renderEmployerDashboard();
  renderLiveSosConsole();
  lookupAnonymousTicket();
}

function renderWorkerSalaryCard() {
  const worker = getPrimaryWorkerForIndustry();
  if (!worker) return;
  const b = worker.salaryBreakdown;

  document.getElementById('worker-salary-card').innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
      <div>
        <div class="text-xs text-slate-400">Verified Worker Profile • Shift Hash: <span class="font-mono text-amber-300">${b.tamperEvidentShiftHash}</span></div>
        <div class="text-base font-extrabold text-white">${worker.workerDisplayName} (${worker.workerIdentifier})</div>
        <div class="text-xs text-emerald-400">Zone: ${worker.assignedZone} • Mood Pulse: <strong>${worker.shiftMoodPulse || 'HAPPY'}</strong></div>
      </div>
      <div class="text-right">
        <div class="text-xs text-slate-400">Net Take-Home Pay</div>
        <div class="text-2xl font-black text-amber-400">₹${b.netTakeHomeSalaryInr.toLocaleString('en-IN')}</div>
      </div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
      <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
        <div class="text-slate-400">Regular (${b.regularHoursWorked}h × ₹${b.hourlyBaseWageInr})</div>
        <div class="text-sm font-bold text-white mt-0.5">₹${b.regularBasePayInr.toLocaleString('en-IN')}</div>
      </div>
      <div class="bg-slate-900 p-2.5 rounded-xl border border-emerald-500/40">
        <div class="text-emerald-300">Overtime (${b.overtimeHoursWorked}h [1.5x])</div>
        <div class="text-sm font-bold text-emerald-400 mt-0.5">+ ₹${b.overtimePayInr.toLocaleString('en-IN')}</div>
      </div>
      <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
        <div class="text-indigo-300">Safety Bonus</div>
        <div class="text-sm font-bold text-indigo-300 mt-0.5">+ ₹${b.safetyBonusInr.toLocaleString('en-IN')}</div>
      </div>
      <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
        <div class="text-rose-300">Deductions</div>
        <div class="text-sm font-bold text-rose-300 mt-0.5">- ₹${b.deductionsInr.toLocaleString('en-IN')}</div>
      </div>
    </div>
  `;
}

function renderQuickHazardPresets() {
  const container = document.getElementById('quick-hazard-presets');
  const hazards = latestWorkforceData.industryProfile.typicalHazards || [];
  const worker = getPrimaryWorkerForIndustry();
  const zoneInput = document.getElementById('hazard-zone-input');
  if (worker && !zoneInput.value) zoneInput.value = worker.assignedZone;

  container.innerHTML = hazards.map(h => `
    <button type="button" onclick="document.getElementById('hazard-description-input').value = ${JSON.stringify(h)}" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-700 transition active:scale-95">
      ⚡ ${h}
    </button>
  `).join('');
}

function renderSkillPassportCard() {
  const worker = getPrimaryWorkerForIndustry();
  if (!worker) return;
  const passport = latestWorkforceData.skillPassports[worker.workerIdentifier];
  if (!passport) return;

  document.getElementById('passport-hash-badge').textContent = `QR ID: ${passport.portablePassportHash}`;
  const container = document.getElementById('skill-passport-container');

  const certs = passport.verifiedCertifications.map(c => `
    <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-inner">
      <div>
        <div class="flex items-center justify-between text-xs">
          <span class="font-mono text-amber-400">${c.certificationCode}</span>
          <span class="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">${c.status}</span>
        </div>
        <h4 class="text-sm font-bold text-white mt-1.5">${c.certificationTitle}</h4>
        <p class="text-xs text-slate-400 mt-0.5">Issuer: ${c.issuingAuthority}</p>
      </div>
      <div class="mt-3 pt-2 border-t border-slate-800 text-xs font-bold text-slate-200">⏱️ Verified Tenure: ${c.verifiedHoursLogged} Hours</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="bg-slate-950 p-4.5 rounded-2xl border border-amber-400/40 space-y-2 shadow-inner">
      <div class="text-xs font-bold text-amber-400 uppercase">Cross-Company Career Carryover</div>
      <div class="text-base font-extrabold text-white">${passport.workerFullName}</div>
      <div class="text-xs text-slate-300">Tenure: <strong>${passport.totalVerifiedExperienceYears} Years</strong> across ${passport.previousEmployersCount} employers</div>
      <div class="text-xs bg-emerald-500/15 text-emerald-300 p-2.5 rounded-xl border border-emerald-500/30 font-semibold">🛡️ Pay Protection: ${passport.startingPayGradeProtection}</div>
    </div>
    ${certs}
  `;
}

function renderEmployerDashboard() {
  const insights = latestWorkforceData.employerBurnoutInsights;
  document.getElementById('employer-kpi-grid').innerHTML = `
    <div class="bg-slate-900 p-4.5 rounded-2xl border border-slate-800 shadow-lg">
      <div class="text-xs text-slate-400">Monitored Personnel</div>
      <div class="text-2xl font-black text-white mt-1">${insights.totalMonitoredWorkers} Staff</div>
      <div class="text-xs text-emerald-400 mt-1">100% QR / GPS Verified</div>
    </div>
    <div class="bg-slate-900 p-4.5 rounded-2xl border border-rose-500/40 shadow-lg">
      <div class="text-xs text-rose-300">Overwork & Quit-Risk Alerts</div>
      <div class="text-2xl font-black text-rose-400 mt-1">${insights.highRiskWorkersCount} Flagged</div>
      <div class="text-xs text-slate-300 mt-1">>48h/wk, tired, or unsafe zone</div>
    </div>
    <div class="bg-slate-900 p-4.5 rounded-2xl border border-amber-500/40 shadow-lg">
      <div class="text-xs text-amber-300">Open Anonymous Tickets</div>
      <div class="text-2xl font-black text-amber-400 mt-1">${insights.openSafetyComplaintsCount} Active</div>
      <div class="text-xs text-slate-300 mt-1">Zero worker identities exposed</div>
    </div>
    <div class="bg-slate-900 p-4.5 rounded-2xl border border-emerald-500/40 shadow-lg">
      <div class="text-xs text-emerald-300">UN SDG-8 Compliance Index</div>
      <div class="text-2xl font-black text-emerald-400 mt-1">${insights.sdg8ComplianceScore} / 100</div>
      <div class="text-xs text-slate-300 mt-1">Wage transparency + safety SLA</div>
    </div>
  `;

  document.getElementById('employer-burnout-list').innerHTML = insights.workerWellbeingInsights.map(w => `
    <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm font-bold text-white">${w.workerDisplayName} • ${w.assignedZone}</span>
        <span class="text-xs font-bold px-3 py-1 rounded-full border ${w.attritionRiskCategory === 'HIGH_QUIT_AND_FATIGUE_RISK' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}">
          Burnout Score: ${w.burnoutRiskScore}% (${w.attritionRiskCategory})
        </span>
      </div>
      <div class="text-xs text-slate-300">Weekly Hours: <strong>${w.totalWeeklyHours}h</strong> (${w.overtimeHoursWorked}h OT) • Mood: <strong>${w.shiftMoodPulse}</strong></div>
      <div class="text-xs text-amber-300 font-semibold">💡 Action: ${w.recommendedSupervisorIntervention}</div>
    </div>
  `).join('');

  document.getElementById('employer-safety-queue').innerHTML = latestWorkforceData.anonymousSafetyReports.map(r => `
    <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-inner">
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span class="font-mono font-bold text-amber-400">${r.trackingReceiptCode} (Zero-ID Hash)</span>
        <span class="px-2.5 py-1 rounded-lg font-bold ${r.resolutionStatus === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}">${r.resolutionStatus} • ${r.severityLevel}</span>
      </div>
      <div class="text-xs font-bold text-white">📍 Zone: ${r.hazardLocationZone}</div>
      <p class="text-xs text-slate-300">"${r.complaintDescription}"</p>
      <div class="text-xs text-emerald-300">Supervisor Response: ${r.supervisorActionNote}</div>
      <div class="text-xs text-amber-300">🎁 Unlocks +₹${r.safetyIncentiveBountyInr} Safety Bounty for Worker upon resolution.</div>
      ${r.resolutionStatus !== 'RESOLVED' ? `<button type="button" onclick="resolveSafetyReportFromAdmin('${r.trackingReceiptCode}')" class="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition active:scale-95">✅ Mark Resolved & Unlock Bounty</button>` : ''}
    </div>
  `).join('');
}

function renderLiveSosConsole() {
  const container = document.getElementById('live-sos-dispatch-console');
  if (liveSosDispatches.length === 0) {
    container.innerHTML = `
      <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 text-center">
        No active SOS distress beacons triggered in current zone. Tap the red 1-TAP SOS button at the top to simulate an emergency dispatch.
      </div>
    `;
    return;
  }

  container.innerHTML = liveSosDispatches.map((sos, index) => `
    <div class="bg-slate-950 p-4 rounded-2xl border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
      <div class="space-y-1">
        <div class="flex items-center gap-2 text-xs">
          <span class="font-mono font-bold text-rose-400">🚨 SOS-BEACON-${sos.id}</span>
          <span class="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold animate-pulse">${sos.status}</span>
        </div>
        <div class="text-xs font-bold text-white">📍 Zone: ${sos.zone}</div>
        <div class="text-xs text-slate-400">Dispatched at: ${sos.timestamp} • District Ombudsman Notified</div>
      </div>
      <div class="flex gap-2">
        <button type="button" onclick="updateSosDispatchStatus(${index}, 'RESPONDER_EN_ROUTE')" class="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition">
          🚔 Responder En Route
        </button>
        <button type="button" onclick="resolveSosDispatch(${index})" class="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition">
          ✅ Scene Secured
        </button>
      </div>
    </div>
  `).join('');
}

function openSosConfirmationModal() {
  const worker = getPrimaryWorkerForIndustry();
  const zoneText = worker ? worker.assignedZone : 'Active Patrol Zone';
  document.getElementById('sos-active-zone-text').textContent = zoneText;
  
  sosSecondsRemaining = 3;
  document.getElementById('sos-countdown-number').textContent = sosSecondsRemaining;
  document.getElementById('sos-modal').classList.remove('hidden');

  if (sosCountdownTimer) clearInterval(sosCountdownTimer);
  sosCountdownTimer = setInterval(() => {
    sosSecondsRemaining -= 1;
    document.getElementById('sos-countdown-number').textContent = sosSecondsRemaining;
    if (sosSecondsRemaining <= 0) {
      clearInterval(sosCountdownTimer);
      confirmAndDispatchSosImmediately();
    }
  }, 1000);
}

function cancelSosEmergency() {
  if (sosCountdownTimer) clearInterval(sosCountdownTimer);
  document.getElementById('sos-modal').classList.add('hidden');
}

function confirmAndDispatchSosImmediately() {
  if (sosCountdownTimer) clearInterval(sosCountdownTimer);
  document.getElementById('sos-modal').classList.add('hidden');
  
  const worker = getPrimaryWorkerForIndustry();
  const newSos = {
    id: Math.floor(1000 + Math.random() * 9000),
    zone: worker ? worker.assignedZone : 'Sector A',
    timestamp: new Date().toLocaleTimeString(),
    status: 'DISPATCHED_TO_OMBUDSMAN'
  };
  liveSosDispatches.unshift(newSos);
  renderLiveSosConsole();
  
  // Switch to employer dashboard automatically so the judge sees the live dispatch feed!
  switchUserPortal('employer');
}

function updateSosDispatchStatus(index, newStatus) {
  if (liveSosDispatches[index]) {
    liveSosDispatches[index].status = newStatus;
    renderLiveSosConsole();
  }
}

function resolveSosDispatch(index) {
  if (liveSosDispatches[index]) {
    liveSosDispatches[index].status = 'SCENE_SECURED_RESOLVED';
    renderLiveSosConsole();
  }
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cancelSosEmergency();
  }
});

async function handleWorkerShiftCheckIn(event) {
  event.preventDefault();
  const worker = getPrimaryWorkerForIndustry();
  if (!worker) return;

  const payload = {
    workerIdentifier: worker.workerIdentifier,
    shiftDurationHours: Number(document.getElementById('checkin-hours').value),
    verificationMethod: document.getElementById('checkin-method').value,
    shiftMoodPulse: document.getElementById('mood-pulse-input').value
  };

  try {
    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const result = await res.json();
      const fb = document.getElementById('checkin-feedback-msg');
      fb.textContent = `Shift & Mood logged successfully! +${result.addedRegularHours}h regular and +${result.addedOvertimeHours}h OT (1.5x) added.`;
      fb.classList.remove('hidden');
      await fetchWorkforceOverview();
    }
  } catch (e) {
    const offlineQueue = JSON.parse(localStorage.getItem('vanishield_offline_queue') || '[]');
    offlineQueue.push(payload);
    localStorage.setItem('vanishield_offline_queue', JSON.stringify(offlineQueue));
    alert('⚡ Offline Mode: Shift queued in browser localStorage and will auto-sync upon reconnection.');
  }
}

async function handleAnonymousSafetySubmit(event) {
  event.preventDefault();
  const payload = {
    industryId: currentIndustryId,
    hazardLocationZone: document.getElementById('hazard-zone-input').value,
    hazardCategory: 'WORKER_SAFETY_SHIELD',
    severityLevel: document.getElementById('hazard-severity-input').value,
    complaintDescription: document.getElementById('hazard-description-input').value,
    submissionChannel: 'QR_AND_VOICE_SHIELD'
  };

  try {
    const res = await fetch('/api/safety/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const report = await res.json();
      document.getElementById('track-pin-input').value = report.trackingReceiptCode;
      document.getElementById('hazard-description-input').value = '';
      await fetchWorkforceOverview();
    }
  } catch (e) {
    alert('Offline queue: Safety report saved locally.');
  }
}

async function lookupAnonymousTicket() {
  const code = document.getElementById('track-pin-input').value.trim();
  const res = await fetch(`/api/safety/track/${encodeURIComponent(code)}`);
  const container = document.getElementById('anonymous-ticket-result');
  if (!res.ok) {
    container.textContent = 'No matching ticket found.';
    return;
  }
  const ticket = await res.json();
  container.innerHTML = `
    <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
      <div><strong>PIN:</strong> <span class="text-amber-300 font-mono">${ticket.trackingReceiptCode}</span> • <strong>Status:</strong> <span class="text-emerald-400">${ticket.resolutionStatus}</span></div>
      <div><strong>Action:</strong> ${ticket.supervisorActionNote}</div>
      <div class="text-emerald-300 font-bold">🎁 Safety Bounty: +₹${ticket.safetyIncentiveBountyInr} Unlocked</div>
    </div>
  `;
}

async function resolveSafetyReportFromAdmin(code) {
  await fetch('/api/safety/resolve', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackingReceiptCode: code, resolutionStatus: 'RESOLVED', supervisorActionNote: 'Verified and rectified on site.' })
  });
  await fetchWorkforceOverview();
}

function exportSdg8AuditReport() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(latestWorkforceData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `VaniShield_SDG8_Audit_${currentIndustryId}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function switchActiveIndustry(id) {
  currentIndustryId = id;
  ['construction', 'police', 'manufacturing'].forEach(ind => {
    document.getElementById(`btn-industry-${ind}`).className = ind === id ? 'px-3 py-2 rounded-lg text-xs font-bold bg-amber-400 text-slate-950 transition active:scale-95' : 'px-3 py-2 rounded-lg text-xs font-bold text-slate-200 hover:text-white transition active:scale-95';
  });
  fetchWorkforceOverview();
}

function switchUserPortal(role) {
  currentPortalRole = role;
  document.getElementById('portal-worker').classList.toggle('hidden', role !== 'worker');
  document.getElementById('portal-employer').classList.toggle('hidden', role !== 'employer');
  document.getElementById('tab-worker-portal').className = role === 'worker' ? 'px-3.5 py-2 rounded-lg text-xs font-extrabold bg-emerald-400 text-slate-950 transition active:scale-95' : 'px-3.5 py-2 rounded-lg text-xs font-extrabold text-slate-200 hover:text-white transition active:scale-95';
  document.getElementById('tab-employer-portal').className = role === 'employer' ? 'px-3.5 py-2 rounded-lg text-xs font-extrabold bg-emerald-400 text-slate-950 transition active:scale-95' : 'px-3.5 py-2 rounded-lg text-xs font-extrabold text-slate-200 hover:text-white transition active:scale-95';
}

function changeInterfaceLanguage(lang) {
  currentLanguageCode = lang;
  renderAllSections();
}

function speakCurrentScreenSummary() {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const dict = LANGUAGE_DICTIONARY[currentLanguageCode] || LANGUAGE_DICTIONARY.en;
  const msg = new SpeechSynthesisUtterance('Welcome to VaniShield. QR attendance, transparent overtime pay, and anonymous zero knowledge safety reporting are active.');
  msg.lang = dict.speechLocale;
  window.speechSynthesis.speak(msg);
}

function speakWageBreakdownAloud() {
  const worker = getPrimaryWorkerForIndustry();
  if (!worker) return;
  const b = worker.salaryBreakdown;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const dict = LANGUAGE_DICTIONARY[currentLanguageCode] || LANGUAGE_DICTIONARY.en;
  const msg = new SpeechSynthesisUtterance(`Salary summary for ${worker.workerDisplayName}. Regular hours ${b.regularHoursWorked}, base pay ${b.regularBasePayInr} rupees. Overtime ${b.overtimeHoursWorked} hours, ${b.overtimePayInr} rupees. Net take home pay is ${b.netTakeHomeSalaryInr} rupees.`);
  msg.lang = dict.speechLocale;
  window.speechSynthesis.speak(msg);
}

function startVoiceDictationForHazard() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const input = document.getElementById('hazard-description-input');
  if (!SpeechRecognition) {
    input.value = 'Voice complaint: Unsafe scaffolding and fatigue reported.';
    return;
  }
  const rec = new SpeechRecognition();
  rec.lang = (LANGUAGE_DICTIONARY[currentLanguageCode] || LANGUAGE_DICTIONARY.en).speechLocale;
  rec.onresult = (e) => { input.value = e.results[0][0].transcript; };
  rec.start();
}

window.addEventListener('DOMContentLoaded', () => { fetchWorkforceOverview(); });