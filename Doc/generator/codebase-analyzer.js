/**
 * IoT Containment System - Codebase Analyzer
 * Analyzes the application structure and generates comprehensive documentation
 */

const fs = require('fs').promises;
const path = require('path');

class CodebaseAnalyzer {
    constructor(rootPath) {
        this.rootPath = rootPath;
        this.analysis = {
            overview: {},
            backend: {
                controllers: [],
                models: [],
                services: [],
                migrations: []
            },
            frontend: {
                pages: [],
                components: [],
                hooks: [],
                contexts: []
            },
            features: [],
            apiEndpoints: [],
            database: {
                models: [],
                relationships: []
            },
            security: {
                authentication: [],
                authorization: [],
                roles: []
            }
        };
    }

    async analyze() {
        console.log('🔍 Starting codebase analysis...');
        
        await this.analyzeOverview();
        await this.analyzeBackend();
        await this.analyzeFrontend();
        await this.analyzeFeatures();
        await this.analyzeSecurity();
        
        console.log('✅ Analysis completed!');
        return this.analysis;
    }

    async analyzeOverview() {
        try {
            const packageJson = JSON.parse(
                await fs.readFile(path.join(this.rootPath, 'Frontend', 'package.json'), 'utf8')
            );
            
            const csprojContent = await fs.readFile(
                path.join(this.rootPath, 'Backend', 'Backend.csproj'), 'utf8'
            );

            this.analysis.overview = {
                projectName: 'IoT Containment Monitoring System',
                version: packageJson.version || '1.0.0',
                description: 'Full-stack IoT monitoring system with real-time sensor data and CCTV integration',
                technologies: {
                    frontend: {
                        framework: 'Next.js 14',
                        language: 'TypeScript',
                        styling: 'Tailwind CSS',
                        ui: 'Radix UI + shadcn/ui',
                        stateManagement: 'React Context + Custom Hooks',
                        realtime: 'MQTT.js'
                    },
                    backend: {
                        framework: '.NET 9',
                        language: 'C#',
                        database: 'SQLite + Entity Framework Core',
                        authentication: 'JWT',
                        realtime: 'MQTTnet',
                        api: 'ASP.NET Core Web API'
                    }
                },
                dependencies: {
                    frontend: Object.keys(packageJson.dependencies || {}),
                    backend: this.extractNuGetPackages(csprojContent)
                }
            };
        } catch (error) {
            console.error('Error analyzing overview:', error.message);
        }
    }

    async analyzeBackend() {
        const backendPath = path.join(this.rootPath, 'Backend');
        
        // Analyze Controllers
        await this.analyzeControllers(path.join(backendPath, 'Controllers'));
        
        // Analyze Models
        await this.analyzeModels(path.join(backendPath, 'Models'));
        
        // Analyze Services
        await this.analyzeServices(path.join(backendPath, 'Services'));
        
        // Analyze Migrations
        await this.analyzeMigrations(path.join(backendPath, 'Migrations'));
    }

    async analyzeFrontend() {
        const frontendPath = path.join(this.rootPath, 'Frontend');
        
        // Analyze Pages
        await this.analyzePages(path.join(frontendPath, 'app'));
        
        // Analyze Components
        await this.analyzeComponents(path.join(frontendPath, 'components'));
        
        // Analyze Hooks
        await this.analyzeHooks(path.join(frontendPath, 'hooks'));
        
        // Analyze Contexts
        await this.analyzeContexts(path.join(frontendPath, 'contexts'));
    }

