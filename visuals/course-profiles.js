(function (global) {
  'use strict';

  const decisionQuestionFixes = Object.freeze({
    'day-12-retries': {
      subtitle: 'Classify the failure before spending more capacity.',
      icon: 'retry',
      tone: 'violet'
    },
    'day-14-idempotency': {
      subtitle: 'Resolve one logical operation.',
      icon: 'key',
      tone: 'violet'
    },
    'day-21-cron-jobs': {
      subtitle: 'Only one owner should execute this schedule.',
      icon: 'lock',
      tone: 'violet'
    },
    'day-36-optimistic-locking': {
      subtitle: 'The version predicate decides success or conflict.',
      icon: 'lock',
      tone: 'violet'
    }
  });

  const list = Object.freeze((global.SWECourseProfileData || []).map((profile) => {
    const questionFix = decisionQuestionFixes[profile.slug];
    const normalized = questionFix
      ? { ...profile, question: { ...profile.question, ...questionFix } }
      : profile;
    return Object.freeze(normalized);
  }));

  const bySlug = Object.freeze(Object.fromEntries(list.map((profile) => [profile.slug, profile])));
  global.SWECourseProfiles = Object.freeze({ list, bySlug });
}(window));
