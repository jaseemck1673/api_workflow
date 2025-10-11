/** @odoo-module **/
import { Component, useState, onMounted, useRef, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { NodeManager } from "./node_manager";
import { ConnectionManager } from "./connection_manager";
import { WorkflowIO } from "./workflow_io";
import { NodeTemplates } from "./node_templates";
import { FormManager } from "./form_manager";


class WorkflowBuilder extends Component {
    setup() {
        console.log('🚀 WorkflowBuilder setup called');
        console.log('📦 Props received:', this.props);
        this.orm = useService("orm");
        this.notification = useService("notification");

        this.canvasRef = useRef("canvas");
        this.configPanelRef = useRef("config-panel");
        this.state = useState({
            workflowNodes: [],
            nodeIdCounter: 0,
            nodeConfigs: {},
            selectedNode: null,
            showInstructions: true,
            connections: [],
            tempConnection: null,
            configUpdateCounter: 0,

            workflowId: this.props?.action?.params?.workflow_id || null,
            workflowName: this.props?.action?.params?.workflow_name || null,
        });

        // Initialize managers
        this.nodeManager = new NodeManager(this);
        this.connectionManager = new ConnectionManager(this);
        this.workflowIO = new WorkflowIO(this);
        this.nodeTemplates = new NodeTemplates(this);
        this.formManager = new FormManager(this);

        onMounted(() => {
            this.setupDragAndDrop();
            this.connectionManager.setupConnections();
            this.setupConfigPanelEvents();

            this.loadWorkflowFromParams();
        });

        // Load workflow data when component starts
        onWillStart(() => {
            console.log('🔧 onWillStart - checking for workflow data');
            this.loadWorkflowFromParams();
        });
    }

    loadWorkflowFromParams() {
        console.log('🔍 Checking for workflow data in props...');
        console.log('📦 Full props object:', this.props);

        const params = this.props?.action?.params;

        if (params && params.workflow_data) {
            console.log("📥 Loading saved workflow from backend params:", this.props.workflow_data);

            // Validate the workflow data structure
            if (this.isValidWorkflowData(params.workflow_data)) {
                this.workflowIO.importWorkflowData(params.workflow_data);
                this.state.showInstructions = false;
                console.log('✅ Workflow data loaded successfully');
            } else {
                console.warn('⚠️ Invalid workflow data structure');
                this.notification.add("Invalid workflow data format", { type: 'warning' });
            }
        } else {
            console.log("ℹ️ No workflow data passed from backend");
            console.log("Available props keys:", Object.keys(this.props || {}));
        }
    }

    isValidWorkflowData(data) {
        return data && typeof data === 'object' && Array.isArray(data.nodes);
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

    setupConfigPanelEvents() {
        this.setupConfigEventHandlers();
    }
// update
    setupConfigEventHandlers() {
        console.log('🔧 Setting up config panel event handlers...');

        // Small delay to ensure DOM is updated
        setTimeout(() => {
            const configPanel = this.configPanelRef.el;
            if (!configPanel) {
                console.warn('⚠️ Config panel not available, retrying...');
                setTimeout(() => this.setupConfigEventHandlers(), 100);
                return;
            }

            // Remove existing event listeners by cloning
            const oldConfigPanel = configPanel.cloneNode(false);
            oldConfigPanel.innerHTML = configPanel.innerHTML;
            configPanel.parentNode.replaceChild(oldConfigPanel, configPanel);
            this.configPanelRef.el = oldConfigPanel;

            // Add event listeners
            this.setupInputHandlers(oldConfigPanel);
            this.setupButtonHandlers(oldConfigPanel);
            this.setupSelectHandlers(oldConfigPanel);
            this.refreshConfigPanelFields();
            console.log('✅ Config panel event handlers setup complete');

            // Update any selected node's form fields
            if (this.state.selectedNode) {
                this.refreshSelectedNodeForm();
            }
        }, 50);
    }

    refreshSelectedNodeForm() {
        const nodeId = this.state.selectedNode;
        if (!nodeId || !this.state.nodeConfigs[nodeId]) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        console.log('🔄 Refreshing form for node:', nodeId, nodeConfig);

        // Force reactivity update
        this.state.configUpdateCounter++;
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

        // Update config panel events when node selection changes
        setTimeout(() => {
            this.setupConfigEventHandlers();
            this.refreshConfigPanelFields();

            if (this.state.nodeConfigs[nodeId] && this.state.nodeConfigs[nodeId].config) {
                this.state.configUpdateCounter++;
        }
        }, 100);

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

        this.nodeManager.updateNodeStatus(nodeId);
        this.workflow.state.configUpdateCounter++;
    }
    // Add the missing methods that are called from templates
   updateAuthType(nodeId, authType) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig) return;

        console.log('🔄 Updating auth type for node:', nodeId, 'to:', authType);

        // Update the authType
        nodeConfig.config.authType = authType;

        // Reset all auth fields
        const authFields = ['username', 'password', 'token', 'apiKey', 'keyLocation',  'keyName', 'headerPrefix'];
        authFields.forEach(field => {
            if (nodeConfig.config[field] !== undefined) {
                // Set default values for API key fields
                if (field === 'keyName' && authType === 'api-key') {
                    nodeConfig.config[field] = 'X-API-Key';
                } else if (field === 'keyLocation' && authType === 'api-key') {
                    nodeConfig.config[field] = 'header';
                } else if (field === 'headerPrefix' && authType === 'api-key') {
                    nodeConfig.config[field] = '';
                } else {
                    nodeConfig.config[field] = '';
                }
            }
        });

        // Force reactivity update - DO NOT call updateState() as it doesn't exist
        this.state.configUpdateCounter++;

        console.log('✅ Auth type updated successfully');
    }

    removeParam(nodeId, paramType, index) {
        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig.config[paramType] && nodeConfig.config[paramType].length > index) {
            nodeConfig.config[paramType].splice(index, 1);
            console.log('🗑️ Removed param:', { nodeId, paramType, index });
            this.nodeManager.updateNodeStatus(nodeId);
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

//    updateAuthType(nodeId, authType) {
//        console.log('🔄 Updating auth type to:', authType);
//
//        this.workflow.updateNodeConfig(nodeId, 'authType', authType);
//
//        const nodeConfig = this.state.nodeConfigs[nodeId];
//        if (nodeConfig) {
//            const fieldsToClear = ['username', 'password', 'token', 'apiKey', 'keyLocation'];
//            fieldsToClear.forEach(field => {
//                if (nodeConfig.config[field]) {
//                    delete nodeConfig.config[field];
//                }
//            });
//        }
//
//        // Force template update to show/hide auth fields
//        this.workflow.state.configUpdateCounter++;
//    }

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


    get selectedNodeConfig() {
        return this.state.selectedNode ? this.state.nodeConfigs[this.state.selectedNode] : null;
    }

    // Debug method to check all node configs
    debugNodeConfigs() {
        console.log('🐛 All Node Configs:', this.state.nodeConfigs);
        return this.state.nodeConfigs;
    }

    // Add these methods to the WorkflowBuilder class

    updateBodyType(bodyType) {
        const nodeId = this.state.selectedNode;
        if (nodeId) {
            this.formManager.updateBodyType(bodyType);
        }

        console.log('🔄 Updating body type to:', bodyType);

        // Update body type
        this.updateNodeConfig('bodyType', bodyType);

        const nodeConfig = this.state.nodeConfigs[nodeId];

        // Initialize formFields if switching to form mode
        if (bodyType === 'form' && (!nodeConfig.config.formFields || !Array.isArray(nodeConfig.config.formFields))) {
            this.updateNodeConfig('formFields', []);
        }

        // Convert existing JSON to form fields if available and switching to form mode
        if (bodyType === 'form' && nodeConfig.config.body) {
            this.convertJsonToForm();
        }
    }

    addFormField() {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig.config.formFields) {
            nodeConfig.config.formFields = [];
        }

        // Add new empty field
        nodeConfig.config.formFields.push({
            key: '',
            value: ''
        });

        console.log('➕ Added form field. Total fields:', nodeConfig.config.formFields.length);
        this.state.configUpdateCounter++;
    }

    updateFormField(index, fieldType, value) {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig.config.formFields && nodeConfig.config.formFields[index]) {
            nodeConfig.config.formFields[index][fieldType] = value;
            console.log('✏️ Updated form field:', { index, fieldType, value });
            this.state.configUpdateCounter++;
        }
    }

    removeFormField(index) {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig.config.formFields && nodeConfig.config.formFields.length > index) {
            nodeConfig.config.formFields.splice(index, 1);
            console.log('🗑️ Removed form field at index:', index);
            this.state.configUpdateCounter++;
        }
    }

    convertFormToJson() {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig.config.formFields) return;

        // Generate JSON from form fields
        const jsonObject = {};
        nodeConfig.config.formFields.forEach(field => {
            if (field.key && field.key.trim() !== '') {
                // Try to parse value as JSON, otherwise use as string
                try {
                    jsonObject[field.key] = JSON.parse(field.value);
                } catch (e) {
                    jsonObject[field.key] = field.value;
                }
            }
        });

        const jsonString = JSON.stringify(jsonObject, null, 2);
        this.updateNodeConfig('body', jsonString);
        this.updateNodeConfig('bodyType', 'json');

        console.log('📄 Converted form to JSON:', jsonString);
        this.notification.add("Form data converted to JSON!", { type: 'success' });
    }

    convertJsonToForm() {
        const nodeId = this.state.selectedNode;
        if (!nodeId) return;

        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig.config.body) return;

        try {
            const jsonObject = JSON.parse(nodeConfig.config.body);
            const formFields = [];

            // Convert JSON object to form fields
            Object.entries(jsonObject).forEach(([key, value]) => {
                formFields.push({
                    key: key,
                    value: typeof value === 'object' ? JSON.stringify(value) : String(value)
                });
            });

            this.updateNodeConfig('formFields', formFields);
            console.log('📋 Converted JSON to form fields:', formFields);
            this.notification.add("JSON converted to form data!", { type: 'success' });
        } catch (error) {
            console.error('❌ Error parsing JSON:', error);
            this.notification.add("Invalid JSON format", { type: 'danger' });
        }
    }

    generateJsonFromForm(formFields) {
        if (!formFields || !Array.isArray(formFields)) {
            return '{}';
        }

        const jsonObject = {};
        formFields.forEach(field => {
            if (field.key && field.key.trim() !== '') {
                // Try to parse value as JSON, otherwise use as string
                try {
                    jsonObject[field.key] = JSON.parse(field.value);
                } catch (e) {
                    jsonObject[field.key] = field.value;
                }
            }
        });

        return JSON.stringify(jsonObject, null, 2);
    }

    //update
    /**
 * Refresh all input fields in the config panel with current node values
 */
    refreshConfigPanelFields() {
        console.log('🔄 Refreshing config panel fields...');

        const configPanel = this.configPanelRef.el;
        if (!configPanel) {
            console.warn('⚠️ Config panel not available');
            return;
        }

        // Update all input fields with current values
        this.updateInputFields(configPanel);
        this.updateSelectFields(configPanel);
        this.updateTextareaFields(configPanel);

        console.log('✅ Config panel fields refreshed');
    }

    /**
     * Update input fields with current node configuration
     */
    updateInputFields(container) {
        const inputs = container.querySelectorAll('input[type="text"], input[type="number"], input[type="password"]');
        inputs.forEach(input => {
            const key = input.dataset.configKey;
            if (!key) return;

            const nodeId = this.state.selectedNode;
            if (nodeId && this.state.nodeConfigs[nodeId]) {
                const value = this.state.nodeConfigs[nodeId].config[key];
                if (value !== undefined && value !== null) {
                    input.value = value;
                    console.log(`📝 Set input ${key} to:`, value);
                }
            }
        });
    }

    /**
     * Update select fields with current node configuration
     */
    updateSelectFields(container) {
        const selects = container.querySelectorAll('select');
        selects.forEach(select => {
            const key = select.dataset.configKey;
            if (!key) return;

            const nodeId = this.state.selectedNode;
            if (nodeId && this.state.nodeConfigs[nodeId]) {
                const value = this.state.nodeConfigs[nodeId].config[key];
                if (value !== undefined && value !== null) {
                    select.value = value;
                    console.log(`🔽 Set select ${key} to:`, value);
                }
            }
        });
    }

    /**
     * Update textarea fields with current node configuration
     */
    updateTextareaFields(container) {
        const textareas = container.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            const key = textarea.dataset.configKey;
            if (!key) return;

            const nodeId = this.state.selectedNode;
            if (nodeId && this.state.nodeConfigs[nodeId]) {
                const value = this.state.nodeConfigs[nodeId].config[key];
                if (value !== undefined && value !== null) {
                    textarea.value = value;
                    console.log(`📄 Set textarea ${key} to:`, value);
                }
            }
        });
    }

    // Delegate methods to managers
     updateBodyType(bodyType) { this.formManager.updateBodyType(bodyType); }
    addFormField() { this.formManager.addFormField(); }
    updateFormField(index, fieldType, value) { this.formManager.updateFormField(index, fieldType, value); }
    removeFormField(index) { this.formManager.removeFormField(index); }
    clearAllFormFields() { this.formManager.clearAllFormFields(); }
    convertFormToJson() { this.formManager.convertFormToJson(); }
    convertJsonToForm() { this.formManager.convertJsonToForm(); }
    generateJsonFromForm(formFields) { return this.formManager.generateJsonFromForm(formFields); }

    //========================
    clearCanvas() { return this.nodeManager.clearCanvas(); }
    testWorkflow() { return this.workflowIO.testWorkflow(); }
    exportWorkflow() { return this.workflowIO.exportWorkflow(); }
    saveWorkflow() { return this.workflowIO.saveWorkflow(); }
    importWorkflow(event) { return this.workflowIO.importWorkflow(event); }
    getConfigurationTemplate(nodeId) { return this.nodeTemplates.getConfigurationTemplate(nodeId); }
}

WorkflowBuilder.template = "api_workflow_builder.WorkflowBuilder";
registry.category("actions").add("workflow_builder", WorkflowBuilder);
export default WorkflowBuilder;
