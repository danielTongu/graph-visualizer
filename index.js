"use strict";

/**
 * Stores transient visual state for graph entities.
 */
class RenderState {
    /**
     * Create a default render state.
     */
    constructor() {
        this.hovered = false;
        this.selected = false;
        this.active = false;
        this.visited = false;
        this.discovered = false;
        this.path = false;
    }

    /**
     * Set hover state.
     *
     * @param {boolean} value - Whether entity is hovered.
     */
    setHovered(value) {
        this.hovered = Boolean(value);
    }

    /**
     * Set selected state.
     *
     * @param {boolean} value - Whether entity is selected.
     */
    setSelected(value) {
        this.selected = Boolean(value);

        if (this.selected) {
            this.active = false;
            this.path = false;
        }
    }

    /**
     * Set active traversal state.
     *
     * @param {boolean} value - Whether entity is active.
     */
    setActive(value) {
        this.active = Boolean(value);

        if (this.active) {
            this.selected = false;
            this.path = false;
        }
    }

    /**
     * Set visited traversal state.
     *
     * @param {boolean} value - Whether entity is visited.
     */
    setVisited(value) {
        this.visited = Boolean(value);

        if (this.visited) {
            this.selected = false;
        }
    }

    /**
     * Set discovered traversal state.
     *
     * @param {boolean} value - Whether entity is discovered.
     */
    setDiscovered(value) {
        this.discovered = Boolean(value);

        if (this.discovered) {
            this.selected = false;
        }
    }

    /**
     * Set final path or MST state.
     *
     * @param {boolean} value - Whether entity is on the final path.
     */
    setPath(value) {
        this.path = Boolean(value);

        if (this.path) {
            this.hovered = false;
            this.selected = false;
            this.active = false;
            this.visited = false;
            this.discovered = false;
        }
    }

    /**
     * Clear active-only state.
     */
    clearActive() {
        this.active = false;
    }

    /**
     * Clear traversal-related state.
     */
    clearTraversal() {
        this.active = false;
        this.visited = false;
        this.discovered = false;
        this.path = false;
    }
}

/**
 * Represents one graph node and owns its drawing logic.
 */
class Node {
    static DEFAULT_RADIUS = 17;

    /**
     * Create a graph node.
     *
     * @param {string} id - Stable node id.
     * @param {string} label - Display label.
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @param {number|string|null|undefined} radius - Optional radius override.
     */
    constructor(id, label, x, y, radius = null) {
        this.id = String(id);
        this.label = String(label);
        this.x = Number(x);
        this.y = Number(y);
        this.radius = Node.normalizeRadius(radius);
        this.renderState = new RenderState();
    }

    /**
     * Normalize radius.
     *
     * @param {number|string|null|undefined} radius - Radius candidate.
     * @returns {number|null} Positive radius or null.
     */
    static normalizeRadius(radius) {
        const parsed = Number(radius);
        let normalized = null;

        if (Number.isFinite(parsed) && parsed > 0) {
            normalized = parsed;
        }

        return normalized;
    }

    /**
     * Set default node radius.
     *
     * @param {number|string} radius - Radius candidate.
     */
    static setDefaultRadius(radius) {
        const parsed = Number(radius);

        if (Number.isFinite(parsed) && parsed > 0) {
            Node.DEFAULT_RADIUS = parsed;
        }
    }

    /**
     * Resolve drawing style from render state.
     *
     * @param {RenderState} state - Render state.
     * @returns {object} Style.
     */
    static getDrawStyle(state) {
        const style = {
            fill: "rgba(148, 163, 184, 0.6)",
            stroke: "rgba(148, 163, 184, 0.6)",
            lineWidth: 2
        };

        if (state.visited) {
            style.fill = "#5cb85c";
            style.stroke = "#5cb85c";
        }

        if (state.hovered) {
            style.fill = "#ef4444";
            style.stroke = "#ef4444";
            style.lineWidth = 4;
        }

        if (state.active) {
            style.fill = "#f59e0b";
            style.stroke = "#f59e0b";
            style.lineWidth = 4;
        }

        if (state.selected) {
            style.fill = "#8b5cf6";
            style.stroke = "#8b5cf6";
            style.lineWidth = 4;
        }

        if (state.path) {
            style.fill = "#38bdf8";
            style.stroke = "#38bdf8";
            style.lineWidth = 5;
        }

        return style;
    }

    /**
     * Draw rounded rectangle.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {number} x - X.
     * @param {number} y - Y.
     * @param {number} width - Width.
     * @param {number} height - Height.
     * @param {number} radius - Radius.
     */
    static #drawRoundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();

        if (typeof ctx.roundRect === "function") {
            ctx.roundRect(x, y, width, height, radius);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(x, y, width, height);
            ctx.strokeRect(x, y, width, height);
        }
    }

    /**
     * Create node from imported data without changing imported id.
     *
     * @param {object} data - Imported node data.
     * @returns {Node} Node.
     */
    static fromJSON(data) {
        return new Node(data.id, data.label, data.x, data.y, data.radius);
    }

    /**
     * Compare this node with another node alphabetically by label.
     *
     * @param {Node} other - Another node.
     * @returns {number} Sort result.
     */
    compareTo(other) {
        return this.label.localeCompare(other.label);
    }

    /**
     * Get effective radius.
     *
     * @returns {number} Effective radius.
     */
    getRadius() {
        let radius = Node.DEFAULT_RADIUS;

        if (Number.isFinite(this.radius) && this.radius > 0) {
            radius = this.radius;
        }

        return radius;
    }

    /**
     * Set display label.
     *
     * @param {string} label - New label.
     */
    setLabel(label) {
        this.label = String(label);
    }

    /**
     * Set radius override.
     *
     * @param {number|string|null|undefined} radius - Radius candidate.
     */
    setRadius(radius) {
        this.radius = Node.normalizeRadius(radius);
    }

    /**
     * Move node.
     *
     * @param {number} x - New x.
     * @param {number} y - New y.
     */
    moveTo(x, y) {
        this.x = Number(x);
        this.y = Number(y);
    }

    /**
     * Check point hit.
     *
     * @param {number} x - World x.
     * @param {number} y - World y.
     * @returns {boolean} True when point hits node.
     */
    containsPoint(x, y) {
        return Geometry.distance(x, y, this.x, this.y) <= this.getRadius();
    }

    /**
     * Draw node.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {number|undefined} distance - Optional distance to node.
     */
    draw(ctx, distance = undefined) {
        const style = Node.getDrawStyle(this.renderState);

        this.#drawShape(ctx, style);
        this.#drawLabel(ctx);

        if (distance !== undefined) {
            this.#drawDistanceBadge(ctx, distance);
        }
    }

    /**
     * Draw node circle.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {object} style - Drawing style.
     */
    #drawShape(ctx, style) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.getRadius(), 0, Math.PI * 2);
        ctx.fillStyle = style.fill;
        ctx.fill();
        ctx.lineWidth = style.lineWidth;
        ctx.strokeStyle = style.stroke;
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw node label.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     */
    #drawLabel(ctx) {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Inter, Arial, sans-serif";
        ctx.shadowColor = "rgb(0, 0, 0)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.label, this.x, this.y);
        ctx.restore();
    }

    /**
     * Draw distance badge.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {number} distance - Distance value.
     */
    #drawDistanceBadge(ctx, distance) {
        const label = distance === Infinity ? "∞" : String(distance);
        const radius = this.getRadius();
        const width = 32;
        const height = 20;
        const x = this.x - width / 2;
        const y = this.y - radius - 20;

        ctx.save();
        ctx.fillStyle = "rgba(2, 6, 23, 0.95)";
        ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
        Node.#drawRoundRect(ctx, x, y, width, height, 6);
        ctx.fillStyle = "#f8fafc";
        ctx.font = "9px Inter, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, this.x, y + height / 2);
        ctx.restore();
    }

    /**
     * Serialize node.
     *
     * @returns {object} Plain node data.
     */
    toJSON() {
        return {
            id: this.id,
            label: this.label,
            x: this.x,
            y: this.y,
            radius: this.radius
        };
    }
}

/**
 * Represents one graph edge and owns its drawing logic.
 */
class Edge {
    /**
     * Create an edge.
     *
     * @param {string} id - Stable edge id.
     * @param {string} from - Source node id.
     * @param {string} to - Destination node id.
     * @param {number|string} weight - Edge weight.
     */
    constructor(id, from, to, weight = 1) {
        this.id = String(id);
        this.from = String(from);
        this.to = String(to);
        this.weight = Number(weight);
        this.renderState = new RenderState();
    }

    /**
     * Create edge from imported data without changing imported id.
     *
     * @param {object} data - Imported edge data.
     * @returns {Edge} Edge.
     */
    static fromJSON(data) {
        return new Edge(data.id, data.from, data.to, data.weight);
    }

    /**
     * Compare this edge with another edge by weight only.
     *
     * @param {Edge} other - Other edge.
     * @returns {number} Sort result.
     */
    compareTo(other) {
        return this.weight - other.weight;
    }

    /**
     * Set weight.
     *
     * @param {number|string} weight - New weight.
     */
    setWeight(weight) {
        const parsed = Number(weight);

        if (Number.isFinite(parsed)) {
            this.weight = parsed;
        }
    }

    /**
     * Draw edge.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Graph} graph - Graph reference.
     */
    draw(ctx, graph) {
        const fromNode = graph.getNodeById(this.from);
        const toNode = graph.getNodeById(this.to);

        if (fromNode && toNode) {
            const style = this.#getDrawStyle();

            this.#drawLine(ctx, fromNode, toNode, style);

            if (graph.directed) {
                this.#drawArrow(ctx, fromNode, toNode, style);
            }

            if (graph.weighted) {
                this.#drawWeight(ctx, fromNode, toNode);
            }
        }
    }

    /**
     * Resolve drawing style from render state.
     *
     * @returns {object} Style.
     */
    #getDrawStyle() {
        return Node.getDrawStyle(this.renderState);
    }

    /**
     * Draw line between nodes.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {object} style - Style.
     */
    #drawLine(ctx, fromNode, toNode, style) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = style.lineWidth;
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw arrow for directed edge.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source.
     * @param {Node} toNode - Target.
     * @param {object} style - Style.
     */
    #drawArrow(ctx, fromNode, toNode, style) {
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const offset = toNode.getRadius();
        const x = toNode.x - Math.cos(angle) * offset;
        const y = toNode.y - Math.sin(angle) * offset;
        const size = 10;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(
            x - size * Math.cos(angle - Math.PI / 6),
            y - size * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x - size * Math.cos(angle + Math.PI / 6),
            y - size * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = style.stroke;
        ctx.fill();
        ctx.restore();
    }

    /**
     * Draw weight label.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source.
     * @param {Node} toNode - Target.
     */
    #drawWeight(ctx, fromNode, toNode) {
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;

        ctx.save();
        ctx.fillStyle = this.#getDrawStyle().fill;
        ctx.font = "12px Inter, Arial, sans-serif";
        ctx.shadowColor = "rgb(0, 0, 0)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(this.weight), midX, midY);
        ctx.restore();
    }

    /**
     * Hit test edge by distance to line segment.
     *
     * @param {number} x - World x.
     * @param {number} y - World y.
     * @param {Graph} graph - Graph reference.
     * @returns {boolean} True when point hits edge.
     */
    containsPoint(x, y, graph) {
        const fromNode = graph.getNodeById(this.from);
        const toNode = graph.getNodeById(this.to);
        let hit = false;

        if (fromNode && toNode) {
            const distance = Geometry.distanceToSegment(
                x,
                y,
                fromNode.x,
                fromNode.y,
                toNode.x,
                toNode.y
            );

            hit = distance < 8;
        }

        return hit;
    }

    /**
     * Serialize edge.
     *
     * @returns {object} Plain edge data.
     */
    toJSON() {
        return {
            id: this.id,
            from: this.from,
            to: this.to,
            weight: this.weight
        };
    }
}

