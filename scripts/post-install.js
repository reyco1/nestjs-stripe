#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Post-install script started');

// Skip postinstall script if package is installed as a dependency
if (process.env.INIT_CWD !== process.cwd()) {
    console.log('Skipping post-install script in dependency');
    process.exit(0);
}

console.log('Running post-install script...');
console.log('Current working directory:', process.cwd());
console.log('INIT_CWD:', process.env.INIT_CWD);

function findAppModule() {
    console.log('Searching for app.module.ts...');
    const possiblePaths = [
        path.join(process.env.INIT_CWD, 'src', 'app.module.ts'),
        path.join(process.cwd(), 'src', 'app.module.ts'),
        path.join(__dirname, '..', '..', '..', 'src', 'app.module.ts')
    ];

    for (const appModulePath of possiblePaths) {
        console.log('Checking path:', appModulePath);
        if (fs.existsSync(appModulePath)) {
            console.log('Found app.module.ts at:', appModulePath);
            return appModulePath;
        }
    }
    return null;
}

function addMissingImports(content) {
    let newContent = content;

    // Check if ConfigService needs to be added to existing ConfigModule import
    if (newContent.includes('ConfigModule') && !newContent.includes('ConfigService')) {
        newContent = newContent.replace(
            /import\s*{\s*ConfigModule\s*}\s*from\s*'@nestjs\/config'/,
            "import { ConfigModule, ConfigService } from '@nestjs/config'"
        );
    }

    // Add StripeModule import if not present
    if (!newContent.includes('@reyco1/nestjs-stripe')) {
        // Find the last import statement
        const lastImportIndex = newContent.lastIndexOf('import');
        const lastImportEndIndex = newContent.indexOf(';', lastImportIndex) + 1;

        // Add new import after the last import
        newContent =
            newContent.slice(0, lastImportEndIndex) +
            '\nimport { StripeModule } from \'@reyco1/nestjs-stripe\';' +
            newContent.slice(lastImportEndIndex);
    }

    return newContent;
}

function addStripeModuleToImports(content) {
    // Check if StripeModule is already in imports
    if (content.includes('StripeModule.forRootAsync')) {
        console.log('StripeModule configuration already exists');
        return content;
    }

    const stripeModuleConfig = `\n    StripeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.get('STRIPE_API_KEY'),
        apiVersion: configService.get('STRIPE_API_VERSION'),
        webhookSecret: configService.get('STRIPE_WEBHOOK_SECRET'),
      }),
    })`;

    // Find the imports array closing bracket
    const importsMatch = content.match(/imports:\s*\[([\s\S]*?)\]/);

    if (importsMatch) {
        const currentImports = importsMatch[1].trim();
        // Remove any trailing commas and add our module
        const newImports = currentImports.replace(/,\s*$/, '') +
            (currentImports ? ',' : '') +
            stripeModuleConfig;

        return content.replace(
            /imports:\s*\[([\s\S]*?)\]/,
            `imports: [${newImports}]`
        );
    }

    return content;
}

function updateEnvFile(projectRoot) {
    const envPath = path.join(projectRoot, '.env');
    const envExamplePath = path.join(projectRoot, '.env.example');

    const stripeEnvVars = `
# Stripe Configuration
STRIPE_API_KEY=your_stripe_secret_key
STRIPE_API_VERSION=2023-10-16
STRIPE_WEBHOOK_SECRET=your_webhook_secret
`;

    // Update or create .env
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (!envContent.includes('STRIPE_API_KEY')) {
            fs.appendFileSync(envPath, stripeEnvVars);
            console.log('Added Stripe environment variables to .env file');
        }
    } else {
        fs.writeFileSync(envPath, stripeEnvVars);
        console.log('Created .env file with Stripe environment variables');
    }

    // Update or create .env.example
    if (fs.existsSync(envExamplePath)) {
        let envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
        if (!envExampleContent.includes('STRIPE_API_KEY')) {
            fs.appendFileSync(envExamplePath, stripeEnvVars);
            console.log('Added Stripe environment variables to .env.example file');
        }
    } else {
        fs.writeFileSync(envExamplePath, stripeEnvVars);
        console.log('Created .env.example file with Stripe environment variables');
    }
}

function updateAppModule() {
    const appModulePath = findAppModule();
    if (!appModulePath) {
        console.log('Could not find app.module.ts');
        return;
    }

    try {
        let content = fs.readFileSync(appModulePath, 'utf8');

        // Add missing imports
        content = addMissingImports(content);

        // Add StripeModule configuration
        content = addStripeModuleToImports(content);

        // Write the updated content back to the file
        fs.writeFileSync(appModulePath, content);
        console.log('Successfully updated app.module.ts');

        // Update environment files
        updateEnvFile(path.join(appModulePath, '..', '..'));

    } catch (error) {
        console.error('Error updating app.module.ts:', error);
    }
}

try {
    updateAppModule();
} catch (error) {
    console.error('Error in post-install script:', error);
    console.error('You may need to manually update your app.module.ts and .env files');
}