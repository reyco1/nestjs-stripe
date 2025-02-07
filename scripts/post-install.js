// scripts/post-install.js
const fs = require('fs');
const path = require('path');

// Skip postinstall script if package is installed as a dependency
if (process.env.INIT_CWD !== process.cwd()) {
    process.exit(0);
}

function findAppModule() {
    const startDir = path.join(__dirname, '..', '..', '..');
    const appModulePath = path.join(startDir, 'src', 'app.module.ts');

    if (fs.existsSync(appModulePath)) {
        return appModulePath;
    }
    return null;
}

function addMissingImports(content) {
    const requiredImports = {
        configService: "import { ConfigService } from '@nestjs/config';",
        stripe: "import { StripeModule } from '@reyco1/nestjs-stripe';"
    };

    let newContent = content;

    // Check for existing ConfigService import
    const hasConfigModule = newContent.includes("ConfigModule");
    const hasConfigService = newContent.includes("ConfigService");

    // If ConfigModule exists but ConfigService doesn't, modify the existing import
    if (hasConfigModule && !hasConfigService) {
        newContent = newContent.replace(
            /import\s*{\s*ConfigModule\s*}\s*from\s*'@nestjs\/config'/,
            "import { ConfigModule, ConfigService } from '@nestjs/config'"
        );
    }

    // Check stripe import and add if missing
    Object.values(requiredImports).forEach(importStatement => {
        // Skip ConfigService import if we already handled it above
        if (importStatement.includes('ConfigService') && hasConfigService) {
            return;
        }

        // Extract the package name from import statement to check variations
        const packageMatch = importStatement.match(/'([^']+)'/)[1];
        if (!newContent.includes(packageMatch) ||
            (importStatement.includes('ConfigService') && !hasConfigService)) {
            // Find the last import statement
            const lastImportIndex = newContent.lastIndexOf('import');
            const lastImportEndIndex = newContent.indexOf(';', lastImportIndex) + 1;

            // Add new import after the last import
            newContent =
                newContent.slice(0, lastImportEndIndex) +
                '\n' +
                importStatement +
                newContent.slice(lastImportEndIndex);
        }
    });

    return newContent;
}

function addStripeModuleToImports(content) {
    // Check if StripeModule is already in imports
    if (content.includes('StripeModule.forRootAsync')) {
        console.log('StripeModule configuration already exists');
        return content;
    }

    const stripeModuleConfig = `
    StripeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        apiKey: configService.get('STRIPE_API_KEY'),
        apiVersion: configService.get('STRIPE_API_VERSION'),
        webhookSecret: configService.get('STRIPE_WEBHOOK_SECRET'),
      }),
    })`;

    // Find the imports array
    const importsMatch = content.match(/imports\s*:\s*\[([\s\S]*?)\]/);

    if (importsMatch) {
        const currentImports = importsMatch[1];
        // Check if imports array is empty
        const newImports = currentImports.trim()
            ? `${currentImports}${currentImports.endsWith(',') ? '' : ','}${stripeModuleConfig},`
            : stripeModuleConfig;

        return content.replace(
            /imports\s*:\s*\[([\s\S]*?)\]/,
            `imports: [${newImports}]`
        );
    }

    return content;
}

function addConfigModule(content) {
    // Check if ConfigModule is already in imports
    if (content.includes('ConfigModule.forRoot')) {
        console.log('ConfigModule configuration already exists');
        return content;
    }

    const configModuleConfig = `
    ConfigModule.forRoot({
      isGlobal: true,
    })`;

    // Find the imports array and add ConfigModule if not present
    const importsMatch = content.match(/imports\s*:\s*\[([\s\S]*?)\]/);

    if (importsMatch) {
        const currentImports = importsMatch[1];
        const newImports = currentImports.trim()
            ? `${currentImports}${currentImports.endsWith(',') ? '' : ','}${configModuleConfig},`
            : configModuleConfig;

        return content.replace(
            /imports\s*:\s*\[([\s\S]*?)\]/,
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

        // Add ConfigModule if not present
        content = addConfigModule(content);

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