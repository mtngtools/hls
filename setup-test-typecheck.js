const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, 'packages');
const packages = fs.readdirSync(packagesDir).filter(p => fs.statSync(path.join(packagesDir, p)).isDirectory());

const tsconfigTestJson = {
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "noEmit": true,
        "types": ["vitest/globals", "node"]
    },
    "include": [
        "src/**/*",
        "tests/**/*"
    ],
    "exclude": [
        "node_modules",
        "dist"
    ]
};

let allGood = true;

for (const pkg of packages) {
    const pkgDir = path.join(packagesDir, pkg);
    if (!fs.existsSync(path.join(pkgDir, 'package.json'))) continue;

    // Write tsconfig.test.json
    fs.writeFileSync(path.join(pkgDir, 'tsconfig.test.json'), JSON.stringify(tsconfigTestJson, null, 4));

    // Update package.json
    const packageJsonPath = path.join(pkgDir, 'package.json');
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (pkgJson.scripts) {
        pkgJson.scripts['test:typecheck'] = "tsc -p tsconfig.test.json";
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkgJson, null, 4) + '\n');
    }
}

// Update root package.json
const rootPackageJsonPath = path.join(__dirname, 'package.json');
const rootPkgJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
if (rootPkgJson.scripts) {
    rootPkgJson.scripts['test:typecheck'] = "turbo run test:typecheck";
    if (rootPkgJson.scripts.prepublishOnly) {
        if (!rootPkgJson.scripts.prepublishOnly.includes('test:typecheck')) {
            rootPkgJson.scripts.prepublishOnly = rootPkgJson.scripts.prepublishOnly.replace('pnpm run typecheck', 'pnpm run typecheck && pnpm run test:typecheck');
        }
    }
    fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPkgJson, null, 2) + '\n');
}

console.log('Successfully set up test:typecheck scripts!');
