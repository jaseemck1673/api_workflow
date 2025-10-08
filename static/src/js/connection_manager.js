/** @odoo-module **/

export class ConnectionManager {
    constructor(workflowBuilder) {
        this.workflow = workflowBuilder;
        this.state = workflowBuilder.state;
        this.canvasRef = workflowBuilder.canvasRef;
        this.connectionSvg = null;
    }

    setupConnections() {
        // Remove existing SVG if any
        const existingSvg = this.canvasRef.el.querySelector('.connections-layer');
        if (existingSvg) {
            existingSvg.remove();
        }

        this.connectionSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.connectionSvg.setAttribute("class", "connections-layer");
        this.connectionSvg.style.position = "absolute";
        this.connectionSvg.style.top = "0";
        this.connectionSvg.style.left = "0";
        this.connectionSvg.style.width = "100%";
        this.connectionSvg.style.height = "100%";
        this.connectionSvg.style.pointerEvents = "none";
        this.connectionSvg.style.zIndex = "5";
        this.connectionSvg.setAttribute('width', '100%');
        this.connectionSvg.setAttribute('height', '100%');
        this.connectionSvg.style.overflow = "visible";

        this.canvasRef.el.appendChild(this.connectionSvg);
        console.log("Connection SVG setup complete");
    }

    startConnection(nodeId, isOutput) {
        console.log("Starting connection from:", nodeId, "isOutput:", isOutput);
        const nodeElement = document.getElementById(nodeId);
        if (!nodeElement) {
            console.error("Node element not found:", nodeId);
            return;
        }

        this.state.tempConnection = {
            sourceNode: nodeId,
            isOutput: isOutput,
            startX: 0,
            startY: 0,
            x: 0,
            y: 0
        };

        this.updateTempConnectionPosition();

        document.addEventListener('mousemove', this.drawTempConnection.bind(this));
        document.addEventListener('click', this.finishConnection.bind(this), { once: true });

        console.log("Temp connection started:", this.state.tempConnection);
    }

    updateTempConnectionPosition() {
        const nodeElement = document.getElementById(this.state.tempConnection.sourceNode);
        if (!nodeElement) return;

        const nodeRect = nodeElement.getBoundingClientRect();
        const canvasRect = this.canvasRef.el.getBoundingClientRect();

        if (this.state.tempConnection.isOutput) {
            this.state.tempConnection.startX = nodeRect.right - canvasRect.left;
        } else {
            this.state.tempConnection.startX = nodeRect.left - canvasRect.left;
        }
        this.state.tempConnection.startY = nodeRect.top - canvasRect.top + nodeRect.height / 2;
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
        console.log("Finishing connection", ev.target);
        if (!this.state.tempConnection) return;

        // Find node at mouse position instead of relying on click target
        const targetNode = this.findNodeAtPosition(ev.clientX, ev.clientY);
        console.log("Target element:", targetNode);

        if (targetNode && targetNode.id !== this.state.tempConnection.sourceNode) {
            console.log("Valid connection target found:", targetNode.id);

            if (this.state.tempConnection.isOutput) {
                this.createConnection(this.state.tempConnection.sourceNode, targetNode.id);
            } else {
                this.createConnection(targetNode.id, this.state.tempConnection.sourceNode);
            }
        } else {
            console.log("No valid target found for connection");
        }

        document.removeEventListener('mousemove', this.drawTempConnection);
        this.state.tempConnection = null;
        this.updateConnections();
    }

