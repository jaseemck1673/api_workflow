/** @odoo-module **/

import { Component, useState, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { NodeManager } from "./node_manager";
import { ConnectionManager } from "./connection_manager";
import { WorkflowIO } from "./workflow_io";
import { NodeTemplates } from "./node_templates";

class WorkflowBuilder extends Component {
    setup() {
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
        });

        // Initialize managers
        this.nodeManager = new NodeManager(this);
        this.connectionManager = new ConnectionManager(this);
        this.workflowIO = new WorkflowIO(this);
        this.nodeTemplates = new NodeTemplates(this);

        onMounted(() => {
            this.setupDragAndDrop();
            this.connectionManager.setupConnections();
            this.setupConfigPanelEvents();
        });
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
        console.log('🔐 Updating auth type:', { nodeId, authType });
        this.nodeTemplates.updateAuthType(nodeId, authType);
        this.setupConfigEventHandlers(); // Refresh UI to show/hide auth fields
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

    // Delegate methods to managers
    clearCanvas() { return this.nodeManager.clearCanvas(); }
    testWorkflow() { return this.workflowIO.testWorkflow(); }
    exportWorkflow() { return this.workflowIO.exportWorkflow(); }
    importWorkflow(event) { return this.workflowIO.importWorkflow(event); }
    getConfigurationTemplate(nodeId) { return this.nodeTemplates.getConfigurationTemplate(nodeId); }
}

WorkflowBuilder.template = "api_workflow_builder.WorkflowBuilder";
registry.category("actions").add("workflow_builder", WorkflowBuilder);
export default WorkflowBuilder;