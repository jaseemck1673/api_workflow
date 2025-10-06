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
        });

        onMounted(() => {
            this.setupDragAndDrop();
            this.setupConnections();
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
            config: {}
        };
        this.state.workflowNodes.push(nodeId);
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

    updateNodeConfig(key, value) {
        if (this.state.selectedNode && this.state.nodeConfigs[this.state.selectedNode]) {
            this.state.nodeConfigs[this.state.selectedNode].config[key] = value;
        }
    }

    get selectedNodeConfig() {
        return this.state.selectedNode ? this.state.nodeConfigs[this.state.selectedNode] : null;
    }
}

WorkflowBuilder.template = "api_workflow_builder.WorkflowBuilder";
registry.category("actions").add("workflow_builder", WorkflowBuilder);
export default WorkflowBuilder;