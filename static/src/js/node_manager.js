/** @odoo-module **/

import { NodeTemplates } from "./node_templates";

export class NodeManager {
    constructor(workflowBuilder) {
        this.workflow = workflowBuilder;
        this.state = workflowBuilder.state;
        this.notification = workflowBuilder.notification;
        this.canvasRef = workflowBuilder.canvasRef;
        this.nodeTemplates = new NodeTemplates(workflowBuilder);
    }

    createWorkflowNode(type, x, y) {
        const nodeId = `node-${++this.state.nodeIdCounter}`;

        const nodeElement = document.createElement('div');
        nodeElement.className = 'workflow-node';
        nodeElement.id = nodeId;
        nodeElement.style.left = `${x}px`;
        nodeElement.style.top = `${y}px`;
        nodeElement.dataset.type = type;

        nodeElement.innerHTML = `
            <button class="delete-node" title="Delete node">×</button>
            <div class="connection-point input" @click="startConnection('node-1', true)"></div>
            <div class="connection-point output" @click="startConnection('node-1', false)"></div>
            <div class="node-header">
                <div class="node-icon">${this.nodeTemplates.getNodeIcon(type)}</div>
                <div class="node-title">${this.nodeTemplates.getNodeTitle(type)}</div>
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
            config: this.nodeTemplates.getDefaultConfig(type)
        };
        this.state.workflowNodes.push(nodeId);
        this.updateNodeStatus(nodeId);
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
            startX = e.clientX;
            startY = e.clientY;

            const rect = node.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            node.classList.add('dragging');
            document.addEventListener('mousemove', elementDrag);
            document.addEventListener('mouseup', closeDragElement);

            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'grabbing';
        };

        const elementDrag = (e) => {
            if (!isDragging) return;
            e.preventDefault();

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const newX = initialX + deltaX;
            const newY = initialY + deltaY;

            node.style.left = `${newX}px`;
            node.style.top = `${newY}px`;

            requestAnimationFrame(() => {
                this.workflow.connectionManager.updateConnections();
            });
        };

        const closeDragElement = () => {
            if (!isDragging) return;

            isDragging = false;
            node.classList.remove('dragging');
            document.removeEventListener('mousemove', elementDrag);
            document.removeEventListener('mouseup', closeDragElement);

            document.body.style.userSelect = '';
            document.body.style.cursor = '';

            if (this.state.nodeConfigs[node.id]) {
                this.state.nodeConfigs[node.id].x = parseInt(node.style.left);
                this.state.nodeConfigs[node.id].y = parseInt(node.style.top);
            }
        };

        node.addEventListener('mousedown', dragMouseDown);

        // Touch support
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
                this.workflow.connectionManager.updateConnections();
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
            this.workflow.selectNode(nodeId);
        });

        const deleteBtn = nodeElement.querySelector('.delete-node');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNode(nodeId);
        });

        const inputPoint = nodeElement.querySelector('.connection-point.input');
        const outputPoint = nodeElement.querySelector('.connection-point.output');

        inputPoint.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.workflow.connectionManager.startConnection(nodeId, false);
        });

        outputPoint.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.workflow.connectionManager.startConnection(nodeId, true);
        });
    }

    deleteNode(nodeId) {
        const nodeElement = document.getElementById(nodeId);
        if (nodeElement) {
            nodeElement.remove();
        }

        this.state.workflowNodes = this.state.workflowNodes.filter(id => id !== nodeId);
        delete this.state.nodeConfigs[nodeId];

        this.state.connections = this.state.connections.filter(conn =>
            conn.source !== nodeId && conn.target !== nodeId
        );

        if (this.state.selectedNode === nodeId) {
            this.state.selectedNode = null;
        }

        this.workflow.connectionManager.updateConnections();
    }

    clearCanvas() {
        if (!confirm("Clear the entire canvas?")) return;

        const canvas = this.workflow.canvasRef.el;
        Array.from(canvas.querySelectorAll('.workflow-node')).forEach(n => n.remove());

        this.state.workflowNodes = [];
        this.state.nodeConfigs = {};
        this.state.nodeIdCounter = 0;
        this.state.selectedNode = null;
        this.state.showInstructions = true;
        this.state.connections = [];
        this.workflow.connectionManager.updateConnections();
    }

    updateNodeStatus(nodeId) {
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
}