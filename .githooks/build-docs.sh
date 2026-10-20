#!/bin/sh
# Build app vào docs/ (GitHub Pages phục vụ từ main + /docs) và commit nếu bản build đổi.
# Dùng chung cho hook post-merge và pre-push. Chỉ làm việc trên nhánh main.
# Trả về: 0 = docs đã đúng (hoặc bỏ qua), 10 = vừa commit bản build mới, khác = build lỗi.
# Bỏ qua bằng: SKIP_PAGES_BUILD=1
set -e

[ -n "$SKIP_PAGES_BUILD" ] && exit 0

root="$(git rev-parse --show-toplevel)"
[ "$(git -C "$root" symbolic-ref --short -q HEAD)" = "main" ] || exit 0

if [ ! -d "$root/app/node_modules" ]; then
  echo "[docs] Thiếu app/node_modules, bỏ qua bước build docs (chạy 'npm install' trong app/ rồi build lại)." >&2
  exit 0
fi

echo "[docs] Build app vào docs/ (base=/chia-tien/)..."
(cd "$root/app" && npm run build -- --base=/chia-tien/ --outDir ../docs --emptyOutDir >/dev/null)
touch "$root/docs/.nojekyll"

git -C "$root" add -A docs
if git -C "$root" diff --cached --quiet -- docs; then
  echo "[docs] docs/ không đổi."
  exit 0
fi

git -C "$root" commit -q --no-verify -m "Build docs ($(git -C "$root" rev-parse --short HEAD))" -- docs
echo "[docs] Đã commit bản build mới trong docs/."
exit 10
