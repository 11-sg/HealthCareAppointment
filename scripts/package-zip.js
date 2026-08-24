const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Packager] Preparing submission zip file...');

const rootDir = path.resolve(__dirname, '..');
const zipName = 'healthcare-appointment-manager.zip';
const zipPath = path.join(rootDir, zipName);

if (fs.existsSync(zipPath)) {
  try {
    fs.unlinkSync(zipPath);
  } catch (e) {}
}

try {
  // Use tar to create zip directly with fast exclusion
  const cmd = `tar -a -cf "${zipName}" --exclude="node_modules" --exclude="dist" --exclude="build" --exclude="coverage" --exclude=".system_generated" --exclude="*.db*" --exclude="*.log" --exclude="${zipName}" *`;
  
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });

  if (fs.existsSync(zipPath)) {
    const stats = fs.statSync(zipPath);
    console.log(`[Packager] Successfully generated ${zipName} (${(stats.size / 1024).toFixed(1)} KB) at:`);
    console.log(`  ${zipPath}`);
  } else {
    console.warn('[Packager] Zip file was not detected after packaging.');
  }
} catch (error) {
  console.error('[Packager] Packaging error:', error.message);
}
