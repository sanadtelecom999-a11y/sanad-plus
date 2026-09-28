# 🧪 Supervisor Crash Test Procedure — v18.4.14

## الهدف
التحقق من استرداد البوت تلقائياً عند موت Gunicorn worker.

## السياق
- Supervisor thread يعمل داخل Gunicorn worker
- عند موت worker → Supervisor يموت معه
- الحماية الحالية: UptimeRobot (خارجي) على /api/health

## الاختبار (maintenance window)

### 1. Pre-flight
```bash
curl -s https://sanad-plus-backend.onrender.com/api/health | jq .checks.bot
# احفظ: age_seconds
EOF
