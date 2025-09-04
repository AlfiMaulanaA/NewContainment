/**
 * IoT Containment System - Template Engine
 * Flexible template processing with Handlebars-like syntax
 */

const fs = require('fs').promises;
const path = require('path');

class TemplateEngine {
    constructor(templatesDir = '../templates') {
        this.templatesDir = path.resolve(__dirname, templatesDir);
        this.templates = new Map();
        this.helpers = new Map();
        this.partials = new Map();
        
        this.registerDefaultHelpers();
    }

    async loadTemplates() {
        try {
            const templateFiles = await fs.readdir(this.templatesDir);
            
            for (const file of templateFiles) {
                if (file.endsWith('.md') || file.endsWith('.html')) {
                    const templateName = path.basename(file, path.extname(file));
                    const templatePath = path.join(this.templatesDir, file);
                    const templateContent = await fs.readFile(templatePath, 'utf8');
                    
                    this.templates.set(templateName, templateContent);
                    console.log(`📄 Loaded template: ${templateName}`);
                }
            }
        } catch (error) {
            console.warn('⚠️ Templates directory not found, using built-in templates');
        }
    }

    registerDefaultHelpers() {
        // Date helpers
        this.helpers.set('formatDate', (date) => {
            return new Date(date).toLocaleDateString();
        });

        this.helpers.set('formatDateTime', (date) => {
            return new Date(date).toLocaleString();
        });

        this.helpers.set('now', () => {
            return new Date().toISOString();
        });

        // String helpers
        this.helpers.set('uppercase', (str) => {
            return str.toUpperCase();
        });

        this.helpers.set('lowercase', (str) => {
            return str.toLowerCase();
        });

        this.helpers.set('capitalize', (str) => {
            return str.charAt(0).toUpperCase() + str.slice(1);
        });

        this.helpers.set('slugify', (str) => {
            return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        });

        // Array helpers
        this.helpers.set('length', (array) => {
            return Array.isArray(array) ? array.length : 0;
        });

        this.helpers.set('join', (array, separator = ', ') => {
            return Array.isArray(array) ? array.join(separator) : '';
        });

        // Conditional helpers
        this.helpers.set('eq', (a, b) => a === b);
        this.helpers.set('ne', (a, b) => a !== b);
        this.helpers.set('gt', (a, b) => a > b);
        this.helpers.set('lt', (a, b) => a < b);
        this.helpers.set('gte', (a, b) => a >= b);
        this.helpers.set('lte', (a, b) => a <= b);

        // Markdown helpers
        this.helpers.set('markdown', (text) => {
            // Simple markdown-like formatting
            return text
                .replace(/\*\*(.*?)\*\*/g, '**$1**') // Bold
                .replace(/\*(.*?)\*/g, '*$1*') // Italic
                .replace(/`(.*?)`/g, '`$1`'); // Code
        });

        // Code helpers
        this.helpers.set('codeBlock', (code, language = '') => {
            return `\`\`\`${language}\n${code}\n\`\`\``;
        });
    }

    registerHelper(name, fn) {
        this.helpers.set(name, fn);
    }

    registerPartial(name, content) {
        this.partials.set(name, content);
    }

    async render(templateName, data = {}) {
        let template = this.templates.get(templateName);
        
        if (!template) {
            console.warn(`⚠️ Template '${templateName}' not found`);
            return '';
        }

        // Add generation metadata
        data.generation = {
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toISOString(),
            time: new Date().toLocaleTimeString(),
            ...data.generation
        };

        return this.processTemplate(template, data);
    }

    processTemplate(template, data) {
        let result = template;

        // Process conditionals: {{#if condition}}...{{/if}}
        result = this.processConditionals(result, data);

        // Process loops: {{#each array}}...{{/each}}
        result = this.processLoops(result, data);

        // Process variables: {{variable}}
        result = this.processVariables(result, data);

        // Process helpers: {{helper param1 param2}}
        result = this.processHelpers(result, data);

        // Process partials: {{> partialName}}
        result = this.processPartials(result, data);

        return result;
    }

