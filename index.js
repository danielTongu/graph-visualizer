"use strict";

/**
 * Stores transient visual state for a graph node or edge.
 */
class RenderState {
    #hovered = false;
    #selected = false;
    #active = false;
    #visited = false;
    #path = false;

    /**
     * Mark or read hovered state.
     *
     * @param {boolean|null} value - New value, or null to read.
     * @returns {boolean|undefined} Current state when reading.
     */
    markHovered(value = null) {
        let result;

        if (value === null) {
            result = this.#hovered;
        } else {
            this.#hovered = Boolean(value);
        }

        return result;
    }

    /**
     * Mark or read selected state.
     *
     * @param {boolean|null} value - New value, or null to read.
     * @returns {boolean|undefined} Current state when reading.
     */
    markSelected(value = null) {
        let result;

        if (value === null) {
            result = this.#selected;
        } else {
            this.#selected = Boolean(value);
        }

        return result;
    }

    /**
     * Mark or read active algorithm state.
     *
     * @param {boolean|null} value - New value, or null to read.
     * @returns {boolean|undefined} Current state when reading.
     */
    markActive(value = null) {
        let result;

        if (value === null) {
            result = this.#active;
        } else {
            this.#active = Boolean(value);
        }

        return result;
    }

    /**
     * Mark or read visited algorithm state.
     *
     * @param {boolean|null} value - New value, or null to read.
     * @returns {boolean|undefined} Current state when reading.
     */
    markVisited(value = null) {
        let result;

        if (value === null) {
            result = this.#visited;
        } else {
            this.#visited = Boolean(value);
        }

        return result;
    }

    /**
     * Mark or read final path or MST state.
     *
     * @param {boolean|null} value - New value, or null to read.
     * @returns {boolean|undefined} Current state when reading.
     */
    markPath(value = null) {
        let result;

        if (value === null) {
            result = this.#path;
        } else {
            this.#path = Boolean(value);
        }

        return result;
    }

    /**
     * Clear active algorithm state.
     */
    clearActive() {
        this.#active = false;
    }

    /**
     * Clear algorithm-related states.
     */
    clearTraversal() {
        this.#active = false;
        this.#visited = false;
        this.#path = false;
    }
}

/**
 * Represents one graph node and owns its drawing logic.
 */
class Node {
    static DEFAULT_RADIUS = 17;
    static STYLE_DEFAULT = {
        fill: "#64748b",
        stroke: "#94a3b8",
        lineWidth: 2
    };

    static STYLE_VISITED = {
        fill: "#186a35",
        stroke: "#4ade80",
        lineWidth: 3
    };

    static STYLE_ACTIVE = {
        fill: "#f59e0b",
        stroke: "#fbbf24",
        lineWidth: 4
    };

    static STYLE_PATH = {
        fill: "#f43f5e",
        stroke: "#fb7185",
        lineWidth: 4
    };

    static STYLE_HOVERED = {
        fill: "#5b8ccd",
        stroke: "#67e8f9",
        lineWidth: 5
    };

    static STYLE_SELECTED = {
        fill: "#a855f7",
        stroke: "#d8b4fe",
        lineWidth: 5
    };

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
     * Create node from imported data.
     *
     * @param {object} data - Imported node data.
     * @returns {Node} Node.
     */
    static fromJSON(data) {
        return new Node(data.id, data.label, data.x, data.y, data.radius);
    }

    /**
     * Normalize radius.
     *
     * @param {number|string|null|undefined} radius - Radius candidate.
     * @returns {number|null} Positive radius or null.
     */
    static normalizeRadius(radius) {
        const parsed = Number(radius);
        return (Number.isFinite(parsed) && parsed > 0) ? parsed : null;
    }

    /**
     * Set default node radius.
     *
     * @param {number|string} radius - Radius candidate.
     */
    static setDefaultRadius(radius) {
        const normalized = Node.normalizeRadius(radius);

        if (normalized !== null) {
            Node.DEFAULT_RADIUS = normalized;
        }
    }

    /**
     * Resolve node or edge drawing style from render state.
     *
     * Visual priority:
     * default < visited < active < path < hovered < selected
     *
     * @param {RenderState} state - Render state.
     * @returns {object} Drawing style.
     */
    static getDrawStyle(state) {
        let style = Node.STYLE_DEFAULT;

        if (state.markVisited()) {
            style = Node.STYLE_VISITED;
        }
        if (state.markActive()) {
            style = Node.STYLE_ACTIVE;
        }
        if (state.markPath()) {
            style = Node.STYLE_PATH;
        }
        if (state.markHovered()) {
            style = Node.STYLE_HOVERED;
        }
        if (state.markSelected()) {
            style = Node.STYLE_SELECTED;
        }

        return style;
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
     * Get effective drawing radius.
     *
     * @returns {number} Effective radius.
     */
    getRadius() {
        let radius = Node.DEFAULT_RADIUS;

        if (this.radius !== null) {
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
     * Move node to a new world position.
     *
     * @param {number} x - New x.
     * @param {number} y - New y.
     */
    moveTo(x, y) {
        this.x = Number(x);
        this.y = Number(y);
    }

    /**
     * Check whether a world point touches this node.
     *
     * @param {number} x - World x.
     * @param {number} y - World y.
     * @returns {boolean} True when point hits node.
     */
    containsPoint(x, y) {
        return Geometry.distance(x, y, this.x, this.y) <= this.getRadius();
    }

    /**
     * Draw node and optional distance badge.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {number|undefined} distance - Optional distance to node.
     */
    draw(ctx, distance = undefined) {
        const style = Node.getDrawStyle(this.renderState);

        this.#drawNodeCircle(ctx, style);
        this.#drawNodeLabel(ctx);

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
    #drawNodeCircle(ctx, style) {
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
    #drawNodeLabel(ctx) {
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
     * Draw shortest-path distance badge.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {number} distance - Distance value.
     */
    #drawDistanceBadge(ctx, distance) {
        const label = this.#formatDistanceLabel(distance);
        const badge = this.#getDistanceBadgeBounds();

        ctx.save();
        ctx.fillStyle = "rgba(2, 6, 23, 0.95)";
        ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
        this.#drawRoundedBadgeBackground(ctx, badge);
        this.#drawDistanceBadgeText(ctx, label, badge);
        ctx.restore();
    }

    /**
     * Format distance value for display.
     *
     * @param {number} distance - Distance value.
     * @returns {string} Distance label.
     */
    #formatDistanceLabel(distance) {
        return (distance === Infinity) ? "∞" : String(distance);
    }

    /**
     * Get distance badge bounds.
     *
     * @returns {object} Badge bounds.
     */
    #getDistanceBadgeBounds() {
        const width = 32;
        const height = 20;

        return {
            x: this.x - width / 2,
            y: this.y - this.getRadius() - 20,
            width,
            height,
            radius: 6
        };
    }

    /**
     * Draw badge background.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {object} badge - Badge bounds.
     */
    #drawRoundedBadgeBackground(ctx, badge) {
        ctx.beginPath();

        if (typeof ctx.roundRect === "function") {
            ctx.roundRect(badge.x, badge.y, badge.width, badge.height, badge.radius);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(badge.x, badge.y, badge.width, badge.height);
            ctx.strokeRect(badge.x, badge.y, badge.width, badge.height);
        }
    }

