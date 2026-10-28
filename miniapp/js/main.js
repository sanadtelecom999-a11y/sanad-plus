const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  tg.setHeaderColor('#050608');
  tg.setBackgroundColor('#050608');
}

window.switchPage = function(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`.nav-item[data-target="${pageId}"]`);
  if (activeNav) activeNav.classList.add('active');
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const target = item.getAttribute('data-target');
    window.switchPage(target);
  });
});

setTimeout(() => {
  const loader = document.getElementById('loading-screen');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s';
    setTimeout(() => loader.remove(), 300);
  }
  window.switchPage('home');
}, 800);
