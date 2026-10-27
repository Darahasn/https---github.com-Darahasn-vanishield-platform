'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');

const {
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
} = require('./src/workforceService');

const applicationServer = express();
const listeningPort = Number(process.env.PORT) || 8080;

applicationServer.use(helmet({ contentSecurityPolicy: false }));
applicationServer.use(compression());
applicationServer.use(express.json({ limit: '50kb' }));

const clientRequestWindowMap = new Map();
applicationServer.use('/api', (request, response, next) => {
  const clientIpAddress = request.ip || 'anonymous-client';
  const currentTimestampMs = Date.now();
  const windowDurationMs = 60 * 1000;
  const maxRequestsPerWindow = 200;

  const clientState = clientRequestWindowMap.get(clientIpAddress) || {
    requestCount: 0,
    windowStartTimestampMs: currentTimestampMs
  };

  if (currentTimestampMs - clientState.windowStartTimestampMs > windowDurationMs) {
    clientState.requestCount = 0;
    clientState.windowStartTimestampMs = currentTimestampMs;
  }

  clientState.requestCount += 1;
  clientRequestWindowMap.set(clientIpAddress, clientState);

  if (clientState.requestCount > maxRequestsPerWindow) {
    return response.status(429).json({ error: 'Rate limit exceeded. Please retry after a moment.' });
  }
  return next();
});

applicationServer.use(express.static(path.join(__dirname, 'public'), { maxAge: '5m' }));

applicationServer.get('/api/health', (_request, response) => {
  response.status(200).json({
    serviceStatus: 'HEALTHY',
    sdgAlignment: 'UN_SDG_8_DECENT_WORK_AND_ECONOMIC_GROWTH',
    supportedIndustries: Object.keys(INDUSTRY_PROFILES),
    timestampIso: new Date().toISOString()
  });
});

applicationServer.get('/api/workforce-overview', (request, response) => {
  const selectedIndustryId = request.query.industryId || 'construction';
  const validIndustryId = INDUSTRY_PROFILES[selectedIndustryId] ? selectedIndustryId : 'construction';

  const industryAttendanceList = initialAttendanceRecords
    .filter((record) => record.industryId === validIndustryId)
    .map((record) => ({
      ...record,
      salaryBreakdown: calculateTransparentSalaryBreakdown(record)
    }));

  const industrySafetyReports = anonymousSafetyReports.filter((report) => report.industryId === validIndustryId);
  const employerInsights = evaluateWorkforceBurnoutAndRetention(validIndustryId);

  response.status(200).json({
    selectedIndustryId: validIndustryId,
    industryProfile: INDUSTRY_PROFILES[validIndustryId],
    allIndustries: INDUSTRY_PROFILES,
    attendanceAndPayrollList: industryAttendanceList,
    anonymousSafetyReports: industrySafetyReports,
    employerBurnoutInsights: employerInsights,
    skillPassports: portableSkillPassports
  });
});

applicationServer.post('/api/attendance/check-in', (request, response) => {
  try {
    const checkInResult = recordAutomatedShiftCheckIn({
      workerIdentifier: request.body.workerIdentifier,
      shiftDurationHours: request.body.shiftDurationHours,
      verificationMethod: request.body.verificationMethod,
      shiftMoodPulse: request.body.shiftMoodPulse
    });
    response.status(200).json(checkInResult);
  } catch (validationError) {
    response.status(400).json({ error: validationError.message });
  }
});

applicationServer.post('/api/safety/report', (request, response) => {
  try {
    const createdReport = createAnonymousSafetyReport({
      industryId: request.body.industryId,
      hazardLocationZone: request.body.hazardLocationZone,
      hazardCategory: request.body.hazardCategory,
      severityLevel: request.body.severityLevel,
      complaintDescription: request.body.complaintDescription,
      submissionChannel: request.body.submissionChannel
    });
    response.status(201).json(createdReport);
  } catch (validationError) {
    response.status(400).json({ error: validationError.message });
  }
});

applicationServer.get('/api/safety/track/:trackingReceiptCode', (request, response) => {
  const targetCode = String(request.params.trackingReceiptCode || '').trim().toUpperCase();
  const matchingReport = anonymousSafetyReports.find((report) => report.trackingReceiptCode === targetCode);
  if (!matchingReport) {
    return response.status(404).json({ error: 'Tracking receipt code not found.' });
  }
  return response.status(200).json(matchingReport);
});

applicationServer.patch('/api/safety/resolve', (request, response) => {
  try {
    const updatedReport = updateSafetyReportResolution({
      trackingReceiptCode: request.body.trackingReceiptCode,
      resolutionStatus: request.body.resolutionStatus,
      supervisorActionNote: request.body.supervisorActionNote
    });
    response.status(200).json(updatedReport);
  } catch (validationError) {
    response.status(400).json({ error: validationError.message });
  }
});

applicationServer.post('/api/passport/add-certification', (request, response) => {
  try {
    const updatedPassport = addCertificationToSkillPassport({
      workerIdentifier: request.body.workerIdentifier,
      certificationTitle: request.body.certificationTitle,
      issuingAuthority: request.body.issuingAuthority,
      verifiedHoursLogged: request.body.verifiedHoursLogged
    });
    response.status(201).json(updatedPassport);
  } catch (validationError) {
    response.status(400).json({ error: validationError.message });
  }
});

if (require.main === module) {
  applicationServer.listen(listeningPort, '0.0.0.0', () => {
    console.log(`VaniShield SDG-8 Server listening on http://0.0.0.0:${listeningPort}`);
  });
}

module.exports = applicationServer;