    /**
     * Draw badge text.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {string} label - Distance label.
     * @param {object} badge - Badge bounds.
     */
    #drawDistanceBadgeText(ctx, label, badge) {
        ctx.fillStyle = "#f8fafc";
        ctx.font = "9px Inter, Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, this.x, badge.y + badge.height / 2);
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
    static HIT_TOLERANCE = 8;
    static ARROW_SIZE = 10;
    static ARROW_ANGLE = Math.PI / 6;

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
        this.weight = Edge.normalizeWeight(weight);
        this.renderState = new RenderState();
    }

    /**
     * Create edge from imported data.
     *
     * @param {object} data - Imported edge data.
     * @returns {Edge} Edge.
     */
    static fromJSON(data) {
        return new Edge(data.id, data.from, data.to, data.weight);
    }

    /**
     * Normalize edge weight.
     *
     * @param {number|string} weight - Weight candidate.
     * @returns {number} Finite weight or 1.
     */
    static normalizeWeight(weight) {
        const parsed = Number(weight);
        return (Number.isFinite(parsed)) ? parsed : 1;
    }

    /**
     * Compare two edges by weight.
     *
     * @param {Edge} other - Other edge.
     * @returns {number} Sort result.
     */
    compareTo(other) {
        return this.weight - other.weight;
    }

    /**
     * Set edge weight.
     *
     * @param {number|string} weight - New weight.
     */
    setWeight(weight) {
        this.weight = Edge.normalizeWeight(weight);
    }

    /**
     * Draw edge, arrow, and optional weight.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Graph} graph - Graph reference.
     */
    draw(ctx, graph) {
        const endpoints = this.#getEndpoints(graph);

        if (endpoints !== null) {
            const style = Node.getDrawStyle(this.renderState);

            this.#drawEdgeLine(ctx, endpoints.fromNode, endpoints.toNode, style);

            if (graph.directed) {
                this.#drawDirectionArrow(ctx, endpoints.fromNode, endpoints.toNode, style);
            }
            if (graph.weighted) {
                this.#drawWeightLabel(ctx, endpoints.fromNode, endpoints.toNode, style);
            }
        }
    }

    /**
     * Hit test edge by distance to its line segment.
     *
     * @param {number} x - World x.
     * @param {number} y - World y.
     * @param {Graph} graph - Graph reference.
     * @returns {boolean} True when point hits edge.
     */
    containsPoint(x, y, graph) {
        const endpoints = this.#getEndpoints(graph);
        let hit = false;

        if (endpoints !== null) {
            const distance = Geometry.distanceToSegment(
                x,
                y,
                endpoints.fromNode.x,
                endpoints.fromNode.y,
                endpoints.toNode.x,
                endpoints.toNode.y
            );

            hit = distance < Edge.HIT_TOLERANCE;
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

    /**
     * Resolve source and target nodes.
     *
     * @param {Graph} graph - Graph reference.
     * @returns {object|null} Edge endpoints.
     */
    #getEndpoints(graph) {
        const fromNode = graph.getNodeById(this.from);
        const toNode = graph.getNodeById(this.to);
        let endpoints = null;

        if (fromNode && toNode) {
            endpoints = {
                fromNode,
                toNode
            };
        }

        return endpoints;
    }

    /**
     * Draw edge line between source and target nodes.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {object} style - Drawing style.
     */
    #drawEdgeLine(ctx, fromNode, toNode, style) {
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
     * Draw direction arrow for a directed edge.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {object} style - Drawing style.
     */
    #drawDirectionArrow(ctx, fromNode, toNode, style) {
        const arrow = this.#getArrowGeometry(fromNode, toNode);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(arrow.tipX, arrow.tipY);
        ctx.lineTo(arrow.leftX, arrow.leftY);
        ctx.lineTo(arrow.rightX, arrow.rightY);
        ctx.closePath();
        ctx.fillStyle = style.stroke;
        ctx.fill();
        ctx.restore();
    }

    /**
     * Calculate arrowhead geometry.
     *
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @returns {object} Arrow geometry.
     */
    #getArrowGeometry(fromNode, toNode) {
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const tipX = toNode.x - Math.cos(angle) * toNode.getRadius();
        const tipY = toNode.y - Math.sin(angle) * toNode.getRadius();

        return {
            tipX,
            tipY,
            leftX: tipX - Edge.ARROW_SIZE * Math.cos(angle - Edge.ARROW_ANGLE),
            leftY: tipY - Edge.ARROW_SIZE * Math.sin(angle - Edge.ARROW_ANGLE),
            rightX: tipX - Edge.ARROW_SIZE * Math.cos(angle + Edge.ARROW_ANGLE),
            rightY: tipY - Edge.ARROW_SIZE * Math.sin(angle + Edge.ARROW_ANGLE)
        };
    }

    /**
     * Draw edge weight label at the midpoint.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {object} style - Drawing style.
     */
    #drawWeightLabel(ctx, fromNode, toNode, style) {
        const midpoint = this.#getMidpoint(fromNode, toNode);

        ctx.save();
        ctx.fillStyle = style.fill;
        ctx.font = "12px Inter, Arial, sans-serif";
        ctx.shadowColor = "rgb(0, 0, 0)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(this.weight), midpoint.x, midpoint.y);
        ctx.restore();
    }

    /**
     * Calculate midpoint between source and target nodes.
     *
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @returns {object} Midpoint.
     */
    #getMidpoint(fromNode, toNode) {
        return {
            x: (fromNode.x + toNode.x) / 2,
            y: (fromNode.y + toNode.y) / 2
        };
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

    // ---------------------------------------------------------------------
    // Sample data and ids
    // ---------------------------------------------------------------------

    /**
     * Load sample graph data from file.
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
        return (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") ?
            `n:${crypto.randomUUID()}` : `n:${Graph.#createFallbackId()}`;
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
        return directed ? `e:${fromId}->${toId}` : Graph.#createUndirectedEdgeId(fromId, toId);
    }

    /**
     * Create deterministic undirected edge id.
     *
     * @param {string} firstId - First node id.
     * @param {string} secondId - Second node id.
     * @returns {string} Edge id.
     */
    static #createUndirectedEdgeId(firstId, secondId) {
        const ordered = [firstId, secondId].sort();
        return `e:${ordered[0]}--${ordered[1]}`;
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

    // ---------------------------------------------------------------------
    // History
    // ---------------------------------------------------------------------

    /**
     * Save current graph state for undo.
     */
    saveHistory() {
        if (!this.#historyLocked) {
            this.#undoStack.push(this.export());
            this.#redoStack.length = 0;
            this.#trimUndoHistory();
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
            this.#redoStack.push(this.export());
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
            this.#undoStack.push(this.export());
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
     * Restore graph state without recording history.
     *
     * @param {object} snapshot - Graph snapshot.
     */
    #restoreSnapshot(snapshot) {
        try {
            this.#historyLocked = true;
            this.import(snapshot);
        } finally {
            this.#historyLocked = false;
        }
    }

    /**
     * Keep undo history within its configured limit.
     */
    #trimUndoHistory() {
        if (this.#undoStack.length > this.#historyLimit) {
            this.#undoStack.shift();
        }
    }

    // ---------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------

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
     * Load graph data and reset history.
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

    // ---------------------------------------------------------------------
    // Nodes
    // ---------------------------------------------------------------------

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
        const node = new Node(Graph.createNodeId(), this.#resolveNodeLabel(label), x, y, radius);
        this.#storeNode(node);
        return node;
    }

    /**
     * Remove node and every connected edge.
     *
     * @param {string} id - Node id.
     */
    removeNode(id) {
        const nodeId = String(id);

        if (this.nodeMap.has(nodeId)) {
            this.saveHistory();
            this.nodeMap.delete(nodeId);
            this.#removeNodeFromOrder(nodeId);
            this.#removeEdgesConnectedToNode(nodeId);
        }
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
     * Resolve a new node label.
     *
     * @param {string|null} label - Optional explicit label.
     * @returns {string} Resolved label.
     */
    #resolveNodeLabel(label) {
        let resolvedLabel;

        if (label === null) {
            resolvedLabel = String(this.nodeOrder.length);
        } else {
            resolvedLabel = String(label);
        }

        return resolvedLabel;
    }

    /**
     * Store node in lookup map and render order.
     *
     * @param {Node} node - Node.
     */
    #storeNode(node) {
        this.nodeMap.set(node.id, node);
        this.nodeOrder.push(node.id);
    }

    /**
     * Remove node id from render order.
     *
     * @param {string} nodeId - Node id.
     */
    #removeNodeFromOrder(nodeId) {
        this.nodeOrder = this.nodeOrder.filter(function keep(id) {
            return id !== nodeId;
        });
    }

    /**
     * Remove every edge connected to a node.
     *
     * @param {string} nodeId - Node id.
     */
    #removeEdgesConnectedToNode(nodeId) {
        this.edgeOrder.forEach(function removeConnectedEdge(edgeId) {
            const edge = this.edgeMap.get(edgeId);

            if (edge && (edge.from === nodeId || edge.to === nodeId)) {
                this.edgeMap.delete(edgeId);
            }
        }, this);

        this.#removeMissingEdgesFromOrder();
    }

    // ---------------------------------------------------------------------
    // Edges
    // ---------------------------------------------------------------------

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

        if (this.#canCreateEdge(fromId, toId)) {
            this.saveHistory();

            edge = new Edge(
                Graph.createEdgeId(fromId, toId, this.directed),
                fromId,
                toId,
                weight
            );

            this.#storeEdge(edge);
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
            this.#removeEdgeFromOrder(edgeId);
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
            if (this.#isSameConnection(edge, fromId, toId)) {
                exists = true;
            }
        }, this);

        return exists;
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
     * Normalize all edge weights to 1.
     */
    normalizeWeights() {
        this.edgeMap.forEach(function normalize(edge) {
            edge.setWeight(1);
        });
    }

    /**
     * Check whether a new edge can be created.
     *
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @returns {boolean} True when edge can be created.
     */
    #canCreateEdge(fromId, toId) {
        return this.nodeMap.has(fromId) &&
            this.nodeMap.has(toId) &&
            fromId !== toId &&
            !this.edgeExists(fromId, toId);
    }

    /**
     * Store edge in lookup map and render order.
     *
     * @param {Edge} edge - Edge.
     */
    #storeEdge(edge) {
        this.edgeMap.set(edge.id, edge);
        this.edgeOrder.push(edge.id);
    }

    /**
     * Remove edge id from render order.
     *
     * @param {string} edgeId - Edge id.
     */
    #removeEdgeFromOrder(edgeId) {
        this.edgeOrder = this.edgeOrder.filter(function keep(id) {
            return id !== edgeId;
        });
    }

    /**
     * Remove edge ids that no longer exist.
     */
    #removeMissingEdgesFromOrder() {
        this.edgeOrder = this.edgeOrder.filter(function keep(edgeId) {
            return this.edgeMap.has(edgeId);
        }, this);
    }

    /**
     * Check whether edge matches a requested connection.
     *
     * @param {Edge} edge - Edge.
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @returns {boolean} True when same connection.
     */
    #isSameConnection(edge, fromId, toId) {
        let same = edge.from === fromId && edge.to === toId;

        if (!same && !this.directed) {
            same = edge.from === toId && edge.to === fromId;
        }

        return same;
    }

    // ---------------------------------------------------------------------
    // Sorting and lookup
    // ---------------------------------------------------------------------

    /**
     * Compare two adjacency neighbors.
     *
     * @param {object} a - First adjacency neighbor.
     * @param {object} b - Second adjacency neighbor.
     * @returns {number} Sort result.
     */
    compareNeighbors(a, b) {
        let result = this.#compareNeighborEdges(a, b);

        if (result === 0) {
            result = this.#compareNeighborNodes(a, b);
        }

        return result;
    }

    /**
     * Find node at position, checking topmost nodes first.
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
     * Find edge at position, checking topmost edges first.
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
     * Compare neighbors by edge weight when graph is weighted.
     *
     * @param {object} a - First adjacency neighbor.
     * @param {object} b - Second adjacency neighbor.
     * @returns {number} Sort result.
     */
    #compareNeighborEdges(a, b) {
        const edgeA = this.getEdgeById(a.edgeId);
        const edgeB = this.getEdgeById(b.edgeId);
        let result = 0;

        if (this.weighted && edgeA && edgeB) {
            result = edgeA.compareTo(edgeB);
        }

        return result;
    }

    /**
     * Compare neighbors by node label.
     *
     * @param {object} a - First adjacency neighbor.
     * @param {object} b - Second adjacency neighbor.
     * @returns {number} Sort result.
     */
    #compareNeighborNodes(a, b) {
        const nodeA = this.getNodeById(a.to);
        const nodeB = this.getNodeById(b.to);
        let result = 0;

        if (nodeA && nodeB) {
            result = nodeA.compareTo(nodeB);
        }

        return result;
    }

    // ---------------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------------

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

    // ---------------------------------------------------------------------
    // Import and export
    // ---------------------------------------------------------------------

    /**
     * Export graph.
     *
     * @returns {object} Serialized graph data.
     */
    export() {
        return {
            directed: this.directed,
            weighted: this.weighted,
            nodes: this.#exportNodes(),
            edges: this.#exportEdges()
        };
    }

    /**
     * Import graph.
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
        this.#importNodes(data.nodes);
        this.#importEdges(data.edges);
    }

    /**
     * Export nodes in render order.
     * @returns {object[]} Serialized nodes.
     */
    #exportNodes() {
        const nodes = [];

        this.nodeOrder.forEach(function exportNode(id) {
            const node = this.nodeMap.get(id);

            if (node) {
                nodes.push(node.toJSON());
            }
        }, this);

        return nodes;
    }

    /**
     * Export edges in render order.
     * @returns {object[]} Serialized edges.
     */
    #exportEdges() {
        const edges = [];

        this.edgeOrder.forEach(function exportEdge(id) {
            const edge = this.edgeMap.get(id);

            if (edge) {
                edges.push(edge.toJSON());
            }
        }, this);

        return edges;
    }

    /**
     * Import nodes.
     * @param {object[]|undefined} nodes - Serialized nodes.
     */
    #importNodes(nodes) {
        if (Array.isArray(nodes)) {
            nodes.forEach(function importNode(raw) {
                const node = Node.fromJSON(raw);

                if (!this.nodeMap.has(node.id)) {
                    this.#storeNode(node);
                }
            }, this);
        }
    }

    /**
     * Import valid edges.
     * @param {object[]|undefined} edges - Serialized edges.
     */
    #importEdges(edges) {
        if (Array.isArray(edges)) {
            edges.forEach(function importEdge(raw) {
                const edge = Edge.fromJSON(raw);

                if (this.#canImportEdge(edge)) {
                    this.#storeEdge(edge);
                }
            }, this);
        }
    }

    /**
     * Check whether imported edge is valid.
     * @param {Edge} edge - Imported edge.
     * @returns {boolean} True when edge can be imported.
     */
    #canImportEdge(edge) {
        return !this.edgeMap.has(edge.id) &&
            this.nodeMap.has(edge.from) &&
            this.nodeMap.has(edge.to);
    }
}

