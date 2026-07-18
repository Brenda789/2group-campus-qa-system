# ============================================
# 校园知识问答助手 — 一键启动前后端
# 用法：在项目根目录右键 → "使用 PowerShell 运行"
#       或在终端输入：powershell -ExecutionPolicy Bypass -File start.ps1
# ============================================

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  校园知识问答助手 — 启动中..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ---------- 启动后端 (Spring Boot, 端口 8000) ----------
Write-Host "`n[1/2] 启动后端 (Spring Boot :8000)..." -ForegroundColor Green

if (Test-Path "$projectRoot\backend-spring") {
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$projectRoot\backend-spring'; Write-Host '后端启动中，请稍候...' -ForegroundColor Yellow; .\mvnw spring-boot:run"
    ) -WindowStyle Minimized
    Write-Host "  ✓ 后端已在独立窗口启动" -ForegroundColor Green
} else {
    Write-Host "  ✗ 找不到 backend-spring 目录" -ForegroundColor Red
}

# ---------- 启动前端 (Vite, 端口 5173) ----------
Write-Host "`n[2/2] 启动前端 (Vite :5173)..." -ForegroundColor Green

if (Test-Path "$projectRoot\frontend-hhu") {
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$projectRoot\frontend-hhu'; Write-Host '前端启动中，请稍候...' -ForegroundColor Yellow; npm run dev"
    ) -WindowStyle Minimized
    Write-Host "  ✓ 前端已在独立窗口启动" -ForegroundColor Green
} else {
    Write-Host "  ✗ 找不到 frontend-hhu 目录" -ForegroundColor Red
}

# ---------- 完成 ----------
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  启动完成！访问地址：" -ForegroundColor Cyan
Write-Host "  管理后台 : http://localhost:5173/#/admin" -ForegroundColor White
Write-Host "  API 文档 : http://localhost:8000/docs" -ForegroundColor White
Write-Host "  默认账号 : admin@campus.example / admin123" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n按任意键退出此窗口（不会关闭前后端）..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
