async function api(path, options = {}) {
  const response = await fetch('/api' + path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 204) return null;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = body.error || {};
    throw new Error(error.message || `Erreur HTTP ${response.status}`);
  }
  return body;
}
