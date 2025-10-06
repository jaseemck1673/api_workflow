/** @odoo-module **/

export class WorkflowIO {
    constructor(workflowBuilder) {
        this.workflow = workflowBuilder;
        this.state = workflowBuilder.state;
        this.orm = workflowBuilder.orm;
        this.notification = workflowBuilder.notification;
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
        this.workflow.nodeManager.clearCanvas();

        workflowData.nodes.forEach(nodeData => {
            this.workflow.nodeManager.createWorkflowNode(nodeData.type, nodeData.x, nodeData.y);
        });

        if (workflowData.connections) {
            this.state.connections = workflowData.connections;
            this.workflow.connectionManager.updateConnections();
        }

        this.state.showInstructions = false;
    }
}