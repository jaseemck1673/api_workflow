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
            post: { url: '', timeout: 10000, body: '' },
            put: { url: '', timeout: 10000, body: '' },
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

        console.log('🎨 Generating config template for node:', nodeId);
        console.log('📊 Current config:', nodeConfig.config);

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
                       value="${this.escapeHtml(currentUrl)}"
                       placeholder="/api/users"
                       onInput="this.getRootNode().workflowBuilder.updateNodeConfig('${nodeId}', 'url', this.value)">

                <label for="timeout-${nodeId}" class="config-label">Timeout (ms)</label>
                <input type="number" id="timeout-${nodeId}" class="config-input"
                       value="${currentTimeout}"
                       placeholder="10000"
                       onInput="this.getRootNode().workflowBuilder.updateNodeConfig('${nodeId}', 'timeout', parseInt(this.value) || 0)">

                ${(method === 'post' || method === 'put') ? this.getBodyConfiguration(nodeId) : ''}

                <button class="test-button" onclick="this.getRootNode().workflowBuilder.runApiTest('${nodeId}')">
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

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">🌐</span>
                    Base API Setup
                </div>
                <label for="base-url-${nodeId}" class="config-label">Base API URL</label>
                <input type="text" id="base-url-${nodeId}" class="config-input"
                       value="${this.escapeHtml(currentBaseUrl)}"
                       placeholder="https://api.example.com"
                       onInput="this.getRootNode().workflowBuilder.updateNodeConfig('${nodeId}', 'baseUrl', this.value)">
            </div>
            ${this.getAuthConfiguration(nodeId)}
        `;
    }

    getAuthConfiguration(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const authType = nodeConfig.config.authType || 'none';

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">🔐</span>
                    Authentication
                </div>

                <label for="auth-type-${nodeId}" class="config-label">Auth Type</label>
                <select id="auth-type-${nodeId}" class="config-select"
                        onchange="this.getRootNode().workflowBuilder.updateAuthType('${nodeId}', this.value)">
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

        return `
            <label for="username-${nodeId}" class="config-label">Username</label>
            <input type="text" id="username-${nodeId}" class="config-input"
                   value="${this.escapeHtml(username)}"
                   onInput="this.getRootNode().workflowBuilder.updateNodeConfig('${nodeId}', 'username', this.value)">

            <label for="password-${nodeId}" class="config-label">Password</label>
            <input type="password" id="password-${nodeId}" class="config-input"
                   value="${this.escapeHtml(password)}"
                   onInput="this.getRootNode().workflowBuilder.updateNodeConfig('${nodeId}', 'password', this.value)">
        `;
    }

    getBearerAuthFields(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const token = nodeConfig.config.token || '';

        return `
            <label for="token-${nodeId}" class="config-label">Bearer Token</label>
            <input type="text" id="token-${nodeId}" class="config-input"
                   value="${this.escapeHtml(token)}"
                   onInput="this.getRootNode().workflowBuilder.updateNodeConfig('${nodeId}', 'token', this.value)">
        `;
    }

    getApiKeyAuthFields(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const apiKey = nodeConfig.config.apiKey || '';
        const keyLocation = nodeConfig.config.keyLocation || 'header';

        return `
            <label for="api-key-${nodeId}" class="config-label">API Key</label>
            <input type="text" id="api-key-${nodeId}" class="config-input"
                   value="${this.escapeHtml(apiKey)}"
                   onInput="this.getRootNode().workflowBuilder.updateNodeConfig('${nodeId}', 'apiKey', this.value)">

            <label for="key-location-${nodeId}" class="config-label">Key Location</label>
            <select id="key-location-${nodeId}" class="config-select"
                    onchange="this.getRootNode().workflowBuilder.updateNodeConfig('${nodeId}', 'keyLocation', this.value)">
                <option value="header" ${keyLocation === 'header' ? 'selected' : ''}>Header</option>
                <option value="query" ${keyLocation === 'query' ? 'selected' : ''}>Query Parameter</option>
            </select>
        `;
    }

    getParamsConfiguration(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const params = nodeConfig.config.params || [];

        let paramsHtml = '';
        params.forEach((param, index) => {
            paramsHtml += `
                <div class="param-item">
                    <span>${this.escapeHtml(param.key)}: ${this.escapeHtml(param.value)}</span>
                    <button class="remove-btn" onclick="this.getRootNode().workflowBuilder.removeParam('${nodeId}', 'params', ${index})">
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
                <input type="text" id="param-key-${nodeId}" class="config-input" placeholder="key_name">

                <label for="param-value-${nodeId}" class="config-label">Parameter Value</label>
                <input type="text" id="param-value-${nodeId}" class="config-input" placeholder="value_content">

                <button class="add-btn" onclick="this.getRootNode().workflowBuilder.addParamFromInputs('${nodeId}', 'params')">
                    + Add Parameter
                </button>
            </div>
        `;
    }

    getHeadersConfiguration(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const headers = nodeConfig.config.headers || [];

        let headersHtml = '';
        headers.forEach((header, index) => {
            headersHtml += `
                <div class="param-item">
                    <span>${this.escapeHtml(header.key)}: ${this.escapeHtml(header.value)}</span>
                    <button class="remove-btn" onclick="this.getRootNode().workflowBuilder.removeParam('${nodeId}', 'headers', ${index})">
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
                <input type="text" id="header-key-${nodeId}" class="config-input" placeholder="X-Custom-Header">

                <label for="header-value-${nodeId}" class="config-label">Header Value</label>
                <input type="text" id="header-value-${nodeId}" class="config-input" placeholder="header_value">

                <button class="add-btn" onclick="this.getRootNode().workflowBuilder.addParamFromInputs('${nodeId}', 'headers')">
                    + Add Header
                </button>
            </div>
        `;
    }

    getBodyConfiguration(nodeId) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const body = nodeConfig.config.body || '';

        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">📝</span>
                    Request Body (JSON)
                </div>

                <div class="template-buttons">
                    <button class="template-btn" onclick="this.getRootNode().workflowBuilder.applyBodyTemplate('${nodeId}', 'object')">
                        { "key": "value" }
                    </button>
                    <button class="template-btn" onclick="this.getRootNode().workflowBuilder.applyBodyTemplate('${nodeId}', 'array')">
                        [ { "item": 1 } ]
                    </button>
                </div>

                <label for="request-body-${nodeId}" class="config-label">JSON Payload</label>
                <textarea id="request-body-${nodeId}" class="config-textarea"
                          placeholder='{"key": "value"}'
                          onInput="this.getRootNode().workflowBuilder.updateNodeConfig('${nodeId}', 'body', this.value)">${this.escapeHtml(body)}</textarea>
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

        console.log('✅ Added param:', { nodeId, paramType, key, value });

        this.workflow.nodeManager.updateNodeStatus(nodeId);
        this.workflow.state.configUpdateCounter++;
    }

    removeParam(nodeId, paramType, index) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig.config[paramType] && nodeConfig.config[paramType].length > index) {
            nodeConfig.config[paramType].splice(index, 1);
            console.log('🗑️ Removed param:', { nodeId, paramType, index });
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
        console.log('🔄 Updating auth type to:', authType);

        this.workflow.updateNodeConfig(nodeId, 'authType', authType);

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig) {
            const fieldsToClear = ['username', 'password', 'token', 'apiKey', 'keyLocation'];
            fieldsToClear.forEach(field => {
                if (nodeConfig.config[field]) {
                    delete nodeConfig.config[field];
                }
            });
        }

        // Force template update to show/hide auth fields
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

registry.category("actions").add("workflow_builder", WorkflowBuilder);