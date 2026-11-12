#!/usr/bin/env bash
# Viết lại lịch sử git để bỏ khỏi mọi commit các tệp không còn dùng ở HEAD của main:
#   - docs/ (bản build GitHub Pages cũ)
#   - app/public/ocr/ (Tesseract và mô hình OCR cũ)
#   - app/*.traineddata
#   - mọi tệp lớn hơn 1 MB
# Mục đích: giảm dung lượng repo. Tệp còn ở HEAD của main được giữ nguyên.
#
# CHỈ chạy trên một bản clone MỚI, ví dụ:
#   git clone --no-local /đường/dẫn/fee-calculator <thư-mục>/clone
#   cd <thư-mục>/clone && scripts/purge-history.sh --dry-run
# Không chạy trong worktree phụ, trong repo đang làm việc, hay khi còn thay đổi chưa commit.
# Viết lại lịch sử không hoàn tác được. Script KHÔNG push; in các bước tiếp theo ở cuối.
#
# Cách dùng:
#   scripts/purge-history.sh --dry-run        chỉ ghi danh sách và in số liệu, không viết lại
#   scripts/purge-history.sh                  ghi danh sách rồi viết lại lịch sử bằng git filter-repo
#   scripts/purge-history.sh --list <tệp>     ghi danh sách vào <tệp> thay vì mặc định
#
# Yêu cầu: git-filter-repo (brew install git-filter-repo), chỉ khi không dùng --dry-run.

set -euo pipefail

BRANCH="main"
MAX_BYTES=$((1024 * 1024)) # 1 MB

die() {
  echo "LỖI: $*" >&2
  exit 1
}

dry_run=0
list_file=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --list)
      shift
      [ $# -gt 0 ] || die "thiếu đường dẫn sau --list"
      list_file="$1"
      ;;
    -h | --help)
      sed -n '2,15p' "$0"
      exit 0
      ;;
    *) die "tham số không hợp lệ: $1" ;;
  esac
  shift
done

# --- Kiểm tra môi trường ---------------------------------------------------

command -v git >/dev/null 2>&1 || die "chưa có git."
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "không nằm trong một bản clone git."

# Worktree phụ có .git là tệp và git-dir khác git-common-dir. Từ chối trường hợp này.
if [ -f "$(git rev-parse --show-toplevel)/.git" ]; then
  die "đây là worktree phụ (.git là tệp). Hãy chạy trên một bản clone mới."
fi
git_dir="$(cd "$(git rev-parse --git-dir)" && pwd -P)"
common_dir="$(cd "$(git rev-parse --git-common-dir)" && pwd -P)"
[ "$git_dir" = "$common_dir" ] || die "đây là worktree phụ. Hãy chạy trên một bản clone mới."

cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  die "còn thay đổi chưa commit hoặc tệp chưa theo dõi. Hãy làm sạch bản clone trước."
fi

# Bản clone mới chỉ có một mục reflog (clone: from ...). Nhiều mục hơn nghĩa là repo đã dùng.
reflog_entries="$(git reflog show --format='%gs' HEAD 2>/dev/null | wc -l | tr -d ' ')"
if [ "$reflog_entries" -gt 1 ]; then
  die "bản clone này đã có $reflog_entries mục reflog, không phải bản clone mới. Hãy clone lại."
fi
[ -z "$(git stash list)" ] || die "bản clone có stash. Hãy clone lại từ đầu."
[ ! -d "$git_dir/filter-repo" ] || die "đã từng chạy git filter-repo trên bản clone này. Hãy clone lại."

git rev-parse --verify -q "refs/heads/$BRANCH" >/dev/null || die "không có nhánh $BRANCH."

if [ "$dry_run" -eq 0 ] && ! git filter-repo --version >/dev/null 2>&1; then
  echo "LỖI: chưa có git-filter-repo. Cài bằng: brew install git-filter-repo" >&2
  exit 1
fi

origin_url="$(git remote get-url origin 2>/dev/null || true)"
[ -n "$list_file" ] || list_file="$git_dir/purge-paths.txt"

# --- Tính danh sách đường dẫn cần xoá -------------------------------------

tmp="$(mktemp -d "${TMPDIR:-/tmp}/purge-history.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT

# Mọi cặp (blob, đường dẫn) từng xuất hiện trong lịch sử của mọi ref, lấy từ diff của từng commit.
# Không dùng `git rev-list --objects`: nó chỉ ghi một đường dẫn cho mỗi blob, nên bỏ sót tệp trùng nội dung.
git log --all --raw --no-renames --no-abbrev --format= |
  awk -F'\t' 'NF >= 2 {
    split($1, f, " ")
    if (f[3] !~ /^0+$/) print f[3] "\t" $2
    if (f[4] !~ /^0+$/) print f[4] "\t" $2
  }' | sort -u >"$tmp/pairs"

# Loại và kích thước của từng đối tượng, dạng TSV: <sha>	<loại>	<kích thước>.
cut -f1 "$tmp/pairs" | sort -u >"$tmp/shas"
git cat-file --batch-check='%(objectname) %(objecttype) %(objectsize)' <"$tmp/shas" | tr ' ' '\t' >"$tmp/types"

# Kích thước lớn nhất của mỗi đường dẫn (dòng: "<kích thước>\t<đường dẫn>").
awk -F'\t' '
  NR == FNR { if ($2 == "blob") sz[$1] = $3 + 0; next }
  ($1 in sz) && (!($2 in mx) || sz[$1] > mx[$2]) { mx[$2] = sz[$1] }
  END { for (p in mx) printf "%d\t%s\n", mx[p], p }