/**
 * Creates traversal and pathfinding plans from a graph.
 */
class Traversal {
    /**
     * Create traversal helper.
     * @param {Graph} graph - Graph instance.
     */
    constructor(graph) {
        this.graph = graph;
    }

    /**
     * Create traversal or pathfinding plan.
     *
     * @param {string} algorithm - Algorithm id.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional end node id.
     * @returns {object} Traversal plan.
     */
    createPlan(algorithm, startId, endId = null) {
        let plan;

        if (algorithm === "BFS") {
            plan = this.#planBreadthFirstSearch(startId, endId);
        } else if (algorithm === "DFS") {
            plan = this.#planDepthFirstSearch(startId, endId);
        } else if (algorithm === "Dijkstra") {
            plan = this.#planDijkstraShortestPath(startId, endId);
        } else if (algorithm === "Prim") {
            plan = this.#planPrimMinimumSpanningTree(startId);
        } else if (algorithm === "Bellman-Ford") {
            plan = this.#planBellmanFordShortestPath(startId, endId);
        } else {
            throw new Error(`Unknown traversal algorithm: ${algorithm}`);
        }

        return plan;
    }

    // ---------------------------------------------------------------------
    // Shared plan helpers
    // ---------------------------------------------------------------------

    /**
     * Create shared algorithm state.
     *
     * @returns {object} Algorithm state.
     */
    #createAlgorithmState() {
        return {
            parent: new Map(),
            steps: [],
            order: []
        };
    }

    /**
     * Create final plan object.
     *
     * @param {string} name - Display name.
     * @param {string} algorithm - Algorithm id.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - End node id.
     * @param {object} state - Algorithm state.
     * @param {Map<string, number>|null} distances - Distance map.
     * @param {object} metadata - Extra metadata.
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

    /**
     * Remember that a node was reached from another node.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} nodeId - Reached node id.
     * @param {string} previousId - Previous node id.
     * @param {string} edgeId - Edge id.
     */
    #rememberPath(parent, nodeId, previousId, edgeId) {
        parent.set(nodeId, {
            prev: previousId,
            edgeId
        });
    }

    /**
     * Record that the algorithm is visiting a node.
     *
     * @param {object} state - Algorithm state.
     * @param {string} nodeId - Node id.
     * @param {string|null} edgeId - Edge used to reach this node.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     */
    #recordVisit(state, nodeId, edgeId = null, distances = null) {
        state.order.push(nodeId);
        state.steps.push(this.#createStep("visit", null, nodeId, edgeId, distances));
    }

    /**
     * Record that the algorithm is actively moving to or considering a node.
     *
     * @param {object} state - Algorithm state.
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     */
    #recordActiveStep(state, fromId, toId, edgeId, distances = null) {
        state.steps.push(this.#createStep("active", fromId, toId, edgeId, distances));
    }

    /**
     * Create one visual algorithm step.
     *
     * @param {string} type - Step type.
     * @param {string|null} fromId - Source node id.
     * @param {string} nodeId - Current node id.
     * @param {string|null} edgeId - Edge id.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     * @returns {object} Step object.
     */
    #createStep(type, fromId, nodeId, edgeId, distances = null) {
        const step = {
            type,
            nodeId
        };

        if (fromId !== null) {
            step.from = fromId;
        }

        if (edgeId !== null) {
            step.edgeId = edgeId;
        }

        if (distances !== null) {
            step.distances = new Map(distances);
        }

        return step;
    }

    // ---------------------------------------------------------------------
    // Shared graph helpers
    // ---------------------------------------------------------------------

    /**
     * Build sorted adjacency list from graph nodes and edges.
     *
     * @returns {Map<string, Array<object>>} Adjacency list.
     */
    #buildSortedAdjacencyList() {
        const adjacency = new Map();

        this.graph.nodeOrder.forEach(function addNode(nodeId) {
            if (this.graph.nodeMap.has(nodeId)) {
                adjacency.set(nodeId, []);
            }
        }, this);

        this.graph.edgeOrder.forEach(function addGraphEdge(edgeId) {
            const edge = this.graph.edgeMap.get(edgeId);

            if (edge) {
                this.#addDirectedNeighbor(adjacency, edge.from, edge.to, edge.id, edge.weight);

                if (!this.graph.directed) {
                    this.#addDirectedNeighbor(adjacency, edge.to, edge.from, edge.id, edge.weight);
                }
            }
        }, this);

        adjacency.forEach(function sortNeighborList(neighbors) {
            this.#sortNeighbors(neighbors);
        }, this);

        return adjacency;
    }

    /**
     * Add one directed neighbor entry.
     *
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {number} weight - Edge weight.
     */
    #addDirectedNeighbor(adjacency, fromId, toId, edgeId, weight) {
        if (adjacency.has(fromId)) {
            adjacency.get(fromId).push(this.#createEdgeStep(fromId, toId, edgeId, weight));
        }
    }

    /**
     * Create normalized edge descriptor.
     *
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {number} weight - Raw edge weight.
     * @returns {object} Edge descriptor.
     */
    #createEdgeStep(fromId, toId, edgeId, weight) {
        return {
            from: fromId,
            to: toId,
            edgeId,
            weight: this.#getTraversalWeight(weight)
        };
    }

    /**
     * Get usable edge weight for weighted and unweighted graphs.
     *
     * @param {number} weight - Raw edge weight.
     * @returns {number} Traversal weight.
     */
    #getTraversalWeight(weight) {
        return this.graph.weighted ? Number(weight) : 1;
    }

    /**
     * Sort neighbors using graph neighbor comparison.
     *
     * @param {Array<object>} neighbors - Neighbor entries.
     */
    #sortNeighbors(neighbors) {
        const graph = this.graph;

        neighbors.sort(function compareNeighbors(a, b) {
            return graph.compareNeighbors(a, b);
        });
    }

    /**
     * Create initial distance table.
     *
     * @param {string} startId - Start node id.
     * @returns {Map<string, number>} Distance map.
     */
    #createDistanceTable(startId) {
        const distances = new Map();

        this.graph.nodeOrder.forEach(function initializeNodeDistance(nodeId) {
            if (this.graph.nodeMap.has(nodeId)) {
                distances.set(nodeId, Infinity);
            }
        }, this);

        distances.set(startId, 0);

        return distances;
    }

    /**
     * Try improving the best known distance through one edge.
     *
     * @param {object} edge - Edge descriptor.
     * @param {Map<string, number>} distances - Distance map.
     * @param {object} state - Algorithm state.
     * @param {boolean} visitAfterImproving - Whether to record target visit after improvement.
     * @returns {boolean} True when the distance improved.
     */
    #relaxEdge(edge, distances, state, visitAfterImproving = false) {
        let improved = false;
        const fromDistance = distances.get(edge.from);

        if (Number.isFinite(fromDistance)) {
            const candidateDistance = fromDistance + edge.weight;

            if (candidateDistance < distances.get(edge.to)) {
                distances.set(edge.to, candidateDistance);
                this.#rememberPath(state.parent, edge.to, edge.from, edge.edgeId);
                this.#recordActiveStep(state, edge.from, edge.to, edge.edgeId, distances);

                if (visitAfterImproving) {
                    this.#recordVisit(state, edge.to, edge.edgeId, distances);
                }

                improved = true;
            }
        }

        return improved;
    }

    // ---------------------------------------------------------------------
    // Breadth-First Search
    // ---------------------------------------------------------------------

    /**
     * Plan Breadth-First Search.
     * BFS explores nodes level by level using a queue.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     * @returns {object} BFS plan.
     */
    #planBreadthFirstSearch(startId, endId) {
        const adjacency = this.#buildSortedAdjacencyList();
        const state = this.#createAlgorithmState();
        const visited = new Set([startId]);
        const queue = [{
            nodeId: startId,
            edgeId: null
        }];

        let queueIndex = 0;
        let targetFound = false;
        while (queueIndex < queue.length && !targetFound) {
            const current = queue[queueIndex];
            queueIndex += 1;
            this.#recordVisit(state, current.nodeId, current.edgeId);
            if (endId !== null && current.nodeId === endId) {
                targetFound = true;
            } else {
                this.#enqueueUnvisitedNeighbors(current.nodeId, adjacency, visited, queue, state);
            }
        }

        return this.#createPlanObject("Breadth-First Search", "BFS", startId, endId, state);

    }

    /**
     * Enqueue every unvisited neighbor of the current BFS node.
     *
     * @param {string} currentId - Current node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited node ids.
     * @param {Object[]} queue - BFS queue.
     * @param {object} state - Algorithm state.
     */
    #enqueueUnvisitedNeighbors(currentId, adjacency, visited, queue, state) {
        const neighbors = adjacency.get(currentId) || [];

        for (let i = 0; i < neighbors.length; i += 1) {
            const edge = neighbors[i];

            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                queue.push({
                    nodeId: edge.to,
                    edgeId: edge.edgeId
                });

                this.#rememberPath(state.parent, edge.to, currentId, edge.edgeId);
                this.#recordActiveStep(state, currentId, edge.to, edge.edgeId);

            }

        }

    }

    // ---------------------------------------------------------------------
    // Depth-First Search
    // ---------------------------------------------------------------------

    /**
     * Plan Depth-First Search.
     * DFS explores as far as possible along one branch before backtracking.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     * @returns {object} DFS plan.
     */
    #planDepthFirstSearch(startId, endId) {
        const adjacency = this.#buildSortedAdjacencyList();
        const state = this.#createAlgorithmState();
        const visited = new Set();

        this.#walkDepthFirst(startId, endId, adjacency, visited, state, null);

        return this.#createPlanObject("Depth-First Search", "DFS", startId, endId, state);
    }

    /**
     * Walk one DFS branch recursively.
     *
     * @param {string} nodeId - Current node id.
     * @param {string|null} endId - Optional target node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited node ids.
     * @param {object} state - Algorithm state.
     * @param{String | null} incomingEdgeId - Edge used to reach node.
     * @returns {boolean} True when target has been found.
     */
    #walkDepthFirst(nodeId, endId, adjacency, visited, state, incomingEdgeId = null) {
        let targetFound;

        visited.add(nodeId);
        this.#recordVisit(state, nodeId, incomingEdgeId);

        if (endId !== null && nodeId === endId) {
            targetFound = true;
        } else {
            targetFound = this.#tryDepthFirstBranches(nodeId, endId, adjacency, visited, state);
        }

        return targetFound;
    }

    /**
     * Try each DFS branch from the current node.
     *
     * @param {string} nodeId - Current node id.
     * @param {string|null} endId - Optional target node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited node ids.
     * @param {object} state - Algorithm state.
     * @returns {boolean} True when target has been found.
     */
    #tryDepthFirstBranches(nodeId, endId, adjacency, visited, state) {
        const neighbors = adjacency.get(nodeId) || [];
        let targetFound = false;

        for (let i = 0; i < neighbors.length && !targetFound; i += 1) {
            const edge = neighbors[i];

            if (!visited.has(edge.to)) {
                this.#rememberPath(state.parent, edge.to, nodeId, edge.edgeId);
                this.#recordActiveStep(state, nodeId, edge.to, edge.edgeId);
                targetFound = this.#walkDepthFirst(edge.to, endId, adjacency, visited, state, edge.edgeId);
            }
        }

        return targetFound;
    }

    // ---------------------------------------------------------------------
    // Dijkstra Shortest Path
    // ---------------------------------------------------------------------

    /**
     * Plan Dijkstra shortest path.
     * Dijkstra repeatedly settles the unvisited node with the smallest known distance.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     * @returns {object} Dijkstra plan.
     */
    #planDijkstraShortestPath(startId, endId) {
        const adjacency = this.#buildSortedAdjacencyList();
        const state = this.#createAlgorithmState();
        const distances = this.#createDistanceTable(startId);
        const settled = new Set();
        let targetSettled = false;
        let reachableNodesRemain = true;

        while (settled.size < this.graph.nodeMap.size && !targetSettled && reachableNodesRemain) {
            const currentId = this.#chooseNearestUnsettledNode(distances, settled);

            if (currentId === null) {
                reachableNodesRemain = false;
            } else {
                settled.add(currentId);
                this.#recordVisitSettledNode(state, currentId, distances);

                if (endId !== null && currentId === endId) {
                    targetSettled = true;
                } else {
                    this.#relaxOutgoingEdgesFromNode(currentId, adjacency, distances, settled, state);
                }
            }
        }

        return this.#createPlanObject("Dijkstra", "Dijkstra", startId, endId, state, distances);
    }

    #recordVisitSettledNode(state, nodeId, distances) {
        const parentStep = state.parent.get(nodeId);
        const edgeId = parentStep ? parentStep.edgeId : null;
        this.#recordVisit(state, nodeId, edgeId, distances);
    }

    /**
     * Choose the unsettled node with the smallest known distance.
     *
     * @param {Map<string, number>} distances - Distance map.
     * @param {Set<string>} settled - Settled node ids.
     * @returns {string|null} Node id or null.
     */
    #chooseNearestUnsettledNode(distances, settled) {
        let bestId = null;
        let bestDistance = Infinity;

        distances.forEach(function inspectDistance(distance, nodeId) {
            if (!settled.has(nodeId) && distance < bestDistance) {
                bestId = nodeId;
                bestDistance = distance;
            }
        });

        return bestId;
    }

    /**
     * Relax outgoing edges from the current Dijkstra node.
     *
     * @param {string} currentId - Current node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Map<string, number>} distances - Distance map.
     * @param {Set<string>} settled - Settled node ids.
     * @param {object} state - Algorithm state.
     */
    #relaxOutgoingEdgesFromNode(currentId, adjacency, distances, settled, state) {
        const neighbors = adjacency.get(currentId) || [];

        for (let i = 0; i < neighbors.length; i += 1) {
            const edge = neighbors[i];
            if (!settled.has(edge.to)) {
                this.#relaxEdge(edge, distances, state);
            }
        }
    }

    // ---------------------------------------------------------------------
    // Prim Minimum Spanning Tree
    // ---------------------------------------------------------------------

    /**
     * Plan Prim minimum spanning tree.
     * Prim grows a tree by repeatedly adding the cheapest edge leaving the tree.
     *
     * @param {string} startId - Start node id.
     * @returns {object} Prim plan.
     */
    #planPrimMinimumSpanningTree(startId) {
        const adjacency = this.#buildSortedAdjacencyList();
        const state = this.#createAlgorithmState();
        const treeNodes = new Set([startId]);
        let totalWeight = 0;
        let disconnected = false;

        this.#recordVisit(state, startId);

        while (treeNodes.size < this.graph.nodeMap.size && !disconnected) {
            const cheapestEdge = this.#chooseCheapestEdgeLeavingTree(adjacency, treeNodes);

            if (cheapestEdge === null) {
                disconnected = true;
            } else {
                treeNodes.add(cheapestEdge.to);
                totalWeight += cheapestEdge.weight;
                this.#rememberPath(state.parent, cheapestEdge.to, cheapestEdge.from, cheapestEdge.edgeId);
                this.#recordActiveStep(state, cheapestEdge.from, cheapestEdge.to, cheapestEdge.edgeId);
                this.#recordVisit(state, cheapestEdge.to, cheapestEdge.edgeId);
            }
        }

        return this.#createPlanObject("Prim's Minimum Spanning Tree", "Prim", startId, null, state, null, {
            totalWeight,
            connected: treeNodes.size === this.graph.nodeMap.size
        });
    }

    /**
     * Choose the cheapest edge from the tree to an outside node.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} treeNodes - Nodes already in the tree.
     * @returns {object|null} Cheapest crossing edge.
     */
    #chooseCheapestEdgeLeavingTree(adjacency, treeNodes) {
        let cheapestEdge = null;

        treeNodes.forEach(function inspectTreeNode(fromId) {
            const neighbors = adjacency.get(fromId) || [];

            for (let i = 0; i < neighbors.length; i += 1) {
                const edge = neighbors[i];

                if (!treeNodes.has(edge.to) && this.#isCheaperTreeEdge(edge, cheapestEdge)) {
                    cheapestEdge = edge;
                }
            }
        }, this);

        return cheapestEdge;
    }

    /**
     * Compare two candidate MST edges.
     * @param {object} candidate - Candidate edge.
     * @param {object|null} currentBest - Current best edge.
     * @returns {boolean} True when candidate is better.
     */
    #isCheaperTreeEdge(candidate, currentBest) {
        let cheaper = false;

        if (currentBest === null) {
            cheaper = true;
        } else if (candidate.weight < currentBest.weight) {
            cheaper = true;
        } else if (candidate.weight === currentBest.weight) {
            cheaper = this.#isEdgeTieBreakerSmaller(candidate, currentBest);
        }

        return cheaper;
    }

    /**
     * Break ties between equal-weight edges deterministically.
     * @param {object} candidate - Candidate edge.
     * @param {object} currentBest - Current best edge.
     * @returns {boolean} True when candidate should come first.
     */
    #isEdgeTieBreakerSmaller(candidate, currentBest) {
        let smaller = false;
        const candidateFrom = String(candidate.from);
        const currentFrom = String(currentBest.from);
        const candidateTo = String(candidate.to);
        const currentTo = String(currentBest.to);

        if (candidateFrom.localeCompare(currentFrom) < 0) {
            smaller = true;
        } else if (candidateFrom === currentFrom && candidateTo.localeCompare(currentTo) < 0) {
            smaller = true;
        }

        return smaller;
    }

    // ---------------------------------------------------------------------
    // Bellman-Ford Shortest Path
    // ---------------------------------------------------------------------

    /**
     * Plan Bellman-Ford the shortest path.
     * Bellman-Ford relaxes every edge repeatedly and can detect negative cycles.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     * @returns {object} Bellman-Ford plan.
     */
    #planBellmanFordShortestPath(startId, endId) {
        const state = this.#createAlgorithmState();
        const distances = this.#createDistanceTable(startId);
        const edges = this.#buildRelaxationEdgeList();

        this.#recordVisit(state, startId, distances);
        this.#repeatEdgeRelaxationPasses(edges, distances, state);

        return this.#createPlanObject("Bellman-Ford", "Bellman-Ford", startId, endId, state, distances, {
            negativeCycle: this.#hasReachableNegativeCycle(edges, distances)
        });
    }

    /**
     * Build edge list used by Bellman-Ford relaxation.
     * @returns {object[]} Relaxation edges.
     */
    #buildRelaxationEdgeList() {
        const edges = [];

        this.graph.edgeOrder.forEach(function addGraphEdge(edgeId) {
            const edge = this.graph.edgeMap.get(edgeId);

            if (edge) {
                edges.push(this.#createEdgeStep(edge.from, edge.to, edge.id, edge.weight));

                if (!this.graph.directed) {
                    edges.push(this.#createEdgeStep(edge.to, edge.from, edge.id, edge.weight));
                }
            }
        }, this);

        return edges;
    }

    /**
     * Repeat Bellman-Ford edge relaxation passes.
     * @param {object[]} edges - Relaxation edges.
     * @param {Map<string, number>} distances - Distance map.
     * @param {object} state - Algorithm state.
     */
    #repeatEdgeRelaxationPasses(edges, distances, state) {
        let changed = true;
        for (let pass = 1; pass < this.graph.nodeMap.size && changed; pass += 1) {
            changed = this.#relaxEveryEdgeOnce(edges, distances, state);
        }
    }

    /**
     * Relax every edge once.
     * @param {object[]} edges - Relaxation edges.
     * @param {Map<string, number>} distances - Distance map.
     * @param {object} state - Algorithm state.
     * @returns {boolean} True when at least one distance improved.
     */
    #relaxEveryEdgeOnce(edges, distances, state) {
        let changed = false;

        for (let i = 0; i < edges.length; i += 1) {
            const improved = this.#relaxEdge(edges[i], distances, state, true);

            if (improved) {
                changed = true;
            }
        }

        return changed;
    }

    /**
     * Detect whether a reachable negative cycle still improves a distance.
     * @param {object[]} edges - Relaxation edges.
     * @param {Map<string, number>} distances - Distance map.
     * @returns {boolean} True when reachable negative cycle exists.
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
 * Application mode helpers.
 *
 * Source of truth:
 * - #mode-select option values in HTML.
 */