/**
 * Core graph data structure.
 */
/**
 * Core graph data structure.
 */
class Graph {
    #undoStack = [];
    #redoStack = [];
    #historyLimit = 100;
    #historyLocked = false;

    /**
     * Create graph.
     */
    constructor() {
        this.nodeMap = new Map();
        this.edgeMap = new Map();
        this.nodeOrder = [];
        this.edgeOrder = [];
        this.directed = false;
        this.weighted = false;
    }

    /**
     * Loads sample graph data from file.
     *
     * @returns {Promise<object>} Sample graph data.
     */
    static async loadSampleAsync() {
        const response = await fetch("./sample-graph-data.json");

        if (!response.ok) {
            throw new Error("Failed to load sample graph data.");
        }

        return response.json();
    }

    /**
     * Create stable unique node id.
     *
     * @returns {string} Node id.
     */
    static createNodeId() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return `n:${crypto.randomUUID()}`;
        }

        return `n:${Graph.#createFallbackId()}`;
    }

    /**
     * Create fallback unique id.
     *
     * @returns {string} Id.
     */
    static #createFallbackId() {
        const time = Date.now().toString(36);
        const random = Graph.#randomString(10);

        return `${time}-${random}`;
    }

    /**
     * Generate random string.
     *
     * @param {number} length - String length.
     * @returns {string} Random string.
     */
    static #randomString(length) {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";

        for (let i = 0; i < length; i += 1) {
            const index = Math.floor(Math.random() * chars.length);
            result += chars.charAt(index);
        }

        return result;
    }

    /**
     * Create deterministic edge id from endpoints.
     *
     * @param {string} from - Source node id.
     * @param {string} to - Target node id.
     * @param {boolean} directed - Whether graph is directed.
     * @returns {string} Edge id.
     */
    static createEdgeId(from, to, directed) {
        const fromId = String(from);
        const toId = String(to);

        if (directed) {
            return `e:${fromId}->${toId}`;
        }

        const ordered = [fromId, toId].sort();
        return `e:${ordered[0]}--${ordered[1]}`;
    }

    /**
     * Clear graph without recording history.
     */
    reset() {
        this.nodeMap.clear();
        this.edgeMap.clear();
        this.nodeOrder.length = 0;
        this.edgeOrder.length = 0;
    }

    /**
     * Import graph safely and reset history.
     *
     * @param {object} data - Serialized graph data.
     */
    load(data) {
        try {
            this.#historyLocked = true;
            this.import(data);
            this.clearHistory();
        } finally {
            this.#historyLocked = false;
        }
    }

    /**
     * Create a snapshot of the graph state.
     *
     * @returns {object} Graph snapshot.
     */
    #createSnapshot() {
        return this.export();
    }

    /**
     * Restore graph state without recording history.
     *
     * @param {object} snapshot - Graph snapshot.
     */
    #restoreSnapshot(snapshot) {
        this.#historyLocked = true;
        this.import(snapshot);
        this.#historyLocked = false;
    }

    /**
     * Save current graph state for undo.
     */
    saveHistory() {
        if (!this.#historyLocked) {
            this.#undoStack.push(this.#createSnapshot());
            this.#redoStack.length = 0;

            if (this.#undoStack.length > this.#historyLimit) {
                this.#undoStack.shift();
            }
        }
    }

    /**
     * Undo the last graph change.
     *
     * @returns {boolean} True when undo happened.
     */
    undo() {
        let changed = false;

        if (this.#undoStack.length > 0) {
            this.#redoStack.push(this.#createSnapshot());
            this.#restoreSnapshot(this.#undoStack.pop());
            changed = true;
        }

        return changed;
    }

    /**
     * Redo the last undone graph change.
     *
     * @returns {boolean} True when redo happened.
     */
    redo() {
        let changed = false;

        if (this.#redoStack.length > 0) {
            this.#undoStack.push(this.#createSnapshot());
            this.#restoreSnapshot(this.#redoStack.pop());
            changed = true;
        }

        return changed;
    }

    /**
     * Clear undo and redo history.
     */
    clearHistory() {
        this.#undoStack.length = 0;
        this.#redoStack.length = 0;
    }

    /**
     * Compare two adjacency neighbors.
     *
     * @param {object} a - First adjacency neighbor.
     * @param {object} b - Second adjacency neighbor.
     * @returns {number} Sort result.
     */
    compareNeighbors(a, b) {
        const edgeA = this.getEdgeById(a.edgeId);
        const edgeB = this.getEdgeById(b.edgeId);
        const nodeA = this.getNodeById(a.to);
        const nodeB = this.getNodeById(b.to);
        let result = 0;

        if (this.weighted && edgeA && edgeB) {
            result = edgeA.compareTo(edgeB);
        }

        if (result === 0 && nodeA && nodeB) {
            result = nodeA.compareTo(nodeB);
        }

        return result;
    }

    /**
     * Add node.
     *
     * @param {number} x - X position.
     * @param {number} y - Y position.
     * @param {string|null} label - Optional label.
     * @param {number|string|null|undefined} radius - Optional radius.
     * @returns {Node} Created node.
     */
    addNode(x, y, label = null, radius = null) {
        this.saveHistory();

        const id = Graph.createNodeId();
        const resolvedLabel = label === null ? String(this.nodeOrder.length + 1) : String(label);
        const node = new Node(id, resolvedLabel, x, y, radius);

        this.nodeMap.set(node.id, node);
        this.nodeOrder.push(node.id);

        return node;
    }

    /**
     * Remove node and connected edges.
     *
     * @param {string} id - Node id.
     */
    removeNode(id) {
        const nodeId = String(id);

        if (this.nodeMap.has(nodeId)) {
            this.saveHistory();

            this.nodeMap.delete(nodeId);

            this.nodeOrder = this.nodeOrder.filter(function keep(value) {
                return value !== nodeId;
            });

            this.edgeOrder.forEach(function inspect(edgeId) {
                const edge = this.edgeMap.get(edgeId);

                if (edge && (edge.from === nodeId || edge.to === nodeId)) {
                    this.edgeMap.delete(edgeId);
                }
            }, this);

            this.edgeOrder = this.edgeOrder.filter(function keep(edgeId) {
                return this.edgeMap.has(edgeId);
            }, this);
        }
    }

    /**
     * Add edge.
     *
     * @param {string} from - Source node id.
     * @param {string} to - Target node id.
     * @param {number|string} weight - Edge weight.
     * @returns {Edge|null} Created edge.
     */
    addEdge(from, to, weight = 1) {
        const fromId = String(from);
        const toId = String(to);
        let edge = null;

        if (
            this.nodeMap.has(fromId) &&
            this.nodeMap.has(toId) &&
            fromId !== toId &&
            !this.edgeExists(fromId, toId)
        ) {
            this.saveHistory();

            const id = Graph.createEdgeId(fromId, toId, this.directed);
            edge = new Edge(id, fromId, toId, weight);

            this.edgeMap.set(edge.id, edge);
            this.edgeOrder.push(edge.id);
        }

        return edge;
    }

    /**
     * Remove edge.
     *
     * @param {string} id - Edge id.
     */
    removeEdge(id) {
        const edgeId = String(id);

        if (this.edgeMap.has(edgeId)) {
            this.saveHistory();
            this.edgeMap.delete(edgeId);

            this.edgeOrder = this.edgeOrder.filter(function keep(value) {
                return value !== edgeId;
            });
        }
    }

    /**
     * Check whether an edge exists.
     *
     * @param {string} from - Source node id.
     * @param {string} to - Target node id.
     * @returns {boolean} True when edge exists.
     */
    edgeExists(from, to) {
        const fromId = String(from);
        const toId = String(to);
        let exists = false;

        this.edgeMap.forEach(function inspect(edge) {
            if (edge.from === fromId && edge.to === toId) {
                exists = true;
            }

            if (!this.directed && edge.from === toId && edge.to === fromId) {
                exists = true;
            }
        }, this);

        return exists;
    }

    /**
     * Get node by id.
     *
     * @param {string} id - Node id.
     * @returns {Node|null} Node.
     */
    getNodeById(id) {
        return this.nodeMap.get(String(id)) || null;
    }

    /**
     * Get edge by id.
     *
     * @param {string} id - Edge id.
     * @returns {Edge|null} Edge.
     */
    getEdgeById(id) {
        return this.edgeMap.get(String(id)) || null;
    }

    /**
     * Find node at position.
     *
     * @param {number} x - X position.
     * @param {number} y - Y position.
     * @returns {Node|null} Node at position.
     */
    findNodeAt(x, y) {
        let foundNode = null;

        for (let i = this.nodeOrder.length - 1; i >= 0 && foundNode === null; i -= 1) {
            const node = this.nodeMap.get(this.nodeOrder[i]);

            if (node && node.containsPoint(x, y)) {
                foundNode = node;
            }
        }

        return foundNode;
    }

    /**
     * Find edge at position.
     *
     * @param {number} x - X position.
     * @param {number} y - Y position.
     * @returns {Edge|null} Edge at position.
     */
    findEdgeAt(x, y) {
        let foundEdge = null;

        for (let i = this.edgeOrder.length - 1; i >= 0 && foundEdge === null; i -= 1) {
            const edge = this.edgeMap.get(this.edgeOrder[i]);

            if (edge && edge.containsPoint(x, y, this)) {
                foundEdge = edge;
            }
        }

        return foundEdge;
    }

    /**
     * Normalize all edge weights to 1.
     */
    normalizeWeights() {
        this.edgeMap.forEach(function normalize(edge) {
            edge.setWeight(1);
        });
    }

    /**
     * Draw all edges in render order.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     */
    drawEdges(ctx) {
        this.edgeOrder.forEach(function drawEdge(edgeId) {
            const edge = this.edgeMap.get(edgeId);

            if (edge) {
                edge.draw(ctx, this);
            }
        }, this);
    }

    /**
     * Draw all nodes in render order.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {App} app - App instance.
     */
    drawNodes(ctx, app) {
        this.nodeOrder.forEach(function drawNode(nodeId) {
            const node = this.nodeMap.get(nodeId);

            if (node) {
                node.draw(ctx, app.getTraversalDistance(node.id));
            }
        }, this);
    }

    /**
     * Draw final path edges over regular edges.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     */
    drawPathEdges(ctx) {
        this.edgeOrder.forEach(function drawPathEdge(edgeId) {
            const edge = this.edgeMap.get(edgeId);

            if (edge && edge.renderState.path) {
                edge.draw(ctx, this);
            }
        }, this);
    }

    /**
     * Draw final path nodes over regular nodes.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {App} app - App instance.
     */
    drawPathNodes(ctx, app) {
        this.nodeOrder.forEach(function drawPathNode(nodeId) {
            const node = this.nodeMap.get(nodeId);

            if (node && node.renderState.path) {
                node.draw(ctx, app.getTraversalDistance(node.id));
            }
        }, this);
    }

    /**
     * Export graph.
     *
     * @returns {object} Serialized graph data.
     */
    export() {
        const nodes = [];
        const edges = [];

        this.nodeOrder.forEach(function exportNode(id) {
            const node = this.nodeMap.get(id);

            if (node) {
                nodes.push(node.toJSON());
            }
        }, this);

        this.edgeOrder.forEach(function exportEdge(id) {
            const edge = this.edgeMap.get(id);

            if (edge) {
                edges.push(edge.toJSON());
            }
        }, this);

        return {
            directed: this.directed,
            weighted: this.weighted,
            nodes,
            edges
        };
    }

    /**
     * Import graph.
     *
     * @param {object} data - Serialized graph data.
     */
    import(data) {
        if (!data || typeof data !== "object") {
            throw new Error("Invalid graph data.");
        }

        if (!this.#historyLocked) {
            this.saveHistory();
        }

        this.reset();

        this.directed = Boolean(data.directed);
        this.weighted = Boolean(data.weighted);

        if (Array.isArray(data.nodes)) {
            data.nodes.forEach(function importNode(raw) {
                const node = Node.fromJSON(raw);

                if (!this.nodeMap.has(node.id)) {
                    this.nodeMap.set(node.id, node);
                    this.nodeOrder.push(node.id);
                }
            }, this);
        }

        if (Array.isArray(data.edges)) {
            data.edges.forEach(function importEdge(raw) {
                const edge = Edge.fromJSON(raw);

                if (
                    !this.edgeMap.has(edge.id) &&
                    this.nodeMap.has(edge.from) &&
                    this.nodeMap.has(edge.to)
                ) {
                    this.edgeMap.set(edge.id, edge);
                    this.edgeOrder.push(edge.id);
                }
            }, this);
        }
    }
}

