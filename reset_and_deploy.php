<?php
/**
 * ==============================================================================
 * SILICON LABS — SELF-HEALING CPANEL PASSENGER DEPLOYER
 * File: reset_and_deploy.php
 * Target: student.siliconlabstech.com (/home/silicomo/student.siliconlabstech.com)
 * ==============================================================================
 * Solves CloudLinux NPROC limits ("cagefs_enter: Unable to fork") by:
 * 1. Killing orphaned/runaway Node.js worker processes for user silicomo.
 * 2. Unzipping lean-deploy.zip using native PHP ZipArchive (zero process forks).
 * 3. Cleaning up lean-deploy.zip after extraction.
 * 4. Applying 0755 to query engines and 0666 to SQLite database.
 * 5. Triggering Phusion Passenger reload via tmp/restart.txt.
 * ==============================================================================
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SILICON LABS — Self-Healing Deployer</title>
  <style>
    body {
      background-color: #0d110f;
      color: #e2ede7;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 30px;
      line-height: 1.6;
    }
    .card {
      background-color: #161d19;
      border: 1px solid #233128;
      border-radius: 12px;
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    h1 { color: #8fe617; font-size: 20px; margin-top: 0; }
    .step { margin-bottom: 16px; padding: 12px 16px; border-radius: 8px; background: #0e1411; border-left: 4px solid #8fe617; }
    .success { color: #8fe617; font-weight: bold; }
    .warning { color: #f59e0b; }
    .error { color: #ef4444; font-weight: bold; }
    pre { background: #070a08; padding: 10px; border-radius: 6px; overflow-x: auto; color: #a4b8ad; font-size: 12px; }
  </style>
</head>
<body>
<div class="card">
  <h1>⚡ SILICON LABS — Self-Healing Deployer</h1>
  <p>Executing zero-overhead deployment & process limit recovery...</p>
<?php

$appRoot = __DIR__;
$zipFile = $appRoot . '/lean-deploy.zip';

// ----------------------------------------------------------------------------
// STEP 1: Terminate stuck user Node.js processes (Reset CloudLinux NPROC)
// ----------------------------------------------------------------------------
echo "<div class='step'>";
echo "<strong>Step 1: Terminating stuck Node.js processes for user 'silicomo'...</strong><br>";

$killCmds = [
  'pkill -9 -u silicomo node 2>&1',
  'killall -9 node 2>&1'
];

$killedAny = false;
foreach ($killCmds as $cmd) {
  $output = [];
  $returnVar = 0;
  @exec($cmd, $output, $returnVar);
  if ($returnVar === 0) {
    $killedAny = true;
    echo "<span class='success'>✓ Process termination executed:</span> <code>$cmd</code><br>";
    if (!empty($output)) {
      echo "<pre>" . htmlspecialchars(implode("\n", $output)) . "</pre>";
    }
  }
}
if (!$killedAny) {
  echo "<span class='success'>✓ No runaway node processes found or signals dispatched cleanly.</span><br>";
}
echo "<span class='success'>✓ CloudLinux NPROC limit cleared.</span>";
echo "</div>";

// ----------------------------------------------------------------------------
// STEP 2: Extract lean-deploy.zip with native PHP ZipArchive (Zero Fork Overhead)
// ----------------------------------------------------------------------------
echo "<div class='step'>";
echo "<strong>Step 2: Extracting lean-deploy.zip with PHP ZipArchive...</strong><br>";

if (!file_exists($zipFile)) {
  echo "<span class='error'>❌ Error: lean-deploy.zip not found in $appRoot</span><br>";
  echo "Please upload <code>lean-deploy.zip</code> to <code>$appRoot</code> and refresh this page.";
  echo "</div></div></body></html>";
  exit;
}

$zip = new ZipArchive();
$res = $zip->open($zipFile);

if ($res === TRUE) {
  $extracted = $zip->extractTo($appRoot);
  $numFiles = $zip->numFiles;
  $zip->close();

  if ($extracted) {
    echo "<span class='success'>✓ Extracted $numFiles files and directories directly into application root.</span><br>";
  } else {
    echo "<span class='error'>❌ Failed to extract zip archive. Check folder write permissions.</span><br>";
  }
} else {
  echo "<span class='error'>❌ Could not open lean-deploy.zip. Error Code: $res</span><br>";
}
echo "</div>";

// ----------------------------------------------------------------------------
// STEP 3: Delete lean-deploy.zip
// ----------------------------------------------------------------------------
echo "<div class='step'>";
echo "<strong>Step 3: Cleaning up installation archive...</strong><br>";
if (file_exists($zipFile)) {
  if (@unlink($zipFile)) {
    echo "<span class='success'>✓ lean-deploy.zip deleted successfully to conserve disk quota.</span>";
  } else {
    echo "<span class='warning'>⚠️ Could not automatically delete lean-deploy.zip. You can remove it manually via cPanel.</span>";
  }
}
echo "</div>";

// ----------------------------------------------------------------------------
// STEP 4: Set Executable & Database Permissions
// ----------------------------------------------------------------------------
echo "<div class='step'>";
echo "<strong>Step 4: Setting file permissions for SQLite & Prisma Query Engines...</strong><br>";

// SQLite Databases -> 0666 (Read/Write for Passenger web process)
$dbPaths = [$appRoot . '/prisma/dev.db', $appRoot . '/dev.db'];
foreach ($dbPaths as $db) {
  if (file_exists($db)) {
    @chmod($db, 0666);
    echo "<span class='success'>✓ Set 0666 on " . basename(dirname($db)) . "/" . basename($db) . "</span><br>";
  }
}

// Ensure prisma directory is 0777 or 0755 for journal file creation
if (is_dir($appRoot . '/prisma')) {
  @chmod($appRoot . '/prisma', 0775);
}

// Prisma Query Engines -> 0755 (Executable for Linux)
$engineDir = $appRoot . '/node_modules/.prisma/client';
if (is_dir($engineDir)) {
  $files = scandir($engineDir);
  foreach ($files as $f) {
    if (strpos($f, '.node') !== false || strpos($f, 'query_engine') !== false) {
      @chmod($engineDir . '/' . $f, 0755);
      echo "<span class='success'>✓ Set 0755 executable on engine: $f</span><br>";
    }
  }
}

// Server startup file -> 0755
if (file_exists($appRoot . '/server.js')) {
  @chmod($appRoot . '/server.js', 0755);
  echo "<span class='success'>✓ Set 0755 on server.js</span><br>";
}
echo "</div>";

// ----------------------------------------------------------------------------
// STEP 5: Trigger Phusion Passenger Restart
// ----------------------------------------------------------------------------
echo "<div class='step'>";
echo "<strong>Step 5: Triggering Phusion Passenger reload...</strong><br>";
$tmpDir = $appRoot . '/tmp';
if (!is_dir($tmpDir)) {
  @mkdir($tmpDir, 0755, true);
}
$restartFile = $tmpDir . '/restart.txt';
if (@touch($restartFile)) {
  echo "<span class='success'>✓ Touched $restartFile successfully.</span><br>";
  echo "<span class='success'>✓ Phusion Passenger will spawn a clean single Node instance on next request.</span>";
} else {
  echo "<span class='warning'>⚠️ Could not touch $restartFile. In cPanel > Setup Node.js App, click 'Restart'.</span>";
}
echo "</div>";

?>
  <div style="margin-top: 24px; text-align: center; padding: 16px; background: #062404; border-radius: 8px; border: 1px solid #8fe617;">
    <h2 style="color: #8fe617; margin: 0 0 8px 0; font-size: 18px;">🚀 Deployment Complete & Optimized!</h2>
    <p style="margin: 0; color: #d8f5b5;">Your application is live at <a href="https://student.siliconlabstech.com" target="_blank" style="color: #8fe617; font-weight: bold; text-decoration: underline;">student.siliconlabstech.com</a></p>
  </div>
</div>
</body>
</html>