class AppMode {
    /**
     * Get available modes from HTML.
     * @param {HTMLSelectElement} select - Mode select.
     * @returns {string[]} Modes.
     */
    static values(select) {
        let values = [];

        if (select && select.options) {
            values = Array.from(select.options, function mapOption(option) {
                return option.value;
            });
        }

        return values;
    }

    /**
     * Get default mode from HTML.
     * @param {HTMLSelectElement} select - Mode select.
     * @returns {string} Default mode.
     */
    static getDefault(select) {
        let mode = "";

        if (select && select.options && select.options.length > 0) {
            mode = select.options[0].value;
        }

        return mode;
    }

    /**
     * Get panel id for mode.
     * @param {string} mode - Mode.
     * @returns {string} Panel id.
     */
    static getPanelId(mode) {
        return `panel-${mode}`;
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
        this.#setStatus("Ready.");
        this.draw();
    }

    /**
     * Convert number to alphabetic label.
     * @param {number} value - Positive one-based number.
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
     * @param {string} nodeId - Node id.
     * @returns {number|undefined} Distance.
     */
    getTraversalDistance(nodeId) {
        return this.#uiState.traversal.distances.get(nodeId);
    }

    /**
     * Create UI state.
     * @returns {object} UI state.
     */
    #createUiState() {
        return {
            mode: AppMode.getDefault(this.#elements.modeSelect),
            selectedNodeIdForEdge: null,
            hoveredNodeId: null,
            hoveredEdgeId: null,
            editSelection: null,
            suppressNextClick: false,
            edgeWeightDraft: 1,

            drag: {
                nodeId: null,
                moved: false
            },

            viewport: {
                x: 0,
                y: 0,
                scale: 1,
                dragging: false,
                moved: false,
                lastX: 0,
                lastY: 0
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
            directedToggle: document.getElementById("directed-toggle"),
            weightedToggle: document.getElementById("weighted-toggle"),
            modeSelect: document.querySelector("#graph-mode select"),
            nodeLabelModeSelect: document.getElementById("node-label-mode-select"),
            defaultNodeRadiusInput: document.getElementById("default-node-radius-input"),
            saveLocalBtn: document.getElementById("save-local-btn"),
            loadLocalBtn: document.getElementById("load-local-btn"),
            clearGraphBtn: document.getElementById("clear-graph-btn"),
            sampleGraphBtn: document.getElementById("sample-graph-btn"),
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
            applyEditBtn: document.getElementById("apply-edit-btn"),
            clearEditSelectionBtn: document.getElementById("clear-edit-selection-btn"),
            startNodeSelect: document.getElementById("start-node-select"),
            endNodeSelect: document.getElementById("end-node-select"),
            algorithmSelect: document.getElementById("algorithm-select"),
            delayInput: document.getElementById("delay-input"),
            traversalOutput: document.getElementById("traversal-output"),
            runTraversalBtn: document.getElementById("run-traversal-btn"),
            stepTraversalBtn: document.getElementById("step-traversal-btn"),
            clearTraversalBtn: document.getElementById("clear-traversal-btn"),
            stopTraversalBtn: document.getElementById("stop-traversal-btn"),
            exportBtn: document.getElementById("export-btn"),
            importBtn: document.getElementById("import-btn"),
            jsonArea: document.getElementById("json-area"),
            canvas: document.querySelector("#graph-editor canvas"),
            statusBox: document.getElementById("graph-status"),
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

        this.#elements.canvas.addEventListener("dblclick", this.handleCanvasDoubleClick.bind(this));
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
     * @param {KeyboardEvent} event - Keyboard event.
     */
    #handleKeyDown(event) {
        const key = event.key.toLowerCase();
        const modifierPressed = event.ctrlKey || event.metaKey;

        if (modifierPressed && key === "z" && !event.shiftKey) {
            event.preventDefault();
            this.undoGraphChange();
        } else if (
            (modifierPressed && key === "y") ||
            (modifierPressed && event.shiftKey && key === "z")
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
        this.#ctx.restore();
    }

    /**
     * Draw background grid.
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
     * Convert mouse event to screen and world coordinates.
     * @param {MouseEvent|WheelEvent} event - Pointer event.
     * @returns {object} Pointer coordinates.
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
    }

    /**
     * Set active mode.
     * @param {string} mode - Mode.
     */
    #setMode(mode) {
        this.#uiState.mode = mode;
        this.#elements.modeSelect.value = mode;
        this.syncControls();
    }

    /**
     * Sync active mode panel.
     */
    #syncModePanels() {
        AppMode.values(this.#elements.modeSelect).forEach(function syncPanel(mode) {
            const panel = document.getElementById(AppMode.getPanelId(mode));
            if (panel) {
                panel.hidden = mode !== this.#uiState.mode;
            }
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
     * Set status message.
     *
     * @param {string} message - Message.
     */
    #setStatus(message) {
        this.#elements.statusBox.textContent = message;
    }

    /**
     * Clear selected render state from all entities.
     */
    #clearSelectedState() {
        this.graph.nodeMap.forEach(function clearNode(node) {
            node.renderState.markSelected(false);
        });

        this.graph.edgeMap.forEach(function clearEdge(edge) {
            edge.renderState.markSelected(false);
        });
    }

    /**
     * Clear hover render state from current hovered entity.
     */
    #clearHoverState() {
        const node = this.graph.getNodeById(this.#uiState.hoveredNodeId);
        const edge = this.graph.getEdgeById(this.#uiState.hoveredEdgeId);

        if (node) {
            node.renderState.markHovered(false);
        }

        if (edge) {
            edge.renderState.markHovered(false);
        }

        this.#uiState.hoveredNodeId = null;
        this.#uiState.hoveredEdgeId = null;
    }

    /**
     * Clear edit and edge-source selection state.
     */
    #clearEditSelectionState() {
        this.#uiState.editSelection = null;
        this.#uiState.selectedNodeIdForEdge = null;
        this.#clearSelectedState();
        this.syncControls();
    }

    /**
     * Clear temporary compose selections.
     */
    #resetComposeSelection() {
        this.#clearEditSelectionState();
    }