/**
 * Geometry helpers.
 */
class Geometry {
    /**
     * Calculate point distance.
     *
     * @param {number} x1 - First x.
     * @param {number} y1 - First y.
     * @param {number} x2 - Second x.
     * @param {number} y2 - Second y.
     * @returns {number} Distance.
     */
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate distance from point to line segment.
     *
     * @param {number} px - Point x.
     * @param {number} py - Point y.
     * @param {number} x1 - Segment start x.
     * @param {number} y1 - Segment start y.
     * @param {number} x2 - Segment end x.
     * @param {number} y2 - Segment end y.
     * @returns {number} Distance.
     */
    static distanceToSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        let distance;

        if (dx === 0 && dy === 0) {
            distance = Geometry.distance(px, py, x1, y1);
        } else {
            const ratio = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
            const t = Math.max(0, Math.min(1, ratio));
            const projectedX = x1 + t * dx;
            const projectedY = y1 + t * dy;

            distance = Geometry.distance(px, py, projectedX, projectedY);
        }

        return distance;
    }
}


/**
 * Creates traversal and pathfinding plans from a graph.
 */
class Traversal {
    /**
     * Create traversal helper.
     *
     * @param {Graph} graph - Graph.
     */
    constructor(graph) {
        this.graph = graph;
    }

    /**
     * Create traversal plan.
     *
     * @param {string} algorithm - Algorithm id.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional end node id.
     * @returns {object} Traversal plan.
     */
    createPlan(algorithm, startId, endId) {
        let plan;

        if (algorithm === "bfs") {
            plan = this.#createBfsPlan(startId, endId);
        } else if (algorithm === "dfs") {
            plan = this.#createDfsPlan(startId, endId);
        } else if (algorithm === "dijkstra") {
            plan = this.#createDijkstraPlan(startId, endId);
        } else if (algorithm === "prim") {
            plan = this.#createPrimPlan(startId);
        } else {
            plan = this.#createBellmanFordPlan(startId, endId);
        }

        return plan;
    }

