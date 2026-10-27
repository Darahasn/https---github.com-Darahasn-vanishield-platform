'use strict';

const crypto = require('crypto');

const INDUSTRY_PROFILES = {
  construction: {
    industryId: 'construction',
    industryName: 'Construction & Infrastructure',
    workerRoleTitle: 'Site Structural Technician & Rigging Specialist',
    supervisorRoleTitle: 'Chief Site Safety & Operations Engineer',
    standardShiftHours: 8,
    overtimeMultiplierRate: 1.5,
    weeklyOverworkThresholdHours: 48,
    typicalHazards: [
      'Unsecured scaffolding on Tower B Level 4',
      'Exposed high-voltage cable near cement mixer',
      'Missing fall-arrest harness anchors in Sector 3'
    ],
    sdg8ImpactSummary: 'Protects migrant daily-wage construction workers from wage theft and scaffolding hazards while preserving certified rigging skills across contractors.'
  },
  police: {
    industryId: 'police',
    industryName: 'Police & Public Safety Force',
    workerRoleTitle: 'Field Patrol Constable & Traffic Response Officer',
    supervisorRoleTitle: 'District Superintendent & Welfare Commander',
    standardShiftHours: 8,
    overtimeMultiplierRate: 1.5,
    weeklyOverworkThresholdHours: 48,
    typicalHazards: [
      'Faulty night-patrol radio repeater in Beat Zone 7',
      'Consecutive 16-hour crowd-control shift without relief',
      'Damaged reflective barricade gear at Highway Checkpost'
    ],
    sdg8ImpactSummary: 'Addresses frontline officer burnout, consecutive double shifts, and confidential grievance reporting without chain-of-command retaliation.'
  },
  manufacturing: {
    industryId: 'manufacturing',
    industryName: 'Manufacturing & Garment Factory',
    workerRoleTitle: 'Precision Machine Operator & Assembly Line Tech',
    supervisorRoleTitle: 'Plant Production & Safety Manager',
    standardShiftHours: 8,
    overtimeMultiplierRate: 1.5,
    weeklyOverworkThresholdHours: 48,
    typicalHazards: [
      'Emergency stop barrier sensor malfunctioning on Press 3',
      'Exhaust ventilation blocked in chemical treatment bay',
      'Excessive consecutive piece-rate shift hours without rest'
    ],
    sdg8ImpactSummary: 'Eliminates piece-rate wage disputes, machine injury risks, and ensures skill certifications carry forward when workers change factories.'
  }
};

const initialAttendanceRecords = [
  {
    recordId: 'ATT-101',
    workerIdentifier: 'WRK-8821',
    workerDisplayName: 'Rajan Murugan',
    industryId: 'construction',
    assignedZone: 'Sector A - High-Rise Core',
    verificationMethod: 'QR_CODE_SCAN',
    regularHoursWorked: 40,
    overtimeHoursWorked: 14,
    consecutiveShiftDays: 7,
    hourlyBaseWageInr: 250,
    safetyComplianceBonusInr: 1200,
    statutoryDeductionsInr: 450,
    shiftMoodPulse: 'TIRED',
    shiftTimestamp: '2026-10-27T08:00:00Z',
    tamperEvidentShiftHash: 'SHIFT-SHA256-8821-VERIFIED'
  },
  {
    recordId: 'ATT-201',
    workerIdentifier: 'POL-4410',
    workerDisplayName: 'Constable Wei Zhang',
    industryId: 'police',
    assignedZone: 'Beat 4 - Night Highway Patrol',
    verificationMethod: 'QR_CODE_SCAN',
    regularHoursWorked: 40,
    overtimeHoursWorked: 18,
    consecutiveShiftDays: 8,
    hourlyBaseWageInr: 320,
    safetyComplianceBonusInr: 1800,
    statutoryDeductionsInr: 600,
    shiftMoodPulse: 'UNHAPPY',
    shiftTimestamp: '2026-10-27T06:00:00Z',
    tamperEvidentShiftHash: 'SHIFT-SHA256-4410-VERIFIED'
  },
  {
    recordId: 'ATT-301',
    workerIdentifier: 'MFG-5512',
    workerDisplayName: 'Ananya Patil',
    industryId: 'manufacturing',
    assignedZone: 'Assembly Line Bay 2 - Robotics',
    verificationMethod: 'GEOFENCE_GPS',
    regularHoursWorked: 40,
    overtimeHoursWorked: 6,
    consecutiveShiftDays: 5,
    hourlyBaseWageInr: 270,
    safetyComplianceBonusInr: 1400,
    statutoryDeductionsInr: 480,
    shiftMoodPulse: 'HAPPY',
    shiftTimestamp: '2026-10-27T07:30:00Z',
    tamperEvidentShiftHash: 'SHIFT-SHA256-5512-VERIFIED'
  }
];