' "$tmp/types" "$tmp/pairs" >"$tmp/pathsizes"

# Đường dẫn ở HEAD của main.
git ls-tree -r --name-only "$BRANCH" >"$tmp/head"

# Ứng viên: không còn ở HEAD và thuộc một trong các nhóm.
awk -F'\t' -v max="$MAX_BYTES" '
  NR == FNR { head[$0] = 1; next }
  {
    p = $2
    if (p in head) next
    if (p ~ /^docs\//) g = "docs"
    else if (p ~ /^app\/public\/ocr\//) g = "ocr"
    else if (p ~ /^app\/[^\/]*\.traineddata$/) g = "traineddata"
    else if ($1 + 0 > max + 0) g = "lon-hon-1MB"
    else next
    print g "\t" $1 "\t" p
  }
' "$tmp/head" "$tmp/pathsizes" | sort -t$'\t' -k3,3 >"$tmp/candidates"

cut -f3 "$tmp/candidates" >"$list_file"
count="$(wc -l <"$list_file" | tr -d ' ')"

if [ "$count" -eq 0 ]; then
  echo "Không có đường dẫn nào cần xoá khỏi lịch sử."
  exit 0
fi

# Dung lượng chưa nén ước tính: tổng kích thước các blob (không trùng) của đường dẫn cần xoá.
# Với con trỏ Git LFS (blob nhỏ có dòng "version https://git-lfs..."), dùng kích thước thật trong con trỏ.
awk -F'\t' 'NR == FNR { rm[$0] = 1; next } ($2 in rm) { print $1 }' "$list_file" "$tmp/pairs" | sort -u >"$tmp/rmshas"
awk -F'\t' 'NR == FNR { rs[$0] = 1; next } ($1 in rs) && $2 == "blob" { print $1 "\t" $3 }' \
  "$tmp/rmshas" "$tmp/types" >"$tmp/rmblobs"

est_bytes=0
while IFS=$'\t' read -r sha size; do
  real="$size"
  if [ "$size" -lt 300 ]; then
    ptr_size="$(git cat-file -p "$sha" | awk '/^version https:\/\/git-lfs/ { f = 1 } $1 == "size" { s = $2 } END { if (f) print s }')"
    if [ -n "$ptr_size" ]; then real="$ptr_size"; fi
  fi
  est_bytes=$((est_bytes + real))
done <"$tmp/rmblobs"

echo "Danh sách đường dẫn cần xoá: $list_file"
echo "Số đường dẫn: $count"
echo "Theo nhóm:"
cut -f1 "$tmp/candidates" | sort | uniq -c | awk '{ printf "  %-14s %s\n", $2, $1 }'
awk -v b="$est_bytes" 'BEGIN { printf "Dung lượng chưa nén ước tính sẽ bỏ: %.1f MB (không tính trùng; kích thước nén trong pack thực tế nhỏ hơn)\n", b / 1048576 }'

if [ "$dry_run" -eq 1 ]; then
  echo "Chế độ --dry-run: không viết lại lịch sử."
  exit 0
fi

# --- Viết lại lịch sử ------------------------------------------------------

echo
echo "Trước khi viết lại:"
git count-objects -vH | grep -E '^(size-pack|size|count):' | sed 's/^/  /'

git ls-tree -r "$BRANCH" >"$tmp/tree-before"

echo "Đang chạy git filter-repo (đường dẫn trong $list_file)..."
git filter-repo --invert-paths --paths-from-file "$list_file"

# git filter-repo đã tự expire reflog và gc; bước này gc mạnh hơn để gom đối tượng mồ côi.
git reflog expire --expire=now --all
git gc --prune=now --aggressive --quiet

echo
echo "Sau khi viết lại:"
git count-objects -vH | grep -E '^(size-pack|size|count):' | sed 's/^/  /'

git ls-tree -r "$BRANCH" >"$tmp/tree-after"
if cmp -s "$tmp/tree-before" "$tmp/tree-after"; then
  echo "Kiểm tra: cây tệp ở $BRANCH giống hệt trước khi viết lại."
else
  die "cây tệp ở $BRANCH KHÁC trước khi viết lại. Không dùng bản clone này; xem lại danh sách."
fi

# --- Bước tiếp theo (làm bằng tay) ------------------------------------------

cat <<EOF

Đã viết lại lịch sử trên bản clone này. Script không push. Bước tiếp theo (làm bằng tay):
1. Kiểm tra dung lượng: git count-objects -vH
2. Chạy test trong app/ (npm test, npm run lint, npm run build) để chắc app vẫn chạy đúng.
3. Gỡ origin đã bị git filter-repo xoá, rồi thêm lại:
     git remote add origin ${origin_url:-<URL-GitHub-của-repo>}
4. Đẩy file LFS trước, rồi đẩy nhánh (đây là ghi đè lịch sử trên GitHub):
     git lfs push --all origin
     git push --force-with-lease origin $BRANCH
   Nếu có nhánh khác cần giữ, cũng phải đẩy lại chúng bằng --force-with-lease.
5. Mọi bản clone và worktree cũ phải xoá và clone lại; không dùng git pull trên bản cũ.
6. Các đối tượng LFS cũ vẫn nằm trên máy chủ LFS của GitHub cho tới khi được xoá riêng; script không xử lý phần này.
EOF
