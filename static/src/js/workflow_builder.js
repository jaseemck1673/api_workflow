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

    setupDragAndDrop() {
        const templates = document.querySelectorAll('.node-template');
        templates.forEach(template => {
            template.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', e.target.dataset.type);
            });
        });
    }


    setupConfigPanelEvents() {
        this.setupConfigEventHandlers();
    }

    setupConfigEventHandlers() {
        const configPanel = this.configPanelRef.el;
        if (!configPanel) return;

        // Remove existing event listeners by cloning
        const oldConfigPanel = configPanel.cloneNode(false);
        oldConfigPanel.innerHTML = configPanel.innerHTML;
        configPanel.parentNode.replaceChild(oldConfigPanel, configPanel);
        this.configPanelRef.el = oldConfigPanel;

        // Add event listeners
        this.setupInputHandlers(oldConfigPanel);
        this.setupButtonHandlers(oldConfigPanel);
        this.setupSelectHandlers(oldConfigPanel);

        console.log('🔧 Config panel event handlers setup for node:', this.state.selectedNode);
    }

    setupInputHandlers(container) {
        const inputs = container.querySelectorAll('input[type="text"], input[type="number"], input[type="password"], textarea');
        inputs.forEach(input => {
            // Remove any existing listeners
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);

            newInput.addEventListener('input', (e) => {
                const nodeId = this.state.selectedNode;
                if (!nodeId) return;

                const key = e.target.dataset.configKey;
                if (!key) return;

                let value = e.target.value;
                if (e.target.type === 'number') {
                    value = parseInt(value) || 0;
                }

                console.log('📝 Input change:', { nodeId, key, value });
                this.updateNodeConfig(nodeId, key, value);
            });

            newInput.addEventListener('blur', (e) => {
                const nodeId = this.state.selectedNode;
                if (!nodeId) return;

                const key = e.target.dataset.configKey;
                if (!key) return;

                console.log('💾 Input blur - saving:', { nodeId, key, value: e.target.value });
                // Force save on blur as well
                this.updateNodeConfig(nodeId, key, e.target.value);
            });

            // Set initial value from node config
            const nodeId = this.state.selectedNode;
            if (nodeId && this.state.nodeConfigs[nodeId]) {
                const key = newInput.dataset.configKey;
                if (key && this.state.nodeConfigs[nodeId].config[key] !== undefined) {
                    newInput.value = this.state.nodeConfigs[nodeId].config[key];
                    console.log('🔄 Setting initial value for', key, ':', this.state.nodeConfigs[nodeId].config[key]);
                }
            }
        });
    }

    setupSelectHandlers(container) {
        const selects = container.querySelectorAll('select');
        selects.forEach(select => {
            // Remove any existing listeners
            const newSelect = select.cloneNode(true);
            select.parentNode.replaceChild(newSelect, select);

            newSelect.addEventListener('change', (e) => {
                const nodeId = this.state.selectedNode;
                if (!nodeId) return;

                const key = e.target.dataset.configKey;
                if (!key) return;

                console.log('🔽 Select change:', { nodeId, key, value: e.target.value });
                this.updateNodeConfig(nodeId, key, e.target.value);
            });

            // Set initial value from node config
            const nodeId = this.state.selectedNode;
            if (nodeId && this.state.nodeConfigs[nodeId]) {
                const key = newSelect.dataset.configKey;
                if (key && this.state.nodeConfigs[nodeId].config[key] !== undefined) {
                    newSelect.value = this.state.nodeConfigs[nodeId].config[key];
                    console.log('🔄 Setting initial select value for', key, ':', this.state.nodeConfigs[nodeId].config[key]);
                }
            }
        });
    }

    setupButtonHandlers(container) {
        // Auth type change
        const authSelects = container.querySelectorAll('select[data-config-key="authType"]');
        authSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                const nodeId = this.state.selectedNode;
                if (!nodeId) return;
                console.log('🔐 Auth type change:', e.target.value);
                this.updateAuthType(nodeId, e.target.value);
            });
        });

        // Add parameter buttons
        const addParamButtons = container.querySelectorAll('button[data-action="addParam"]');
        addParamButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const nodeId = this.state.selectedNode;
                if (!nodeId) return;
                console.log('➕ Adding parameter');
                this.addParamFromInputs(nodeId, 'params');
            });
        });

        // Add header buttons
        const addHeaderButtons = container.querySelectorAll('button[data-action="addHeader"]');
        addHeaderButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const nodeId = this.state.selectedNode;
                if (!nodeId) return;
                console.log('➕ Adding header');
                this.addParamFromInputs(nodeId, 'headers');
            });
        });

        // Remove parameter/header buttons
        const removeButtons = container.querySelectorAll('button[data-action="removeParam"]');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const nodeId = this.state.selectedNode;
                if (!nodeId) return;
                const paramType = e.target.dataset.paramType;
                const index = parseInt(e.target.dataset.index);
                console.log('🗑️ Removing', paramType, 'at index', index);
                this.removeParam(nodeId, paramType, index);
            });
        });

        // Body template buttons
        const bodyTemplateButtons = container.querySelectorAll('button[data-action="applyBodyTemplate"]');
        bodyTemplateButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const nodeId = this.state.selectedNode;
                if (!nodeId) return;
                const templateType = e.target.dataset.templateType;
                console.log('📋 Applying body template:', templateType);
                this.applyBodyTemplate(nodeId, templateType);
            });
        });

        // Test API buttons
        const testButtons = container.querySelectorAll('button[data-action="testApi"]');
        testButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const nodeId = this.state.selectedNode;
                if (!nodeId) return;
                console.log('⚡ Testing API for node:', nodeId);
                this.runApiTest(nodeId);
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
        if (!nodeType) return;

        const canvas = this.canvasRef.el;
        const rect = canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left - 80;
        const y = ev.clientY - rect.top - 40;

        this.nodeManager.createWorkflowNode(nodeType, x, y);
        this.state.showInstructions = false;
    }

    selectNode(nodeId) {
        document.querySelectorAll('.workflow-node').forEach(node =>
            node.classList.remove('selected')
        );

        const nodeElement = document.getElementById(nodeId);
        if (nodeElement) {
            nodeElement.classList.add('selected');
        }
        this.state.selectedNode = nodeId;

        console.log('🎯 Selected node:', nodeId, 'Config:', this.state.nodeConfigs[nodeId]);

        // Update config panel events when node selection changes
        setTimeout(() => {
            this.setupConfigEventHandlers();
        }, 100);
    }

    deselectAllNodes() {
        document.querySelectorAll('.workflow-node').forEach(node =>
            node.classList.remove('selected')
        );
        this.state.selectedNode = null;
    }

    updateNodeConfig(nodeId, key, value) {
        console.log('💾 Saving to node config:', { nodeId, key, value });

        if (this.state.nodeConfigs[nodeId]) {
            this.state.nodeConfigs[nodeId].config[key] = value;
            console.log('✅ Node config updated:', this.state.nodeConfigs[nodeId]);
            this.nodeManager.updateNodeStatus(nodeId);
            this.state.configUpdateCounter++;
        } else {
            console.error('❌ Node not found:', nodeId);
        }
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
        console.log('🗑️ Removing param:', { nodeId, paramType, index });
        this.nodeTemplates.removeParam(nodeId, paramType, index);
        this.setupConfigEventHandlers(); // Refresh UI
    }

    addParamFromInputs(nodeId, paramType) {
        console.log('➕ Adding param from inputs:', { nodeId, paramType });
        this.nodeTemplates.addParamFromInputs(nodeId, paramType);
        this.setupConfigEventHandlers(); // Refresh UI
    }

    applyBodyTemplate(nodeId, type) {
        console.log('📋 Applying body template:', { nodeId, type });
        this.nodeTemplates.applyBodyTemplate(nodeId, type);
        this.setupConfigEventHandlers(); // Refresh UI
    }

    runApiTest(nodeId) {
        console.log('⚡ Running API test for node:', nodeId);
        this.nodeTemplates.runApiTest(nodeId);
    }

    getNodeParams(nodeId) {
        return this.nodeTemplates.getNodeParams(nodeId);
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