    findNodeAtPosition(x, y) {
        const nodes = document.querySelectorAll('.workflow-node');

        for (const node of nodes) {
            const rect = node.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right &&
                y >= rect.top && y <= rect.bottom) {
                return node;
            }
        }
        return null;
    }

    createConnection(sourceNodeId, targetNodeId) {
        console.log("Creating connection from:", sourceNodeId, "to:", targetNodeId);

        // Check if connection already exists
        const existingConnection = this.state.connections.find(conn =>
            conn.source === sourceNodeId && conn.target === targetNodeId
        );

        if (existingConnection) {
            console.log("Connection already exists");
            return;
        }

        const connection = {
            id: `conn-${Date.now()}`,
            source: sourceNodeId,
            target: targetNodeId
        };

        this.state.connections.push(connection);
        console.log("Connection created:", connection);
        console.log("All connections:", this.state.connections);

        this.updateConnections();
    }

    updateConnections() {
        if (!this.connectionSvg) {
            console.error("Connection SVG not initialized");
            return;
        }

        this.connectionSvg.innerHTML = '';
        console.log("Updating connections, total:", this.state.connections.length);

        // Draw permanent connections
        this.state.connections.forEach(conn => {
            const sourceNode = document.getElementById(conn.source);
            const targetNode = document.getElementById(conn.target);

            console.log(`Drawing connection ${conn.source} -> ${conn.target}`, {
                sourceExists: !!sourceNode,
                targetExists: !!targetNode
            });

            if (sourceNode && targetNode) {
                this.drawConnectionLine(sourceNode, targetNode, false, conn.id);
            } else {
                console.error("Source or target node not found for connection:", conn);
            }
        });

        // Draw temporary connection
        if (this.state.tempConnection) {
            const sourceNode = document.getElementById(this.state.tempConnection.sourceNode);
            if (sourceNode) {
                this.drawConnectionLine(sourceNode, this.state.tempConnection, true, 'temp');
            }
        }
    }

    drawConnectionLine(source, target, isTemp = false, connectionId = '') {
        const canvasRect = this.canvasRef.el.getBoundingClientRect();

        let sourceX, sourceY, targetX, targetY;

        // Calculate source coordinates
        if (isTemp) {
            // For temp connection, use stored coordinates
            sourceX = this.state.tempConnection.startX;
            sourceY = this.state.tempConnection.startY;
            targetX = this.state.tempConnection.x;
            targetY = this.state.tempConnection.y;
        } else {
            // For permanent connections, calculate from node elements
            const sourceRect = source.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();

            sourceX = sourceRect.right - canvasRect.left;
            sourceY = sourceRect.top - canvasRect.top + sourceRect.height / 2;

            targetX = targetRect.left - canvasRect.left;
            targetY = targetRect.top - canvasRect.top + targetRect.height / 2;
        }

        console.log(`Drawing ${isTemp ? 'temp' : 'permanent'} line:`, {
            sourceX, sourceY, targetX, targetY, connectionId
        });

        // Create SVG path
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

        // Bezier curve for smooth connection
        const controlPoint1X = sourceX + (targetX - sourceX) * 0.5;
        const controlPoint2X = sourceX + (targetX - sourceX) * 0.5;

        const pathData = `M ${sourceX} ${sourceY} C ${controlPoint1X} ${sourceY} ${controlPoint2X} ${targetY} ${targetX} ${targetY}`;

        path.setAttribute("d", pathData);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", isTemp ? "#667eea" : "#28a745");
        path.setAttribute("stroke-width", isTemp ? "2" : "3");

        if (isTemp) {
            path.setAttribute("stroke-dasharray", "5,5");
        }

        if (!isTemp) {
            path.setAttribute("data-connection-id", connectionId);
        }

        this.connectionSvg.appendChild(path);

        // Add connection points for debugging
        if (!isTemp) {
            this.addConnectionPoint(sourceX, sourceY, '#ff0000');
            this.addConnectionPoint(targetX, targetY, '#0000ff');
        }
    }

    // Helper method for debugging connection points
    addConnectionPoint(x, y, color) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "3");
        circle.setAttribute("fill", color);
        this.connectionSvg.appendChild(circle);
    }

    // Method to remove a connection
    removeConnection(connectionId) {
        this.state.connections = this.state.connections.filter(conn => conn.id !== connectionId);
        this.updateConnections();
    }

    // Method to refresh all connections (call this when nodes move)
    refreshConnections() {
        this.updateConnections();
    }
}