// Script to temporarily exclude API routes during Capacitor build
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const apiPath = path.join(projectRoot, 'app', 'api');
const apiBackupPath = path.join(projectRoot, 'app', '_api_backup');

const isRestore = process.argv.includes('--restore');

function copyFolderRecursiveSync(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);
    files.forEach((file) => {
        const srcFile = path.join(source, file);
        const destFile = path.join(target, file);

        if (fs.lstatSync(srcFile).isDirectory()) {
            copyFolderRecursiveSync(srcFile, destFile);
        } else {
            fs.copyFileSync(srcFile, destFile);
        }
    });
}

if (isRestore) {
    // Restore API folder
    if (fs.existsSync(apiBackupPath)) {
        try {
            // Remove current API folder if it exists
            if (fs.existsSync(apiPath)) {
                fs.rmSync(apiPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            }
            // Copy backup back
            copyFolderRecursiveSync(apiBackupPath, apiPath);
            // Remove backup
            fs.rmSync(apiBackupPath, { recursive: true, force: true });
            console.log('✅ API routes restored');
        } catch (err) {
            console.error('❌ Error restoring API routes:', err.message);
            process.exit(1);
        }
    }
} else {
    // Backup API folder
    if (fs.existsSync(apiPath)) {
        try {
            // Remove old backup if exists
            if (fs.existsSync(apiBackupPath)) {
                fs.rmSync(apiBackupPath, { recursive: true, force: true });
            }
            // Copy API to backup
            copyFolderRecursiveSync(apiPath, apiBackupPath);
            // Remove original API folder
            fs.rmSync(apiPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            console.log('✅ API routes temporarily excluded from build');
        } catch (err) {
            console.error('❌ Error excluding API routes:', err.message);
            process.exit(1);
        }
    }
}
