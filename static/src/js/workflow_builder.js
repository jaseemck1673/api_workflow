/** @odoo-module **/

import { Component, useState, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

class WorkflowBuilder extends Component {
    setup() {
        this.orm = useService("orm");
        this.notification = useService("notification");

        this.canvasRef = useRef("canvas");
        this.state = useState({
            workflowNodes: [],
            nodeIdCounter: 0,
            nodeConfigs: {},
            selectedNode: null,
            showInstructions: true,
            connections: [],
            tempConnection: null,
            nodeConfigs: {},
            selectedNode: null,
            configUpdateCounter: 0,
        });

        onMounted(() => {
            this.setupDragAndDrop();
            this.setupConnections();
        });
    }
    // =========== oct 6 =================
    getNodeTemplate(type) {
        console.log('getNodeTemplate()')
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

    getConfigurationTemplate(nodeId) {
        console.log('getConfigurationTemplate')
        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (!nodeConfig) return '';

        const type = nodeConfig.type;
        let html = '';

        // Common configuration templates from script.js
        const apiFields = `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">🌐</span>
                    Endpoint Details
                </div>
                <label for="url-${nodeId}" class="config-label">API URL Path</label>
                <input type="text" id="url-${nodeId}" class="config-input"
                       placeholder="/api/users"
                       t-on-input="(ev) => this.updateNodeConfig('${nodeId}', 'url', ev.target.value)">
            </div>
        `;

        const authFields = `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">🔐</span>
                    Authentication Configuration
                </div>
                <label for="auth-type-${nodeId}" class="config-label">Auth Type</label>
                <select id="auth-type-${nodeId}" class="config-select"
                        t-on-change="(ev) => this.updateAuthType('${nodeId}', ev.target.value)">
                    <option value="none">None</option>
                    <option value="basic">Basic Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="api-key">API Key</option>
                </select>
                <div id="auth-fields-${nodeId}" class="auth-fields"></div>
            </div>
        `;

        // Add similar templates for other node types as in script.js
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

    // Individual configuration methods
    getStartConfiguration(nodeId) {
        console.log('getStartConfiguration()')
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

    getHttpMethodConfiguration(nodeId, method) {
        console.log('getHttpMethodConfiguration()')
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
                       placeholder="/api/users"
                       t-on-input="(ev) => this.updateNodeConfig('${nodeId}', 'url', ev.target.value)">

                <label for="timeout-${nodeId}" class="config-label">Timeout (ms)</label>
                <input type="number" id="timeout-${nodeId}" class="config-input"
                       placeholder="10000"
                       t-on-input="(ev) => this.updateNodeConfig('${nodeId}', 'timeout', parseInt(ev.target.value))">

                ${(method === 'post' || method === 'put') ? this.getBodyConfiguration(nodeId) : ''}

                <button class="test-button" t-on-click="() => this.runApiTest('${nodeId}')">
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
        console.log('getEndpointConfiguration()')
        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">🌐</span>
                    Base API Setup
                </div>
                <label for="base-url-${nodeId}" class="config-label">Base API URL</label>
                <input type="text" id="base-url-${nodeId}" class="config-input"
                       placeholder="https://api.example.com"
                       t-on-input="(ev) => this.updateNodeConfig('${nodeId}', 'baseUrl', ev.target.value)">
            </div>
            ${this.getAuthConfiguration(nodeId)}
        `;
    }

    // Add parameter management methods
    addParam(nodeId, paramType, key, value) {
    console.log('addParam()')
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

        this.updateNodeStatus(nodeId);
    }

    removeParam(nodeId, paramType, index) {
        console.log('removeParam')
        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig.config[paramType] && nodeConfig.config[paramType].length > index) {
            nodeConfig.config[paramType].splice(index, 1);
            this.updateNodeStatus(nodeId);
        }
    }

    getParamsConfiguration(nodeId) {
        console.log('getParamsConfiguration')
        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">❓</span>
                    Query Parameters
                </div>

                <div class="param-builder">
                    <t t-foreach="this.getNodeParams(nodeId)" t-as="param" t-key="param_index">
                        <div class="param-item">
                            <span>{ param.key }: { param.value }</span>
                            <button class="remove-btn"
                                    t-on-click="() => this.removeParam('${nodeId}', 'params', param_index)">
                                ×
                            </button>
                        </div>
                    </t>
                </div>

                <label for="param-key-${nodeId}" class="config-label">Parameter Key</label>
                <input type="text" id="param-key-${nodeId}" class="config-input" placeholder="key_name">

                <label for="param-value-${nodeId}" class="config-label">Parameter Value</label>
                <input type="text" id="param-value-${nodeId}" class="config-input" placeholder="value_content">

                <button class="add-btn"
                        t-on-click="() => this.addParamFromInputs('${nodeId}', 'params')">
                    + Add Parameter
                </button>
            </div>
        `;
    }

    addParamFromInputs(nodeId, paramType) {
        console.log('addParamFromInputs')
        const keyInput = document.getElementById(`${paramType}-key-${nodeId}`);
        const valueInput = document.getElementById(`${paramType}-value-${nodeId}`);

       if (keyInput && valueInput && keyInput.value && valueInput.value) {
            if (!this.state.nodeConfigs[nodeId].config[paramType]) {
                this.state.nodeConfigs[nodeId].config[paramType] = [];
            }

            this.state.nodeConfigs[nodeId].config[paramType].push({
                key: keyInput.value.trim(),
                value: valueInput.value.trim()
            });

            keyInput.value = '';
            valueInput.value = '';
            this.updateNodeStatus(nodeId);
        } else {
            this.notification.add("Key and Value cannot be empty", { type: 'warning' });
        }
    }

    // Authentication management
    updateAuthType(nodeId, authType) {
        if (this.state.nodeConfigs[nodeId]) {
            this.state.nodeConfigs[nodeId].config.authType = authType;

            // Clear dependent fields when auth type changes
            const fieldsToClear = ['username', 'password', 'token', 'apiKey', 'keyLocation'];
            fieldsToClear.forEach(field => {
                if (this.state.nodeConfigs[nodeId].config[field]) {
                    delete this.state.nodeConfigs[nodeId].config[field];
                }
            });

            this.updateNodeStatus(nodeId);
            // Force template update to show/hide auth fields
            this.state.configUpdateCounter++;
        }
    }

    updateAuthFields(nodeId, authType) {
        console.log('updateAuthFields')
        // This would update the dynamic auth fields in the UI
        const nodeConfig = this.state.nodeConfigs[nodeId];

        switch (authType) {
            case 'basic':
                // Add username/password fields
                break;
            case 'bearer':
                // Add token field
                break;
            case 'api-key':
                // Add API key and location fields
                break;
            case 'none':
                // Clear auth fields
                break;
        }
    }

    getAuthConfiguration(nodeId) {
        console.log('getAuthConfiguration')
        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">🔐</span>
                    Authentication
                </div>

                <label for="auth-type-${nodeId}" class="config-label">Auth Type</label>
                <select id="auth-type-${nodeId}" class="config-select"
                        t-on-change="(ev) => this.updateAuthType('${nodeId}', ev.target.value)">
                    <option value="none">None</option>
                    <option value="basic">Basic Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="api-key">API Key</option>
                </select>

                <div class="auth-fields">
                    <t t-if="this.state.nodeConfigs[nodeId]?.config?.authType === 'basic'">
                        <label for="username-${nodeId}" class="config-label">Username</label>
                        <input type="text" id="username-${nodeId}" class="config-input"
                               t-on-input="(ev) => this.updateNodeConfig('${nodeId}', 'username', ev.target.value)">

                        <label for="password-${nodeId}" class="config-label">Password</label>
                        <input type="password" id="password-${nodeId}" class="config-input"
                               t-on-input="(ev) => this.updateNodeConfig('${nodeId}', 'password', ev.target.value)">
                    </t>

                    <t t-if="this.state.nodeConfigs[nodeId]?.config?.authType === 'bearer'">
                        <label for="token-${nodeId}" class="config-label">Bearer Token</label>
                        <input type="text" id="token-${nodeId}" class="config-input"
                               t-on-input="(ev) => this.updateNodeConfig('${nodeId}', 'token', ev.target.value)">
                    </t>

                    <t t-if="this.state.nodeConfigs[nodeId]?.config?.authType === 'api-key'">
                        <label for="api-key-${nodeId}" class="config-label">API Key</label>
                        <input type="text" id="api-key-${nodeId}" class="config-input"
                               t-on-input="(ev) => this.updateNodeConfig('${nodeId}', 'apiKey', ev.target.value)">

                        <label for="key-location-${nodeId}" class="config-label">Key Location</label>
                        <select id="key-location-${nodeId}" class="config-select"
                                t-on-change="(ev) => this.updateNodeConfig('${nodeId}', 'keyLocation', ev.target.value)">
                            <option value="header">Header</option>
                            <option value="query">Query Parameter</option>
                        </select>
                    </t>
                </div>
            </div>
        `;
    }

    getBodyConfiguration(nodeId) {
        console.log('getBodyConfiguration')
        return `
            <div class="config-section">
                <div class="section-title">
                    <span class="section-icon">📝</span>
                    Request Body (JSON)
                </div>

                <div class="template-buttons">
                    <button class="template-btn"
                            t-on-click="() => this.applyBodyTemplate('${nodeId}', 'object')">
                        { "key": "value" }
                    </button>
                    <button class="template-btn"
                            t-on-click="() => this.applyBodyTemplate('${nodeId}', 'array')">
                        [ { "item": 1 } ]
                    </button>
                </div>

                <label for="request-body-${nodeId}" class="config-label">JSON Payload</label>
                <textarea id="request-body-${nodeId}" class="config-textarea"
                          t-on-input="(ev) => this.updateNodeConfig('${nodeId}', 'body', ev.target.value)"
                          placeholder='{"key": "value"}'></textarea>
            </div>
        `;
    }

    applyBodyTemplate(nodeId, type) {
        console.log('applyBodyTemplate')
        const textarea = document.getElementById(`request-body-${nodeId}`);
        let template = '';

        if (type === 'object') {
            template = '{\n  "name": "New Item",\n  "status": "pending"\n}';
        } else if (type === 'array') {
            template = '[\n  {\n    "id": 1,\n    "value": "initial"\n  }\n]';
        }

        if (textarea) {
            textarea.value = template;
            this.updateNodeConfig(nodeId, 'body', template);
        }
    }

    async runApiTest(nodeId) {
        console.log('runApiTest')
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const responseArea = document.getElementById(`response-area-${nodeId}`);
        const testButton = document.getElementById(`test-btn-${nodeId}`);

        if (!responseArea || !testButton) return;

        // Similar API test logic as in script.js
        try {
            testButton.disabled = true;
            testButton.textContent = 'Running...';
            responseArea.textContent = 'Request Sent. Waiting for Response...';

            // Build request from workflow configuration
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
        } finally {
            testButton.disabled = false;
            testButton.textContent = '⚡ Run API Test';
        }
    }

    buildRequestFromWorkflow(nodeId) {
        console.log('buildRequestFromWorkflow')
        // Build complete request from connected nodes
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const baseNode = Object.values(this.state.nodeConfigs).find(n => n.type === 'endpoint');
        const authNode = Object.values(this.state.nodeConfigs).find(n => n.type === 'auth');

        // Combine configurations from all relevant nodes
        return {
            url: this.buildFullUrl(nodeConfig, baseNode),
            method: nodeConfig.type.toUpperCase(),
            headers: this.buildHeaders(authNode),
            body: nodeConfig.config.body
        };
    }

    updateNodeStatus(nodeId) {
        console.log('updateNodeStatus')
        const nodeConfig = this.state.nodeConfigs[nodeId];
        const element = document.getElementById(nodeId);
        const statusDiv = element ? element.querySelector('.node-status') : null;

        if (!element || !statusDiv) return;

        let isConfigured = false;
        let statusText = 'Click to configure';

        switch (nodeConfig.type) {
            case 'start':
            case 'end':
                isConfigured = true;
                statusText = nodeConfig.type === 'start' ? 'Ready' : 'End Point';
                break;
            case 'endpoint':
                isConfigured = nodeConfig.config.baseUrl && nodeConfig.config.baseUrl.length > 0;
                statusText = isConfigured ? 'Base URL Set' : 'Missing Base URL';
                break;
            case 'auth':
                isConfigured = nodeConfig.config.authType && nodeConfig.config.authType !== 'none';
                if (nodeConfig.config.authType === 'basic') {
                    isConfigured = nodeConfig.config.username && nodeConfig.config.password;
                } else if (nodeConfig.config.authType === 'bearer') {
                    isConfigured = !!nodeConfig.config.token;
                } else if (nodeConfig.config.authType === 'api-key') {
                    isConfigured = !!nodeConfig.config.apiKey;
                }
                statusText = isConfigured ? 'Auth Configured' : 'Missing Auth Detail';
                break;
            case 'get':
            case 'put':
            case 'post':
            case 'delete':
                isConfigured = nodeConfig.config.url && nodeConfig.config.url.length > 0;
                if ((nodeConfig.type === 'post' || nodeConfig.type === 'put') && !nodeConfig.config.body) {
                    isConfigured = false;
                }
                statusText = isConfigured ? 'Ready to Run' : 'Missing URL/Body';
                break;
            case 'params':
                isConfigured = nodeConfig.config.params && nodeConfig.config.params.length > 0;
                statusText = isConfigured ? `${nodeConfig.config.params.length} Set` : 'No items set';
                break;
            case 'headers':
                isConfigured = nodeConfig.config.headers && nodeConfig.config.headers.length > 0;
                statusText = isConfigured ? `${nodeConfig.config.headers.length} Set` : 'No items set';
                break;
            case 'body':
                isConfigured = nodeConfig.config.body && nodeConfig.config.body.trim().length > 0;
                statusText = isConfigured ? 'Body Set' : 'Empty Body';
                break;
        }

        statusDiv.textContent = statusText;
        element.classList.toggle('node-configured', isConfigured);
        element.classList.toggle('node-error', !isConfigured && nodeConfig.type !== 'start' && nodeConfig.type !== 'end');
    }

    updateAuthType(nodeId, authType) {
        console.log('updateAuthType')
        this.updateNodeConfig('authType', authType);

        // Clear dependent fields when auth type changes
        const nodeConfig = this.state.nodeConfigs[nodeId];
        if (nodeConfig) {
            const fieldsToClear = ['username', 'password', 'token', 'apiKey', 'keyLocation'];
            fieldsToClear.forEach(field => {
                if (nodeConfig.config[field]) {
                    delete nodeConfig.config[field];
                }
            });
        }
    }
    // ===============previous functions ===========
    setupDragAndDrop() {
        const templates = document.querySelectorAll('.node-template');
        templates.forEach(template => {
            template.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.dataset.type);
            });
        });
    }

    onDragOver(ev) {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'copy';
    }

    onDragLeave(ev) {
        // Basic implementation
    }

    onDrop(ev) {
        ev.preventDefault();
        const nodeType = ev.dataTransfer.getData('text/plain');
        console.log('Dropped:', nodeType);
        if (!nodeType) return;

        const canvas = this.canvasRef.el;
        const rect = canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left - 80;
        const y = ev.clientY - rect.top - 40;

        this.createWorkflowNode(nodeType, x, y);
        this.state.showInstructions = false;
    }

    createWorkflowNode(type, x, y) {
        console.log('createWorkflowNode')
        const nodeId = `node-${++this.state.nodeIdCounter}`;

        const nodeElement = document.createElement('div');
        nodeElement.className = 'workflow-node';
        nodeElement.id = nodeId;
        nodeElement.style.left = `${x}px`;
        nodeElement.style.top = `${y}px`;
        nodeElement.dataset.type = type;

        nodeElement.innerHTML = `
            <button class="delete-node" title="Delete node">×</button>
            <div class="connection-point input"></div>
            <div class="connection-point output"></div>
            <div class="node-header">
                <div class="node-icon">${this.getNodeIcon(type)}</div>
                <div class="node-title">${this.getNodeTitle(type)}</div>
            </div>
            <div class="node-status">Click to configure</div>
        `;

        this.canvasRef.el.appendChild(nodeElement);
        this.makeNodeDraggable(nodeElement);
        this.attachNodeEvents(nodeElement, nodeId);

        // Store node configuration
        this.state.nodeConfigs[nodeId] = {
            id: nodeId,
            type: type,
            x: x,
            y: y,
            config: this.getDefaultConfig(type)
        };
        this.state.workflowNodes.push(nodeId);
        this.updateNodeStatus(nodeId);
    }

     getDefaultConfig(type) {
        console.log('getDefaultConfig')
        const defaults = {
            endpoint: { baseUrl: '', authType: 'none', url: '' },
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

   makeNodeDraggable(node) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

        const dragMouseDown = (e) => {
        if (e.target.classList.contains('connection-point') ||
            e.target.classList.contains('delete-node')) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        isDragging = true;

        // Get initial mouse position
        startX = e.clientX;
        startY = e.clientY;

        // Get initial node position
        const rect = node.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        node.classList.add('dragging');
        document.addEventListener('mousemove', elementDrag);
        document.addEventListener('mouseup', closeDragElement);

        // Prevent text selection while dragging
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
    };

        const elementDrag = (e) => {
        if (!isDragging) return;

        e.preventDefault();

        // Calculate exact movement based on mouse delta
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Apply exact mouse movement to node position
        const newX = initialX + deltaX;
        const newY = initialY + deltaY;

        node.style.left = `${newX}px`;
        node.style.top = `${newY}px`;

        // Update connections in real-time with high frequency
        requestAnimationFrame(() => {
            this.updateConnections();
        });
    };

        const closeDragElement = () => {
        if (!isDragging) return;

        isDragging = false;
        node.classList.remove('dragging');
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', closeDragElement);

        // Restore text selection and cursor
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        // Update node position in state
        if (this.state.nodeConfigs[node.id]) {
            this.state.nodeConfigs[node.id].x = parseInt(node.style.left);
            this.state.nodeConfigs[node.id].y = parseInt(node.style.top);
        }
    };

        node.addEventListener('mousedown', dragMouseDown);

    // Add touch support for mobile devices
        node.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('connection-point') ||
            e.target.classList.contains('delete-node')) {
            return;
        }

        e.preventDefault();
        isDragging = true;

        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;

        const rect = node.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;

        node.classList.add('dragging');
        document.addEventListener('touchmove', touchDrag);
        document.addEventListener('touchend', closeDragElement);
    });

        const touchDrag = (e) => {
        if (!isDragging) return;

        e.preventDefault();
        const touch = e.touches[0];

        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;

        const newX = initialX + deltaX;
        const newY = initialY + deltaY;

        node.style.left = `${newX}px`;
        node.style.top = `${newY}px`;

        requestAnimationFrame(() => {
            this.updateConnections();
        });
    };
    }


    attachNodeEvents(nodeElement, nodeId) {
        nodeElement.addEventListener('click', (e) => {
            if (e.target.classList.contains('connection-point') ||
                e.target.classList.contains('delete-node')) {
                return;
            }
            e.stopPropagation();
            this.selectNode(nodeId);
        });

        // Delete node event
        const deleteBtn = nodeElement.querySelector('.delete-node');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNode(nodeId);
        });

        // Connection points events
        const inputPoint = nodeElement.querySelector('.connection-point.input');
        const outputPoint = nodeElement.querySelector('.connection-point.output');

        inputPoint.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startConnection(nodeId, false);
        });

        outputPoint.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startConnection(nodeId, true);
        });
    }

    deleteNode(nodeId) {
        const nodeElement = document.getElementById(nodeId);
        if (nodeElement) {
            nodeElement.remove();
        }

        // Remove from state
        this.state.workflowNodes = this.state.workflowNodes.filter(id => id !== nodeId);
        delete this.state.nodeConfigs[nodeId];

        // Remove connections
        this.state.connections = this.state.connections.filter(conn =>
            conn.source !== nodeId && conn.target !== nodeId
        );

        if (this.state.selectedNode === nodeId) {
            this.state.selectedNode = null;
        }

        this.updateConnections();
    }

    selectNode(nodeId) {
        console.log('selectNode')
        document.querySelectorAll('.workflow-node').forEach(node =>
            node.classList.remove('selected')
        );

        const nodeElement = document.getElementById(nodeId);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }
        this.state.selectedNode = nodeId;
    }

    clearCanvas() {
        console.log('clearCanvas')
        if (!confirm("Clear the entire canvas?")) return;

        const canvas = this.canvasRef.el;
        Array.from(canvas.querySelectorAll('.workflow-node')).forEach(n => n.remove());

        this.state.workflowNodes = [];
        this.state.nodeConfigs = {};
        this.state.nodeIdCounter = 0;
        this.state.selectedNode = null;
        this.state.showInstructions = true;
        this.state.connections = [];
        this.updateConnections();
    }

    setupConnections() {
        this.connectionSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.connectionSvg.setAttribute("class", "connections-layer");
        this.connectionSvg.style.position = "absolute";
        this.connectionSvg.style.top = "0";
        this.connectionSvg.style.left = "0";
        this.connectionSvg.style.width = "100%";
        this.connectionSvg.style.height = "100%";
        this.connectionSvg.style.pointerEvents = "none";
        this.connectionSvg.style.zIndex = "5";

        this.canvasRef.el.appendChild(this.connectionSvg);
    }

    startConnection(nodeId, isOutput) {
        const nodeElement = document.getElementById(nodeId);
        if (!nodeElement) return;

        this.state.tempConnection = {
            sourceNode: nodeId,
            isOutput: isOutput,
            startX: 0,
            startY: 0,
            x: 0,
            y: 0
        };

        // Calculate starting point based on connection type
        const nodeRect = nodeElement.getBoundingClientRect();
        const canvasRect = this.canvasRef.el.getBoundingClientRect();

        if (isOutput) {
            this.state.tempConnection.startX = nodeRect.right - canvasRect.left;
        } else {
            this.state.tempConnection.startX = nodeRect.left - canvasRect.left;
        }
        this.state.tempConnection.startY = nodeRect.top - canvasRect.top + nodeRect.height / 2;

        document.addEventListener('mousemove', this.drawTempConnection.bind(this));
        document.addEventListener('click', this.finishConnection.bind(this), { once: true });
    }

    drawTempConnection(ev) {
        if (!this.state.tempConnection) return;

        const canvas = this.canvasRef.el;
        const rect = canvas.getBoundingClientRect();
        this.state.tempConnection.x = ev.clientX - rect.left;
        this.state.tempConnection.y = ev.clientY - rect.top;

        this.updateConnections();
    }

    finishConnection(ev) {
        console.log('finishConnection')
        if (!this.state.tempConnection) return;

        // Find if we're connecting to another node
        const targetElement = ev.target.closest('.workflow-node');
        if (targetElement && targetElement.id !== this.state.tempConnection.sourceNode) {
            if (this.state.tempConnection.isOutput) {
                this.createConnection(this.state.tempConnection.sourceNode, targetElement.id);
            } else {
                this.createConnection(targetElement.id, this.state.tempConnection.sourceNode);
            }
        }

        document.removeEventListener('mousemove', this.drawTempConnection);
        this.state.tempConnection = null;
        this.updateConnections();
    }

    createConnection(sourceNodeId, targetNodeId) {
        const connection = {
            id: `conn-${Date.now()}`,
            source: sourceNodeId,
            target: targetNodeId
        };

        this.state.connections.push(connection);
        this.updateConnections();
    }

    updateConnections() {
        // Clear existing connections
        this.connectionSvg.innerHTML = '';

        // Draw permanent connections
        this.state.connections.forEach(conn => {
            const sourceNode = document.getElementById(conn.source);
            const targetNode = document.getElementById(conn.target);

            if (sourceNode && targetNode) {
                this.drawConnectionLine(sourceNode, targetNode, false);
            }
        });

        // Draw temporary connection
        if (this.state.tempConnection) {
            const sourceNode = document.getElementById(this.state.tempConnection.sourceNode);
            if (sourceNode) {
                this.drawConnectionLine(sourceNode, this.state.tempConnection, true);
            }
        }
    }

    drawConnectionLine(source, target, isTemp = false) {
        const sourceRect = source.getBoundingClientRect();
        const canvasRect = this.canvasRef.el.getBoundingClientRect();

        let sourceX, sourceY;

        if (isTemp) {
            // For temp connections, use stored start coordinates
            sourceX = this.state.tempConnection.startX;
            sourceY = this.state.tempConnection.startY;
        } else {
            // For permanent connections from output to input
            sourceX = sourceRect.right - canvasRect.left;
            sourceY = sourceRect.top - canvasRect.top + sourceRect.height / 2;
        }

        let targetX, targetY;

        if (isTemp && target.x !== undefined && target.y !== undefined) {
            // For temporary connections, use the stored coordinates
            targetX = target.x;
            targetY = target.y;
        } else {
            // For permanent connections, get coordinates from target node's input
            const targetRect = target.getBoundingClientRect();
            targetX = targetRect.left - canvasRect.left;
            targetY = targetRect.top - canvasRect.top + targetRect.height / 2;
        }

        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");

        // Create curved path
        const deltaX = targetX - sourceX;
        const controlX1 = sourceX + Math.abs(deltaX) * 0.5;
        const controlX2 = targetX - Math.abs(deltaX) * 0.5;

        const pathData = `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY} ${controlX2} ${targetY} ${targetX} ${targetY}`;

        // Use setAttribute for SVG elements
        line.setAttribute("d", pathData);
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", isTemp ? "#667eea" : "#28a745");
        line.setAttribute("stroke-width", isTemp ? "2" : "3");

        if (isTemp) {
            line.setAttribute("stroke-dasharray", "5,5");
        }

        this.connectionSvg.appendChild(line);
    }

    async testWorkflow() {
        if (!this.validateWorkflow()) {
            this.notification.add("Workflow validation failed!", { type: 'danger' });
            return;
        }

        try {
            this.notification.add("Testing workflow...", { type: 'info' });

            const result = await this.orm.call('api.workflow', 'test_workflow', [{
                nodes: Object.values(this.state.nodeConfigs),
                connections: this.state.connections
            }]);

            this.notification.add("Workflow test completed!", { type: 'success' });
            console.log('Test results:', result);

        } catch (error) {
            this.notification.add("Workflow test failed", { type: 'danger' });
            console.error('Test error:', error);
        }
    }

    validateWorkflow() {
        const hasStart = Object.values(this.state.nodeConfigs).some(node => node.type === 'start');
        const hasEnd = Object.values(this.state.nodeConfigs).some(node => node.type === 'end');

        if (!hasStart) {
            this.notification.add("Workflow must have a Start node", { type: 'warning' });
            return false;
        }

        if (!hasEnd) {
            this.notification.add("Workflow should have an End node", { type: 'warning' });
            return false;
        }

        return true;
    }

    exportWorkflow() {
        const workflowData = {
            nodes: Object.values(this.state.nodeConfigs),
            connections: this.state.connections,
            metadata: {
                version: "1.0",
                exportedAt: new Date().toISOString(),
                totalNodes: this.state.workflowNodes.length
            }
        };

        const dataStr = JSON.stringify(workflowData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `workflow-${Date.now()}.json`;
        link.click();

        this.notification.add("Workflow exported successfully!", { type: 'success' });
    }

    importWorkflow(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workflowData = JSON.parse(e.target.result);
                this.loadWorkflowData(workflowData);
                this.notification.add("Workflow imported successfully!", { type: 'success' });
            } catch (error) {
                this.notification.add("Invalid workflow file", { type: 'danger' });
            }
        };
        reader.readAsText(file);
    }

    loadWorkflowData(workflowData) {
        this.clearCanvas();

        workflowData.nodes.forEach(nodeData => {
            this.createWorkflowNode(nodeData.type, nodeData.x, nodeData.y);
        });

        if (workflowData.connections) {
            this.state.connections = workflowData.connections;
            this.updateConnections();
        }

        this.state.showInstructions = false;
    }

    deselectAllNodes() {
        document.querySelectorAll('.workflow-node').forEach(node =>
            node.classList.remove('selected')
        );
        this.state.selectedNode = null;
    }

    updateNodeConfig(nodeId, key, value) {
        if (this.state.nodeConfigs[nodeId]) {
            this.state.nodeConfigs[nodeId].config[key] = value;
            this.updateNodeStatus(nodeId);
        }
        if (this.state.selectedNode && this.state.nodeConfigs[this.state.selectedNode]) {
            this.state.nodeConfigs[this.state.selectedNode].config[key] = value;
            this.updateNodeStatus(this.state.selectedNode);
            this.state.configUpdateCounter++;
        }
    }

    get selectedNodeConfig() {
        return this.state.selectedNode ? this.state.nodeConfigs[this.state.selectedNode] : null;
    }
}

WorkflowBuilder.template = "api_workflow_builder.WorkflowBuilder";
registry.category("actions").add("workflow_builder", WorkflowBuilder);
export default WorkflowBuilder;