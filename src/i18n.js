'use strict';

const LABELS = {
  status: '状态',
  watchTimeSec: '观看时长',
  bufferingSec: '缓冲时长',
  completionRatio: '完成度',
  flags: '告警'
};

const STATUS_MESSAGES = {
  active: '进行中',
  completed: '已完成',
  failed: '失败'
};

const FLAG_MESSAGES = {
  high_error_rate: '错误率较高',
  long_buffering: '缓冲时间过长',
  early_dropoff: '早期流失'
};

function labelsFor() {
  return LABELS;
}

function messageFor(code, catalog) {
  return { code, message: catalog[code] || code };
}

function summaryFor(report) {
  const percent = Math.round(report.completionRatio * 100);
  return `${report.mediaId} 的会话状态为${STATUS_MESSAGES[report.status] || report.status}：完成度 ${percent}%，观看 ${report.watchTimeSec} 秒，缓冲 ${report.bufferingSec} 秒。`;
}

function localizeSessionReport(report) {
  if (!report) return null;
  return {
    ...report,
    language: 'zh',
    labels: labelsFor(),
    statusLabel: messageFor(report.status, STATUS_MESSAGES),
    flagDetails: report.flags.map((flag) => messageFor(flag, FLAG_MESSAGES)),
    summary: summaryFor(report)
  };
}

module.exports = {
  localizeSessionReport,
  labelsFor
};
