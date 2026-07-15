"""将 docs/architecture-diagram.md 中的 Mermaid 图渲染为 PNG"""
import re, base64, zlib, urllib.request, json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

MD_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       'docs', 'architecture-diagram.md')
OUT_DIR = os.path.join(os.path.dirname(MD_FILE), 'screenshots')
os.makedirs(OUT_DIR, exist_ok=True)

def encode_mermaid(code: str) -> str:
    """Mermaid.Ink 编码: base64(json({"code":"..."})) -> pako deflate -> base64url"""
    data = json.dumps({"code": code}).encode()
    compressed = zlib.compress(data, level=9)
    # base64url 编码 (去掉 padding，替换 +/ 为 -_)
    b64 = base64.urlsafe_b64encode(compressed).rstrip(b'=').decode()
    return b64

def render_mermaid(code: str, filename: str):
    encoded = encode_mermaid(code.strip())
    url = f"https://mermaid.ink/img/{encoded}?type=png&theme=neutral&scale=2"
    out_path = os.path.join(OUT_DIR, filename)
    print(f"  渲染 {filename} ...")
    try:
        urllib.request.urlretrieve(url, out_path)
        size = os.path.getsize(out_path)
        print(f"    ✅ {filename} ({size} bytes)")
    except Exception as e:
        print(f"    ❌ {filename}: {e}")

# 解析 Markdown 中的 Mermaid 代码块
text = open(MD_FILE, encoding='utf-8').read()
blocks = re.findall(r'```mermaid\n(.*?)```', text, re.DOTALL)

titles = [
    "01-整体架构图",
    "02-分层架构图",
    "03-问答时序图",
    "04-项目包结构图",
]

print(f"找到 {len(blocks)} 个 Mermaid 图块，开始渲染...\n")
for i, block in enumerate(blocks):
    name = titles[i] if i < len(titles) else f"diagram-{i+1}"
    render_mermaid(block, f"{name}.png")

print(f"\n全部渲染完成！图片保存在: {OUT_DIR}")