    async analyzeControllers(controllersPath) {
        try {
            const files = await this.getFiles(controllersPath, '.cs');
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const controller = this.parseController(content, path.basename(file));
                this.analysis.backend.controllers.push(controller);
                
                // Extract API endpoints
                this.analysis.apiEndpoints.push(...controller.endpoints);
            }
        } catch (error) {
            console.error('Error analyzing controllers:', error.message);
        }
    }

    async analyzeModels(modelsPath) {
        try {
            const files = await this.getFiles(modelsPath, '.cs');
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const model = this.parseModel(content, path.basename(file));
                this.analysis.backend.models.push(model);
                this.analysis.database.models.push(model);
            }
        } catch (error) {
            console.error('Error analyzing models:', error.message);
        }
    }

    async analyzePages(pagesPath) {
        try {
            const files = await this.getFiles(pagesPath, '.tsx', true);
            
            for (const file of files) {
                if (file.includes('page.tsx')) {
                    const content = await fs.readFile(file, 'utf8');
                    const page = this.parsePage(content, file);
                    this.analysis.frontend.pages.push(page);
                }
            }
        } catch (error) {
            console.error('Error analyzing pages:', error.message);
        }
    }

    async analyzeFeatures() {
        // Extract features based on pages and controllers
        const features = new Map();
        
        // Group by feature areas
        this.analysis.frontend.pages.forEach(page => {
            const feature = this.extractFeatureFromPath(page.path);
            if (!features.has(feature.name)) {
                features.set(feature.name, {
                    name: feature.name,
                    description: feature.description,
                    pages: [],
                    controllers: [],
                    models: []
                });
            }
            features.get(feature.name).pages.push(page);
        });

        this.analysis.backend.controllers.forEach(controller => {
            const feature = this.extractFeatureFromController(controller.name);
            if (features.has(feature)) {
                features.get(feature).controllers.push(controller);
            }
        });

        this.analysis.features = Array.from(features.values());
    }

    async analyzeSecurity() {
        // Analyze authentication and authorization patterns
        const authController = this.analysis.backend.controllers.find(c => 
            c.name.includes('Auth') || c.name.includes('Authentication')
        );
        
        if (authController) {
            this.analysis.security.authentication = authController.endpoints
                .filter(e => e.path.includes('login') || e.path.includes('register'));
        }

        // Analyze role-based access
        const roleController = this.analysis.backend.controllers.find(c => 
            c.name.includes('Role') || c.name.includes('User')
        );
        
        if (roleController) {
            this.analysis.security.roles = this.extractRoles();
        }
    }

    // Utility methods
    parseController(content, fileName) {
        const controller = {
            name: fileName.replace('.cs', ''),
            description: this.extractDescription(content),
            endpoints: [],
            authorize: content.includes('[Authorize'),
            roles: this.extractControllerRoles(content)
        };

        // Extract endpoints
        const httpMethods = ['HttpGet', 'HttpPost', 'HttpPut', 'HttpDelete', 'HttpPatch'];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            httpMethods.forEach(method => {
                if (line.includes(`[${method}`)) {
                    const endpoint = this.parseEndpoint(lines, i, method);
                    if (endpoint) {
                        controller.endpoints.push(endpoint);
                    }
                }
            });
        }

        return controller;
    }

    parseModel(content, fileName) {
        const model = {
            name: fileName.replace('.cs', ''),
            description: this.extractDescription(content),
            properties: [],
            relationships: []
        };

        // Extract properties
        const propertyRegex = /public\s+(\w+(?:<[^>]+>)?)\s+(\w+)\s*{[^}]*}/g;
        let match;
        
        while ((match = propertyRegex.exec(content)) !== null) {
            model.properties.push({
                type: match[1],
                name: match[2],
                isRequired: content.includes(`[Required]`) && content.indexOf(`[Required]`) < match.index,
                isKey: content.includes(`[Key]`) && content.indexOf(`[Key]`) < match.index
            });
        }

        return model;
    }

    parsePage(content, filePath) {
        const relativePath = filePath.replace(this.rootPath, '').replace(/\\/g, '/');
        const urlPath = this.convertFilePathToUrl(relativePath);
        
        return {
            name: path.basename(filePath, '.tsx'),
            path: relativePath,
            url: urlPath,
            description: this.extractPageDescription(content),
            components: this.extractUsedComponents(content),
            hooks: this.extractUsedHooks(content),
            requiresAuth: content.includes('useAuthGuard') || content.includes('AuthGuard'),
            developerMode: content.includes('DeveloperModeGuard') || content.includes('isDeveloperMode')
        };
    }

    parseEndpoint(lines, startIndex, method) {
        try {
            const methodLine = lines[startIndex];
            let path = '';
            
            // Extract path from attribute
            const pathMatch = methodLine.match(/\[Http\w+(?:\("([^"]+)"\))?\]/);
            if (pathMatch) {
                path = pathMatch[1] || '';
            }

            // Find the method signature
            let methodSignature = '';
            for (let i = startIndex + 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.includes('public') && (line.includes('async') || line.includes('IActionResult'))) {
                    methodSignature = line;
                    break;
                }
            }

            return {
                method: method.replace('Http', '').toUpperCase(),
                path: path,
                description: this.extractEndpointDescription(lines, startIndex),
                signature: methodSignature,
                requiresAuth: this.checkAuthRequirement(lines, startIndex),
                roles: this.extractEndpointRoles(lines, startIndex)
            };
        } catch (error) {
            return null;
        }
    }

    // Helper methods
    async getFiles(dir, extension, recursive = false) {
        const files = [];
        try {
            const items = await fs.readdir(dir);
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = await fs.stat(itemPath);
                
                if (stat.isDirectory() && recursive) {
                    files.push(...await this.getFiles(itemPath, extension, recursive));
                } else if (stat.isFile() && item.endsWith(extension)) {
                    files.push(itemPath);
                }
            }
        } catch (error) {
            // Directory might not exist
        }
        return files;
    }

    extractDescription(content) {
        // Try to find XML comments or regular comments
        const xmlCommentMatch = content.match(/<summary>\s*(.*?)\s*<\/summary>/s);
        if (xmlCommentMatch) {
            return xmlCommentMatch[1].replace(/\/\/\s*/g, '').trim();
        }

        const commentMatch = content.match(/\/\/\s*(.+)/);
        if (commentMatch) {
            return commentMatch[1].trim();
        }

        return '';
    }

    extractFeatureFromPath(filePath) {
        const pathParts = filePath.split('/').filter(p => p && p !== 'app');
        
        if (pathParts.length > 0) {
            const mainFeature = pathParts[0];
            return {
                name: this.capitalizeFeatureName(mainFeature),
                description: this.getFeatureDescription(mainFeature)
            };
        }
        
        return { name: 'Core', description: 'Core application functionality' };
    }

    capitalizeFeatureName(feature) {
        return feature.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    getFeatureDescription(feature) {
        const descriptions = {
            'auth': 'User authentication and session management',
            'dashboard': 'Main dashboard and overview screens',
            'management': 'System administration and configuration',
            'monitoring': 'Real-time sensor and device monitoring',
            'control': 'Containment and device control interfaces',
            'access-control': 'Biometric access control system (Developer Mode)',
            'developer': 'Developer tools and debugging interfaces',
            'reports': 'Data reporting and analytics'
        };
        
        return descriptions[feature] || `${this.capitalizeFeatureName(feature)} functionality`;
    }

    convertFilePathToUrl(filePath) {
        // Convert file path to URL path
        let url = filePath
            .replace(/.*\/app/, '')
            .replace(/\/page\.tsx$/, '')
            .replace(/\\/g, '/');
            
        return url || '/';
    }

    extractUsedComponents(content) {
        const components = [];
        const importMatches = content.match(/import\s+.*from\s+['"]@\/components\/.*['"]/g);
        
        if (importMatches) {
            importMatches.forEach(match => {
                const componentMatch = match.match(/import\s+(?:\{([^}]+)\}|\w+)/);
                if (componentMatch) {
                    if (componentMatch[1]) {
                        // Named imports
                        components.push(...componentMatch[1].split(',').map(c => c.trim()));
                    } else {
                        // Default import
                        components.push(componentMatch[0].split('import')[1].split('from')[0].trim());
                    }
                }
            });
        }
        
        return [...new Set(components)];
    }

    extractUsedHooks(content) {
        const hooks = [];
        const hookMatches = content.match(/use\w+/g);
        
        if (hookMatches) {
            hooks.push(...hookMatches);
        }
        
        return [...new Set(hooks)];
    }

    extractNuGetPackages(csprojContent) {
        const packages = [];
        const packageMatches = csprojContent.match(/<PackageReference\s+Include="([^"]+)"/g);
        
        if (packageMatches) {
            packageMatches.forEach(match => {
                const packageName = match.match(/Include="([^"]+)"/)[1];
                packages.push(packageName);
            });
        }
        
        return packages;
    }

    extractControllerRoles(content) {
        const roleMatches = content.match(/\[Authorize\(Roles\s*=\s*["']([^"']+)["']\)\]/g);
        const roles = [];
        
        if (roleMatches) {
            roleMatches.forEach(match => {
                const roleList = match.match(/["']([^"']+)["']/)[1];
                roles.push(...roleList.split(',').map(r => r.trim()));
            });
        }
        
        return [...new Set(roles)];
    }

    extractRoles() {
        return [
            { name: 'User', level: 1, description: 'Standard user with basic access' },
            { name: 'Developer', level: 2, description: 'Developer with advanced features access' },
            { name: 'Admin', level: 3, description: 'Administrator with full system access' }
        ];
    }

    extractPageDescription(content) {
        // Try to extract page description from metadata or comments
        const metadataMatch = content.match(/title:\s*["']([^"']+)["']/);
        if (metadataMatch) {
            return metadataMatch[1];
        }

        const titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
        if (titleMatch) {
            return titleMatch[1];
        }

        return '';
    }

    extractEndpointDescription(lines, startIndex) {
        // Look for XML comments above the endpoint
        for (let i = startIndex - 1; i >= 0; i--) {
            const line = lines[i].trim();
            if (line.includes('<summary>')) {
                let description = '';
                for (let j = i; j < startIndex; j++) {
                    if (lines[j].includes('</summary>')) break;
                    if (!lines[j].includes('<summary>') && !lines[j].includes('///')) {
                        description += lines[j].trim() + ' ';
                    }
                }
                return description.trim();
            }
            if (line && !line.startsWith('///') && !line.startsWith('[')) {
                break;
            }
        }
        return '';
    }

    checkAuthRequirement(lines, startIndex) {
        // Check for [Authorize] attribute
        for (let i = startIndex - 5; i < startIndex; i++) {
            if (i >= 0 && lines[i].includes('[Authorize')) {
                return true;
            }
        }
        return false;
    }

    extractEndpointRoles(lines, startIndex) {
        // Extract roles from [Authorize(Roles = "...")] attributes
        for (let i = startIndex - 5; i < startIndex; i++) {
            if (i >= 0) {
                const roleMatch = lines[i].match(/\[Authorize\(Roles\s*=\s*["']([^"']+)["']\)\]/);
                if (roleMatch) {
                    return roleMatch[1].split(',').map(r => r.trim());
                }
            }
        }
        return [];
    }

    async analyzeServices(servicesPath) {
        try {
            const files = await this.getFiles(servicesPath, '.cs');
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const service = this.parseService(content, path.basename(file));
                this.analysis.backend.services.push(service);
            }
        } catch (error) {
            console.error('Error analyzing services:', error.message);
        }
    }

    async analyzeMigrations(migrationsPath) {
        try {
            const files = await this.getFiles(migrationsPath, '.cs');
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const migration = this.parseMigration(content, path.basename(file));
                this.analysis.backend.migrations.push(migration);
            }
        } catch (error) {
            console.error('Error analyzing migrations:', error.message);
        }
    }

    async analyzeComponents(componentsPath) {
        try {
            const files = await this.getFiles(componentsPath, '.tsx', true);
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const component = this.parseComponent(content, file);
                this.analysis.frontend.components.push(component);
            }
        } catch (error) {
            console.error('Error analyzing components:', error.message);
        }
    }

    async analyzeHooks(hooksPath) {
        try {
            const files = await this.getFiles(hooksPath, '.ts', true);
            files.push(...await this.getFiles(hooksPath, '.tsx', true));
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const hook = this.parseHook(content, file);
                this.analysis.frontend.hooks.push(hook);
            }
        } catch (error) {
            console.error('Error analyzing hooks:', error.message);
        }
    }

    async analyzeContexts(contextsPath) {
        try {
            const files = await this.getFiles(contextsPath, '.tsx', true);
            files.push(...await this.getFiles(contextsPath, '.ts', true));
            
            for (const file of files) {
                const content = await fs.readFile(file, 'utf8');
                const context = this.parseContext(content, file);
                this.analysis.frontend.contexts.push(context);
            }
        } catch (error) {
            console.error('Error analyzing contexts:', error.message);
        }
    }

    parseService(content, fileName) {
        return {
            name: fileName.replace('.cs', ''),
            description: this.extractDescription(content),
            methods: this.extractServiceMethods(content),
            interfaces: this.extractImplementedInterfaces(content),
            dependencies: this.extractServiceDependencies(content)
        };
    }

    parseMigration(content, fileName) {
        return {
            name: fileName.replace('.cs', ''),
            timestamp: this.extractMigrationTimestamp(fileName),
            description: this.extractDescription(content),
            tables: this.extractMigrationTables(content),
            operations: this.extractMigrationOperations(content)
        };
    }

    parseComponent(content, filePath) {
        const relativePath = filePath.replace(this.rootPath, '').replace(/\\/g, '/');
        
        return {
            name: path.basename(filePath, '.tsx'),
            path: relativePath,
            description: this.extractComponentDescription(content),
            props: this.extractComponentProps(content),
            hooks: this.extractUsedHooks(content),
            dependencies: this.extractComponentDependencies(content),
            isClientComponent: content.includes("'use client'"),
            isServerComponent: !content.includes("'use client'")
        };
    }

    parseHook(content, filePath) {
        const relativePath = filePath.replace(this.rootPath, '').replace(/\\/g, '/');
        
        return {
            name: path.basename(filePath, path.extname(filePath)),
            path: relativePath,
            description: this.extractDescription(content),
            parameters: this.extractHookParameters(content),
            returnType: this.extractHookReturnType(content),
            dependencies: this.extractHookDependencies(content)
        };
    }

    parseContext(content, filePath) {
        const relativePath = filePath.replace(this.rootPath, '').replace(/\\/g, '/');
        
        return {
            name: path.basename(filePath, path.extname(filePath)),
            path: relativePath,
            description: this.extractDescription(content),
            state: this.extractContextState(content),
            actions: this.extractContextActions(content),
            provider: this.extractContextProvider(content)
        };
    }

    extractServiceMethods(content) {
        const methods = [];
        const methodRegex = /(?:public|private|protected)?\s*(?:async\s+)?(?:Task<.*?>|Task|.*?)\s+(\w+)\s*\([^)]*\)/g;
        let match;
        
        while ((match = methodRegex.exec(content)) !== null) {
            if (!match[1].includes('get_') && !match[1].includes('set_')) {
                methods.push(match[1]);
            }
        }
        
        return methods;
    }

    extractImplementedInterfaces(content) {
        const interfaceMatch = content.match(/class\s+\w+\s*:\s*([^{]+)/);
        if (interfaceMatch) {
            return interfaceMatch[1].split(',').map(i => i.trim());
        }
        return [];
    }

    extractServiceDependencies(content) {
        const dependencies = [];
        const constructorMatch = content.match(/public\s+\w+\s*\(([^)]+)\)/);
        if (constructorMatch) {
            const params = constructorMatch[1].split(',');
            params.forEach(param => {
                const typeMatch = param.trim().match(/^(\w+(?:<[^>]+>)?)/);
                if (typeMatch) {
                    dependencies.push(typeMatch[1]);
                }
            });
        }
        return dependencies;
    }

    extractMigrationTimestamp(fileName) {
        const timestampMatch = fileName.match(/^(\d+)/);
        return timestampMatch ? timestampMatch[1] : '';
    }

    extractMigrationTables(content) {
        const tables = [];
        const createTableMatches = content.match(/CreateTable\s*\(\s*name:\s*"(\w+)"/g);
        if (createTableMatches) {
            createTableMatches.forEach(match => {
                const tableMatch = match.match(/"(\w+)"/);
                if (tableMatch) tables.push(tableMatch[1]);
            });
        }
        return tables;
    }

    extractMigrationOperations(content) {
        const operations = [];
        const operationTypes = ['CreateTable', 'DropTable', 'AddColumn', 'DropColumn', 'CreateIndex'];
        
        operationTypes.forEach(op => {
            const regex = new RegExp(`${op}\\s*\\(`, 'g');
            const matches = content.match(regex);
            if (matches) {
                operations.push({ type: op, count: matches.length });
            }
        });
        
        return operations;
    }

    extractComponentDescription(content) {
        const commentMatch = content.match(/\/\*\*(.*?)\*\//s);
        if (commentMatch) {
            return commentMatch[1].replace(/\s*\*\s*/g, ' ').trim();
        }
        
        const titleMatch = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/);
        if (titleMatch) {
            return titleMatch[1];
        }
        
        return '';
    }

    extractComponentProps(content) {
        const propsMatch = content.match(/interface\s+\w*Props\s*{([^}]+)}/);
        if (propsMatch) {
            const props = [];
            const propLines = propsMatch[1].split('\n');
            propLines.forEach(line => {
                const propMatch = line.trim().match(/(\w+)\??\s*:\s*([^;]+)/);
                if (propMatch) {
                    props.push({
                        name: propMatch[1],
                        type: propMatch[2].trim(),
                        optional: line.includes('?')
                    });
                }
            });
            return props;
        }
        return [];
    }

    extractComponentDependencies(content) {
        const imports = [];
        const importMatches = content.match(/import\s+.*from\s+['"][^'"]+['"]/g);
        if (importMatches) {
            importMatches.forEach(match => {
                const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/);
                if (moduleMatch) {
                    imports.push(moduleMatch[1]);
                }
            });
        }
        return imports;
    }

    extractHookParameters(content) {
        const hookMatch = content.match(/export\s+(?:default\s+)?function\s+use\w+\s*\(([^)]*)\)/);
        if (hookMatch) {
            return hookMatch[1].split(',').map(param => param.trim()).filter(p => p);
        }
        return [];
    }

    extractHookReturnType(content) {
        const returnMatch = content.match(/return\s+({[^}]+}|\[[^\]]+\]|\w+)/);
        if (returnMatch) {
            return returnMatch[1];
        }
        return 'unknown';
    }

    extractHookDependencies(content) {
        const dependencies = [];
        const reactHooks = content.match(/use\w+/g);
        if (reactHooks) {
            dependencies.push(...reactHooks);
        }
        return [...new Set(dependencies)];
    }

    extractContextState(content) {
        const stateMatch = content.match(/interface\s+\w*State\s*{([^}]+)}/);
        if (stateMatch) {
            return stateMatch[1].trim();
        }
        return '';
    }

    extractContextActions(content) {
        const actions = [];
        const actionMatches = content.match(/type\s+\w*Action\s*=([^;]+)/);
        if (actionMatches) {
            const actionTypes = actionMatches[1].split('|');
            actionTypes.forEach(action => {
                const typeMatch = action.trim().match(/{\s*type:\s*['"](\w+)['"]/);
                if (typeMatch) {
                    actions.push(typeMatch[1]);
                }
            });
        }
        return actions;
    }

    extractContextProvider(content) {
        const providerMatch = content.match(/export\s+function\s+(\w+Provider)/);
        return providerMatch ? providerMatch[1] : '';
    }

    extractFeatureFromController(controllerName) {
        const name = controllerName.replace('Controller', '').toLowerCase();
        
        const featureMap = {
            'auth': 'Authentication',
            'user': 'User Management', 
            'device': 'Device Management',
            'sensor': 'Sensor Monitoring',
            'containment': 'Containment Control',
            'mqtt': 'MQTT Communication',
            'camera': 'CCTV Integration',
            'maintenance': 'Maintenance',
            'whatsapp': 'WhatsApp Integration',
            'menu': 'Menu Management',
            'role': 'Role Management',
            'access': 'Access Control'
        };

        for (const [key, feature] of Object.entries(featureMap)) {
            if (name.includes(key)) {
                return feature;
            }
        }

        return 'Core';
    }

    // Save analysis to file
    async saveAnalysis(outputPath) {
        try {
            await fs.writeFile(
                path.join(outputPath, 'codebase-analysis.json'), 
                JSON.stringify(this.analysis, null, 2),
                'utf8'
            );
            console.log('✅ Analysis saved to codebase-analysis.json');
        } catch (error) {
            console.error('Error saving analysis:', error.message);
        }
    }
}

module.exports = CodebaseAnalyzer;