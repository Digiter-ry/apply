// minimal placeholder so the page doesn't 404
export async function loadI18n(locale){ return {}; }
export function t(dict, key, fallback){ return fallback ?? key; }
