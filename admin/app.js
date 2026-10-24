const API_BASE = 'https://sanad-plus-backend.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ app.js loaded successfully!");
    
    // إذا كان هناك توكن محفوظ، ندخل مباشرة
    if (localStorage.getItem('admin_token')) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboardScreen').classList.remove('hidden');
    }
});

// دالة وهمية لتسجيل الدخول (للتجربة فقط)
function handleLogin() {
    console.log("Login button clicked!");
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    
    if (!user || !pass) return alert('أدخل البيانات');
    
    alert('تم الضغط على زر الدخول! (هذه نسخة تجريبية)');
    
    // إخفاء الدخول وإظهار اللوحة
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboardScreen').classList.remove('hidden');
}

function verifyOTP() {
    alert('تم الضغط على زر تأكيد الرمز!');
}
