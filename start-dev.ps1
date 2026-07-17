# ================================================================
#  一键启动前后端 — 河海大学校园问答助手
#  用法: 在项目根目录 (QA system/) 执行:
#        powershell -ExecutionPolicy Bypass -File start-dev.ps1
# ================================================================

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host @"
╔══════════════════════════════════════════════════╗
║     🏫  河海大学校园问答助手 — 开发环境启动        ║
╚══════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# ==================== 环境检测 ====================
Write-Host "`n[1/3] 正在检测运行环境..." -ForegroundColor Yellow

# Java — 优先使用 JDK 21（Spring Boot 4 需要）
$JAVA_HOME = $null
$JDK21 = "C:\Program Files\OpenJDK\jdk-21"
if (Test-Path "$JDK21\bin\java.exe") {
    $env:JAVA_HOME = $JDK21
    $env:PATH = "$JDK21\bin;$env:PATH"
    $javaVer = & "$JDK21\bin\java.exe" -version 2>&1 | ForEach-Object { "$_" } | Select-Object -First 1
    Write-Host "  ✓ Java: $javaVer" -ForegroundColor Green
} else {
    $javaVer = $null
    try { $javaVer = (java -version 2>&1 | ForEach-Object { "$_" } | Select-Object -First 1) } catch { }
    if (-not $javaVer) {
        Write-Host "  ✗ 未找到 Java！请安装 JDK 21+ 并添加到 PATH" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Java: $javaVer" -ForegroundColor Green
}

# Maven (可选 — 没有则尝试 mvnw)
$hasMvn = $true
try { $null = mvn --version 2>&1 } catch { $hasMvn = $false }

# Node.js
$nodeVer = $null
try { $nodeVer = (node --version 2>&1) } catch { }
if (-not $nodeVer) {
    Write-Host "  ✗ 未找到 Node.js！请安装 Node.js 18+ 并添加到 PATH" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Node.js: $nodeVer" -ForegroundColor Green

# MySQL
Write-Host "  ⚠  请确保 MySQL 8.0 已启动 (localhost:3306, 库: campus_qa)" -ForegroundColor DarkYellow

# ==================== 安装依赖 ====================
Write-Host "`n[2/3] 正在安装依赖..." -ForegroundColor Yellow

# 前端 node_modules
$frontendDir = "$ROOT\frontend-hhu"
if (-not (Test-Path "$frontendDir\node_modules")) {
    Write-Host "  → 安装前端依赖 (npm install)..." -ForegroundColor Gray
    Push-Location $frontendDir
    npm install 2>&1 | Out-Null
    Pop-Location
    Write-Host "  ✓ 前端依赖安装完成" -ForegroundColor Green
} else {
    Write-Host "  ✓ 前端依赖已存在，跳过" -ForegroundColor Green
}

# ==================== 启动服务 ====================
Write-Host "`n[3/3] 正在启动服务..." -ForegroundColor Yellow

# ---------- 后端 (Spring Boot) ----------
$backendDir = "$ROOT\backend-spring"
$mvnCmd = if ($hasMvn) { "mvn" } else { ".\mvnw.cmd" }
$mvnArgs = "spring-boot:run -Dspring-boot.run.fork=false"

Write-Host "  → 启动后端 (Spring Boot) $mvnCmd $mvnArgs" -ForegroundColor Gray

$backendJob = Start-Job -Name "backend-spring" -ArgumentList $backendDir, $mvnCmd, $mvnArgs -ScriptBlock {
    param($dir, $cmd, $args)
    Set-Location $dir
    & $cmd @args 2>&1
}

# ---------- 前端 (Vite) ----------
Write-Host "  → 启动前端 (Vite) npm run dev" -ForegroundColor Gray

$frontendJob = Start-Job -Name "frontend-vite" -ArgumentList $frontendDir -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev 2>&1
}

# ==================== 等待就绪 ====================
Write-Host "`n  ⏳ 等待服务就绪..." -ForegroundColor DarkYellow

# 等待后端 (端口 8000)
$backendReady = $false
for ($i = 0; $i -lt 120; $i++) {
    try {
        $conn = [System.Net.Sockets.TcpClient]::new('localhost', 8000)
        $conn.Close()
        $conn.Dispose()
        $backendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if ($backendReady) {
    Write-Host "  ✓ 后端已就绪 → http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "  ⚠  后端启动超时，请检查后端日志" -ForegroundColor DarkYellow
}

# 等待前端 (端口 5173)
$frontendReady = $false
for ($i = 0; $i -lt 30; $i++) {
    try {
        $conn = [System.Net.Sockets.TcpClient]::new('localhost', 5173)
        $conn.Close()
        $conn.Dispose()
        $frontendReady = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if ($frontendReady) {
    Write-Host "  ✓ 前端已就绪 → http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host "  ⚠  前端启动超时，请检查前端日志" -ForegroundColor DarkYellow
}

# ==================== 完成 ====================
Write-Host @"

╔══════════════════════════════════════════════════╗
║                                                  ║
║   🚀  开发环境已启动！                            ║
║                                                  ║
║   前端:  http://localhost:5173                    ║
║   后端:  http://localhost:8000                    ║
║                                                  ║
║   按 Ctrl+C 停止所有服务                         ║
║                                                  ║
╚══════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# ==================== 实时日志输出 ====================
Write-Host "`n实时日志 (后端 / 前端):`n" -ForegroundColor Gray

while ($true) {
    # 接收后端日志
    $backendOutput = Receive-Job -Job $backendJob 2>$null
    if ($backendOutput) {
        foreach ($line in $backendOutput) {
            Write-Host "[后端] $line" -ForegroundColor DarkCyan
        }
    }

    # 接收前端日志
    $frontendOutput = Receive-Job -Job $frontendJob 2>$null
    if ($frontendOutput) {
        foreach ($line in $frontendOutput) {
            Write-Host "[前端] $line" -ForegroundColor Magenta
        }
    }

    # 检查作业状态
    if ($backendJob.State -eq 'Failed') {
        Write-Host "`n✗ 后端进程异常退出！" -ForegroundColor Red
        Receive-Job -Job $backendJob | Write-Host -ForegroundColor Red
        break
    }
    if ($frontendJob.State -eq 'Failed') {
        Write-Host "`n✗ 前端进程异常退出！" -ForegroundColor Red
        Receive-Job -Job $frontendJob | Write-Host -ForegroundColor Red
        break
    }

    Start-Sleep -Seconds 1
}

# 清理
Stop-Job -Job $backendJob -ErrorAction SilentlyContinue
Stop-Job -Job $frontendJob -ErrorAction SilentlyContinue
Remove-Job -Job $backendJob -ErrorAction SilentlyContinue
Remove-Job -Job $frontendJob -ErrorAction SilentlyContinue
