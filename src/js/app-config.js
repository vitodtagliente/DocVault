/**
 * App configuration — loaded once from src/app.config.json.
 * Edit app.config.json to change the app name, version, or description.
 * Top-level await ensures the config is resolved before any importer runs.
 */

const DEFAULTS = {
  name: 'DocVault',
  version: '1.0.0',
  tech: 'DocVault 1.0.0',
  tagline: 'Your personal document vault',
};

let _cfg = DEFAULTS;
try {
  const res = await fetch('app.config.json');
  if (res.ok) _cfg = { ...DEFAULTS, ...await res.json() };
} catch { /* keep defaults */ }

export const appConfig = _cfg;

/** Full "Name vX.Y.Z · Tech" string for About sections. */
export const aboutText = `${_cfg.name} v${_cfg.version} · ${_cfg.tech}`;
