const fs = require('fs');
const file = 'admin/app.js';
let content = fs.readFileSync(file, 'utf8');

const brokenCode = `        const res = await fetch(\`\${API_BASE}\${endpoint}\`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body`;
const fixedCode = `        const res = await fetch(\`\${API_BASE}\${endpoint}\`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
        const data = await res.json();
        if (res.ok) {
            showToast('تمت العملية بنجاح', 'success');
            document.getElementById('detailsModal').classList.add('hidden');
            if(type === 'orders') loadInbox('orders');
            if(type === 'deposits') loadInbox('deposits');
            if(type === 'kyc') loadInbox('kyc');
        } else {
            showToast(data.error || 'حدث خطأ', 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('خطأ في الاتصال بالسيرفر', 'error');
    }
}`;

if (content.includes(brokenCode)) {
    content = content.replace(brokenCode, fixedCode);
    fs.writeFileSync(file, content);
    console.log('✅ تم إصلاح الكود بنجاح!');
} else {
    console.log('⚠️ لم يتم العثور على الكود المكسور، قد يكون الملف سليماً أو تختلف المسافات.');
}
