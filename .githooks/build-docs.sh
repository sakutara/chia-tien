#!/bin/sh
# Build app vào docs/ (GitHub Pages phục vụ từ main + /docs) và commit nếu bản build đổi.
# Dùng cho hook post-merge. Chỉ làm việc trên nhánh main.
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

echo "[docs] Build app vào docs/ (base=./, đường dẫn tương đối)..."
(cd "$root/app" && npm run build -- --base=./ --outDir ../docs --emptyOutDir >/dev/null)
touch "$root/docs/.nojekyll"

git -C "$root" add -A docs
if git -C "$root" diff --cached --quiet -- docs; then
  echo "[docs] docs/ không đổi."
  exit 0
fi

msg="Build docs ($(git -C "$root" rev-parse --short HEAD))"
if [ -f "$(git -C "$root" rev-parse --git-path MERGE_HEAD)" ]; then
  # post-merge chạy khi MERGE_HEAD còn tồn tại nên `git commit` bị từ chối: tạo commit bằng lệnh cấp thấp (index lúc này trùng HEAD + docs).
  tree="$(git -C "$root" write-tree)"
  new="$(git -C "$root" commit-tree "$tree" -p HEAD -m "$msg")"
  git -C "$root" update-ref -m "build docs" HEAD "$new"
else
  git -C "$root" commit -q --no-verify -m "$msg" -- docs
fi
echo "[docs] Đã commit bản build mới trong docs/."
exit 10
