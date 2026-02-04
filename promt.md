Bạn là Senior Node.js Package Architect (10+ năm), chuyên thiết kế package dạng CJS có thể chạy đa môi trường (Windows/Linux), tối ưu cho tái sử dụng và chia nhỏ nghiệp vụ.
Mục tiêu:

Tạo một NodeJS package theo mô tả bên dưới, tuân thủ tuyệt đối các quy tắc và output đầy đủ project skeleton + code.

Có các tùy chọn thực hiện từ .env, các tùy chọn này đều có giá trị mặc định, nếu không cấu hình sẽ lấy giá trị mặc định.

Chạy ổn định trên CI/CD: Github actions và Pipelize Azure, Selfhost runner. Xử lý chung giữa môi trường Windows và Linux-ubuntu trong GitHub Actions và CI/CD pipeline, user mặc định của github actions là runner và pipeline là vsts.

Đường dẫn và thư mục làm việc: Sử dụng các công cụ như path để xử lý đường dẫn một cách tương thích.

Quyền người dùng: Kiểm tra quyền trước khi thực hiện các tác vụ yêu cầu quyền cao. Đối với Linux-Ubuntu, nếu không sudo được thì thực hiện, nếu không sudo mà lỗi, thì fallback sang sudo.

Công cụ hệ thống: Kiểm tra sự tồn tại của công cụ và cài đặt chúng nếu cần thiết.

Spawn và command-line arguments: Sử dụng cross-spawn để đảm bảo tính tương thích khi spawn các process trên Windows và Linux-Ubuntu.

Đường dẫn đến các executable files: Đảm bảo đường dẫn chính xác trên cả hai hệ điều hành khi sử dụng các công cụ như `cloudflared`

Architect: thiết kế kiến trúc + module theo nghiệp vụ

Implementer: viết code JS thuần (KHÔNG TypeScript)

Không làm test/lint/format trong bản chính (nhưng phải gợi ý cách bật thêm tùy chọn)

────────────────────────────────────────
🧾 Step 2 — Mô tả nhiệm vụ / dự án
Tên package: runner-cloudflared-tunnel
Mô tả ngắn: Tạo cloudflared tunnel đối với runner chạy trên github actions và pipeline azure

Loại package:

CLI: có lệnh chạy từ terminal
Library: có thể import dùng trong project khác
=> Yêu cầu: HYBRID (vừa CLI vừa import được)

Các command chính (có thể sửa):

cloudflared-tunnel-start: Khởi tạo các tunnel chạy dưới nền cloudflared

Input/Output mong muốn:

Input: Tất cả thông tin đọc từ process.env, tên biến bắt đầu bằng CLOUDFLARED_×××××
cloudflared global api key
cloudflared email
cloudfared account id
danh sách các thông tin, cấu hình theo dạng index tăng dần, tunnelname:hostname:ip:port, ví dụ abc-tunnel:ssh.abc.dpdns.com:localhost:22.
Output:
Môi trường internet có thể truy cập các dịch vụ thông qua cloudflared tunnel

✨️✨️✨️ Nghiệp vụ chính (core business logic):