const anonymousSafetyReports = [
  {
    trackingReceiptCode: 'SAFE-9F4A2C',
    zeroKnowledgeHash: 'e9f4a2c8817b3c4d99102a',
    industryId: 'construction',
    hazardLocationZone: 'Sector A - High-Rise Core',
    hazardCategory: 'STRUCTURAL_SAFETY',
    severityLevel: 'CRITICAL',
    complaintDescription: 'Guardrail loose on 4th floor material hoist platform; near-miss during morning crane lift.',
    submissionChannel: 'QR_SCAN_VOICE',
    resolutionStatus: 'IN_PROGRESS',
    supervisorActionNote: 'Scaffolding crew dispatched with torque bolts; hoist paused for 30-min inspection.',
    slaEscalationDeadlineIso: new Date(Date.now() + 3600000).toISOString(),
    isSlaAutoEscalated: false,
    safetyIncentiveBountyInr: 300,
    bountyClaimed: false,
    createdAtIso: '2026-10-27T06:45:00Z'
  },
  {
    trackingReceiptCode: 'SAFE-3B8D1E',
    zeroKnowledgeHash: '3b8d1e7741a09f23118c4b',
    industryId: 'police',
    hazardLocationZone: 'Beat 4 - Night Highway Patrol',
    hazardCategory: 'FATIGUE_AND_EQUIPMENT',
    severityLevel: 'HIGH',
    complaintDescription: 'Patrol vehicle dash-radio drops signal in tunnel zone and unit has worked 3 consecutive night doubles.',
    submissionChannel: 'VOICE_ANONYMOUS',
    resolutionStatus: 'OPEN',
    supervisorActionNote: 'Pending telecom technician swap and roster relief rotation.',
    slaEscalationDeadlineIso: new Date(Date.now() - 1000).toISOString(),
    isSlaAutoEscalated: true,
    safetyIncentiveBountyInr: 300,
    bountyClaimed: false,
    createdAtIso: '2026-10-27T07:15:00Z'
  }
];

const portableSkillPassports = {
  'WRK-8821': {
    workerIdentifier: 'WRK-8821',
    workerFullName: 'Rajan Murugan',
    primaryIndustry: 'construction',
    portablePassportHash: 'PASS-8821-VERIFIED-SDG8',
    totalVerifiedExperienceYears: 6.5,
    previousEmployersCount: 3,
    startingPayGradeProtection: 'Level-3 Senior Technician (No Reset to Zero)',
    verifiedCertifications: [
      {
        certificationCode: 'CERT-RIG-2024',
        certificationTitle: 'Heavy Tower Crane Rigging & Load Signaler',
        issuingAuthority: 'National Construction Safety Council',
        verifiedHoursLogged: 1420,
        status: 'VERIFIED'
      }
    ]
  },
  'POL-4410': {
    workerIdentifier: 'POL-4410',
    workerFullName: 'Constable Wei Zhang',
    primaryIndustry: 'police',
    portablePassportHash: 'PASS-4410-VERIFIED-SDG8',
    totalVerifiedExperienceYears: 5.0,
    previousEmployersCount: 2,
    startingPayGradeProtection: 'Senior Field Response Specialist (Direct Lateral Credit)',
    verifiedCertifications: [
      {
        certificationCode: 'CERT-MED-2025',
        certificationTitle: 'Golden-Hour Trauma & First Responder Triage',
        issuingAuthority: 'Emergency Medical Services Academy',
        verifiedHoursLogged: 1150,
        status: 'VERIFIED'
      }
    ]
  },
  'MFG-5512': {
    workerIdentifier: 'MFG-5512',
    workerFullName: 'Ananya Patil',
    primaryIndustry: 'manufacturing',
    portablePassportHash: 'PASS-5512-VERIFIED-SDG8',
    totalVerifiedExperienceYears: 4.0,
    previousEmployersCount: 2,
    startingPayGradeProtection: 'Lead Automation Operator (Full Skill Carryover)',
    verifiedCertifications: [
      {
        certificationCode: 'CERT-ROBO-2025',
        certificationTitle: 'Industrial Robotics Safety & PLC Interlock Audit',
        issuingAuthority: 'Manufacturing Standards Bureau',
        verifiedHoursLogged: 980,
        status: 'VERIFIED'
      }
    ]
  }
};

