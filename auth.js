(() => {
  'use strict';

  const AUTH_CONFIG = Object.freeze({
    usernameDigest: 'FveKfWMX8QK72V/JpPP/LjJJKHaQuL2ta3gQ+Cs0rOM=',
    passwordSalt: 'dSYxfJXexO51xPiOx/Z2TQ==',
    passwordVerifier: 'AklthMGYcOmevpzWHsTYKuKGqN4qEuVidUpLcR1scmg=',
    pbkdf2Iterations: 310000,
    sessionKey: 'swe-field-guide-auth-v1',
    sessionDurationMs: 12 * 60 * 60 * 1000
  });

  const encoder = new TextEncoder();
  const loadedSources = new Set();
  let applicationLoaded = false;
  let expiryTimer;

  function fromBase64(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  function constantTimeEqual(left, right) {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
      difference |= left[index] ^ right[index];
    }
    return difference === 0;
  }

  async function sha256(value) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    return new Uint8Array(digest);
  }

  async function derivePasswordVerifier(password) {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: fromBase64(AUTH_CONFIG.passwordSalt),
        iterations: AUTH_CONFIG.pbkdf2Iterations
      },
      key,
      256
    );

    return new Uint8Array(bits);
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(AUTH_CONFIG.sessionKey);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
        localStorage.removeItem(AUTH_CONFIG.sessionKey);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  function writeSession() {
    const session = { expiresAt: Date.now() + AUTH_CONFIG.sessionDurationMs };
    try {
      localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));
    } catch {
      // Authentication still works for the current page when storage is unavailable.
    }
    return session;
  }

  function clearSession() {
    try {
      localStorage.removeItem(AUTH_CONFIG.sessionKey);
    } catch {
      // Ignore storage failures during logout.
    }
  }

  function scheduleExpiry(expiresAt) {
    clearTimeout(expiryTimer);
    const delay = Math.max(0, expiresAt - Date.now());
    expiryTimer = window.setTimeout(() => {
      clearSession();
      location.reload();
    }, Math.min(delay, 2_147_000_000));
  }

  function loadScript(source) {
    if (loadedSources.has(source)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = source;
      script.async = false;
      script.dataset.authLoaded = 'true';
      script.addEventListener('load', () => {
        loadedSources.add(source);
        resolve();
      }, { once: true });
      script.addEventListener('error', () => {
        script.remove();
        reject(new Error(`Unable to load ${source}`));
      }, { once: true });
      document.body.appendChild(script);
    });
  }

  async function loadProtectedApplication() {
    if (applicationLoaded) return;
    const sources = Array.from(document.querySelectorAll('[data-protected-src]'))
      .map((element) => element.dataset.protectedSrc)
      .filter(Boolean);

    for (const source of sources) {
      await loadScript(source);
    }
    applicationLoaded = true;
  }

  function setStatus(message, isError = false) {
    const status = document.getElementById('auth-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('auth-error', isError);
  }

  function setFormBusy(isBusy) {
    const form = document.getElementById('auth-form');
    if (!form) return;
    Array.from(form.elements).forEach((element) => {
      element.disabled = isBusy;
    });
    form.setAttribute('aria-busy', String(isBusy));
  }

  async function unlock(session) {
    const root = document.documentElement;
    root.classList.add('auth-loading');
    setFormBusy(true);
    setStatus('Opening the field guide…');

    try {
      await loadProtectedApplication();
      root.classList.remove('auth-locked', 'auth-loading');
      root.classList.add('auth-unlocked');
      document.getElementById('auth-gate')?.setAttribute('hidden', '');
      document.getElementById('app')?.focus({ preventScroll: true });
      scheduleExpiry(session.expiresAt);
    } catch (error) {
      console.error('Protected application failed to load', error);
      root.classList.remove('auth-loading');
      setFormBusy(false);
      setStatus('The site could not be opened. Refresh and try again.', true);
    }
  }

  async function credentialsAreValid(username, password) {
    if (!globalThis.crypto?.subtle) {
      throw new Error('Web Crypto is unavailable in this browser.');
    }

    const normalizedUsername = username.trim().toLowerCase();
    const [usernameDigest, passwordVerifier] = await Promise.all([
      sha256(normalizedUsername),
      derivePasswordVerifier(password)
    ]);

    return constantTimeEqual(usernameDigest, fromBase64(AUTH_CONFIG.usernameDigest))
      && constantTimeEqual(passwordVerifier, fromBase64(AUTH_CONFIG.passwordVerifier));
  }

  function initialize() {
    const form = document.getElementById('auth-form');
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('auth-password');
    const revealButton = document.getElementById('auth-reveal');
    const logoutButton = document.getElementById('auth-logout');
    let failedAttempts = 0;

    revealButton?.addEventListener('click', () => {
      const revealing = passwordInput.type === 'password';
      passwordInput.type = revealing ? 'text' : 'password';
      revealButton.textContent = revealing ? 'Hide' : 'Show';
      revealButton.setAttribute('aria-pressed', String(revealing));
      passwordInput.focus();
    });

    logoutButton?.addEventListener('click', () => {
      clearSession();
      location.reload();
    });

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      setFormBusy(true);
      setStatus('Checking credentials…');

      try {
        const valid = await credentialsAreValid(usernameInput.value, passwordInput.value);
        passwordInput.value = '';

        if (!valid) {
          failedAttempts += 1;
          const delay = Math.min(500 * (2 ** Math.max(0, failedAttempts - 1)), 5000);
          setStatus('Invalid username or password.', true);
          await new Promise((resolve) => window.setTimeout(resolve, delay));
          setFormBusy(false);
          passwordInput.focus();
          return;
        }

        failedAttempts = 0;
        await unlock(writeSession());
      } catch (error) {
        console.error('Authentication failed', error);
        passwordInput.value = '';
        setStatus('Authentication is unavailable in this browser.', true);
        setFormBusy(false);
      }
    });

    const existingSession = readSession();
    if (existingSession) {
      unlock(existingSession);
    } else {
      usernameInput?.focus();
    }
  }

  initialize();
})();