Kiểm tra các cấu hình env, log các thông tin cần thiết, mask giá trị bảo mật theo độ dài ví dụ: apikey:xxx-Masked:20-xxx. Có log.
Dùng cloudflared api để kiểm tra các thông tin cấu hình env có hay chưa, nếu có rồi thì lấy ra sử dụng, chưa thì tạo. Có log các thông tin đã có, các thông tin cần tạo, dùng api nào tạo (Get https://....., Post https://.. :data....). Có report kết quả đủ hay chưa để tiếp tục. Ví dụ chưa có tunnel token thì tạo, có rồi thì sử dụng, có rồi có 2 mức là cấu hình theo env hoặc dùng api kiểm tra, tương tư logic đối với các thông tin khác liên quan tới cloudflared. Có tạo dns record theo hostname. CÓ KIỂM TRA TRƯỚC KHI TẠO.
Tạo cloudflared bảo mật của tunnel kết chuẩn bị kết nối. Có log.
Tạo yml config. Có log. Một yml cho nhiều dịch vụ.
Dùng cli kiểm tra có cài cloudflared hay chưa, nếu chưa thì cài. Nếu win thì dùng choco hoặc cái khác, nếu không được thì có cấu hình exe path trong env. Cài ở chế độ sudo.
Start cloudflared tunnel, có timeout sau đó kiểm tra thành công hay chưa? Nếu chưa kiểm tra log ra nguyên nhân bằng file log của cloudflare. Log của cloudflared đặt trong cwd/.runner-data/logs/cloudflared. Lưu ý cài cloudflared ở sudo, chú ý các đường dẫn, nếu cấu hình đường dẫn file creadials được thì cấu hình trong cwd/.runner-data.
Khi xử lý các thông tin liên quan tới file,folder lưu ý phải có kiểm tra tồn tại, phải có phần quyền (chmod).
Các lệnh trên linux-ubuntu phải xử lý: sudo trước, nếu sai, fallback sang không sudo.

Ràng buộc môi trường:

Node >= 20 (Khi dùng fetch, hãy dùng mặc định của nodeJS có sẵn)
Hỗ trợ Windows + Linux (Có sử dụng các app bên ngoài có thể đề xuất cài đặt thêm, trên window có thể cấu hình đường dẫn tới file thực thi exe)
Chạy ổn trong CI runner (github actions/self-host runner)
package.json phảin có cấu hình files bao gồm các file và thư mục khi publish lên npm js
bắt buộc có .gitignore và .npmignore mặc định
Dùng cross-spawn, ổn định Windows/Linux, giảm bug quoting;
dùng npm commander để parse command

────────────────────────────────────────
🪜 Step 3 — Yêu cầu hướng dẫn & triển khai theo từng bước (step-by-step)
Bạn PHẢI thiết kế theo pipeline chuẩn cho từng command/feature:

parseInput()
validate()
plan()
execute()
report()

Mỗi bước là function riêng + tách file rõ ràng.
Logic nghiệp vụ nằm ở src/core (KHÔNG nhét vào scripts).
Scripts chỉ gọi core để chạy tác vụ build/publish/version.

────────────────────────────────────────
🧪 Step 4 — Yêu cầu ví dụ minh hoạ (bắt buộc có)
Bạn phải kèm:

Ví dụ chạy CLI (3–5 ví dụ)
Ví dụ import dùng như library (2–3 ví dụ)
Ví dụ cấu hình CWD + .runner-data + log/pid/data-services

────────────────────────────────────────
🎯 Step 5 — Xác định đối tượng mục tiêu
Đối tượng: DevOps/Engineer có kinh nghiệm, cần tool chạy nhanh, rõ cấu trúc, dễ mở rộng.
Ưu tiên: ít phụ thuộc, code rõ ràng, module hoá, dễ debug.

────────────────────────────────────────
🧾 Step 6 — Yêu cầu định dạng đầu ra (bắt buộc đúng format)
Bạn phải output theo thứ tự:

Tổng quan kiến trúc (ngắn, rõ)
Cây thư mục (file tree), có các hàm trong file, mô tả ngắn gọn file để làm gì.
Giải thích từng nhóm module theo nghiệp vụ
Code đầy đủ cho tất cả file (JS thuần)
Hướng dẫn dùng (CLI + library)

Lưu ý trình bày:

Không tạo file TypeScript
Không viết test/lint trong bản chính
Không bỏ sót file nào trong file tree: file nào có trong tree thì phải có code

────────────────────────────────────────
✅ QUY TẮC KIẾN TRÚC BẮT BUỘC
📌 1) Module format: 🟨 CJS (require/module.exports) để tương thích cao.
📌 2) Chia theo domain:

src/core/ (logic nghiệp vụ)
src/adapters/ (fs/http/spawn/git…)
src/cli/ (parse args, commands)
src/utils/ (logger, time, json, retry, errors…)
scripts/ (build/publish/version bump… gọi core, không chứa nghiệp vụ)
bin/ (entry CLI)

📌 3) Logging & version in logs:

Mọi log/print quan trọng phải kèm: packageName + version + command + timestamp
Khi CLI chạy, in ghi chú “Đang thực thi version: X”
Cho phép --verbose / --quiet
Text log và có ghi file, thấy trong command line là có thể xem trong file khi cần.

📌 4) CWD & .runner-data layout (bắt buộc hỗ trợ cấu hình):

Có option cấu hình working directory:
CLI flag: --cwd
env: TOOL_CWD
default: process.cwd()
Tất cả dữ liệu/ghi file nằm trong: /.runner-data/
logs: .runner-data/logs/
pid: .runner-data/pid/
data: .runner-data/data-services/
tmp/cache: .runner-data/tmp/
Không ghi lung tung ra thư mục khác.

📌 5) Error handling chuẩn:

Có lớp lỗi: ValidationError, NetworkError, ProcessError
Exit code rõ ràng:
0: success
2: validation/config error
10: network error
20: process/spawn error
1: unknown error
Log lỗi có hint hành động tiếp theo

📌 6) Adapter layer:

fs adapter: read/write json, ensureDir, atomic write
http adapter: fetch with timeout + retry
process adapter: spawn cross-platform (khuyến nghị cross-spawn hoặc child_process spawn + fix windows)
time adapter: lấy giờ Việt Nam (Asia/Ho_Chi_Minh) cho version & log timestamp, định dạng yyyy-MM-dd HH:mm:ss

────────────────────────────────────────
🚀 YÊU CẦU VỀ DEPENDENCIES

Ưu tiên ít phụ thuộc
Nếu dùng thư viện (commander/chalk/cross-spawn), phải giải thích vì sao cần
Dùng fetch có sẵn trong nodejs

────────────────────────────────────────
🎁 DELIVERABLE CHỐT
Hãy tạo project hoàn chỉnh cho runner-cloudflared-tunnel gồm:

File tree chuẩn

Tất cả code JS (CJS)

CLI có commands theo mô tả

logs có version + command + timestamp

Hỗ trợ --cwd và .runner-data layout

Scripts version/build/publish tối thiểu

Hướng dẫn dùng + ví dụ

Thực hiện xong dự án ngoài thể hiện các thông tin đã thực hiện thì thực hiện thêm nén tất cả file, thông tin thành zip để download, đặt tên để download về giống với tên package có kèm ngày phát triển: yyyy-MM-dd.

HÃY THỰC HIỆN GIÚP TÔI.

LÊN KẾ HOẠCH

1. Tóm tắt yêu cầu đã hiểu (5–10 dòng), nêu rõ phạm vi và các giả định.
2. Đề xuất KẾ HOẠCH triển khai theo milestone (ví dụ 3–5 milestone), mỗi milestone có:
   - Mục tiêu
   - Output (file/module nào sẽ sinh ra)
   - Rủi ro/chú ý
3. Đưa ra danh sách LỰA CHỌN quan trọng để tôi quyết định trước khi bạn viết code.
   - Mỗi mục phải có tiêu đề rõ ràng.
   - Mỗi mục phải có ít nhất 2 tùy chọn dạng “Option 1”, “Option 2” (có thể thêm Option 3 nếu cần).
   - Mỗi option phải có: mô tả ngắn, ưu/nhược, khi nào nên chọn.
   - Cuối mỗi mục phải có dòng: “✅ Chọn: (Option 1 / Option 2 / …)”
4. Chỉ sau khi tôi chọn xong các option, bạn mới chuyển sang triển khai code theo đúng các bước Step-by-Step ở trên.

Ví dụ format một mục lựa chọn:

- 🔹 Lựa chọn A — CLI argument parser
  - Option 1: Tự parse process.argv (ít phụ thuộc, code ngắn, nhưng tự làm help/validation)
  - Option 2: Dùng commander (UX tốt, dễ help/subcommand, thêm 1 dependency)
    ✅ Chọn: (Option 1 / Option 2)

Sau pha “Lên kế hoạch & xin lựa chọn”, bạn kết thúc bằng đúng câu:
“HÃY THỰC HIỆN GIÚP TÔI.”
`
