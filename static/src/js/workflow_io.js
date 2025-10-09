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

                // Debug after import - FIXED setTimeout
                setTimeout(() => {
                    this.debugConfigurations();
                }, 1000); // Added delay parameter

                this.notification.add("Workflow imported successfully!", { type: 'success' });
            } catch (error) {
                console.error('❌ Import error:', error);
                this.notification.add("Invalid workflow file", { type: 'danger' });
            }
        };
        reader.readAsText(file);

        // Clear the file input
        event.target.value = '';
    }

    debugConfigurations() {
            console.log('🐛 DEBUG: Current Node Configurations');
            Object.keys(this.state.nodeConfigs).forEach(nodeId => {
                const config = this.state.nodeConfigs[nodeId];
                console.log(`📋 Node ${nodeId} (${config.type}):`, config.config);
            });

            console.log('📊 Summary:', {
                totalNodes: Object.keys(this.state.nodeConfigs).length,
                selectedNode: this.state.selectedNode,
                workflowNodes: this.state.workflowNodes.length
            });
        }

    loadWorkflowData(workflowData) {
        console.log('📥 Loading workflow data:', workflowData);

        // Clear existing workflow
        this.workflow.nodeManager.clearCanvas();

        // Wait for canvas to be cleared before creating new nodes
            setTimeout(() => {
                try {
                    // Create nodes
                    if (workflowData.nodes && Array.isArray(workflowData.nodes)) {
                        console.log(`📋 Creating ${workflowData.nodes.length} nodes...`);

                        workflowData.nodes.forEach((nodeData, index) => {
                            // Create node with original ID and configuration
                            const nodeId = this.workflow.nodeManager.createWorkflowNode(
                                nodeData.type,
                                nodeData.x || 100 + (index * 20),
                                nodeData.y || 100 + (index * 20),
                                nodeData.id // Pass the original ID
                            );

                            // Restore node configuration immediately
                            if (nodeData.config && nodeData.id) {
                                this.workflow.state.nodeConfigs[nodeData.id] = {
                                    ...nodeData,
                                    config: { ...nodeData.config }
                                };
                                console.log(`✅ Restored node ${nodeData.id} configuration:`, nodeData.config);
                            }
                        });
                    }

                    // Restore connections after nodes are created
                    if (workflowData.connections && Array.isArray(workflowData.connections)) {
                        setTimeout(() => {
                            this.workflow.state.connections = [...workflowData.connections];
                            this.workflow.connectionManager.updateConnections();
                            console.log(`✅ Restored ${workflowData.connections.length} connections`);

                            // Refresh config panel event handlers after everything is loaded
                            this.workflow.setupConfigEventHandlers();

                        }, workflowData.nodes.length * 50 + 100);
                    } else {
                        // Refresh config panel even if no connections
                        setTimeout(() => {
                            this.workflow.setupConfigEventHandlers();
                        }, 500);
                    }

                    this.workflow.state.showInstructions = false;

                    console.log('✅ Workflow imported successfully');

                } catch (error) {
                    console.error('❌ Error during workflow import:', error);
                    this.notification.add("Error loading workflow data", { type: 'danger' });
                }
            }, 100);
        }

    async saveWorkflow() {
            try {
                console.log("💾 Save workflow triggered");

                const nodes = Object.values(this.state.nodeConfigs);
                if (nodes.length === 0) {
                    this.showNotification('Cannot save empty workflow', 'warning');
                    return;
                }

                // Get current workflow_id if editing an existing workflow
                let existingId = this.state.workflowId;
                let workflowName = this.state.workflowName;

                if (!existingId) {
                    // Only ask for name if creating a new workflow
                    workflowName = prompt('Enter workflow name:', `Workflow-${new Date().toLocaleDateString()}`);
                    if (!workflowName) return;
                }

                const workflowData = {
                    id: existingId,  // ✅ Pass ID if updating existing record
                    name: workflowName,
                    description: 'API Workflow created from workflow builder',
                    workflow_data: JSON.stringify({
                        nodes: nodes,
                        connections: this.state.connections,
                        metadata: {
                            version: "1.0",
                            exportedAt: new Date().toISOString(),
                            totalNodes: nodes.length,
                            totalConnections: this.state.connections.length
                        }
                    })
                };

                console.log('📤 Sending workflow data to backend:', workflowData);

                const result = await this.orm.call('api.workflow', 'save_or_update_workflow', [workflowData]);

                if (result) {
                    console.log(result)
                    this.state.workflowId = result;
                    this.showNotification(
                        existingId
                            ? `Workflow "${workflowName}" updated successfully!`
                            : `Workflow "${workflowName}" created successfully!`,
                        'success'
                    );

                    console.log('✅ Workflow saved with ID:', result);
                }

            } catch (error) {
                console.error('❌ Error saving workflow:', error);
                this.showNotification(`Failed to save workflow: ${error.message}`, 'error');
            }
        }

    showNotification(message, type = 'info') {
            // Use Odoo's notification system
            if (this.env && this.env.services && this.env.services.notification) {
                this.env.services.notification.add(message, { type });
            } else {
                // Fallback
                alert(`${type.toUpperCase()}: ${message}`);
            }
        }

    importWorkflowData(workflowData) {
            try {
                console.log('📥 Importing workflow data:', workflowData);
                this.loadWorkflowData(workflowData);
                this.notification.add("Workflow loaded successfully!", { type: 'success' });
            } catch (error) {
                console.error('❌ Error importing workflow data:', error);
                this.notification.add("Failed to load workflow data", { type: 'danger' });
            }
        }
    }