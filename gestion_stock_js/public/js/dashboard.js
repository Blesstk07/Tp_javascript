(async function loadDashboard() {
  const message = document.querySelector('#message');
  const target = document.querySelector('#dashboard');
  try {
    const data = await api('/dashboard');
    target.textContent = JSON.stringify(data, null, 2);
    message.textContent = 'API connectée.';
  } catch (error) {
    message.textContent = error.message;
  }
})();