function calculateTransparentSalaryBreakdown(attendanceRecord) {
  if (!attendanceRecord || typeof attendanceRecord.regularHoursWorked !== 'number') {
    throw new Error('Valid attendance record with numeric hours is required.');
  }

  const industryConfig = INDUSTRY_PROFILES[attendanceRecord.industryId] || INDUSTRY_PROFILES.construction;
  const regularBasePayInr = Math.round(attendanceRecord.regularHoursWorked * attendanceRecord.hourlyBaseWageInr);
  const overtimeHourlyRateInr = Math.round(attendanceRecord.hourlyBaseWageInr * industryConfig.overtimeMultiplierRate);
  const overtimePayInr = Math.round(attendanceRecord.overtimeHoursWorked * overtimeHourlyRateInr);
  const safetyBonusInr = attendanceRecord.safetyComplianceBonusInr || 0;
  const deductionsInr = attendanceRecord.statutoryDeductionsInr || 0;
  const netTakeHomeSalaryInr = regularBasePayInr + overtimePayInr + safetyBonusInr - deductionsInr;
  const totalHoursWorked = attendanceRecord.regularHoursWorked + attendanceRecord.overtimeHoursWorked;

  return {
    workerIdentifier: attendanceRecord.workerIdentifier,
    workerDisplayName: attendanceRecord.workerDisplayName,
    industryId: attendanceRecord.industryId,
    regularHoursWorked: attendanceRecord.regularHoursWorked,
    overtimeHoursWorked: attendanceRecord.overtimeHoursWorked,
    totalHoursWorked,
    hourlyBaseWageInr: attendanceRecord.hourlyBaseWageInr,
    overtimeMultiplierRate: industryConfig.overtimeMultiplierRate,
    overtimeHourlyRateInr,
    regularBasePayInr,
    overtimePayInr,
    safetyBonusInr,
    deductionsInr,
    netTakeHomeSalaryInr,
    tamperEvidentShiftHash: attendanceRecord.tamperEvidentShiftHash || 'SHIFT-SHA256-VERIFIED'
  };
}

function recordAutomatedShiftCheckIn({ workerIdentifier, shiftDurationHours, verificationMethod = 'QR_CODE_SCAN', shiftMoodPulse = 'HAPPY' }) {
  const sanitizedShiftHours = Number(shiftDurationHours);
  if (!workerIdentifier || Number.isNaN(sanitizedShiftHours) || sanitizedShiftHours <= 0 || sanitizedShiftHours > 24) {
    throw new Error('Shift duration must be a valid number between 1 and 24 hours.');
  }

  const targetWorkerRecord = initialAttendanceRecords.find((item) => item.workerIdentifier === workerIdentifier);
  if (!targetWorkerRecord) {
    throw new Error(`Worker record not found for identifier: ${workerIdentifier}`);
  }

  const industryConfig = INDUSTRY_PROFILES[targetWorkerRecord.industryId] || INDUSTRY_PROFILES.construction;
  const standardDailyShiftHours = industryConfig.standardShiftHours;

  const addedRegularHours = Math.min(sanitizedShiftHours, standardDailyShiftHours);
  const addedOvertimeHours = Math.max(0, sanitizedShiftHours - standardDailyShiftHours);

  targetWorkerRecord.regularHoursWorked += addedRegularHours;
  targetWorkerRecord.overtimeHoursWorked += addedOvertimeHours;
  targetWorkerRecord.consecutiveShiftDays += 1;
  targetWorkerRecord.verificationMethod = verificationMethod;
  targetWorkerRecord.shiftMoodPulse = ['HAPPY', 'TIRED', 'UNHAPPY'].includes(shiftMoodPulse) ? shiftMoodPulse : 'HAPPY';
  targetWorkerRecord.shiftTimestamp = new Date().toISOString();
  targetWorkerRecord.tamperEvidentShiftHash = `SHIFT-SHA256-${crypto.randomBytes(4).toString('hex').toUpperCase()}-VERIFIED`;

  return {
    updatedAttendanceRecord: targetWorkerRecord,
    addedRegularHours,
    addedOvertimeHours,
    salaryBreakdown: calculateTransparentSalaryBreakdown(targetWorkerRecord)
  };
}

