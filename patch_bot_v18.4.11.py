import os

bot_file = "bot/bot.py"
if not os.path.exists(bot_file):
    print(f"[FAIL] {bot_file} not found")
    exit(1)

with open(bot_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

# ═══ 1. إدراج الدالة المساعدة قبل error_handler ═══
helper_lines = [
    "# ─────────────────────────────────────────────────────────────\n",
    "# Error Notification Throttling — v18.4.11\n",
    "# ─────────────────────────────────────────────────────────────\n",
    "_error_notify_buckets = defaultdict(list)\n",
    "_ERROR_NOTIFY_WINDOW = 300\n",
    "_ERROR_NOTIFY_MAX = 3\n",
    "_ERROR_NOTIFY_KEY_LEN = 80\n",
    "\n",
    "def _should_notify_error(error_str: str) -> bool:\n",
    "    if not error_str:\n",
    "        return True\n",
    "    key = error_str[:_ERROR_NOTIFY_KEY_LEN]\n",
    "    now = time.time()\n",
    "    bucket = int(now // _ERROR_NOTIFY_WINDOW)\n",
    "    if len(_error_notify_buckets) > 1000:\n",
    "        for k in list(_error_notify_buckets.keys()):\n",
    "            if k[1] < bucket:\n",
    "                del _error_notify_buckets[k]\n",
    "    full_key = (key, bucket)\n",
    "    _error_notify_buckets[full_key].append(now)\n",
    "    count = len(_error_notify_buckets[full_key])\n",
    "    if count == _ERROR_NOTIFY_MAX + 1:\n",
    "        logger.warning(f\"Rate limit triggered: {key[:50]}...\")\n",
    "        return True\n",
    "    return count <= _ERROR_NOTIFY_MAX\n",
    "\n"
]

if any("_should_notify_error" in line for line in lines):
    print("[SKIP] Helper already exists.")
else:
    inserted = False
    for i, line in enumerate(lines):
        if "async def error_handler" in line:
            lines[i:i] = helper_lines
            inserted = True
            print(f"[OK] Helper inserted at line {i+1}")
            break
    if not inserted:
        print("[FAIL] error_handler not found.")
        exit(1)

# ═══ 2. تحديد موقع error_handler أولاً ═══
eh_start = None
for i, line in enumerate(lines):
    if "async def error_handler" in line:
        eh_start = i
        break

if eh_start is None:
    print("[FAIL] error_handler function not found.")
    exit(1)

# ═══ 3. تحديد block "if context.error:" داخل error_handler ═══
start_idx = None
end_idx = None
for i in range(eh_start, len(lines)):
    stripped = lines[i].strip()
    if start_idx is None and stripped == "if context.error:":
        start_idx = i
    if start_idx is not None and "Failed to notify admins" in lines[i]:
        end_idx = i + 1
        break

if start_idx is None or end_idx is None:
    print(f"[FAIL] Could not find notify block (start={start_idx}, end={end_idx})")
    exit(1)

print(f"[INFO] Block found: lines {start_idx+1} → {end_idx}")

# ═══ 4. فحص إذا كان مُطبَّقاً مسبقاً ═══
old_block = "".join(lines[start_idx:end_idx])
if "_should_notify_error" in old_block:
    print("[SKIP] error_handler already patched.")
else:
    indent = "    "  # 4 spaces — نفس indentation الأصلي
    new_block = (
        f"{indent}if context.error:\n"
        f"{indent}    error_short = str(context.error)[:300]\n"
        f"{indent}    if _should_notify_error(error_short):\n"
        f"{indent}        try:\n"
        f"{indent}            notify_admins_sync(\n"
        f"{indent}                f\"❌ **خطأ في البوت**\\n`{{error_short}}`\",\n"
        f"{indent}                important=True\n"
        f"{indent}            )\n"
        f"{indent}        except Exception as e:\n"
        f"{indent}            logger.error(f\"Failed to notify admins: {{e}}\")\n"
        f"{indent}    else:\n"
        f"{indent}        logger.debug(f\"Error notification throttled: {{error_short[:50]}}\")\n"
    )
    lines[start_idx:end_idx] = [new_block]
    print("[OK] error_handler patched.")

# ═══ 5. حفظ الملف ═══
with open(bot_file, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("\n[DONE] Patch applied to bot/bot.py")