    /**
     * Create shared traversal state.
     *
     * @returns {object} Traversal state.
     */
    #createState() {
        return {
            parent: new Map(),
            steps: [],
            order: []
        };
    }

    /**
     * Add visit step.
     *
     * @param {object} state - Traversal state.
     * @param {string} nodeId - Node id.
     * @param {Map<string, number>|null} distances - Optional distances.
     */
    #addVisitStep(state, nodeId, distances = null) {
        state.order.push(nodeId);
        state.steps.push(this.#createStep("visit", null, nodeId, null, distances));
    }

    /**
     * Add discover step.
     *
     * @param {object} state - Traversal state.
     * @param {string} from - Source node id.
     * @param {string} nodeId - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {Map<string, number>|null} distances - Optional distances.
     */
    #addDiscoverStep(state, from, nodeId, edgeId, distances = null) {
        state.steps.push(this.#createStep("discover", from, nodeId, edgeId, distances));
    }

    /**
     * Create traversal step.
     *
     * @param {string} type - Step type.
     * @param {string|null} from - Source node id.
     * @param {string} nodeId - Node id.
     * @param {string|null} edgeId - Edge id.
     * @param {Map<string, number>|null} distances - Optional distances.
     * @returns {object} Step.
     */
    #createStep(type, from, nodeId, edgeId, distances) {
        const step = {
            type,
            nodeId
        };

        if (from !== null) {
            step.from = from;
        }

        if (edgeId !== null) {
            step.edgeId = edgeId;
        }

        if (distances !== null) {
            step.distances = new Map(distances);
        }

        return step;
    }

    /**
     * Record parent relationship.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} nodeId - Child node id.
     * @param {string} prev - Parent node id.
     * @param {string} edgeId - Edge id.
     */
    #setParent(parent, nodeId, prev, edgeId) {
        parent.set(nodeId, {
            prev,
            edgeId
        });
    }

    /**
     * Create normalized traversal plan object.
     *
     * @param {string} name - Display name.
     * @param {string} algorithm - Algorithm id.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - End node id.
     * @param {object} state - Traversal state.
     * @param {Map<string, number>|null} distances - Distances.
     * @param {object} metadata - Metadata.
     * @returns {object} Plan object.
     */
    #createPlanObject(name, algorithm, startId, endId, state, distances = null, metadata = {}) {
        return {
            name,
            algorithm,
            startId,
            endId,
            steps: state.steps,
            order: state.order,
            parent: state.parent,
            distances,
            metadata,
            index: 0
        };
    }

    //------ BFS ------//
    /**
     * Build adjacency list.
     *
     * @returns {Map<string, Array<object>>} Adjacency list.
     */
    #buildAdjacencyList() {
        const adjacency = new Map();

        this.graph.nodeOrder.forEach(function initNode(nodeId) {
            if (this.graph.nodeMap.has(nodeId)) {
                adjacency.set(nodeId, []);
            }
        }, this);

        this.graph.edgeOrder.forEach(function addEdge(edgeId) {
            const edge = this.graph.edgeMap.get(edgeId);

            if (edge) {
                this.#addAdjacencyEdge(adjacency, edge.from, edge.to, edge.id, edge.weight);

                if (!this.graph.directed) {
                    this.#addAdjacencyEdge(adjacency, edge.to, edge.from, edge.id, edge.weight);
                }
            }
        }, this);

        adjacency.forEach(function sortNeighbors(neighbors) {
            const graph = this.graph;

            neighbors.sort(function compare(a, b) {
                return graph.compareNeighbors(a, b);
            });
        }, this);

        return adjacency;
    }

    /**
     * Add adjacency edge.
     *
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {string} from - Source id.
     * @param {string} to - Target id.
     * @param {string} edgeId - Edge id.
     * @param {number} weight - Edge weight.
     */
    #addAdjacencyEdge(adjacency, from, to, edgeId, weight) {
        if (adjacency.has(from)) {
            adjacency.get(from).push({
                to,
                edgeId,
                weight: this.graph.weighted ? Number(weight) : 1
            });
        }
    }

    /**
     * Create BFS traversal plan.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional end node.
     * @returns {object} Plan.
     */
    #createBfsPlan(startId, endId) {
        const adjacency = this.#buildAdjacencyList();
        const state = this.#createState();
        const visited = new Set([startId]);
        const queue = [startId];

        while (queue.length > 0) {
            const current = queue.shift();

            this.#addVisitStep(state, current);

            if (endId !== null && current === endId) {
                break;
            }

            this.#expandBfsNode(current, adjacency, visited, queue, state);
        }

        return this.#createPlanObject("BFS", "bfs", startId, endId, state);
    }

    /**
     * Expand one BFS node.
     *
     * @param {string} current - Current node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited ids.
     * @param {string[]} queue - Queue.
     * @param {object} state - Traversal state.
     */
    #expandBfsNode(current, adjacency, visited, queue, state) {
        const neighbors = adjacency.get(current) || [];

        for (let i = 0; i < neighbors.length; i += 1) {
            const edge = neighbors[i];

            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                queue.push(edge.to);
                this.#setParent(state.parent, edge.to, current, edge.edgeId);
                this.#addDiscoverStep(state, current, edge.to, edge.edgeId);
            }
        }
    }

    //------ DFS ------//
    /**
     * Create DFS traversal plan.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional end node.
     * @returns {object} Plan.
     */
    #createDfsPlan(startId, endId) {
        const adjacency = this.#buildAdjacencyList();
        const state = this.#createState();
        const visited = new Set();

        this.#visitDfsNode(startId, endId, adjacency, visited, state);

        return this.#createPlanObject("DFS", "dfs", startId, endId, state);
    }

    /**
     * Visit DFS node recursively.
     *
     * @param {string} nodeId - Node id.
     * @param {string|null} endId - Optional end node.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited ids.
     * @param {object} state - Traversal state.
     * @returns {boolean} True when target found.
     */
    #visitDfsNode(nodeId, endId, adjacency, visited, state) {
        visited.add(nodeId);
        this.#addVisitStep(state, nodeId);

        return (endId !== null && nodeId === endId) ||
            this.#expandDfsNode(nodeId, endId, adjacency, visited, state);
    }

    /**
     * Expand DFS neighbors.
     *
     * @param {string} nodeId - Node id.
     * @param {string|null} endId - Optional end node.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited ids.
     * @param {object} state - Traversal state.
     * @returns {boolean} True when target found.
     */
    #expandDfsNode(nodeId, endId, adjacency, visited, state) {
        const neighbors = adjacency.get(nodeId) || [];
        let found = false;

        for (let i = 0; i < neighbors.length && !found; i += 1) {
            const edge = neighbors[i];

            if (!visited.has(edge.to)) {
                this.#setParent(state.parent, edge.to, nodeId, edge.edgeId);
                this.#addDiscoverStep(state, nodeId, edge.to, edge.edgeId);
                found = this.#visitDfsNode(edge.to, endId, adjacency, visited, state);
            }
        }

        return found;
    }

    //------ Dijkstra ------//
    /**
     * Create Dijkstra shortest-path plan.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional end node id.
     * @returns {object} Plan.
     */
    #createDijkstraPlan(startId, endId) {
        const adjacency = this.#buildAdjacencyList();
        const state = this.#createState();
        const distances = this.#createInitialDistances(startId);
        const visited = new Set();

        while (visited.size < this.graph.nodeMap.size) {
            const current = this.#findNearestUnvisited(distances, visited);

            if (current === null) {
                break;
            }

            visited.add(current);
            this.#addVisitStep(state, current, distances);

            if (endId !== null && current === endId) {
                break;
            }

            this.#relaxNeighbors(current, adjacency, distances, visited, state);
        }

        return this.#createPlanObject("Dijkstra", "dijkstra", startId, endId, state, distances);
    }

    /**
     * Create an initial distance map.
     *
     * @param {string} startId - Start node id.
     * @returns {Map<string, number>} Distance map.
     */
    #createInitialDistances(startId) {
        const distances = new Map();

        this.graph.nodeOrder.forEach(function initDistance(nodeId) {
            if (this.graph.nodeMap.has(nodeId)) {
                distances.set(nodeId, Infinity);
            }
        }, this);

        distances.set(startId, 0);

        return distances;
    }

    /**
     * Find nearest unvisited node.
     *
     * @param {Map<string, number>} distances - Distance map.
     * @param {Set<string>} visited - Visited node ids.
     * @returns {string|null} Node id or null.
     */
    #findNearestUnvisited(distances, visited) {
        let bestId = null;
        let bestDistance = Infinity;

        distances.forEach(function inspect(distance, nodeId) {
            if (!visited.has(nodeId) && distance < bestDistance) {
                bestId = nodeId;
                bestDistance = distance;
            }
        });

        return bestId;
    }

    /**
     * Relax neighbors for shortest-path algorithms.
     *
     * @param {string} current - Current node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Map<string, number>} distances - Distance map.
     * @param {Set<string>} visited - Visited node ids.
     * @param {object} state - Traversal state.
     */
    #relaxNeighbors(current, adjacency, distances, visited, state) {
        const neighbors = adjacency.get(current) || [];

        for (let i = 0; i < neighbors.length; i += 1) {
            const edge = neighbors[i];

            if (!visited.has(edge.to)) {
                this.#tryRelaxEdge(current, edge, distances, state);
            }
        }
    }

    /**
     * Try relaxing one edge.
     *
     * @param {string} from - Source node id.
     * @param {object} edge - Edge descriptor.
     * @param {Map<string, number>} distances - Distance map.
     * @param {object} state - Traversal state.
     * @returns {boolean} True when relaxed.
     */
    #tryRelaxEdge(from, edge, distances, state) {
        let relaxed = false;
        const fromDistance = distances.get(from);

        if (Number.isFinite(fromDistance)) {
            const candidate = fromDistance + edge.weight;

            if (candidate < distances.get(edge.to)) {
                distances.set(edge.to, candidate);
                this.#setParent(state.parent, edge.to, from, edge.edgeId);
                this.#addDiscoverStep(state, from, edge.to, edge.edgeId, distances);
                relaxed = true;
            }
        }

        return relaxed;
    }

    //------ Prim ------//
    /**
     * Create Prim minimum spanning tree plan.
     *
     * @param {string} startId - Start node id.
     * @returns {object} Plan.
     */
    #createPrimPlan(startId) {
        const adjacency = this.#buildAdjacencyList();
        const state = this.#createState();
        const visited = new Set([startId]);
        let totalWeight = 0;

        this.#addVisitStep(state, startId);

        while (visited.size < this.graph.nodeMap.size) {
            const candidate = this.#findLowestPrimCandidate(adjacency, visited);

            if (candidate === null) {
                break;
            }

            visited.add(candidate.to);
            totalWeight += candidate.weight;

            this.#setParent(state.parent, candidate.to, candidate.from, candidate.edgeId);
            this.#addDiscoverStep(state, candidate.from, candidate.to, candidate.edgeId);
            this.#addVisitStep(state, candidate.to);
        }

        return this.#createPlanObject("Prim's MST", "prim", startId, null, state, null, {
            totalWeight,
            connected: visited.size === this.graph.nodeMap.size
        });
    }

    /**
     * Find the lowest Prim candidate edge.
     *
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited node ids.
     * @returns {object|null} Candidate edge.
     */
    #findLowestPrimCandidate(adjacency, visited) {
        let best = null;

        visited.forEach(function inspectNode(fromId) {
            const neighbors = adjacency.get(fromId) || [];

            for (let i = 0; i < neighbors.length; i += 1) {
                const edge = neighbors[i];

                if (!visited.has(edge.to) && this.#isBetterPrimCandidate(edge, fromId, best)) {
                    best = {
                        from: fromId,
                        to: edge.to,
                        edgeId: edge.edgeId,
                        weight: edge.weight
                    };
                }
            }
        }, this);

        return best;
    }

    /**
     * Compare Prim candidate edge.
     *
     * @param {object} edge - Edge descriptor.
     * @param {string} fromId - Source node id.
     * @param {object|null} currentBest - Current best candidate.
     * @returns {boolean} True when edge is better.
     */
    #isBetterPrimCandidate(edge, fromId, currentBest) {
        let better = false;

        if (currentBest === null) {
            better = true;
        } else if (edge.weight < currentBest.weight) {
            better = true;
        } else if (edge.weight === currentBest.weight && String(fromId).localeCompare(String(currentBest.from)) < 0) {
            better = true;
        } else if (
            edge.weight === currentBest.weight &&
            String(fromId) === String(currentBest.from) &&
            String(edge.to).localeCompare(String(currentBest.to)) < 0
        ) {
            better = true;
        }

        return better;
    }

    //------ Bellman-Ford ------//
    /**
     * Create Bellman-Ford shortest-path plan.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional end node id.
     * @returns {object} Plan.
     */
    #createBellmanFordPlan(startId, endId) {
        const state = this.#createState();
        const distances = this.#createInitialDistances(startId);
        const edges = this.#createRelaxationEdges();

        this.#addVisitStep(state, startId, distances);
        this.#runBellmanFordPasses(edges, distances, state);

        return this.#createPlanObject("Bellman-Ford", "bellman-ford", startId, endId, state, distances, {
            negativeCycle: this.#hasReachableNegativeCycle(edges, distances)
        });
    }

    /**
     * Create directed relaxation edge list.
     *
     * @returns {object[]} Relaxation edges.
     */
    #createRelaxationEdges() {
        const edges = [];

        this.graph.edgeOrder.forEach(function addEdge(edgeId) {
            const edge = this.graph.edgeMap.get(edgeId);

            if (edge) {
                this.#addRelaxationEdge(edges, edge.from, edge.to, edge.id, edge.weight);

                if (!this.graph.directed) {
                    this.#addRelaxationEdge(edges, edge.to, edge.from, edge.id, edge.weight);
                }
            }
        }, this);

        return edges;
    }

    /**
     * Add one relaxation edge.
     *
     * @param {object[]} edges - Relaxation edges.
     * @param {string} from - Source node id.
     * @param {string} to - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {number} weight - Edge weight.
     */
    #addRelaxationEdge(edges, from, to, edgeId, weight) {
        edges.push({
            from,
            to,
            edgeId,
            weight: this.graph.weighted ? Number(weight) : 1
        });
    }

    /**
     * Run Bellman-Ford relaxation passes.
     *
     * @param {object[]} edges - Relaxation edges.
     * @param {Map<string, number>} distances - Distance map.
     * @param {object} state - Traversal state.
     */
    #runBellmanFordPasses(edges, distances, state) {
        for (let pass = 1; pass < this.graph.nodeMap.size; pass += 1) {
            const changed = this.#relaxBellmanFordPass(edges, distances, state);

            if (!changed) {
                break;
            }
        }
    }

    /**
     * Run one Bellman-Ford pass.
     *
     * @param {object[]} edges - Relaxation edges.
     * @param {Map<string, number>} distances - Distance map.
     * @param {object} state - Traversal state.
     * @returns {boolean} True when anything changed.
     */
    #relaxBellmanFordPass(edges, distances, state) {
        let changed = false;

        for (let i = 0; i < edges.length; i += 1) {
            if (this.#tryRelaxBellmanFordEdge(edges[i], distances, state)) {
                changed = true;
            }
        }

        return changed;
    }

    /**
     * Try relaxing one Bellman-Ford edge.
     *
     * @param {object} edge - Relaxation edge.
     * @param {Map<string, number>} distances - Distance map.
     * @param {object} state - Traversal state.
     * @returns {boolean} True when relaxed.
     */
    #tryRelaxBellmanFordEdge(edge, distances, state) {
        let relaxed = false;
        const fromDistance = distances.get(edge.from);

        if (Number.isFinite(fromDistance)) {
            const candidate = fromDistance + edge.weight;

            if (candidate < distances.get(edge.to)) {
                distances.set(edge.to, candidate);
                this.#setParent(state.parent, edge.to, edge.from, edge.edgeId);
                this.#addDiscoverStep(state, edge.from, edge.to, edge.edgeId, distances);
                this.#addVisitStep(state, edge.to, distances);
                relaxed = true;
            }
        }

        return relaxed;
    }

    /**
     * Detect reachable negative cycle.
     *
     * @param {object[]} edges - Relaxation edges.
     * @param {Map<string, number>} distances - Distance map.
     * @returns {boolean} True when negative cycle exists.
     */
    #hasReachableNegativeCycle(edges, distances) {
        let found = false;

        for (let i = 0; i < edges.length && !found; i += 1) {
            const edge = edges[i];
            const fromDistance = distances.get(edge.from);

            if (Number.isFinite(fromDistance) && fromDistance + edge.weight < distances.get(edge.to)) {
                found = true;
            }
        }

        return found;
    }
}


/**
 * Coordinates graph data, canvas rendering, UI controls, and interactions.
 */
class App {
    graph = new Graph();

    #elements;
    #ctx;
    #uiState;

    /**
     * Create app.
     */
    constructor() {
        this.#elements = this.#getElements();
        this.#ctx = this.#elements.canvas.getContext("2d");
        this.#uiState = this.#createUiState();

        this.#bindEvents();
        this.resizeCanvas();
        this.refreshNodeSelectors();
        this.syncControls();
        this.setStatus("Ready.");
        this.draw();
    }

    /**
     * Convert number to letters.
     *
     * @param {number} value - Number.
     * @returns {string} Letter label.
     */
    static numberToLetters(value) {
        let number = Number(value);
        let label = "";

        while (number > 0) {
            number -= 1;
            label = String.fromCharCode(65 + (number % 26)) + label;
            number = Math.floor(number / 26);
        }

        return label;
    }

    /**
     * Get traversal distance for a node.
     *
     * @param {string} nodeId - Node id.
     * @returns {number|undefined} Distance.
     */
    getTraversalDistance(nodeId) {
        return this.#uiState.traversal.distances.get(nodeId);
    }

