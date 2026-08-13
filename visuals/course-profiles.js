(function (global) {
  'use strict';
  const list = Object.freeze((global.SWECourseProfileData || []).map((profile) => Object.freeze(profile)));
  const bySlug = Object.freeze(Object.fromEntries(list.map((profile) => [profile.slug, profile])));
  global.SWECourseProfiles = Object.freeze({ list, bySlug });
}(window));