    /**
     * Undo graph change.
     */
    undoGraphChange() {
        if (this.graph.undo()) {
            this.#resetAfterGraphLoad();
            this.#setStatus("Undo.");
        } else {
            this.#setStatus("Nothing to undo.");
        }
    }

    /**
     * Redo graph change.
     */
    redoGraphChange() {
        if (this.graph.redo()) {
            this.#resetAfterGraphLoad();
            this.#setStatus("Redo.");
        } else {
            this.#setStatus("Nothing to redo.");
        }
    }

    /**
     * Handle mode change.
     */
    handleModeChange() {
        this.#setMode(this.#elements.modeSelect.value);
        this.#resetComposeSelection();
        this.#setStatus("Mode changed.");
        this.draw();
    }

    /**
     * Handle node label mode change.
     */
    handleNodeLabelModeChange() {
        this.#setStatus("New nodes will use selected label style.");
    }

    /**
     * Handle default node radius input.
     */
    handleDefaultNodeRadiusInput() {
        const parsed = Number(this.#elements.defaultNodeRadiusInput.value);

        if (Number.isFinite(parsed) && parsed > 0) {
            Node.setDefaultRadius(parsed);
            this.syncControls();
            this.#setStatus("Default node radius updated.");
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
        this.#setStatus(this.graph.directed ? "Directed graph." : "Undirected graph.");
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
        this.#setStatus(this.graph.weighted ? "Weighted graph." : "Unweighted graph.");
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
     * Handle canvas double click.
     * @param {MouseEvent} event - Mouse event.
     */
    handleCanvasDoubleClick(event) {
        this.#uiState.suppressNextClick = true;

        const point = this.#getPointer(event);
        const node = this.graph.findNodeAt(point.x, point.y);
        const edge = node ? null : this.graph.findEdgeAt(point.x, point.y);

        if (node || edge) {
            this.#deleteEntity(node, edge);
        }

        this.draw();
    }

    /**
     * Delete a node or edge.
     * @param {Node|null} node - Node.
     * @param {Edge|null} edge - Edge.
     */
    #deleteEntity(node, edge) {
        this.#clearEditSelectionState();

        if (node) {
            this.graph.removeNode(node.id);
            this.refreshNodeSelectors();
            this.#setStatus("Node deleted.");
        } else if (edge) {
            this.graph.removeEdge(edge.id);
            this.#setStatus("Edge deleted.");
        }

        this.clearTraversal();
        this.syncControls();
    }

    /**
     * Handle canvas click.
     * @param {MouseEvent} event - Mouse event.
     */
    handleCanvasClick(event) {
        if (this.#uiState.suppressNextClick) {
            this.#uiState.suppressNextClick = false;
        } else if (this.#uiState.viewport.moved) {
            this.#uiState.viewport.moved = false;
        } else {
            this.#routeCanvasClick(this.#getPointer(event));
        }

        this.draw();
    }

    /**
     * Route canvas click by current pointer target and mode.
     * @param {object} point - Pointer position.
     */
    #routeCanvasClick(point) {
        const node = this.graph.findNodeAt(point.x, point.y);
        const edge = node ? null : this.graph.findEdgeAt(point.x, point.y);

        if (!node && !edge) {
            this.#handleEmptyCanvasClick(point);
        } else if (this.#uiState.mode === "add-edge") {
            this.#handleAddEdgeMode(node);
        } else if (this.#isCurrentEditNode(node)) {
            this.#startEdgeFromSelectedNode(node);
        } else {
            this.#setMode("edit");
            this.#handleEditMode(node, edge);
        }
    }

    /**
     * Check whether clicked node is the current edit-selected node.
     * @param {Node|null} node - Clicked node.
     * @returns {boolean} True when clicked node is already selected for editing.
     */
    #isCurrentEditNode(node) {
        const selection = this.#uiState.editSelection;
        return Boolean(node && selection && selection.type === "node" && selection.id === node.id);
    }

