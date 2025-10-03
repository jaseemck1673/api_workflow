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
        this.state.showInstructions = false;

        // stage 2
        if (!nodeType) return;
    }

    deselectAllNodes() {
        this.state.selectedNode = null;
    }
}

WorkflowBuilder.template = "api_workflow_builder.WorkflowBuilder";

registry.category("actions").add("workflow_builder", WorkflowBuilder);

export default WorkflowBuilder;
