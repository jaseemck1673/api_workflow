/** @odoo-module **/

export class ConnectionManager {
    constructor(workflowBuilder) {
        this.workflow = workflowBuilder;
        this.state = workflowBuilder.state;
        this.canvasRef = workflowBuilder.canvasRef;
        this.connectionSvg = null;
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
        this.connectionSvg.innerHTML = '';

        this.state.connections.forEach(conn => {
            const sourceNode = document.getElementById(conn.source);
            const targetNode = document.getElementById(conn.target);

            if (sourceNode && targetNode) {
                this.drawConnectionLine(sourceNode, targetNode, false);
            }
        });

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
            sourceX = this.state.tempConnection.startX;
            sourceY = this.state.tempConnection.startY;
        } else {
            sourceX = sourceRect.right - canvasRect.left;
            sourceY = sourceRect.top - canvasRect.top + sourceRect.height / 2;
        }

        let targetX, targetY;

        if (isTemp && target.x !== undefined && target.y !== undefined) {
            targetX = target.x;
            targetY = target.y;
        } else {
            const targetRect = target.getBoundingClientRect();
            targetX = targetRect.left - canvasRect.left;
            targetY = targetRect.top - canvasRect.top + targetRect.height / 2;
        }

        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");

        const deltaX = targetX - sourceX;
        const controlX1 = sourceX + Math.abs(deltaX) * 0.5;
        const controlX2 = targetX - Math.abs(deltaX) * 0.5;

        const pathData = `M ${sourceX} ${sourceY} C ${controlX1} ${sourceY} ${controlX2} ${targetY} ${targetX} ${targetY}`;

        line.setAttribute("d", pathData);
        line.setAttribute("fill", "none");
        line.setAttribute("stroke", isTemp ? "#667eea" : "#28a745");
        line.setAttribute("stroke-width", isTemp ? "2" : "3");

        if (isTemp) {
            line.setAttribute("stroke-dasharray", "5,5");
        }

        this.connectionSvg.appendChild(line);
    }
}