    /**
     * Handle empty canvas click.
     * @param {object} point - Pointer position.
     */
    #handleEmptyCanvasClick(point) {
        this.#setMode("add-node");
        this.#cancelEdgeSource();
        this.#handleAddNode(point, null);
    }

    /**
     * Handle add-node mode.
     * @param {object} point - Pointer position.
     * @param {Node|null} existingNode - Existing node at pointer.
     */
    #handleAddNode(point, existingNode) {
        if (!existingNode) {
            this.graph.addNode(point.x, point.y, this.#createNodeLabel());
            this.refreshNodeSelectors();
            this.#setStatus("Node added.");
        }
    }

    /**
     * Create a label for a new node.
     * @returns {string|null} Node label or null for automatic numeric label.
     */
    #createNodeLabel() {
        let label = null;

        if (this.#elements.nodeLabelModeSelect.value === "alphabetic") {
            label = App.numberToLetters(this.graph.nodeOrder.length + 1);
        }

        return label;
    }

    /**
     * Start edge creation from the current selected node.
     * @param {Node} node - Selected node.
     */
    #startEdgeFromSelectedNode(node) {
        this.#setMode("add-edge");
        this.#selectEdgeSource(node);
    }

    /**
     * Handle add-edge mode.
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
     * @param {Node} node - Source node.
     */
    #selectEdgeSource(node) {
        this.#clearSelectedState();
        this.#uiState.selectedNodeIdForEdge = node.id;

        node.renderState.markSelected(true);

        this.syncControls();
        this.#setStatus(`Source node ${node.label} selected.`);
    }

    /**
     * Cancel selected edge source.
     */
    #cancelEdgeSource() {
        this.#uiState.selectedNodeIdForEdge = null;
        this.#clearSelectedState();
        this.syncControls();
        this.#setStatus("Edge selection canceled.");
    }

    /**
     * Create edge to destination node.
     * @param {Node} node - Destination node.
     */
    #createEdgeToNode(node) {
        const fromId = this.#uiState.selectedNodeIdForEdge;
        const weight = this.#resolveEdgeWeight();
        const edge = weight === null ? null : this.graph.addEdge(fromId, node.id, weight);

        if (weight === null) {
            this.#setStatus("Invalid weight.");
        } else if (!edge) {
            this.#setStatus("That edge already exists or uses missing nodes.");
        } else {
            this.#setStatus("Edge added.");
        }

        this.#cancelEdgeSource();
    }

    /**
     * Resolve edge weight.
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
     * @param {Node|null} node - Node.
     * @param {Edge|null} edge - Edge.
     */
    #handleEditMode(node, edge) {
        this.#clearSelectedState();

        if (node) {
            this.#uiState.editSelection = this.#createNodeEditSelection(node);
            node.renderState.markSelected(true);
            this.#setStatus(`Loaded node ${node.label}.`);
        } else if (edge) {
            this.#uiState.editSelection = this.#createEdgeEditSelection(edge);
            edge.renderState.markSelected(true);
            this.#setStatus("Loaded edge.");
        }

        this.syncControls();
    }

    /**
     * Create node edit selection.
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
        const selection = this.#uiState.editSelection;

        if (selection && selection.type === "node") {
            selection.label = this.#elements.editNodeLabelInput.value;
        }
    }

    /**
     * Handle node radius edit input.
     */
    handleEditNodeRadiusInput() {
        const selection = this.#uiState.editSelection;

        if (selection && selection.type === "node") {
            const value = this.#elements.editNodeRadiusInput.value.trim();
            selection.radius = value === "" ? null : Number(value);
        }
    }

    /**
     * Handle edge weight edit input.
     */
    handleEditEdgeWeightInput() {
        const selection = this.#uiState.editSelection;
        const parsed = Number(this.#elements.editEdgeWeightInput.value);

        if (selection && selection.type === "edge" && Number.isFinite(parsed)) {
            selection.weight = parsed;
        }
    }

    /**
     * Apply current edit selection.
     */
    applyEditSelection() {
        const selection = this.#uiState.editSelection;

        if (!selection) {
            this.#setStatus("Nothing is selected for editing.");
        } else if (selection.type === "node") {
            this.#applyNodeEdit();
        } else if (selection.type === "edge") {
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
        const radiusIsValid = radius === null || (Number.isFinite(Number(radius)) && Number(radius) > 0);

        if (!node) {
            this.#setStatus("Selected node no longer exists.");
        } else if (!label) {
            this.#setStatus("Node label cannot be empty.");
        } else if (!radiusIsValid) {
            this.#setStatus("Node radius must be positive or empty.");
        } else {
            this.graph.saveHistory();
            node.setLabel(label);
            node.setRadius(radius);
            this.refreshNodeSelectors();
            this.syncControls();
            this.#setStatus("Node updated.");
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
            this.#setStatus("Selected edge no longer exists.");
        } else if (this.graph.weighted && !Number.isFinite(parsed)) {
            this.#setStatus("Edge weight must be a valid number.");
        } else {
            this.graph.saveHistory();

            if (this.graph.weighted) {
                edge.setWeight(parsed);
            }

            this.syncControls();
            this.#setStatus("Edge updated.");
            this.draw();
        }
    }

    /**
     * Clear edit selection.
     * @param {string|null} status - Optional status message.
     */
    clearEditSelection(status = null) {
        this.#clearEditSelectionState();
        this.#setStatus(status || "Edit selection cleared.");
        this.draw();
    }

    /**
     * Handle mouse down.
     * @param {MouseEvent} event - Mouse event.
     */
    handleMouseDown(event) {
        const point = this.#getPointer(event);
        const node = this.graph.findNodeAt(point.x, point.y);
        const shouldPan = event.button === 1 || event.altKey || !node;

        if (node && !shouldPan) {
            this.#uiState.drag.nodeId = node.id;
            this.#uiState.drag.moved = false;
        } else if (shouldPan) {
            this.#startPan(point);
        }
    }

    /**
     * Handle mouse move.
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
        if (this.#uiState.drag.nodeId !== null) {
            this.#finishNodeDrag();
        }

        if (this.#uiState.viewport.dragging) {
            this.#stopPan();
        }
    }

    /**
     * Finish node drag.
     */
    #finishNodeDrag() {
        this.#uiState.drag.nodeId = null;

        if (this.#uiState.drag.moved) {
            this.#uiState.suppressNextClick = true;
            this.#clearEditSelectionState();
            this.#setStatus("Node moved.");
            this.draw();
        }

        this.#uiState.drag.moved = false;
    }

    /**
     * Update hover state
     * @param {object} point - Pointer position.
     */
    #updateHover(point) {
        const node = this.graph.findNodeAt(point.x, point.y);
        const edge = node ? null : this.graph.findEdgeAt(point.x, point.y);

        this.#clearHoverState();

        if (node) {
            node.renderState.markHovered(true);
            this.#uiState.hoveredNodeId = node.id;
        } else if (edge) {
            edge.renderState.markHovered(true);
            this.#uiState.hoveredEdgeId = edge.id;
        }
    }

    /**
     * Move dragged node.
     * @param {object} point - Pointer position.
     */
    #moveDraggedNode(point) {
        const node = this.graph.getNodeById(this.#uiState.drag.nodeId);

        if (node) {
            if (!this.#uiState.drag.moved && (node.x !== point.x || node.y !== point.y)) {
                this.graph.saveHistory();
                this.#uiState.drag.moved = true;
            }

            node.moveTo(point.x, point.y);
        }
    }

    /**
     * Start viewport pan.
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
     * Add node options to traversal selectors.
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
     * Restore selector values after rebuilding options.
     * @param {string} previousStart - Previous start node id.
     * @param {string} previousEnd - Previous end node id.
     */
    #restoreNodeSelectorValues(previousStart, previousEnd) {
        if (this.graph.nodeOrder.length > 0) {
            const fallbackStart = this.graph.nodeOrder[0];
            this.#elements.startNodeSelect.value = this.graph.getNodeById(previousStart) ? previousStart : fallbackStart;
        }
        this.#elements.endNodeSelect.value = this.graph.getNodeById(previousEnd) ? previousEnd : "";
    }

    /**
     * Read traversal settings.
     * @returns {object|null} Traversal settings.
     */
    #getTraversalSettings() {
        let settings = null;

        if (this.graph.nodeMap.size === 0) {
            this.#setStatus("There are no nodes in the graph.");
        } else if (!this.#elements.startNodeSelect.value) {
            this.#setStatus("Choose a start node.");
        } else {
            settings = this.#createTraversalSettings();
        }

        return settings;
    }

    /**
     * Create traversal settings after validation.
     * @returns {object|null} Traversal settings.
     */
    #createTraversalSettings() {
        let settings = null;

        const algorithm = this.#elements.algorithmSelect.value;

        if (algorithm === "Prim" && this.graph.directed) {
            this.#setStatus("Prim's MST requires an undirected graph.");
        } else if (algorithm === "Dijkstra" && this.#graphHasNegativeWeight()) {
            this.#setStatus("Dijkstra does not support negative weights. Use Bellman-Ford.");
        } else {
            settings = {
                algorithm,
                startId: this.#elements.startNodeSelect.value,
                endId: this.#elements.endNodeSelect.value || null,
                delay: Math.max(this.#elements.delayInput.min, Number(this.#elements.delayInput.value))
            };
        }

        return settings;
    }

    /**
     * Check whether the graph has a negative edge weight.
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
            this.#setStatus("Traversal is already running.");
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
            this.#stepPreparedTraversal();
        }
    }

    /**
     * Prepare a traversal plan.
     * @param {object} settings - Traversal settings.
     */
    #prepareTraversal(settings) {
        const traversal = new Traversal(this.graph);

        this.clearTraversal();
        this.#uiState.traversal.plan = traversal.createPlan(settings.algorithm, settings.startId, settings.endId);
        this.#uiState.traversal.index = 0;
        this.#setStatus(`${this.#uiState.traversal.plan.name} ready.`);
    }

    /**
     * Check whether the current traversal plan can be reused.
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
     * Step an already prepared traversal.
     */
    #stepPreparedTraversal() {
        const plan = this.#uiState.traversal.plan;

        if (plan && this.#uiState.traversal.index < plan.steps.length) {
            this.#setStatus("Traversal running.");
            this.#advanceTraversalStep();

            if (this.#uiState.traversal.index >= plan.steps.length) {
                this.#finishTraversal();
            }
        } else {
            this.#setStatus("Traversal is already complete.");
        }
    }

    /**
     * Animate traversal.
     * @param {number} delay - Delay between steps.
     * @param {number} token - Traversal token.
     */
    async #animateTraversal(delay, token) {
        this.#setStatus("Traversal running.");

        while (this.#shouldContinueTraversal(token)) {
            this.#advanceTraversalStep();
            await this.#sleep(delay);
        }

        if (token === this.#uiState.traversal.token) {
            this.#finishTraversal();
            this.#uiState.traversal.running = false;
        }
    }

    /**
     * Check whether automatic traversal should continue.
     * @param {number} token - Traversal token.
     * @returns {boolean} True when traversal should continue.
     */
    #shouldContinueTraversal(token) {
        const traversal = this.#uiState.traversal;

        return Boolean(traversal.plan) &&
            traversal.index < traversal.plan.steps.length &&
            token === traversal.token;
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
            this.#elements.traversalOutput.textContent = `${plan.name} step ${this.#uiState.traversal.index} of ${plan.steps.length}.`;
            this.draw();
        }
    }

    /**
     * Mark render state for one traversal step.
     * @param {object|undefined} step - Traversal step.
     */
    #markTraversalStep(step) {
        if (step) {
            this.#clearActiveTraversalStates();

            if (step.type === "active") {
                this.#markActiveTraversalEntity(step);
            } else if (step.type === "visit") {
                this.#markVisitedTraversalEntity(step);
            }

            if (step.distances) {
                this.#uiState.traversal.distances = new Map(step.distances);
            }
        }
    }

    /**
     * Mark active node and edge for a traversal step.
     *
     * @param {object} step - Traversal step.
     */
    #markActiveTraversalEntity(step) {
        const node = this.graph.getNodeById(step.nodeId);
        const edge = step.edgeId ? this.graph.getEdgeById(step.edgeId) : null;

        if (node) {
            node.renderState.markActive(true);
        }

        if (edge) {
            edge.renderState.markActive(true);
        }
    }

    /**
     * Mark visited node and edge for a traversal step.
     * @param {object} step - Traversal step.
     */
    #markVisitedTraversalEntity(step) {
        const node = this.graph.getNodeById(step.nodeId);
        const edge = step.edgeId ? this.graph.getEdgeById(step.edgeId) : null;

        if (node) {
            node.renderState.markVisited(true);
        }

        if (edge) {
            edge.renderState.markVisited(true);
        }
    }

    /**
     * Clear active traversal state from all entities.
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
     * @param {number} ms - Milliseconds.
     * @returns {Promise<void>} Sleep promise.
     */
    #sleep(ms) {
        return new Promise(function resolveLater(resolve) {
            window.setTimeout(resolve, ms);
        });
    }

    /**
     * Finish traversal and mark final path or tree.
     */
    #finishTraversal() {
        const plan = this.#uiState.traversal.plan;

        if (plan) {
            this.#clearActiveTraversalStates();
            this.#markFinalPath(plan);
            this.#writeTraversalOutput(plan);
            this.#setStatus(`${plan.name} complete.`);
            this.draw();
        }
    }

    /**
     * Mark final shortest path or MST tree.
     * @param {object} plan - Traversal plan.
     */
    #markFinalPath(plan) {
        if (plan.algorithm === "Prim") {
            this.#markTreePath(plan.parent);
        } else if (plan.endId !== null) {
            this.#markTargetPath(plan.parent, plan.startId, plan.endId);
        }
    }

    /**
     * Mark every parent edge as final tree path.
     * @param {Map<string, object>} parent - Parent map.
     */
    #markTreePath(parent) {
        parent.forEach(function markTreeNode(step, nodeId) {
            const edge = this.graph.getEdgeById(step.edgeId);
            const node = this.graph.getNodeById(nodeId);
            const prevNode = this.graph.getNodeById(step.prev);

            if (edge) {
                edge.renderState.markPath(true);
            }

            if (node) {
                node.renderState.markPath(true);
            }

            if (prevNode) {
                prevNode.renderState.markPath(true);
            }
        }, this);
    }

    /**
     * Mark final path to target node.
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
                edge.renderState.markPath(true);
            }

            if (node) {
                node.renderState.markPath(true);
            }

            cursor = step.prev;
        }

        this.#markPathStartNode(parent, startId, endId);
    }

    /**
     * Mark start node when target path exists.
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} startId - Start node id.
     * @param {string} endId - End node id.
     */
    #markPathStartNode(parent, startId, endId) {
        const startNode = this.graph.getNodeById(startId);

        if (startNode && (endId === startId || parent.has(endId))) {
            startNode.renderState.markPath(true);
        }
    }

    /**
     * Write final traversal output.
     * @param {object} plan - Traversal plan.
     */
    #writeTraversalOutput(plan) {
        if (plan.algorithm === "Dijkstra") {
            this.#writeShortestPathOutput(plan, "Dijkstra");
        } else if (plan.algorithm === "Bellman-Ford") {
            this.#writeBellmanFordOutput(plan);
        } else if (plan.algorithm === "Prim") {
            this.#writePrimOutput(plan);
        } else {
            this.#writeTraversalOrderOutput(plan);
        }
    }

    /**
     * Write traversal order output.
     * @param {object} plan - Traversal plan.
     */
    #writeTraversalOrderOutput(plan) {
        this.#elements.traversalOutput.innerHTML = `${plan.name} order:<hr>${this.#formatNodeOrder(plan.order)}`;
    }

    /**
     * Write shortest-path output.
     * @param {object} plan - Traversal plan.
     * @param {string} name - Algorithm display name.
     */
    #writeShortestPathOutput(plan, name) {
        if (plan.endId === null) {
            this.#elements.traversalOutput.textContent = `${name} visited: ${this.#formatNodeOrder(plan.order)}`;
        } else {
            this.#writeTargetDistanceOutput(plan, name);
        }
    }

    /**
     * Write target distance output.
     * @param {object} plan - Traversal plan.
     * @param {string} name - Algorithm display name.
     */
    #writeTargetDistanceOutput(plan, name) {
        const target = this.graph.getNodeById(plan.endId);
        const distance = plan.distances.get(plan.endId);
        const label = target ? target.label : String(plan.endId);

        if (Number.isFinite(distance)) {
            this.#elements.traversalOutput.innerHTML = `${name} visited:<hr>${this.#formatNodeOrder(plan.order)}<hr>Shortest distance to ${label}: ${distance}.`;
        } else {
            this.#elements.traversalOutput.textContent = `${name} visited: ${this.#formatNodeOrder(plan.order)}\n\nNo path to ${label}.`;
        }
    }

    /**
     * Write Bellman-Ford output.
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
     * @param {object} plan - Traversal plan.
     */
    #writePrimOutput(plan) {
        const status = plan.metadata.connected ? "MST Complete" : "MST Partial";

        this.#elements.traversalOutput.innerHTML = `${status}, Order:<hr><p>${this.#formatNodeOrder(plan.order)}</p><hr>Weight: ${plan.metadata.totalWeight}`;
    }

    /**
     * Get node label.
     * @param {string} nodeId - Node id.
     * @returns {string} Node label.
     */
    #getNodeLabel(nodeId) {
        const node = this.graph.getNodeById(nodeId);
        return node ? node.label : String(nodeId);
    }

    /**
     * Convert node id order to display labels.
     * @param {string[]} order - Node id order.
     * @returns {string} Formatted order.
     */
    #formatNodeOrder(order) {
        return order.map(function formatNodeId(nodeId) {
            return this.#getNodeLabel(nodeId);
        }, this).join(" → ");
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
        this.graph.nodeMap.forEach(function clearNode(node) {node.renderState.clearTraversal();});
        this.graph.edgeMap.forEach(function clearEdge(edge) {edge.renderState.clearTraversal();});
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
        this.#setStatus("Traversal stopped.");
        this.draw();
    }

    /**
     * Export graph JSON.
     */
    exportGraph() {
        this.#elements.jsonArea.value = JSON.stringify(this.graph.export(), null, 2);
        this.#setStatus("Graph exported.");
    }

    /**
     * Import graph JSON.
     */
    importGraph() {
        try {
            const payload = JSON.parse(this.#elements.jsonArea.value);

            this.graph.load(payload);
            this.#resetAfterGraphLoad();
            this.#setStatus("Graph imported.");
        } catch (error) {
            this.#setStatus("Import failed.");
        }
    }

    /**
     * Save graph to local storage.
     */
    saveLocal() {
        window.localStorage.setItem("graph-state", JSON.stringify(this.graph.export()));
        this.#setStatus("Saved locally.");
    }

    /**
     * Load graph from local storage.
     */
    loadLocal() {
        const raw = window.localStorage.getItem("graph-state");

        if (raw) {
            this.#loadLocalGraph(raw);
        } else {
            this.#setStatus("No save found.");
        }
    }

    /**
     * Load serialized graph from local storage value.
     * @param {string} raw - Raw serialized graph.
     */
    #loadLocalGraph(raw) {
        try {
            this.graph.load(JSON.parse(raw));
            this.#resetAfterGraphLoad();
            this.#setStatus("Loaded from local storage.");
        } catch (error) {
            this.#setStatus("Saved graph is invalid.");
        }
    }

    /**
     * Clear graph.
     */
    clearGraph() {
        this.graph.reset();
        this.graph.clearHistory();
        this.#resetAfterGraphLoad();
        this.#setStatus("Graph cleared.");
    }

    /**
     * Load sample graph.
     */
    loadSampleGraph() {
        Graph.loadSampleAsync()
            .then(function handleSampleData(data) {
                this.graph.load(data);
                this.#resetAfterGraphLoad();
                this.#setStatus("Sample graph loaded.");
            }.bind(this))
            .catch(function handleSampleError(error) {
                this.#setStatus(error.message);
            }.bind(this));
    }

    /**
     * Reset mode to the default HTML mode.
     */
    #resetModeToDefault() {
        this.#setMode(AppMode.getDefault(this.#elements.modeSelect));
    }

    /**
     * Reset UI after graph load.
     */
    #resetAfterGraphLoad() {
        this.#uiState.selectedNodeIdForEdge = null;
        this.#uiState.hoveredNodeId = null;
        this.#uiState.hoveredEdgeId = null;
        this.#uiState.editSelection = null;
        this.#uiState.drag.nodeId = null;
        this.#uiState.drag.moved = false;
        this.#resetModeToDefault();
        this.clearTraversal();
        this.refreshNodeSelectors();
        this.syncControls();
        this.draw();
    }
}

/**
 * Start app after DOM is ready.
 */
window.addEventListener("DOMContentLoaded", function startApp() {
    const copyrightYear = document.getElementById("copyright-year");

    if (copyrightYear) {
        copyrightYear.textContent = String(new Date().getFullYear());
    }

    AppStartup.bindAsideNavigation();

    window.graphApp = new App();
});

/**
 * Startup helpers.
 */
class AppStartup {
    /**
     * Bind aside navigation buttons.
     */
    static bindAsideNavigation() {
        const asideNavButtons = document.querySelectorAll("aside nav button");

        asideNavButtons.forEach(function bindAsideButton(button) {
            button.addEventListener("click", function handleAsideClick() {
                AppStartup.scrollAsideToButtonTarget(button);
            });
        });
    }

    /**
     * Scroll aside container to target panel.
     * @param {HTMLButtonElement} button - Aside navigation button.
     */
    static scrollAsideToButtonTarget(button) {
        const targetId = button.dataset.target;
        const target = document.getElementById(targetId);
        const container = document.querySelector("aside");

        if (target && container) {
            container.scrollTo({
                left: target.offsetLeft,
                behavior: "smooth"
            });
        }
    }
}