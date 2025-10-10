/** @odoo-module **/

export class NodeTemplates {
    constructor(workflowBuilder) {
        this.workflow = workflowBuilder;
        this.state = workflowBuilder.state;
        this.notification = workflowBuilder.notification;
    }

    getNodeTemplate(type) {
        const templates = {
            start: { icon: '▶️', title: 'Start Workflow' },
            end: { icon: '🏁', title: 'End Workflow' },
            endpoint: { icon: '🌐', title: 'API Endpoint' },
            auth: { icon: '🔐', title: 'Authentication' },
            get: { icon: '📥', title: 'GET Request' },
            post: { icon: '📤', title: 'POST Request' },
            put: { icon: '✏️', title: 'PUT Request' },
            delete: { icon: '🗑️', title: 'DELETE Request' },
            params: { icon: '❓', title: 'Query Parameters' },
            body: { icon: '📝', title: 'Request Body' },
            headers: { icon: '📋', title: 'Custom Headers' }
        };
        return templates[type] || templates.start;
    }

    getNodeIcon(type) {
        const icons = {
            start: '▶️',
            end: '🏁',
            endpoint: '🌐',
            auth: '🔐',
            get: '📥',
            post: '📤',
            put: '✏️',
            delete: '🗑️'
        };
        return icons[type] || '🔘';
    }

    getNodeTitle(type) {
        const titles = {
            start: 'Start Workflow',
            end: 'End Workflow',
            endpoint: 'API Endpoint',
            auth: 'Authentication',
            get: 'GET Request',
            post: 'POST Request',
            put: 'PUT Request',
            delete: 'DELETE Request'
        };
        return titles[type] || 'Node';
    }

    getDefaultConfig(type) {
        const defaults = {
            endpoint: { baseUrl: '', authType: 'none' },
            auth: { authType: 'none' },
            get: { url: '', timeout: 10000 },
             post: { url: '', timeout: 10000, body: '' , bodyType: 'json', formFields: [] },
            put: { url: '', timeout: 10000, body: '', bodyType: 'json', formFields: []  },
            delete: { url: '', timeout: 10000 },
            params: { params: [] },
            headers: { headers: [] },
            body: { body: '' },
            start: {},
            end: {}
        };
        return defaults[type] || {};
    }

    getConfigurationTemplate(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig) {
            console.error('❌ Node config not found for:', nodeId);
            return '';
        }

        console.log('🎨 Generating config template for node:', nodeId, 'Config:', nodeConfig);

        const type = nodeConfig.type;
        let html = '';

        switch (type) {
            case 'start':
                html = this.getStartConfiguration(nodeId);
                break;
            case 'end':
                html = this.getEndConfiguration(nodeId);
                break;
            case 'endpoint':
                html = this.getEndpointConfiguration(nodeId);
                break;
            case 'auth':
                html = this.getAuthConfiguration(nodeId);
                break;
            case 'get':
            case 'post':
            case 'put':
            case 'delete':
                html = this.getHttpMethodConfiguration(nodeId, type);
                break;
            case 'params':
                html = this.getParamsConfiguration(nodeId);
                break;
            case 'headers':
                html = this.getHeadersConfiguration(nodeId);
                break;
            case 'body':
                html = this.getBodyConfiguration(nodeId);
                break;
        }

