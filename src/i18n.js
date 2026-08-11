'use strict';

const LABELS = {
  en: {
    status: 'Status',
    watchTimeSec: 'Watch time',
    bufferingSec: 'Buffering time',
    completionRatio: 'Completion',
    flags: 'Flags'
  },
  zh: {
    status: '状态',
    watchTimeSec: '观看时长',
    bufferingSec: '缓冲时长',
    completionRatio: '完成度',
    flags: '告警'
  }
};

const STATUS_MESSAGES = {
  active: { en: 'Active', zh: '进行中' },
  completed: { en: 'Completed', zh: '已完成' },
  failed: { en: 'Failed', zh: '失败' }
};

const FLAG_MESSAGES = {
  high_error_rate: {
    en: 'High error rate',
    zh: '错误率较高'
  },
  long_buffering: {
    en: 'Long buffering',
    zh: '缓冲时间过长'
  },
  early_dropoff: {
    en: 'Early drop-off',
    zh: '早期流失'
  }
};

function normalizeLanguage(language) {
  if (language === 'zh' || language === 'en' || language === 'bilingual') {
    return language;
  }
  return 'en';
}

function labelsFor(language) {
  if (language === 'bilingual') return { en: LABELS.en, zh: LABELS.zh };
  return LABELS[language] || LABELS.en;
}

function messageFor(code, catalog, language) {
  const entry = catalog[code] || { en: code, zh: code };
  if (language === 'bilingual') return { code, en: entry.en, zh: entry.zh };
  return { code, message: entry[language] || entry.en };
}

function summaryFor(report, language) {
  const percent = Math.round(report.completionRatio * 100);
  const en = `${report.status} session for ${report.mediaId}: ${percent}% complete, ${report.watchTimeSec}s watched, ${report.bufferingSec}s buffering.`;
  const zh = `${report.mediaId} 的会话状态为${STATUS_MESSAGES[report.status]?.zh || report.status}：完成度 ${percent}%，观看 ${report.watchTimeSec} 秒，缓冲 ${report.bufferingSec} 秒。`;
  return language === 'bilingual' ? { en, zh } : language === 'zh' ? zh : en;
}

function localizeSessionReport(report, languageInput) {
  if (!report) return null;
  if (!languageInput) return report;
  const language = normalizeLanguage(languageInput);
  return {
    ...report,
    language,
    labels: labelsFor(language),
    statusLabel: messageFor(report.status, STATUS_MESSAGES, language),
    flagDetails: report.flags.map((flag) => messageFor(flag, FLAG_MESSAGES, language)),
    summary: summaryFor(report, language)
  };
}

module.exports = {
  normalizeLanguage,
  localizeSessionReport,
  labelsFor
};