    processConditionals(template, data) {
        const ifRegex = /\{\{#if\s+([\w.]+)\}\}(.*?)\{\{\/if\}\}/gs;
        
        return template.replace(ifRegex, (match, condition, content) => {
            const value = this.getValue(data, condition);
            if (this.isTruthy(value)) {
                return this.processTemplate(content, data);
            }
            return '';
        });
    }

    processLoops(template, data) {
        const eachRegex = /\{\{#each\s+([\w.]+)\}\}(.*?)\{\{\/each\}\}/gs;
        
        return template.replace(eachRegex, (match, arrayPath, content) => {
            const array = this.getValue(data, arrayPath);
            if (!Array.isArray(array)) return '';

            return array.map((item, index) => {
                const itemData = {
                    ...data,
                    this: item,
                    '@index': index,
                    '@first': index === 0,
                    '@last': index === array.length - 1,
                    '@even': index % 2 === 0,
                    '@odd': index % 2 === 1
                };

                // If item is an object, merge its properties
                if (typeof item === 'object' && item !== null) {
                    Object.assign(itemData, item);
                }

                return this.processTemplate(content, itemData);
            }).join('');
        });
    }

    processVariables(template, data) {
        const varRegex = /\{\{([\w.]+)\}\}/g;
        
        return template.replace(varRegex, (match, path) => {
            const value = this.getValue(data, path);
            return value !== undefined ? String(value) : '';
        });
    }

    processHelpers(template, data) {
        const helperRegex = /\{\{(\w+)\s+(.*?)\}\}/g;
        
        return template.replace(helperRegex, (match, helperName, params) => {
            const helper = this.helpers.get(helperName);
            if (!helper) return match;

            try {
                const paramValues = this.parseParameters(params, data);
                return helper(...paramValues);
            } catch (error) {
                console.warn(`⚠️ Helper '${helperName}' failed:`, error.message);
                return match;
            }
        });
    }

    processPartials(template, data) {
        const partialRegex = /\{\{>\s*(\w+)\}\}/g;
        
        return template.replace(partialRegex, (match, partialName) => {
            const partial = this.partials.get(partialName);
            if (!partial) return match;
            
            return this.processTemplate(partial, data);
        });
    }

    getValue(data, path) {
        if (path === 'this') return data.this;
        
        const keys = path.split('.');
        let value = data;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    parseParameters(paramString, data) {
        const params = [];
        const tokens = paramString.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
        
        for (const token of tokens) {
            if (token.startsWith('"') && token.endsWith('"')) {
                // String literal
                params.push(token.slice(1, -1));
            } else if (!isNaN(token)) {
                // Number
                params.push(Number(token));
            } else if (token === 'true' || token === 'false') {
                // Boolean
                params.push(token === 'true');
            } else {
                // Variable reference
                const value = this.getValue(data, token);
                params.push(value);
            }
        }
        
        return params;
    }

    isTruthy(value) {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return Boolean(value);
    }

    async renderToFile(templateName, data, outputPath) {
        const content = await this.render(templateName, data);
        await fs.writeFile(outputPath, content, 'utf8');
        return outputPath;
    }

    // Utility method to create data structure for API documentation
    createApiData(analysis) {
        return {
            project: {
                name: analysis.overview.projectName,
                version: analysis.overview.version,
                description: analysis.overview.description,
                author: 'Development Team',
                repository: analysis.overview.repository || ''
            },
            api: {
                baseUrl: 'http://localhost:5000/api',
                authentication: {
                    enabled: true,
                    type: 'JWT Bearer Token'
                },
                rateLimiting: {
                    rpm: 100,
                    rph: 1000
                }
            },
            controllers: analysis.backend.controllers.map(controller => ({
                name: controller.name,
                description: controller.description || `${controller.name} API endpoints`,
                endpoints: controller.endpoints.length,
                requiresAuth: controller.authorize,
                roles: controller.roles || []
            })),
            endpoints: analysis.apiEndpoints.map(endpoint => ({
                method: endpoint.method,
                path: endpoint.path,
                description: endpoint.description,
                requiresAuth: endpoint.requiresAuth,
                roles: endpoint.roles || [],
                requestBody: this.generateSampleRequest(endpoint),
                responseBody: this.generateSampleResponse(endpoint)
            }))
        };
    }

    generateSampleRequest(endpoint) {
        if (endpoint.method === 'GET') return null;
        
        return JSON.stringify({
            // Generate sample based on endpoint
            example: "data"
        }, null, 2);
    }

    generateSampleResponse(endpoint) {
        return JSON.stringify({
            success: true,
            data: {},
            message: "Operation successful"
        }, null, 2);
    }
}

module.exports = TemplateEngine;