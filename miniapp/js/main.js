console.log("Main.js loaded!");
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

window.switchPage = function(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add('active');
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const target = item.getAttribute('data-target');
    if (target) window.switchPage(target);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loading-screen');
  if (loader) loader.style.display = 'none';
  
  const balance = document.getElementById('home-balance');
  if (balance) balance.textContent = "الميني آب يعمل!";
  
  const cats = document.getElementById('home-categories');
  if (cats) cats.innerHTML = "<div>قسم 1</div><div>قسم 2</div>";
});
