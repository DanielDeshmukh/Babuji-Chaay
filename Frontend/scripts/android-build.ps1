$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $projectRoot "android"
$localPropertiesPath = Join-Path $androidDir "local.properties"

$javaCandidates = @()

if ($env:JAVA_HOME) {
  $javaCandidates += $env:JAVA_HOME
}

$javaCandidates += "C:\Program Files\Android\Android Studio\jbr"
$javaCandidates += "C:\Program Files\Java\jdk-17"

$resolvedJavaHome = $null

foreach ($candidate in $javaCandidates) {
  if (-not [string]::IsNullOrWhiteSpace($candidate)) {
    $javaExe = Join-Path $candidate "bin\java.exe"
    if (Test-Path $javaExe) {
      $resolvedJavaHome = $candidate
      break
    }
  }
}

if (-not $resolvedJavaHome) {
  throw "No valid Java installation was found. Set JAVA_HOME or install Android Studio / JDK 17."
}

$sdkCandidates = @()

if ($env:ANDROID_HOME) {
  $sdkCandidates += $env:ANDROID_HOME
}

if ($env:ANDROID_SDK_ROOT) {
  $sdkCandidates += $env:ANDROID_SDK_ROOT
}

$sdkCandidates += (Join-Path $env:LOCALAPPDATA "Android\Sdk")

$resolvedAndroidSdk = $null

foreach ($candidate in $sdkCandidates) {
  if (-not [string]::IsNullOrWhiteSpace($candidate)) {
    $adbExe = Join-Path $candidate "platform-tools\adb.exe"
    if (Test-Path $adbExe) {
      $resolvedAndroidSdk = $candidate
      break
    }
  }
}

if (-not $resolvedAndroidSdk) {
  throw "No valid Android SDK installation was found. Set ANDROID_HOME or install the Android SDK."
}

$env:JAVA_HOME = $resolvedJavaHome
$env:ANDROID_HOME = $resolvedAndroidSdk
$env:ANDROID_SDK_ROOT = $resolvedAndroidSdk

@(
  "sdk.dir=$($resolvedAndroidSdk -replace '\\','\\')"
) | Set-Content -Path $localPropertiesPath

Write-Host "Using JAVA_HOME=$resolvedJavaHome"
Write-Host "Using ANDROID_HOME=$resolvedAndroidSdk"

Push-Location $androidDir
try {
  .\gradlew.bat $args
} finally {
  Pop-Location
}
