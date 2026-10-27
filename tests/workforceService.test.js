'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  initialAttendanceRecords,
  calculateTransparentSalaryBreakdown,
  recordAutomatedShiftCheckIn,
  createAnonymousSafetyReport,
  updateSafetyReportResolution,
  evaluateWorkforceBurnoutAndRetention,
  addCertificationToSkillPassport
} = require('../src/workforceService');

test('Salary Breakdown calculates regular pay, 1.5x overtime pay, and net salary accurately', () => {
  const sampleRecord = {
    workerIdentifier: 'TEST-01',
    workerDisplayName: 'Test Worker',
    industryId: 'construction',
    regularHoursWorked: 40,
    overtimeHoursWorked: 10,
    hourlyBaseWageInr: 200,
    safetyComplianceBonusInr: 1000,
    statutoryDeductionsInr: 500
  };

  const salaryResult = calculateTransparentSalaryBreakdown(sampleRecord);
  assert.equal(salaryResult.regularBasePayInr, 8000);
  assert.equal(salaryResult.overtimeHourlyRateInr, 300);
  assert.equal(salaryResult.overtimePayInr, 3000);
  assert.equal(salaryResult.netTakeHomeSalaryInr, 11500);
});

test('Automated QR shift check-in records mood pulse and computes overtime hours', () => {
  const initialOvertime = initialAttendanceRecords[0].overtimeHoursWorked;
  const checkInOutput = recordAutomatedShiftCheckIn({
    workerIdentifier: 'WRK-8821',
    shiftDurationHours: 11,
    verificationMethod: 'QR_CODE_SCAN',
    shiftMoodPulse: 'TIRED'
  });

  assert.equal(checkInOutput.addedRegularHours, 8);
  assert.equal(checkInOutput.addedOvertimeHours, 3);
  assert.equal(checkInOutput.updatedAttendanceRecord.shiftMoodPulse, 'TIRED');
});

test('Zero-knowledge safety reporting strips identity and generates tracking receipt', () => {
  const reportResult = createAnonymousSafetyReport({
    industryId: 'police',
    hazardLocationZone: 'Beat 7 Highway Tunnel',
    hazardCategory: 'EQUIPMENT_HAZARD',
    severityLevel: 'CRITICAL',
    complaintDescription: 'Emergency strobe light and radio repeater offline during storm.'
  });

  assert.ok(reportResult.trackingReceiptCode.startsWith('SAFE-'));
  assert.equal(reportResult.workerIdentifier, undefined);
  assert.equal(reportResult.resolutionStatus, 'OPEN');
});

test('Employer Burnout & Attrition Radar flags overworked staff across all 3 industries', () => {
  const constructionEval = evaluateWorkforceBurnoutAndRetention('construction');
  const policeEval = evaluateWorkforceBurnoutAndRetention('police');
  const mfgEval = evaluateWorkforceBurnoutAndRetention('manufacturing');

  assert.ok(constructionEval.highRiskWorkersCount >= 1);
  assert.ok(policeEval.highRiskWorkersCount >= 1);
  assert.ok(mfgEval.sdg8ComplianceScore > 0);
});

test('Portable Skill Passport preserves past experience and appends verified certifications', () => {
  const updatedPassport = addCertificationToSkillPassport({
    workerIdentifier: 'WRK-8821',
    certificationTitle: 'Solar Microgrid Wiring Safety',
    issuingAuthority: 'Green Skill Council',
    verifiedHoursLogged: 240
  });

  assert.equal(updatedPassport.startingPayGradeProtection.includes('No Reset to Zero'), true);
  assert.equal(updatedPassport.verifiedCertifications[0].certificationTitle, 'Solar Microgrid Wiring Safety');
});