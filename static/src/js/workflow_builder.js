/** @odoo-module **/

import { Component, useState, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";

class WorkflowBuilder extends Component {
    setup() {
        this.canvasRef = useRef("canvas");
        this.state = useState({
            // stage 2
            workflowNodes: [],
            nodeIdCounter: 0,
            nodeConfigs: {},
            // stage 1
            selectedNode: null,
            showInstructions: true,
        });

        onMounted(() => {
            this.setupDragAndDrop();
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
        const x = ev.clientX - rect.left - 90;
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
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        const dragMouseDown = (e) => {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
            node.classList.add('dragging');
        };

        const elementDrag = (e) => {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            node.style.top = (node.offsetTop - pos2) + "px";
            node.style.left = (node.offsetLeft - pos1) + "px";
        };

        const closeDragElement = () => {
            document.onmouseup = null;
            document.onmousemove = null;
            node.classList.remove('dragging');
        };

        node.onmousedown = dragMouseDown;
    }
    // attach node event stage 2

    attachNodeEvents(nodeElement, nodeId) {
        nodeElement.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(nodeId);
        });
    }
    // Select node stage 2
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
    get selectedNodeConfig() {
        if (!this.state.selectedNode) return null;
        return this.state.nodeConfigs[this.state.selectedNode];
    }

    updateNodeConfig(key, value) {
        if (this.state.selectedNode) {
            const config = this.state.nodeConfigs[this.state.selectedNode];
            if (config) {
                config.config[key] = value;
            }
        }
    }



    deselectAllNodes() {
        this.state.selectedNode = null;
    }
}

WorkflowBuilder.template = "api_workflow_builder.WorkflowBuilder";

registry.category("actions").add("workflow_builder", WorkflowBuilder);

export default WorkflowBuilder;
