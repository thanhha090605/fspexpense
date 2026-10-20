# Mini App Báo chi phí (Flysapa)

Cấu trúc repo (giữ đúng vị trí file):
```
index.html
vercel.json
api/n8n.js      <- bắt buộc nằm trong thư mục api/
README.md
```

## 1. Deploy Vercel
1. Tạo repo GitHub mới, đẩy 4 file trên lên. Vercel > Add New Project > chọn repo (Framework: Other).
2. Settings > Environment Variables:
   | Biến | Giá trị |
   |---|---|
   | BOT_TOKEN | token bot **chi phí** (bot mới tạo từ BotFather, không dùng bot hoa hồng) |
   | N8N_BASE | https://flysapa.app.n8n.cloud (không có dấu / cuối) |
   | N8N_SECRET | giá trị Header Auth trong n8n (credential "Header Auth account") |
   | N8N_AUTH_HEADER | Authorization (đúng Name của credential Header Auth) |
   | N8N_PREFIX | để trống (= webhook) |
3. Redeploy sau khi thêm biến.

## 2. Gắn vào bot
BotFather > /mybots > bot chi phí > Bot Settings > Menu Button > đặt URL Vercel của project.

## 3. n8n (2 workflow phải Publish)
- "Fly | Expense Management (build)": webhook `expense-create` + bot duyệt/nhắc việc. Thay credential Telegram bằng bot chi phí, điền Danh mục H2/H3/H4.
- "Fly | Expense OCR": webhook `expense-ocr`. Credential OCR.space: header Name phải là `apikey`.
- Tab "Người dùng": người báo chi phải tick cột "Đề nghị" (cả báo chi lẫn OCR đều kiểm tra).

## 4. Lỗi thường gặp
- 403 "Phiên Telegram không hợp lệ": mở app không từ bot, hoặc BOT_TOKEN sai bot.
- 403 từ n8n: sai N8N_SECRET / N8N_AUTH_HEADER, hoặc Telegram ID chưa có trong tab Người dùng.
- 404: workflow chưa Publish, hoặc api/n8n.js không nằm trong thư mục api/.
- "không phải JSON": N8N_BASE sai.
- E572 Missing apikey (OCR): header Name của credential OCR.space phải là `apikey`.
- 413: tổng file > ~4MB, bớt file đính kèm (app đã tự nén ảnh).