    /**
     * Create UI state.
     *
     * @returns {object} UI state.
     */
    #createUiState() {
        return {
            mode: "add-node",
            selectedNodeIdForEdge: null,
            draggedNodeId: null,
            hoveredNodeId: null,
            hoveredEdgeId: null,
            edgeWeightDraft: 1,
            editSelection: null,
            viewport: {
                x: 0,
                y: 0,
                scale: 1,
                dragging: false,
                lastX: 0,
                lastY: 0,
                moved: false
            },
            traversal: {
                plan: null,
                index: 0,
                running: false,
                token: 0,
                distances: new Map()
            }
        };
    }

    /**
     * Collect DOM elements.
     *
     * @returns {object} Elements.
     */
    #getElements() {
        return {
            canvas: document.querySelector("#graph-editor canvas"),

            modeSelect: document.getElementById("mode-select"),
            modePill: document.getElementById("mode-pill"),

            nodeLabelModeSelect: document.getElementById("node-label-mode-select"),
            defaultNodeRadiusInput: document.getElementById("default-node-radius-input"),

            directedToggle: document.getElementById("directed-toggle"),
            weightedToggle: document.getElementById("weighted-toggle"),
            edgeWeightRow: document.getElementById("edge-weight-row"),
            edgeWeightInput: document.getElementById("edge-weight-input"),

            editEmptyHelp: document.getElementById("edit-empty-help"),
            nodeEditControls: document.getElementById("node-edit-controls"),
            edgeEditControls: document.getElementById("edge-edit-controls"),
            editButtons: document.getElementById("edit-buttons"),
            editNodeLabelInput: document.getElementById("edit-node-label-input"),
            editNodeRadiusInput: document.getElementById("edit-node-radius-input"),
            editEdgeWeightRow: document.getElementById("edit-edge-weight-row"),
            editEdgeWeightInput: document.getElementById("edit-edge-weight-input"),
            edgeUnweightedHelp: document.getElementById("edge-unweighted-help"),

            startNodeSelect: document.getElementById("start-node-select"),
            endNodeSelect: document.getElementById("end-node-select"),
            algorithmSelect: document.getElementById("algorithm-select"),
            delayInput: document.getElementById("delay-input"),
            traversalOutput: document.getElementById("traversal-output"),

            jsonArea: document.getElementById("json-area"),
            statusBox: document.getElementById("graph-status"),

            runTraversalBtn: document.getElementById("run-traversal-btn"),
            stepTraversalBtn: document.getElementById("step-traversal-btn"),
            clearTraversalBtn: document.getElementById("clear-traversal-btn"),
            stopTraversalBtn: document.getElementById("stop-traversal-btn"),

            exportBtn: document.getElementById("export-btn"),
            importBtn: document.getElementById("import-btn"),
            saveLocalBtn: document.getElementById("save-local-btn"),
            loadLocalBtn: document.getElementById("load-local-btn"),

            clearGraphBtn: document.getElementById("clear-graph-btn"),
            sampleGraphBtn: document.getElementById("sample-graph-btn"),

            applyEditBtn: document.getElementById("apply-edit-btn"),
            clearEditSelectionBtn: document.getElementById("clear-edit-selection-btn")
        };
    }

    /**
     * Bind event listeners.
     */
    #bindEvents() {
        this.#elements.modeSelect.addEventListener("change", this.handleModeChange.bind(this));

        this.#elements.nodeLabelModeSelect.addEventListener("change", this.handleNodeLabelModeChange.bind(this));
        this.#elements.defaultNodeRadiusInput.addEventListener("input", this.handleDefaultNodeRadiusInput.bind(this));

        this.#elements.directedToggle.addEventListener("change", this.handleDirectedToggle.bind(this));
        this.#elements.weightedToggle.addEventListener("change", this.handleWeightedToggle.bind(this));
        this.#elements.edgeWeightInput.addEventListener("input", this.handleEdgeWeightDraft.bind(this));

        this.#elements.editNodeLabelInput.addEventListener("input", this.handleEditNodeLabelInput.bind(this));
        this.#elements.editNodeRadiusInput.addEventListener("input", this.handleEditNodeRadiusInput.bind(this));
        this.#elements.editEdgeWeightInput.addEventListener("input", this.handleEditEdgeWeightInput.bind(this));
        this.#elements.applyEditBtn.addEventListener("click", this.applyEditSelection.bind(this));
        this.#elements.clearEditSelectionBtn.addEventListener("click", this.clearEditSelection.bind(this));

        this.#elements.canvas.addEventListener("click", this.handleCanvasClick.bind(this));
        this.#elements.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
        this.#elements.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
        this.#elements.canvas.addEventListener("wheel", this.handleWheel.bind(this), {passive: false});

        this.#elements.runTraversalBtn.addEventListener("click", this.runTraversal.bind(this));
        this.#elements.stepTraversalBtn.addEventListener("click", this.stepTraversal.bind(this));
        this.#elements.clearTraversalBtn.addEventListener("click", this.clearTraversal.bind(this));
        this.#elements.stopTraversalBtn.addEventListener("click", this.stopTraversal.bind(this));

        this.#elements.exportBtn.addEventListener("click", this.exportGraph.bind(this));
        this.#elements.importBtn.addEventListener("click", this.importGraph.bind(this));
        this.#elements.saveLocalBtn.addEventListener("click", this.saveLocal.bind(this));
        this.#elements.loadLocalBtn.addEventListener("click", this.loadLocal.bind(this));

        this.#elements.clearGraphBtn.addEventListener("click", this.clearGraph.bind(this));
        this.#elements.sampleGraphBtn.addEventListener("click", this.loadSampleGraph.bind(this));

        window.addEventListener("mouseup", this.handleMouseUp.bind(this));
        window.addEventListener("resize", this.resizeCanvas.bind(this));
        window.addEventListener("keydown", this.#handleKeyDown.bind(this));
    }

    /**
     * Handle keyboard shortcuts.
     *
     * @param {KeyboardEvent} event - Keyboard event.
     */
    #handleKeyDown(event) {
        const key = event.key.toLowerCase();
        const isModifierPressed = event.ctrlKey || event.metaKey;

        if (isModifierPressed && key === "z" && !event.shiftKey) {
            event.preventDefault();
            this.undoGraphChange();
        } else if (
            (isModifierPressed && key === "y") ||
            (isModifierPressed && event.shiftKey && key === "z")
        ) {
            event.preventDefault();
            this.redoGraphChange();
        }
    }

    /**
     * Resize canvas for device pixel ratio.
     */
    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.#elements.canvas.getBoundingClientRect();

        this.#elements.canvas.width = Math.floor(rect.width * dpr);
        this.#elements.canvas.height = Math.floor(rect.height * dpr);
        this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.draw();
    }

    /**
     * Draw full scene.
     */
    draw() {
        const width = this.#elements.canvas.clientWidth;
        const height = this.#elements.canvas.clientHeight;
        const viewport = this.#uiState.viewport;

        this.#ctx.clearRect(0, 0, width, height);
        this.#drawGrid(width, height);

        this.#ctx.save();
        this.#ctx.translate(viewport.x, viewport.y);
        this.#ctx.scale(viewport.scale, viewport.scale);

        this.graph.drawEdges(this.#ctx);
        this.graph.drawNodes(this.#ctx, this);
        this.#drawPathOverlay();

        this.#ctx.restore();
    }

    /**
     * Draw background grid.
     *
     * @param {number} width - Canvas width.
     * @param {number} height - Canvas height.
     */
    #drawGrid(width, height) {
        const viewport = this.#uiState.viewport;
        const spacing = 30 * viewport.scale;
        const startX = ((viewport.x % spacing) + spacing) % spacing;
        const startY = ((viewport.y % spacing) + spacing) % spacing;

        this.#ctx.save();
        this.#ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
        this.#ctx.lineWidth = 1;

        for (let x = startX; x <= width; x += spacing) {
            this.#ctx.beginPath();
            this.#ctx.moveTo(x, 0);
            this.#ctx.lineTo(x, height);
            this.#ctx.stroke();
        }

        for (let y = startY; y <= height; y += spacing) {
            this.#ctx.beginPath();
            this.#ctx.moveTo(0, y);
            this.#ctx.lineTo(width, y);
            this.#ctx.stroke();
        }

        this.#ctx.restore();
    }

    /**
     * Redraw final path/MST entities last so they stay visible.
     */
    #drawPathOverlay() {
        this.graph.drawPathEdges(this.#ctx);
        this.graph.drawPathNodes(this.#ctx, this);
    }

    /**
     * Convert mouse event to screen and world coordinates.
     *
     * @param {MouseEvent|WheelEvent} event - Mouse event.
     * @returns {object} Pointer.
     */
    #getPointer(event) {
        const rect = this.#elements.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        return {
            screenX,
            screenY,
            x: (screenX - this.#uiState.viewport.x) / this.#uiState.viewport.scale,
            y: (screenY - this.#uiState.viewport.y) / this.#uiState.viewport.scale
        };
    }

    /**
     * Sync all controls from current app state.
     */
    syncControls() {
        this.#syncModePanels();
        this.#syncComposeControls();
        this.#syncEditControls();
        this.#updateSummaryPills();
    }

    /**
     * Sync active mode panel.
     */
    #syncModePanels() {
        const panelIds = {
            "add-node": "panel-add-node",
            "add-edge": "panel-add-edge",
            edit: "panel-edit",
            move: "panel-move",
            delete: "panel-delete"
        };

        Object.keys(panelIds).forEach(function syncPanel(mode) {
            document.getElementById(panelIds[mode]).hidden = mode !== this.#uiState.mode;
        }, this);
    }

    /**
     * Sync compose controls.
     */
    #syncComposeControls() {
        this.#elements.defaultNodeRadiusInput.value = String(Node.DEFAULT_RADIUS);
        this.#elements.directedToggle.checked = this.graph.directed;
        this.#elements.weightedToggle.checked = this.graph.weighted;
        this.#elements.edgeWeightRow.hidden = !this.graph.weighted;
        this.#elements.edgeWeightInput.value = String(this.#uiState.edgeWeightDraft);
    }

    /**
     * Sync edit controls.
     */
    #syncEditControls() {
        const selection = this.#uiState.editSelection;
        const hasNode = selection && selection.type === "node";
        const hasEdge = selection && selection.type === "edge";

        this.#elements.editEmptyHelp.hidden = hasNode || hasEdge;
        this.#elements.nodeEditControls.hidden = !hasNode;
        this.#elements.edgeEditControls.hidden = !hasEdge;
        this.#elements.editButtons.hidden = !(hasNode || hasEdge);

        if (hasNode) {
            this.#syncNodeEditControls(selection);
        }

        if (hasEdge) {
            this.#syncEdgeEditControls(selection);
        }
    }

    /**
     * Sync node edit controls.
     *
     * @param {object} selection - Node edit selection.
     */
    #syncNodeEditControls(selection) {
        this.#elements.editNodeLabelInput.value = selection.label;
        this.#elements.editNodeRadiusInput.value = selection.radius === null ? "" : String(selection.radius);
        this.#elements.editNodeRadiusInput.placeholder = String(Node.DEFAULT_RADIUS);
    }

    /**
     * Sync edge edit controls.
     *
     * @param {object} selection - Edge edit selection.
     */
    #syncEdgeEditControls(selection) {
        this.#elements.editEdgeWeightRow.hidden = !this.graph.weighted;
        this.#elements.edgeUnweightedHelp.hidden = this.graph.weighted;
        this.#elements.editEdgeWeightInput.value = String(selection.weight);
    }

    /**
     * Update summary pills.
     */
    #updateSummaryPills() {
        this.#elements.modePill.textContent =
            this.#elements.modeSelect.options[this.#elements.modeSelect.selectedIndex].text;
    }

    /**
     * Set status message.
     *
     * @param {string} message - Message.
     */
    setStatus(message) {
        this.#elements.statusBox.textContent = message;
    }

    /**
     * Reset temporary compose selections.
     */
    #resetComposeSelection() {
        this.#uiState.selectedNodeIdForEdge = null;
        this.#uiState.editSelection = null;
        this.#clearSelectedState();
    }

    /**
     * Clear selected render state from all entities.
     */
    #clearSelectedState() {
        this.graph.nodeMap.forEach(function clearNode(node) {
            node.renderState.setSelected(false);
        });

        this.graph.edgeMap.forEach(function clearEdge(edge) {
            edge.renderState.setSelected(false);
        });
    }

    /**
     * Undo graph change.
     */
    undoGraphChange() {
        if (this.graph.undo()) {
            this.#resetAfterGraphLoad();
            this.setStatus("Undo.");
        } else {
            this.setStatus("Nothing to undo.");
        }
    }

    /**
     * Redo graph change.
     */
    redoGraphChange() {
        if (this.graph.redo()) {
            this.#resetAfterGraphLoad();
            this.setStatus("Redo.");
        } else {
            this.setStatus("Nothing to redo.");
        }
    }

    /**
     * Handle mode change.
     */
    handleModeChange() {
        this.#uiState.mode = this.#elements.modeSelect.value;
        this.#resetComposeSelection();

        this.syncControls();
        this.setStatus("Mode changed.");
        this.draw();
    }

    /**
     * Handle node label mode change.
     */
    handleNodeLabelModeChange() {
        this.setStatus("New nodes will use selected label style.");
    }

    /**
     * Handle default node radius input.
     */
    handleDefaultNodeRadiusInput() {
        const parsed = Number(this.#elements.defaultNodeRadiusInput.value);

        if (Number.isFinite(parsed) && parsed > 0) {
            Node.setDefaultRadius(parsed);
            this.syncControls();
            this.setStatus("Default node radius updated.");
            this.draw();
        }
    }

    /**
     * Handle directed toggle.
     */
    handleDirectedToggle() {
        this.graph.saveHistory();

        this.graph.directed = this.#elements.directedToggle.checked;
        this.#resetComposeSelection();

        this.syncControls();
        this.setStatus(this.graph.directed ? "Directed graph." : "Undirected graph.");
        this.draw();
    }

    /**
     * Handle weighted toggle.
     */
    handleWeightedToggle() {
        this.graph.saveHistory();

        this.graph.weighted = this.#elements.weightedToggle.checked;
        this.#resetComposeSelection();

        if (!this.graph.weighted) {
            this.graph.normalizeWeights();
        }

        this.syncControls();
        this.setStatus(this.graph.weighted ? "Weighted graph." : "Unweighted graph.");
        this.draw();
    }

    /**
     * Handle edge weight draft input.
     */
    handleEdgeWeightDraft() {
        const parsed = Number(this.#elements.edgeWeightInput.value);

        if (Number.isFinite(parsed)) {
            this.#uiState.edgeWeightDraft = parsed;
        }
    }

    /**
     * Handle canvas click.
     *
     * @param {MouseEvent} event - Mouse event.
     */
    handleCanvasClick(event) {
        if (this.#uiState.viewport.moved) {
            this.#uiState.viewport.moved = false;
        } else {
            this.#routeCanvasClick(this.#getPointer(event));
        }

        this.draw();
    }

    /**
     * Route canvas click by mode.
     *
     * @param {object} point - Pointer position.
     */
    #routeCanvasClick(point) {
        const node = this.graph.findNodeAt(point.x, point.y);
        const edge = node ? null : this.graph.findEdgeAt(point.x, point.y);

        if (this.#uiState.mode === "add-node") {
            this.#handleAddNode(point, node);
        } else if (this.#uiState.mode === "add-edge") {
            this.#handleAddEdgeMode(node);
        } else if (this.#uiState.mode === "edit") {
            this.#handleEditMode(node, edge);
        } else if (this.#uiState.mode === "delete") {
            this.#handleDeleteMode(node, edge);
        }

        this.#updateSummaryPills();
    }

    /**
     * Handle add-node mode.
     *
     * @param {object} point - Pointer position.
     * @param {Node|null} existingNode - Existing node at pointer.
     */
    #handleAddNode(point, existingNode) {
        if (!existingNode) {
            const node = this.graph.addNode(point.x, point.y);

            if (node) {
                node.label = this.#createNodeLabel();
                this.refreshNodeSelectors();
                this.setStatus("Node added.");
            }
        }
    }

    /**
     * Create a label for a new node.
     *
     * @returns {string} Node label.
     */
    #createNodeLabel() {
        if (this.#elements.nodeLabelModeSelect.value === "alphabetic") {
            return App.numberToLetters(this.graph.nodeOrder.length);
        }

        return String(this.graph.nodeOrder.length);
    }

    /**
     * Get node label.
     *
     * @param {string} nodeId - Node id.
     * @returns {string} Node label.
     */
    #getNodeLabel(nodeId) {
        const node = this.graph.getNodeById(nodeId);

        return node ? node.label : String(nodeId);
    }

    /**
     * Convert node id order to display labels.
     *
     * @param {string[]} order - Node id order.
     * @returns {string} Formatted order.
     */
    #formatNodeOrder(order) {
        return order.map(function formatNodeId(nodeId) {
            return this.#getNodeLabel(nodeId);
        }, this).join(" → ");
    }

    /**
     * Handle add-edge mode.
     *
     * @param {Node|null} node - Clicked node.
     */
    #handleAddEdgeMode(node) {
        if (node) {
            if (this.#uiState.selectedNodeIdForEdge === null) {
                this.#selectEdgeSource(node);
            } else if (this.#uiState.selectedNodeIdForEdge === node.id) {
                this.#cancelEdgeSource();
            } else {
                this.#createEdgeToNode(node);
            }
        }
    }

    /**
     * Select edge source node.
     *
     * @param {Node} node - Source node.
     */
    #selectEdgeSource(node) {
        this.#clearSelectedState();
        this.#uiState.selectedNodeIdForEdge = node.id;
        node.renderState.setSelected(true);
        this.setStatus(`Source node ${node.label} selected.`);
    }

    /**
     * Cancel selected edge source.
     */
    #cancelEdgeSource() {
        this.#uiState.selectedNodeIdForEdge = null;
        this.#clearSelectedState();
        this.setStatus("Edge selection canceled.");
    }

    /**
     * Create edge to destination node.
     *
     * @param {Node} node - Destination node.
     */
    #createEdgeToNode(node) {
        const fromId = this.#uiState.selectedNodeIdForEdge;
        const weight = this.#resolveEdgeWeight();
        const edge = weight === null ? null : this.graph.addEdge(fromId, node.id, weight);

        if (weight === null) {
            this.setStatus("Invalid weight.");
        } else if (!edge) {
            this.setStatus("That edge already exists or uses missing nodes.");
        } else {
            this.setStatus("Edge added.");
        }

        this.#cancelEdgeSource();
    }

    /**
     * Resolve edge weight.
     *
     * @returns {number|null} Edge weight or null.
     */
    #resolveEdgeWeight() {
        let weight = 1;

        if (this.graph.weighted) {
            const parsed = Number(this.#elements.edgeWeightInput.value);

            if (Number.isFinite(parsed)) {
                weight = parsed;
                this.#uiState.edgeWeightDraft = parsed;
            } else {
                weight = null;
            }
        }

        return weight;
    }

    /**
     * Handle edit mode.
     *
     * @param {Node|null} node - Node.
     * @param {Edge|null} edge - Edge.
     */
    #handleEditMode(node, edge) {
        this.#clearSelectedState();

        if (node) {
            this.#uiState.editSelection = this.#createNodeEditSelection(node);
            node.renderState.setSelected(true);
            this.setStatus(`Loaded node ${node.label}.`);
        } else if (edge) {
            this.#uiState.editSelection = this.#createEdgeEditSelection(edge);
            edge.renderState.setSelected(true);
            this.setStatus("Loaded edge.");
        }

        this.syncControls();
    }

    /**
     * Create node edit selection.
     *
     * @param {Node} node - Node.
     * @returns {object} Edit selection.
     */
    #createNodeEditSelection(node) {
        return {
            type: "node",
            id: node.id,
            label: node.label,
            radius: node.radius
        };
    }

    /**
     * Create edge edit selection.
     *
     * @param {Edge} edge - Edge.
     * @returns {object} Edit selection.
     */
    #createEdgeEditSelection(edge) {
        const fromNode = this.graph.getNodeById(edge.from);
        const toNode = this.graph.getNodeById(edge.to);

        return {
            type: "edge",
            id: edge.id,
            fromLabel: fromNode ? fromNode.label : String(edge.from),
            toLabel: toNode ? toNode.label : String(edge.to),
            weight: edge.weight
        };
    }

    /**
     * Handle node label edit input.
     */
    handleEditNodeLabelInput() {
        if (this.#uiState.editSelection && this.#uiState.editSelection.type === "node") {
            this.#uiState.editSelection.label = this.#elements.editNodeLabelInput.value;
        }
    }

    /**
     * Handle node radius edit input.
     */
    handleEditNodeRadiusInput() {
        if (this.#uiState.editSelection && this.#uiState.editSelection.type === "node") {
            const value = this.#elements.editNodeRadiusInput.value.trim();

            this.#uiState.editSelection.radius = value === "" ? null : Number(value);
        }
    }

    /**
     * Handle edge weight edit input.
     */
    handleEditEdgeWeightInput() {
        const parsed = Number(this.#elements.editEdgeWeightInput.value);

        if (this.#uiState.editSelection && this.#uiState.editSelection.type === "edge" && Number.isFinite(parsed)) {
            this.#uiState.editSelection.weight = parsed;
        }
    }

    /**
     * Apply current edit selection.
     */
    applyEditSelection() {
        if (!this.#uiState.editSelection) {
            this.setStatus("Nothing is selected for editing.");
        } else if (this.#uiState.editSelection.type === "node") {
            this.#applyNodeEdit();
        } else if (this.#uiState.editSelection.type === "edge") {
            this.#applyEdgeEdit();
        }
    }

    /**
     * Apply node edit.
     */
    #applyNodeEdit() {
        const selection = this.#uiState.editSelection;
        const node = this.graph.getNodeById(selection.id);
        const label = String(selection.label).trim();
        const radius = selection.radius;
        const radiusIsValid =
            radius === null || (Number.isFinite(Number(radius)) && Number(radius) > 0);

        if (!node) {
            this.setStatus("Selected node no longer exists.");
        } else if (!label) {
            this.setStatus("Node label cannot be empty.");
        } else if (!radiusIsValid) {
            this.setStatus("Node radius must be positive or empty.");
        } else {
            this.graph.saveHistory();

            node.setLabel(label);
            node.setRadius(radius);

            this.refreshNodeSelectors();
            this.syncControls();
            this.setStatus("Node updated.");
            this.draw();
        }
    }

    /**
     * Apply edge edit.
     */
    #applyEdgeEdit() {
        const selection = this.#uiState.editSelection;
        const edge = this.graph.getEdgeById(selection.id);
        const parsed = Number(selection.weight);

        if (!edge) {
            this.setStatus("Selected edge no longer exists.");
        } else if (this.graph.weighted && !Number.isFinite(parsed)) {
            this.setStatus("Edge weight must be a valid number.");
        } else {
            this.graph.saveHistory();

            if (this.graph.weighted) {
                edge.setWeight(parsed);
            }

            this.syncControls();
            this.setStatus("Edge updated.");
            this.draw();
        }
    }

    /**
     * Clear edit selection.
     */
    clearEditSelection() {
        this.#uiState.editSelection = null;
        this.#clearSelectedState();
        this.syncControls();
        this.setStatus("Edit selection cleared.");
        this.draw();
    }

    /**
     * Handle delete mode.
     *
     * @param {Node|null} node - Node.
     * @param {Edge|null} edge - Edge.
     */
    #handleDeleteMode(node, edge) {
        if (node) {
            this.graph.removeNode(node.id);
            this.refreshNodeSelectors();
            this.setStatus("Node deleted.");
        } else if (edge) {
            this.graph.removeEdge(edge.id);
            this.setStatus("Edge deleted.");
        }

        this.clearTraversal();
        this.syncControls();
    }

    /**
     * Handle mouse down.
     *
     * @param {MouseEvent} event - Mouse event.
     */
    handleMouseDown(event) {
        const point = this.#getPointer(event);
        const node = this.graph.findNodeAt(point.x, point.y);
        const shouldPan = event.button === 1 || event.altKey || !node;

        if (this.#uiState.mode === "move" && node && !shouldPan) {
            this.graph.saveHistory();
            this.#uiState.draggedNodeId = node.id;
        } else if (shouldPan) {
            this.#startPan(point);
        }
    }

    /**
     * Handle mouse move.
     *
     * @param {MouseEvent} event - Mouse event.
     */
    handleMouseMove(event) {
        const point = this.#getPointer(event);

        if (this.#uiState.viewport.dragging) {
            this.#panViewport(point);
        } else {
            this.#updateHover(point);
            this.#moveDraggedNode(point);
        }

        this.draw();
    }

    /**
     * Handle mouse up.
     */
    handleMouseUp() {
        if (this.#uiState.draggedNodeId !== null) {
            this.#uiState.draggedNodeId = null;
            this.setStatus("Node moved.");
        }

        if (this.#uiState.viewport.dragging) {
            this.#stopPan();
        }
    }

    /**
     * Update hover state.
     *
     * @param {object} point - Pointer position.
     */
    #updateHover(point) {
        const node = this.graph.findNodeAt(point.x, point.y);
        const edge = node ? null : this.graph.findEdgeAt(point.x, point.y);

        this.#clearHoverState();

        if (node) {
            node.renderState.setHovered(true);
            this.#uiState.hoveredNodeId = node.id;
            this.#uiState.hoveredEdgeId = null;
        } else if (edge) {
            edge.renderState.setHovered(true);
            this.#uiState.hoveredNodeId = null;
            this.#uiState.hoveredEdgeId = edge.id;
        } else {
            this.#uiState.hoveredNodeId = null;
            this.#uiState.hoveredEdgeId = null;
        }
    }

    /**
     * Clear current hover state.
     */
    #clearHoverState() {
        const node = this.graph.getNodeById(this.#uiState.hoveredNodeId);
        const edge = this.graph.getEdgeById(this.#uiState.hoveredEdgeId);

        if (node) {
            node.renderState.setHovered(false);
        }

        if (edge) {
            edge.renderState.setHovered(false);
        }
    }

    /**
     * Move dragged node.
     *
     * @param {object} point - Pointer position.
     */
    #moveDraggedNode(point) {
        const node = this.graph.getNodeById(this.#uiState.draggedNodeId);

        if (this.#uiState.mode === "move" && node) {
            node.moveTo(point.x, point.y);
        }
    }

    /**
     * Start viewport pan.
     *
     * @param {object} point - Pointer position.
     */
    #startPan(point) {
        this.#uiState.viewport.dragging = true;
        this.#uiState.viewport.lastX = point.screenX;
        this.#uiState.viewport.lastY = point.screenY;
        this.#uiState.viewport.moved = false;
        this.#elements.canvas.classList.add("panning");
    }

    /**
     * Pan viewport.
     *
     * @param {object} point - Pointer position.
     */
    #panViewport(point) {
        const dx = point.screenX - this.#uiState.viewport.lastX;
        const dy = point.screenY - this.#uiState.viewport.lastY;

        this.#uiState.viewport.x += dx;
        this.#uiState.viewport.y += dy;
        this.#uiState.viewport.lastX = point.screenX;
        this.#uiState.viewport.lastY = point.screenY;

        if (Math.abs(dx) + Math.abs(dy) > 1) {
            this.#uiState.viewport.moved = true;
        }
    }

    /**
     * Stop viewport pan.
     */
    #stopPan() {
        this.#uiState.viewport.dragging = false;
        this.#elements.canvas.classList.remove("panning");
    }

    /**
     * Handle wheel zoom.
     *
     * @param {WheelEvent} event - Wheel event.
     */
    handleWheel(event) {
        event.preventDefault();

        const point = this.#getPointer(event);
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        const newScale = Math.max(0.2, Math.min(4, this.#uiState.viewport.scale * zoomFactor));

        this.#uiState.viewport.x = point.screenX - point.x * newScale;
        this.#uiState.viewport.y = point.screenY - point.y * newScale;
        this.#uiState.viewport.scale = newScale;

        this.draw();
    }

    /**
     * Refresh start/end node selectors.
     */
    refreshNodeSelectors() {
        const previousStart = this.#elements.startNodeSelect.value;
        const previousEnd = this.#elements.endNodeSelect.value;

        this.#elements.startNodeSelect.innerHTML = "";
        this.#elements.endNodeSelect.innerHTML = "";

        this.#appendEndNodeNoneOption();
        this.#appendNodeSelectorOptions();
        this.#restoreNodeSelectorValues(previousStart, previousEnd);
    }

    /**
     * Add an empty end-node option.
     */
    #appendEndNodeNoneOption() {
        const option = document.createElement("option");

        option.value = "";
        option.textContent = "None";
        this.#elements.endNodeSelect.appendChild(option);
    }

    /**
     * Add node options to selectors.
     */
    #appendNodeSelectorOptions() {
        this.graph.nodeOrder.forEach(function appendNode(nodeId) {
            const node = this.graph.getNodeById(nodeId);

            if (node) {
                this.#appendNodeOption(this.#elements.startNodeSelect, node);
                this.#appendNodeOption(this.#elements.endNodeSelect, node);
            }
        }, this);
    }

    /**
     * Add one node option.
     *
     * @param {HTMLSelectElement} select - Select element.
     * @param {Node} node - Node.
     */
    #appendNodeOption(select, node) {
        const option = document.createElement("option");

        option.value = node.id;
        option.textContent = `${node.label} (id:${node.id})`;
        select.appendChild(option);
    }

    /**
     * Restore selector values.
     *
     * @param {string} previousStart - Previous start node id.
     * @param {string} previousEnd - Previous end node id.
     */
    #restoreNodeSelectorValues(previousStart, previousEnd) {
        if (this.graph.nodeOrder.length > 0) {
            const fallbackStart = this.graph.nodeOrder[0];

            this.#elements.startNodeSelect.value = this.graph.getNodeById(previousStart)
                ? previousStart
                : fallbackStart;
        }

        this.#elements.endNodeSelect.value = this.graph.getNodeById(previousEnd)
            ? previousEnd
            : "";
    }

    /**
     * Read traversal settings.
     *
     * @returns {object|null} Traversal settings.
     */
    #getTraversalSettings() {
        let settings = null;

        if (this.graph.nodeMap.size === 0) {
            this.setStatus("There are no nodes in the graph.");
        } else if (!this.#elements.startNodeSelect.value) {
            this.setStatus("Choose a start node.");
        } else {
            settings = this.#createTraversalSettings();
        }

        return settings;
    }

    /**
     * Create traversal settings after validation.
     *
     * @returns {object|null} Traversal settings.
     */
    #createTraversalSettings() {
        let settings = null;
        const algorithm = this.#elements.algorithmSelect.value;

        if (algorithm === "prim" && this.graph.directed) {
            this.setStatus("Prim's MST requires an undirected graph.");
        } else if (algorithm === "dijkstra" && this.#graphHasNegativeWeight()) {
            this.setStatus("Dijkstra does not support negative weights. Use Bellman-Ford.");
        } else {
            settings = {
                algorithm,
                startId: this.#elements.startNodeSelect.value,
                endId: this.#elements.endNodeSelect.value || null,
                delay: Math.max(50, Number(this.#elements.delayInput.value) || 500)
            };
        }

        return settings;
    }

    /**
     * Check for negative edge weight.
     *
     * @returns {boolean} True when graph has negative edge weight.
     */
    #graphHasNegativeWeight() {
        let hasNegative = false;

        this.graph.edgeMap.forEach(function inspect(edge) {
            if (Number(edge.weight) < 0) {
                hasNegative = true;
            }
        });

        return hasNegative;
    }

    /**
     * Run traversal automatically.
     */
    async runTraversal() {
        const settings = this.#getTraversalSettings();

        if (settings && !this.#uiState.traversal.running) {
            this.#prepareTraversal(settings);
            this.#uiState.traversal.running = true;
            this.#uiState.traversal.token += 1;

            await this.#animateTraversal(settings.delay, this.#uiState.traversal.token);
        } else if (this.#uiState.traversal.running) {
            this.setStatus("Traversal is already running.");
        }
    }

    /**
     * Prepare a traversal plan.
     *
     * @param {object} settings - Traversal settings.
     */
    #prepareTraversal(settings) {
        const traversal = new Traversal(this.graph);

        this.clearTraversal();

        this.#uiState.traversal.plan = traversal.createPlan(
            settings.algorithm,
            settings.startId,
            settings.endId
        );

        this.#uiState.traversal.index = 0;
        this.setStatus(`${this.#uiState.traversal.plan.name} ready.`);
    }

    /**
     * Animate traversal.
     *
     * @param {number} delay - Delay between steps.
     * @param {number} token - Traversal token.
     */
    async #animateTraversal(delay, token) {
        this.setStatus("Traversal running.");
        while (
            this.#uiState.traversal.plan &&
            this.#uiState.traversal.index < this.#uiState.traversal.plan.steps.length &&
            token === this.#uiState.traversal.token
            ) {
            this.#advanceTraversalStep();
            await this.#sleep(delay);
        }

        if (token === this.#uiState.traversal.token) {
            this.#finishTraversal();
            this.#uiState.traversal.running = false;
        }
    }

    /**
     * Step traversal manually.
     */
    stepTraversal() {
        const settings = this.#getTraversalSettings();

        if (settings) {
            if (!this.#hasReusableTraversalPlan(settings)) {
                this.#prepareTraversal(settings);
            }

            if (
                this.#uiState.traversal.plan &&
                this.#uiState.traversal.index < this.#uiState.traversal.plan.steps.length
            ) {
                this.setStatus("Traversal running.");
                this.#advanceTraversalStep();

                if (this.#uiState.traversal.index >= this.#uiState.traversal.plan.steps.length) {
                    this.#finishTraversal();
                }
            } else {
                this.setStatus("Traversal is already complete.");
            }
        }
    }

    /**
     * Check whether the current traversal plan can be reused.
     *
     * @param {object} settings - Traversal settings.
     * @returns {boolean} True when reusable.
     */
    #hasReusableTraversalPlan(settings) {
        const plan = this.#uiState.traversal.plan;

        return Boolean(plan) &&
            plan.algorithm === settings.algorithm &&
            plan.startId === settings.startId &&
            plan.endId === settings.endId;
    }

    /**
     * Advance traversal by one step.
     */
    #advanceTraversalStep() {
        const plan = this.#uiState.traversal.plan;

        if (plan && this.#uiState.traversal.index < plan.steps.length) {
            const step = plan.steps[this.#uiState.traversal.index];

            this.#markTraversalStep(step);
            this.#uiState.traversal.index += 1;

            this.#elements.traversalOutput.textContent =
                `${plan.name} step ${this.#uiState.traversal.index} of ${plan.steps.length}.`;

            this.draw();
        }
    }

    /**
     * Mark render state for one traversal step.
     *
     * @param {object|undefined} step - Traversal step.
     */
    #markTraversalStep(step) {
        if (step) {
            this.#clearActiveTraversalStates();

            const node = this.graph.getNodeById(step.nodeId);
            const edge = step.edgeId ? this.graph.getEdgeById(step.edgeId) : null;

            if (node) {
                node.renderState.setActive(true);
                node.renderState.setVisited(true);
            }

            if (edge) {
                edge.renderState.setActive(true);
                edge.renderState.setDiscovered(true);
            }

            if (step.distances) {
                this.#uiState.traversal.distances = new Map(step.distances);
            }
        }
    }

    /**
     * Clear active traversal state.
     */
    #clearActiveTraversalStates() {
        this.graph.nodeMap.forEach(function clearNode(node) {
            node.renderState.clearActive();
        });

        this.graph.edgeMap.forEach(function clearEdge(edge) {
            edge.renderState.clearActive();
        });
    }

    /**
     * Sleep helper.
     *
     * @param {number} ms - Milliseconds.
     * @returns {Promise<void>} Sleep promise.
     */
    #sleep(ms) {
        return new Promise(function resolveLater(resolve) {
            window.setTimeout(resolve, ms);
        });
    }

    /**
     * Finish the traversal and mark the final path / tree.
     */
    #finishTraversal() {
        const plan = this.#uiState.traversal.plan;

        if (plan) {
            this.#clearActiveTraversalStates();
            this.#markFinalPath(plan);
            this.#writeTraversalOutput(plan);
            this.setStatus(`${plan.name} complete.`);
            this.draw();
        }
    }

    /**
     * Mark the final shortest path or MST/tree.
     *
     * @param {object} plan - Traversal plan.
     */
    #markFinalPath(plan) {
        if (plan.algorithm === "prim") {
            this.#markTreePath(plan.parent);
        } else if (plan.endId !== null) {
            this.#markTargetPath(plan.parent, plan.startId, plan.endId);
        }
    }

    /**
     * Mark every parent edge as final tree path.
     *
     * @param {Map<string, object>} parent - Parent map.
     */
    #markTreePath(parent) {
        parent.forEach(function markTreeNode(step, nodeId) {
            const edge = this.graph.getEdgeById(step.edgeId);
            const node = this.graph.getNodeById(nodeId);
            const prevNode = this.graph.getNodeById(step.prev);

            if (edge) {
                edge.renderState.setPath(true);
            }

            if (node) {
                node.renderState.setPath(true);
            }

            if (prevNode) {
                prevNode.renderState.setPath(true);
            }
        }, this);
    }

    /**
     * Mark the final path to a target node.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} startId - Start node id.
     * @param {string} endId - End node id.
     */
    #markTargetPath(parent, startId, endId) {
        let cursor = endId;

        while (cursor !== startId && parent.has(cursor)) {
            const step = parent.get(cursor);
            const edge = this.graph.getEdgeById(step.edgeId);
            const node = this.graph.getNodeById(cursor);

            if (edge) {
                edge.renderState.setPath(true);
            }

            if (node) {
                node.renderState.setPath(true);
            }

            cursor = step.prev;
        }

        const startNode = this.graph.getNodeById(startId);

        if (startNode && (endId === startId || parent.has(endId))) {
            startNode.renderState.setPath(true);
        }
    }

    /**
     * Write final traversal output.
     *
     * @param {object} plan - Traversal plan.
     */
    #writeTraversalOutput(plan) {
        if (plan.algorithm === "dijkstra") {
            this.#writeShortestPathOutput(plan, "Dijkstra");
        } else if (plan.algorithm === "bellman-ford") {
            this.#writeBellmanFordOutput(plan);
        } else if (plan.algorithm === "prim") {
            this.#writePrimOutput(plan);
        } else {
            this.#elements.traversalOutput.innerHTML = `${plan.name} order:<hr>${this.#formatNodeOrder(plan.order)}`;
        }
    }

    /**
     * Write shortest-path output.
     *
     * @param {object} plan - Traversal plan.
     * @param {string} name - Algorithm display name.
     */
    #writeShortestPathOutput(plan, name) {
        if (plan.endId === null) {
            this.#elements.traversalOutput.textContent =
                `${name} visited: ${this.#formatNodeOrder(plan.order)}`;
        } else {
            this.#writeTargetDistanceOutput(plan, name);
        }
    }

    /**
     * Write target distance output.
     *
     * @param {object} plan - Traversal plan.
     * @param {string} name - Algorithm display name.
     */
    #writeTargetDistanceOutput(plan, name) {
        const target = this.graph.getNodeById(plan.endId);
        const distance = plan.distances.get(plan.endId);
        const label = target ? target.label : String(plan.endId);

        if (Number.isFinite(distance)) {
            this.#elements.traversalOutput.innerHTML =
                `${name} visited:<hr>${this.#formatNodeOrder(plan.order)}<hr>Shortest distance to ${label}: ${distance}.`;
        } else {
            this.#elements.traversalOutput.textContent =
                `${name} visited: ${this.#formatNodeOrder(plan.order)}\n\nNo path to ${label}.`;
        }
    }

    /**
     * Write Bellman-Ford output.
     *
     * @param {object} plan - Traversal plan.
     */
    #writeBellmanFordOutput(plan) {
        if (plan.metadata.negativeCycle) {
            this.#elements.traversalOutput.textContent = "Negative cycle detected.";
        } else {
            this.#writeShortestPathOutput(plan, "Bellman-Ford");
        }
    }

    /**
     * Write Prim output.
     *
     * @param {object} plan - Traversal plan.
     */
    #writePrimOutput(plan) {
        const status = plan.metadata.connected ? "MST Complete" : "MST Partial";
        this.#elements.traversalOutput.innerHTML =
            `${status}, Order:<hr><p>${this.#formatNodeOrder(plan.order)}</p><hr>Weight: ${plan.metadata.totalWeight}`;
    }

    /**
     * Clear traversal visuals and data.
     */
    clearTraversal() {
        this.#uiState.traversal.plan = null;
        this.#uiState.traversal.index = 0;
        this.#uiState.traversal.running = false;
        this.#uiState.traversal.token += 1;
        this.#uiState.traversal.distances.clear();

        this.graph.nodeMap.forEach(function clearNode(node) {
            node.renderState.clearTraversal();
        });

        this.graph.edgeMap.forEach(function clearEdge(edge) {
            edge.renderState.clearTraversal();
        });

        this.#elements.traversalOutput.textContent = "Traversal output will appear here.";
        this.draw();
    }

    /**
     * Stop running traversal animation.
     */
    stopTraversal() {
        this.#uiState.traversal.running = false;
        this.#uiState.traversal.token += 1;
        this.#clearActiveTraversalStates();
        this.setStatus("Traversal stopped.");
        this.draw();
    }

    /**
     * Export graph JSON.
     */
    exportGraph() {
        this.#elements.jsonArea.value = JSON.stringify(this.graph.export(), null, 2);
        this.setStatus("Graph exported.");
    }

    /**
     * Import graph JSON.
     */
    importGraph() {
        try {
            const payload = JSON.parse(this.#elements.jsonArea.value);

            this.graph.load(payload);
            this.#resetAfterGraphLoad();
            this.setStatus("Graph imported.");
        } catch (error) {
            this.setStatus("Import failed.");
        }
    }

    /**
     * Save graph to local storage.
     */
    saveLocal() {
        window.localStorage.setItem("graph-state", JSON.stringify(this.graph.export()));
        this.setStatus("Saved locally.");
    }

    /**
     * Load graph from local storage.
     */
    loadLocal() {
        const raw = window.localStorage.getItem("graph-state");

        if (raw) {
            try {
                this.graph.load(JSON.parse(raw));
                this.#resetAfterGraphLoad();
                this.setStatus("Loaded from local storage.");
            } catch (error) {
                this.setStatus("Saved graph is invalid.");
            }
        } else {
            this.setStatus("No save found.");
        }
    }

    /**
     * Clear graph.
     */
    clearGraph() {
        this.graph.reset();
        this.graph.clearHistory();
        this.#resetAfterGraphLoad();
        this.setStatus("Graph cleared.");
    }

    /**
     * Reset UI after a graph load.
     */
    #resetAfterGraphLoad() {
        this.#uiState.selectedNodeIdForEdge = null;
        this.#uiState.draggedNodeId = null;
        this.#uiState.hoveredNodeId = null;
        this.#uiState.hoveredEdgeId = null;
        this.#uiState.editSelection = null;

        this.clearTraversal();
        this.refreshNodeSelectors();
        this.syncControls();
        this.draw();
    }

    /**
     * Load the sample graph.
     */
    loadSampleGraph() {
        Graph.loadSampleAsync()
            .then((data) => {
                this.graph.load(data);
                this.#resetAfterGraphLoad();
                this.setStatus("Sample graph loaded.");
            })
            .catch((error) => {
                this.setStatus(error.message);
            });
    }
}

window.addEventListener("DOMContentLoaded", function startApp() {

    const copyrightYear = document.getElementById("copyright-year");
    if (copyrightYear) {
        copyrightYear.textContent = String(new Date().getFullYear());
    }

    const asideNavButtons = document.querySelectorAll('aside nav button');
    if (asideNavButtons) {
        asideNavButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.target;
                const target = document.getElementById(targetId);
                const container = document.querySelector('aside');

                if (target && container) {
                    container.scrollTo({left: target.offsetLeft, behavior: 'smooth'});
                }
            });
        });
    }

    window.graphApp = new App();
});