function createAnonymousSafetyReport({ industryId, hazardLocationZone, hazardCategory, severityLevel, complaintDescription, submissionChannel = 'QR_SCAN_VOICE' }) {
  const cleanedDescription = String(complaintDescription || '').trim();
  const cleanedZone = String(hazardLocationZone || '').trim();

  if (cleanedDescription.length < 5 || cleanedZone.length < 2) {
    throw new Error('Complaint description and hazard location zone are required.');
  }

  const randomEntropy = crypto.randomBytes(8).toString('hex');
  const zeroKnowledgeHash = crypto.createHash('sha256').update(`${cleanedZone}:${cleanedDescription}:${randomEntropy}`).digest('hex').slice(0, 22);
  const trackingReceiptCode = `SAFE-${zeroKnowledgeHash.slice(0, 6).toUpperCase()}`;

  const severityHoursMap = { CRITICAL: 1, HIGH: 4, MEDIUM: 24 };
  const slaHours = severityHoursMap[severityLevel] || 12;
  const slaEscalationDeadlineIso = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

  const newSafetyReport = {
    trackingReceiptCode,
    zeroKnowledgeHash,
    industryId: INDUSTRY_PROFILES[industryId] ? industryId : 'construction',
    hazardLocationZone: cleanedZone.slice(0, 80),
    hazardCategory: String(hazardCategory || 'GENERAL_SAFETY').slice(0, 40),
    severityLevel: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severityLevel) ? severityLevel : 'HIGH',
    complaintDescription: cleanedDescription.slice(0, 500),
    submissionChannel,
    resolutionStatus: 'OPEN',
    supervisorActionNote: 'Logged anonymously via Zero-Knowledge Shield. Assigned to safety officer.',
    slaEscalationDeadlineIso,
    isSlaAutoEscalated: false,
    safetyIncentiveBountyInr: 300,
    bountyClaimed: false,
    createdAtIso: new Date().toISOString()
  };

  anonymousSafetyReports.unshift(newSafetyReport);
  return newSafetyReport;
}

function updateSafetyReportResolution({ trackingReceiptCode, resolutionStatus, supervisorActionNote }) {
  const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
  if (!validStatuses.includes(resolutionStatus)) {
    throw new Error('Invalid resolution status provided.');
  }

  const matchingReport = anonymousSafetyReports.find((report) => report.trackingReceiptCode === trackingReceiptCode);
  if (!matchingReport) {
    throw new Error(`Safety report not found for code: ${trackingReceiptCode}`);
  }

  matchingReport.resolutionStatus = resolutionStatus;
  if (supervisorActionNote && String(supervisorActionNote).trim()) {
    matchingReport.supervisorActionNote = String(supervisorActionNote).trim().slice(0, 300);
  }

  return matchingReport;
}