        return html;
    }

    getStartConfiguration(nodeId) {
        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">▶️</span>
                    Start Configuration
                </div>
                <div class="help-text">This is the entry point of your workflow.</div>
            </div>
        `;
    }

    getEndConfiguration(nodeId) {
        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">🏁</span>
                    End Configuration
                </div>
                <div class="help-text">This is the exit point of your workflow.</div>
            </div>
        `;
    }

    getHttpMethodConfiguration(nodeId, method) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const currentUrl = nodeConfig.config.url || '';
        const currentTimeout = nodeConfig.config.timeout || 10000;

        console.log('📡 HTTP Method Config - URL:', currentUrl, 'Timeout:', currentTimeout);

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">📡</span>
                    Request Details
                </div>
                <label class="config-label">HTTP Method</label>
                <div style="font-size: 1.5rem; font-weight: bold; color: #00f2fe; text-align: center; padding: 10px;">
                    ${method.toUpperCase()}
                </div>
                <label for="url-${nodeId}" class="config-label">API URL Path</label>
                <input type="text" id="url-${nodeId}" class="config-input"
                       data-config-key="url"
                       placeholder="/api/users"
                       value="${this.escapeHtml(currentUrl)}">

                <label for="timeout-${nodeId}" class="config-label">Timeout (ms)</label>
                <input type="number" id="timeout-${nodeId}" class="config-input"
                       data-config-key="timeout"
                       placeholder="10000"
                       value="${currentTimeout}">

                ${(method === 'post' || method === 'put') ? this.getBodyConfiguration(nodeId) : ''}

                <button class="test-button" data-action="testApi">
                    ⚡ Run API Test
                </button>

                <label class="config-label">API Response</label>
                <div class="response-area" id="response-area-${nodeId}">
                    No test run yet.
                </div>
            </div>
        `;
    }

    getEndpointConfiguration(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const currentBaseUrl = nodeConfig.config.baseUrl || '';

        console.log('🌐 Endpoint Config - Base URL:', currentBaseUrl);

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">🌐</span>
                    Base API Setup
                </div>
                <label for="base-url-${nodeId}" class="config-label">Base API URL</label>
                <input type="text" id="base-url-${nodeId}" class="config-input"
                       data-config-key="baseUrl"
                       placeholder="https://api.example.com"
                       value="${this.escapeHtml(currentBaseUrl)}">
            </div>
            ${this.getAuthConfiguration(nodeId)}
        `;
    }

    getAuthConfiguration(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const authType = nodeConfig.config.authType || 'none';

        console.log('🔐 Auth Config - Type:', authType, 'Full config:', nodeConfig.config);

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">🔐</span>
                    Authentication
                </div>

                <label for="auth-type-${nodeId}" class="config-label">Auth Type</label>
                <select id="auth-type-${nodeId}" class="config-select" data-config-key="authType">
                    <option value="none" ${authType === 'none' ? 'selected' : ''}>None</option>
                    <option value="basic" ${authType === 'basic' ? 'selected' : ''}>Basic Auth</option>
                    <option value="bearer" ${authType === 'bearer' ? 'selected' : ''}>Bearer Token</option>
                    <option value="api-key" ${authType === 'api-key' ? 'selected' : ''}>API Key</option>
                </select>

                <div class="auth-fields">
                    ${authType === 'basic' ? this.getBasicAuthFields(nodeId) : ''}
                    ${authType === 'bearer' ? this.getBearerAuthFields(nodeId) : ''}
                    ${authType === 'api-key' ? this.getApiKeyAuthFields(nodeId) : ''}
                </div>
            </div>
        `;
    }

    getBasicAuthFields(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const username = nodeConfig.config.username || '';
        const password = nodeConfig.config.password || '';

        console.log('👤 Basic Auth Fields - Username:', username, 'Password:', password ? '***' : 'empty');

        return `
            <label for="username-${nodeId}" class="config-label">Username / API Key</label>
            <input type="text" id="username-${nodeId}" class="config-input"
                   data-config-key="username"
                   value="${this.escapeHtml(username)}">

            <label for="password-${nodeId}" class="config-label">Password / Secret Key</label>
            <input type="password" id="password-${nodeId}" class="config-input"
                   data-config-key="password"
                   value="${this.escapeHtml(password)}">
        `;
    }

    getBearerAuthFields(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const token = nodeConfig.config.token || '';

        console.log('🔑 Bearer Auth Fields - Token:', token ? '***' : 'empty');

        return `
            <label for="token-${nodeId}" class="config-label">Bearer Token</label>
            <input type="text" id="token-${nodeId}" class="config-input"
                   data-config-key="token"
                   value="${this.escapeHtml(token)}">
        `;
    }

    getApiKeyAuthFields(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const apiKey = nodeConfig.config.apiKey || '';
        const keyLocation = nodeConfig.config.keyLocation || 'header';

        console.log('🔑 API Key Auth Fields - API Key:', apiKey ? '***' : 'empty', 'Location:', keyLocation);

        return `
            <label for="api-key-${nodeId}" class="config-label">API Key</label>
            <input type="text" id="api-key-${nodeId}" class="config-input"
                   data-config-key="apiKey"
                   value="${this.escapeHtml(apiKey)}">

            <label for="key-location-${nodeId}" class="config-label">Key Location</label>
            <select id="key-location-${nodeId}" class="config-select" data-config-key="keyLocation">
                <option value="header" ${keyLocation === 'header' ? 'selected' : ''}>Header</option>
                <option value="query" ${keyLocation === 'query' ? 'selected' : ''}>Query Parameter</option>
            </select>
        `;
    }

    getParamsConfiguration(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const params = nodeConfig.config.params || [];

        console.log('❓ Params Config - Count:', params.length, 'Params:', params);

        let paramsHtml = '';
        params.forEach((param, index) => {
            paramsHtml += `
                <div class="param-item">
                    <span>${this.escapeHtml(param.key)}: ${this.escapeHtml(param.value)}</span>
                    <button class="remove-btn" data-action="removeParam" data-param-type="params" data-index="${index}">
                        ×
                    </button>
                </div>
            `;
        });

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">❓</span>
                    Query Parameters
                </div>

                <div class="param-builder">
                    ${paramsHtml || '<div class="no-params">No parameters added yet</div>'}
                </div>

                <label for="param-key-${nodeId}" class="config-label">Parameter Key</label>
                <input type="text" id="param-key-${nodeId}" class="config-input temp-input" placeholder="key_name">

                <label for="param-value-${nodeId}" class="config-label">Parameter Value</label>
                <input type="text" id="param-value-${nodeId}" class="config-input temp-input" placeholder="value_content">

                <button class="add-btn" data-action="addParam">
                    + Add Parameter
                </button>
            </div>
        `;
    }

    getHeadersConfiguration(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const headers = nodeConfig.config.headers || [];

        console.log('📋 Headers Config - Count:', headers.length, 'Headers:', headers);

        let headersHtml = '';
        headers.forEach((header, index) => {
            headersHtml += `
                <div class="param-item">
                    <span>${this.escapeHtml(header.key)}: ${this.escapeHtml(header.value)}</span>
                    <button class="remove-btn" data-action="removeParam" data-param-type="headers" data-index="${index}">
                        ×
                    </button>
                </div>
            `;
        });

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">📋</span>
                    Custom Headers
                </div>

                <div class="param-builder">
                    ${headersHtml || '<div class="no-params">No headers added yet</div>'}
                </div>

                <label for="header-key-${nodeId}" class="config-label">Header Key</label>
                <input type="text" id="header-key-${nodeId}" class="config-input temp-input" placeholder="X-Custom-Header">

                <label for="header-value-${nodeId}" class="config-label">Header Value</label>
                <input type="text" id="header-value-${nodeId}" class="config-input temp-input" placeholder="header_value">

                <button class="add-btn" data-action="addHeader">
                    + Add Header
                </button>
            </div>
        `;
    }

    getBodyConfiguration(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const body = nodeConfig.config.body || '';

        console.log('📝 Body Config - Length:', body.length, 'Preview:', body.substring(0, 50));

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">📝</span>
                    Request Body (JSON)
                </div>

                <div class="template-buttons">
                    <button class="template-btn" data-action="applyBodyTemplate" data-template-type="object">
                        { "key": "value" }
                    </button>
                    <button class="template-btn" data-action="applyBodyTemplate" data-template-type="array">
                        [ { "item": 1 } ]
                    </button>
                </div>

                <label for="request-body-${nodeId}" class="config-label">JSON Payload</label>
                <textarea id="request-body-${nodeId}" class="config-textarea"
                          data-config-key="body"
                          placeholder='{"key": "value"}'>${this.escapeHtml(body)}</textarea>
            </div>
        `;
    }

    // Utility method to escape HTML
    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Parameter management methods
    addParam(nodeId, paramType, key, value) {
        if (!key || !value) {
            this.notification.add("Key and Value cannot be empty", { type: 'warning' });
            return;
        }

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig.config[paramType]) {
            nodeConfig.config[paramType] = [];
        }

        nodeConfig.config[paramType].push({
            key: key.trim(),
            value: value.trim()
        });

        console.log('✅ Added param:', { nodeId, paramType, key, value, allParams: nodeConfig.config[paramType] });

        this.workflow.nodeManager.updateNodeStatus(nodeId);
        this.workflow.state.configUpdateCounter++;
    }

    removeParam(nodeId, paramType, index) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig.config[paramType] && nodeConfig.config[paramType].length > index) {
            const removed = nodeConfig.config[paramType].splice(index, 1);
            console.log('🗑️ Removed param:', { nodeId, paramType, index, removed });
            this.workflow.nodeManager.updateNodeStatus(nodeId);
            this.workflow.state.configUpdateCounter++;
        } else {
            console.error('❌ Cannot remove param - index out of bounds:', { nodeId, paramType, index });
        }
    }

    addParamFromInputs(nodeId, paramType) {
        const isHeader = paramType === 'headers';
        const keyInput = document.getElementById(`${isHeader ? 'header' : 'param'}-key-${nodeId}`);
        const valueInput = document.getElementById(`${isHeader ? 'header' : 'param'}-value-${nodeId}`);

        if (keyInput && valueInput && keyInput.value && valueInput.value) {
            this.addParam(nodeId, paramType, keyInput.value, valueInput.value);
            keyInput.value = '';
            valueInput.value = '';
        } else {
            this.notification.add("Key and Value cannot be empty", { type: 'warning' });
        }
    }

    updateAuthType(nodeId, authType) {
        console.log('🔄 Updating auth type from', this.state.nodeConfigs[nodeId].config.authType, 'to', authType);

        this.workflow.updateNodeConfig(nodeId, 'authType', authType);

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig) {
            const fieldsToClear = ['username', 'password', 'token', 'apiKey', 'keyLocation'];
            fieldsToClear.forEach(field => {
                if (nodeConfig.config[field]) {
                    console.log('🧹 Clearing auth field:', field);
                    delete nodeConfig.config[field];
                }
            });
        }
        this.workflow.state.configUpdateCounter++;
    }

    applyBodyTemplate(nodeId, type) {
        const textarea = document.getElementById(`request-body-${nodeId}`);
        let template = '';

        if (type === 'object') {
            template = '{\n  "name": "New Item",\n  "status": "pending"\n}';
        } else if (type === 'array') {
            template = '[\n  {\n    "id": 1,\n    "value": "initial"\n  }\n]';
        }

        if (textarea) {
            textarea.value = template;
            this.workflow.updateNodeConfig(nodeId, 'body', template);
            console.log('📋 Applied body template:', type);
        }
    }

    async runApiTest(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const responseArea = document.getElementById(`response-area-${nodeId}`);

        if (!responseArea) return;

        try {
            responseArea.textContent = 'Request Sent. Waiting for Response...';

            setTimeout(() => {
                const mockResponse = {
                    status: 200,
                    statusText: "OK (Mocked)",
                    requestUrl: nodeConfig.config.url || '/api/test',
                    data: {
                        message: "This is a simulated API response.",
                        method: nodeConfig.type.toUpperCase(),
                        time: new Date().toISOString(),
                        config: nodeConfig.config
                    }
                };

                responseArea.textContent = JSON.stringify(mockResponse, null, 2);
                this.notification.add("API test completed successfully!", { type: 'success' });
            }, 1500);

        } catch (error) {
            responseArea.textContent = JSON.stringify({ error: error.message }, null, 2);
            this.notification.add("API test failed", { type: 'danger' });
        }
    }

    getNodeParams(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        return nodeConfig && nodeConfig.config.params ? nodeConfig.config.params : [];
    }
}