function evaluateWorkforceBurnoutAndRetention(industryId) {
  const filteredAttendance = industryId
    ? initialAttendanceRecords.filter((record) => record.industryId === industryId)
    : initialAttendanceRecords;

  const filteredReports = industryId
    ? anonymousSafetyReports.filter((report) => report.industryId === industryId)
    : anonymousSafetyReports;

  const workerWellbeingInsights = filteredAttendance.map((record) => {
    const totalWeeklyHours = record.regularHoursWorked + record.overtimeHoursWorked;
    const unresolvedZoneHazardsCount = filteredReports.filter(
      (report) => report.hazardLocationZone === record.assignedZone && report.resolutionStatus !== 'RESOLVED'
    ).length;

    let attritionRiskCategory = 'LOW';
    let burnoutRiskScore = 20;
    let recommendedSupervisorIntervention = 'Maintain standard shift rotation.';

    if (totalWeeklyHours > 52 || record.consecutiveShiftDays >= 7 || record.shiftMoodPulse === 'UNHAPPY' || unresolvedZoneHazardsCount > 0) {
      attritionRiskCategory = 'HIGH_QUIT_AND_FATIGUE_RISK';
      burnoutRiskScore = Math.min(98, 60 + record.overtimeHoursWorked * 2 + (record.shiftMoodPulse === 'UNHAPPY' ? 20 : 10));
      recommendedSupervisorIntervention = 'Immediate mandatory 24h rest rotation + resolve open zone safety hazard.';
    } else if (totalWeeklyHours > 45 || record.consecutiveShiftDays >= 6 || record.shiftMoodPulse === 'TIRED') {
      attritionRiskCategory = 'MODERATE_OVERWORK';
      burnoutRiskScore = 52;
      recommendedSupervisorIntervention = 'Cap overtime for next 48 hours and verify hydration/relief.';
    }

    return {
      workerIdentifier: record.workerIdentifier,
      workerDisplayName: record.workerDisplayName,
      assignedZone: record.assignedZone,
      totalWeeklyHours,
      overtimeHoursWorked: record.overtimeHoursWorked,
      consecutiveShiftDays: record.consecutiveShiftDays,
      shiftMoodPulse: record.shiftMoodPulse || 'HAPPY',
      unresolvedZoneHazardsCount,
      burnoutRiskScore,
      attritionRiskCategory,
      recommendedSupervisorIntervention
    };
  });

  const highRiskWorkersCount = workerWellbeingInsights.filter(
    (insight) => insight.attritionRiskCategory === 'HIGH_QUIT_AND_FATIGUE_RISK'
  ).length;

  const resolvedReportsCount = filteredReports.filter((report) => report.resolutionStatus === 'RESOLVED').length;
  const safetyResolutionRatePercent = filteredReports.length === 0 ? 100 : Math.round((resolvedReportsCount / filteredReports.length) * 100);

  return {
    industryProfile: INDUSTRY_PROFILES[industryId] || INDUSTRY_PROFILES.construction,
    totalMonitoredWorkers: filteredAttendance.length,
    highRiskWorkersCount,
    openSafetyComplaintsCount: filteredReports.length - resolvedReportsCount,
    safetyResolutionRatePercent,
    sdg8ComplianceScore: Math.max(70, 96 - highRiskWorkersCount * 7),
    workerWellbeingInsights
  };
}

function addCertificationToSkillPassport({ workerIdentifier, certificationTitle, issuingAuthority, verifiedHoursLogged }) {
  const passportRecord = portableSkillPassports[workerIdentifier];
  if (!passportRecord) {
    throw new Error(`Skill passport not found for worker: ${workerIdentifier}`);
  }
  const cleanedTitle = String(certificationTitle || '').trim();
  const cleanedAuthority = String(issuingAuthority || '').trim();
  const numericHours = Number(verifiedHoursLogged) || 120;

  if (cleanedTitle.length < 3 || cleanedAuthority.length < 3) {
    throw new Error('Certification title and issuing authority are required.');
  }

  const newCertification = {
    certificationCode: `CERT-${Date.now().toString().slice(-4)}`,
    certificationTitle: cleanedTitle.slice(0, 100),
    issuingAuthority: cleanedAuthority.slice(0, 100),
    verifiedHoursLogged: Math.max(1, Math.min(5000, numericHours)),
    status: 'VERIFIED'
  };

  passportRecord.verifiedCertifications.unshift(newCertification);
  return passportRecord;
}

module.exports = {
  INDUSTRY_PROFILES,
  initialAttendanceRecords,
  anonymousSafetyReports,
  portableSkillPassports,
  calculateTransparentSalaryBreakdown,
  recordAutomatedShiftCheckIn,
  createAnonymousSafetyReport,
  updateSafetyReportResolution,
  evaluateWorkforceBurnoutAndRetention,
  addCertificationToSkillPassport
};