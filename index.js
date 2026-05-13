"use strict";

/**
 * Stores transient visual state for a graph node or edge.
 * RenderState only controls the presentation state used during rendering and traversal visualization.
 * It is not exported with graph data.
 */
class RenderState {

    #state = {
        hovered: false,
        selected: false,
        active: false,
        visited: false,
        path: false
    };

    /**
     * Read or update a render-state flag.
     * Passing null reads the current value.
     * Passing any other value updates the flag.
     *
     * @param {string} key - State flag name.
     * @param {boolean|null} value - New value, or null to read.
     * @returns {boolean|undefined} Current value when reading.
     */
    #stateValue(key, value) {
        let result;

        if (value === null) {
            result = this.#state[key];
        } else {
            this.#state[key] = Boolean(value);
        }

        return result;
    }

    /**
     * Read or update hovered state.
     *
     * @param {boolean|null} value - New hovered state, or null to read.
     * @returns {boolean|undefined} Current hovered state when reading.
     */
    hovered(value = null) {
        return this.#stateValue("hovered", value);
    }

    /**
     * Read or update the selected state.
     *
     * @param {boolean|null} value - New selected state, or null to read.
     * @returns {boolean|undefined} Current selected state when reading.
     */
    selected(value = null) {
        return this.#stateValue("selected", value);
    }

    /**
     * Read or update active traversal state.
     *
     * @param {boolean|null} value - New active state, or null to read.
     * @returns {boolean|undefined} Current active state when reading.
     */
    active(value = null) {
        return this.#stateValue("active", value);
    }

    /**
     * Read or update visited traversal state.
     *
     * @param {boolean|null} value - New visited state, or null to read.
     * @returns {boolean|undefined} Current visited state when reading.
     */
    visited(value = null) {
        return this.#stateValue("visited", value);
    }

    /**
     * Read or update the final traversal path state.
     *
     * @param {boolean|null} value - New path state, or null to read.
     * @returns {boolean|undefined} Current path state when reading.
     */
    path(value = null) {
        return this.#stateValue("path", value);
    }

    /**
     * Clear active traversal state.
     */
    clearActive() {
        this.#state.active = false;
    }

    /**
     * Clear traversal-related visual state.
     * Hovered and selected states remain unchanged.
     */
    clearTraversal() {
        this.#state.active = false;
        this.#state.visited = false;
        this.#state.path = false;
    }
}


/**
 * Represents one graph node and owns its drawing and hit-testing logic.
 */
class Node {

    static DEFAULT_RADIUS = 17;

    static STYLE_DEFAULT = Object.freeze({
        fill: "#1e293b",
        stroke: "#64748b",
        lineWidth: 2
    });

    static STYLE_VISITED = Object.freeze({
        fill: "#14532d",
        stroke: "#4ade80",
        lineWidth: 3
    });

    static STYLE_ACTIVE = Object.freeze({
        fill: "#78350f",
        stroke: "#f59e0b",
        lineWidth: 4
    });

    static STYLE_PATH = Object.freeze({
        fill: "#7f1d1d",
        stroke: "#f87171",
        lineWidth: 3
    });

    static STYLE_HOVERED = Object.freeze({
        fill: "#22d3ee",
        stroke: "#164e63",
        lineWidth: 3
    });

    static STYLE_SELECTED = Object.freeze({
        fill: "#818cf8",
        stroke: "#312e81",
        lineWidth: 5
    });

    /**
     * Create a node.
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
     * Create a node from serialized graph data.
     *
     * @param {object} data - Serialized node data.
     * @returns {Node} Node.
     */
    static fromJSON(data) {
        return new Node(
            data.id,
            data.label,
            data.x,
            data.y,
            data.radius
        );
    }

    /**
     * Normalize a node radius.
     * Invalid or non-positive values become null, causing the node to use the global default radius.
     *
     * @param {number|string|null|undefined} radius - Radius candidate.
     * @returns {number|null} Normalized radius.
     */
    static normalizeRadius(radius) {
        const parsed = Number(radius);
        return (Number.isFinite(parsed) && parsed > 0) ? parsed : null;
    }

    /**
     * Set the global default node radius.
     * Invalid values are ignored.
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
     * Resolve the active draw style for a render state.
     *
     * Visual priority:
     * Default <Visited < Active < Path < Hovered < Selected
     *
     * Later states override earlier states.
     *
     * @param {RenderState} state - Render state.
     * @returns {object} Active draw style.
     */
    static getDrawStyle(state) {
        let style = Node.STYLE_DEFAULT;

        if (state.visited()) {
            style = Node.STYLE_VISITED;
        }
        if (state.active()) {
            style = Node.STYLE_ACTIVE;
        }
        if (state.path()) {
            style = Node.STYLE_PATH;
        }
        if (state.hovered()) {
            style = Node.STYLE_HOVERED;
        }
        if (state.selected()) {
            style = Node.STYLE_SELECTED;
        }

        return style;
    }

    /**
     * Serialize the node as plain graph data.
     * Render state is not exported.
     *
     * @returns {object} Serialized node data.
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

    /**
     * Compare this node to another node alphabetically by label.
     *
     * @param {Node} other - Another node.
     * @returns {number} Label comparison result.
     */
    compareTo(other) {
        return this.label.localeCompare(other.label);
    }

    /**
     * Set node label.
     *
     * @param {string} label - New node label.
     */
    setLabel(label) {
        this.label = String(label);
    }

    /**
     * Get the effective node radius.
     * Nodes use their override radius when present.
     * Otherwise, the global default radius is used.
     *
     * @returns {number} Effective node radius.
     */
    getRadius() {
        let radius = Node.DEFAULT_RADIUS;

        if (this.radius !== null) {
            radius = this.radius;
        }

        return radius;
    }

    /**
     * Set node radius override.
     * Invalid or non-positive values clear the override and restore the global default radius.
     *
     * @param {number|string|null|undefined} radius - Radius candidate.
     */
    setRadius(radius) {
        this.radius = Node.normalizeRadius(radius);
    }

    /**
     * Move the node to a new world position.
     *
     * @param {number} x - New world x coordinate.
     * @param {number} y - New world y coordinate.
     */
    moveTo(x, y) {
        this.x = Number(x);
        this.y = Number(y);
    }

    /**
     * Check whether a world point intersects the node circle.
     *
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @returns {boolean} True when the point intersects the node.
     */
    containsPoint(x, y) {
        return (Geometry.distance(x, y, this.x, this.y) <= this.getRadius());
    }

    /**
     * Draw the node and optional traversal distance badge.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {number|undefined} distance - Optional traversal distance.
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
     * Draw the node circle.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {object} style - Active render style.
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
     * Draw the node label centered inside the node circle.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     */
    #drawNodeLabel(ctx) {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
        ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 1;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.label, this.x, this.y);
        ctx.restore();
    }

    /**
     * Draw a traversal distance badge above the node.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {number} distance - Traversal distance.
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
     * Format a traversal distance for badge display.
     *
     * @param {number} distance - Traversal distance.
     * @returns {string} Badge label.
     */
    #formatDistanceLabel(distance) {
        return distance === Infinity ? "∞" : String(distance);
    }

    /**
     * Get the distance badge bounds.
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
     * Draw the distance badge background.
     * Uses CanvasRenderingContext2D.roundRect() when available and falls back to a normal rectangle in older browsers.
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
     * Draw the distance badge text.
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
}


/**
 * Represents one graph edge and owns its drawing and hit-testing logic.
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
     * @param {string} to - Target node id.
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
     * Create an edge from serialized graph data.
     *
     * @param {object} data - Serialized edge data.
     * @returns {Edge} Edge.
     */
    static fromJSON(data) {
        return new Edge(
            data.id,
            data.from,
            data.to,
            data.weight
        );
    }

    /**
     * Normalize an edge weight.
     * Invalid weights default to 1.
     *
     * @param {number|string} weight - Weight candidate.
     * @returns {number} Normalized edge weight.
     */
    static normalizeWeight(weight) {
        const parsed = Number(weight);
        return Number.isFinite(parsed) ? parsed : 1;
    }

    /**
     * Serialize the edge as plain graph data.
     * Render state is not exported.
     *
     * @returns {object} Serialized edge data.
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
     * Compare this edge to another edge by weight.
     *
     * @param {Edge} other - Another edge.
     * @returns {number} Weight comparison result.
     */
    compareTo(other) {
        return this.weight - other.weight;
    }

    /**
     * Set edge weight.
     *
     * @param {number|string} weight - New edge weight.
     */
    setWeight(weight) {
        this.weight = Edge.normalizeWeight(weight);
    }

    /**
     * Draw the edge line, optional direction arrow, and optional weight label.
     * Missing endpoint nodes prevent rendering.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Graph} graph - Graph instance.
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
     * Check whether a world point intersects the edge hit area.
     * Hit testing uses the shortest point-to-segment distance.
     *
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @param {Graph} graph - Graph instance.
     * @returns {boolean} True when the point intersects the edge.
     */
    containsPoint(x, y, graph) {
        const endpoints = this.#getEndpoints(graph);
        let hit = false;

        if (endpoints !== null) {
            const distance = Geometry.distanceToSegment(x, y, endpoints.fromNode.x, endpoints.fromNode.y, endpoints.toNode.x, endpoints.toNode.y);
            hit = distance < Edge.HIT_TOLERANCE;
        }

        return hit;
    }

    /**
     * Resolve edge endpoint nodes from the graph.
     *
     * @param {Graph} graph - Graph instance.
     * @returns {object|null} Endpoint nodes, or null when either node is missing.
     */
    #getEndpoints(graph) {
        const fromNode = graph.getNodeById(this.from);
        const toNode = graph.getNodeById(this.to);
        return (fromNode && toNode) ? { fromNode, toNode } : null;
    }

    /**
     * Draw the main edge line between two nodes.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {object} style - Active render style.
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
     * Draw a direction arrow for a directed edge.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {object} style - Active render style.
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
     * Calculate arrowhead geometry for a directed edge.
     * The arrow tip is positioned at the target node boundary.
     *
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @returns {object} Arrow geometry.
     */
    #getArrowGeometry(fromNode, toNode) {
        const angle = Math.atan2(
            toNode.y - fromNode.y,
            toNode.x - fromNode.x
        );

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
     * Draw the edge weight label at the midpoint between endpoint nodes.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {object} style - Active render style.
     */
    #drawWeightLabel(ctx, fromNode, toNode, style) {
        const midpoint = this.#getMidpoint(fromNode, toNode);

        ctx.save();
        ctx.fillStyle = style.fill;
        ctx.font = "12px Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
        ctx.shadowColor = "rgb(0, 0, 0)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(this.weight), midpoint.x, midpoint.y);
        ctx.restore();
    }

    /**
     * Calculate the midpoint between two nodes.
     *
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @returns {object} Midpoint coordinates.
     */
    #getMidpoint(fromNode, toNode) {
        return {
            x: (fromNode.x + toNode.x) / 2,
            y: (fromNode.y + toNode.y) / 2
        };
    }
}


/**
 * Geometry helpers for graph hit testing and drawing calculations.
 */
class Geometry {

    /**
     * Calculate Euclidean distance between two points.
     *
     * @param {number} x1 - First point x coordinate.
     * @param {number} y1 - First point y coordinate.
     * @param {number} x2 - Second point x coordinate.
     * @param {number} y2 - Second point y coordinate.
     * @returns {number} Distance between the points.
     */
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate the shortest distance from a point to a line segment.
     * When the segment has zero length, the distance to the segment's single endpoint is returned.
     *
     * @param {number} px - Point x coordinate.
     * @param {number} py - Point y coordinate.
     * @param {number} x1 - Segment start x coordinate.
     * @param {number} y1 - Segment start y coordinate.
     * @param {number} x2 - Segment end x coordinate.
     * @param {number} y2 - Segment end y coordinate.
     * @returns {number} Shortest point-to-segment distance.
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
 *
 * The graph owns:
 * - node and edge storage
 * - render ordering
 * - import/export
 * - undo/redo history
 * - graph mutation operations
 */
class Graph {
    #undoStack = [];
    #redoStack = [];
    #historyLimit = 100;
    #historyLocked = false;

    /**
     * Create an empty graph.
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
     * Load sample graph data from the sample graph JSON file.
     *
     * @returns {Promise<object>} Serialized graph data.
     * @throws {Error} When the sample graph file cannot be loaded.
     */
    static async loadSampleAsync() {
        const response = await fetch("./sample-graph-data.json");
        if (!response.ok) {
            throw new Error("Failed to load sample graph data.");
        }

        return response.json();
    }

    /**
     * Create a stable unique node id.
     * crypto.randomUUID() is preferred when available.
     * A fallback generator is used in unsupported environments.
     *
     * @returns {string} Node id.
     */
    static createNodeId() {
        return (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
            ? `n:${crypto.randomUUID()}`
            : `n:${Graph.#createFallbackId()}`;
    }

    /**
     * Create a deterministic edge id from node endpoints.
     * Directed edges preserve a direction in the id.
     * Undirected edges normalize endpoint order so the same connection always produces the same id.
     *
     * @param {string} from - Source node id.
     * @param {string} to - Target node id.
     * @param {boolean} directed - Whether the graph is directed.
     * @returns {string} Edge id.
     */
    static createEdgeId(from, to, directed) {
        const fromId = String(from);
        const toId = String(to);
        return directed ? `e:${fromId}->${toId}` : Graph.#createUndirectedEdgeId(fromId, toId);
    }

    /**
     * Create a deterministic undirected edge id.
     *
     * Endpoint ids are sorted lexicographically so:
     * - A--B
     * - B--A
     *
     * produce the same edge id.
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
     * Create a fallback unique id.
     *
     * @returns {string} Fallback id.
     */
    static #createFallbackId() {
        const time = Date.now().toString(36);
        const random = Graph.#randomString(10);
        return `${time}-${random}`;
    }

    /**
     * Create a random lowercase alphanumeric string.
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
     * Save the current graph snapshot for undo.
     * Redo history is cleared whenever a new history entry is created.
     * History recording is skipped while restoring snapshots.
     */
    saveHistory() {
        if (!this.#historyLocked) {
            this.#undoStack.push(this.export());
            this.#redoStack.length = 0;
            this.#trimUndoHistory();
        }
    }

    /**
     * Undo the most recent graph mutation.
     *
     * @returns {boolean} True when undo succeeded.
     */
    undo() {
        const changed = this.#undoStack.length > 0;
        if (changed) {
            this.#redoStack.push(this.export());
            this.#restoreSnapshot(this.#undoStack.pop());
        }

        return changed;
    }

    /**
     * Redo the most recently undone graph mutation.
     *
     * @returns {boolean} True when redo succeeded.
     */
    redo() {
        const changed = this.#redoStack.length > 0;
        if (changed) {
            this.#undoStack.push(this.export());
            this.#restoreSnapshot(this.#redoStack.pop());
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
     * Restore a graph snapshot without recording additional history.
     *
     * @param {object} snapshot - Serialized graph snapshot.
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
     * Trim undo history to the configured history limit.
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
     * Remove every node and edge without recording history.
     * Graph configuration flags are preserved.
     */
    reset() {
        this.nodeMap.clear();
        this.edgeMap.clear();
        this.nodeOrder.length = 0;
        this.edgeOrder.length = 0;
    }

    /**
     * Load serialized graph data and clear undo history.
     * History recording is temporarily disabled while importing.
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
     * Create and add a node to the graph.
     * The new node is appended to render order.
     *
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @param {string|null} label - Optional node label.
     * @param {number|string|null|undefined} radius - Optional radius override.
     * @returns {Node} Created node.
     */
    addNode(x, y, label = null, radius = null) {
        this.saveHistory();
        const node = new Node(Graph.createNodeId(), this.#resolveNodeLabel(label), x, y, radius);
        this.#storeNode(node);
        return node;
    }

    /**
     * Remove a node and every connected edge.
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
     * Get a node by id.
     *
     * @param {string} id - Node id.
     * @returns {Node|null} Node, or null when missing.
     */
    getNodeById(id) {
        return this.nodeMap.get(String(id)) || null;
    }

    /**
     * Resolve the label for a newly created node.
     * When no label is provided, the current node count is used.
     *
     * @param {string|null} label - Optional explicit label.
     * @returns {string} Resolved node label.
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
     * Store a node in lookup storage and render order.
     *
     * @param {Node} node - Node.
     */
    #storeNode(node) {
        this.nodeMap.set(node.id, node);
        this.nodeOrder.push(node.id);
    }

    /**
     * Remove a node id from render order.
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
     * Edge render order is compacted after removals.
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
     * Create and add an edge between two nodes.
     *
     * Edge creation fails when:
     * - either node is missing
     * - endpoints are identical
     * - the edge already exists
     *
     * @param {string} from - Source node id.
     * @param {string} to - Target node id.
     * @param {number|string} weight - Edge weight.
     * @returns {Edge|null} Created edge, or null when creation failed.
     */
    addEdge(from, to, weight = 1) {
        const fromId = String(from);
        const toId = String(to);

        let edge = null;

        if (this.#canCreateEdge(fromId, toId)) {
            this.saveHistory();

            edge = new Edge(Graph.createEdgeId(fromId, toId, this.directed), fromId, toId, weight);
            this.#storeEdge(edge);
        }

        return edge;
    }

    /**
     * Remove an edge.
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
     * Check whether an edge already exists between two nodes.
     * Undirected graphs treat reversed endpoints as the same connection.
     *
     * @param {string} from - Source node id.
     * @param {string} to - Target node id.
     * @returns {boolean} True when the edge exists.
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
     * Get an edge by id.
     *
     * @param {string} id - Edge id.
     * @returns {Edge|null} Edge, or null when missing.
     */
    getEdgeById(id) {
        return this.edgeMap.get(String(id)) || null;
    }

    /**
     * Normalize every edge weight to 1.
     * Used when switching from weighted to unweighted mode.
     */
    normalizeWeights() {
        this.edgeMap.forEach(function normalize(edge) {
            edge.setWeight(1);
        });
    }

    /**
     * Check whether an edge can be created between two nodes.
     *
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @returns {boolean} True when the edge is valid and does not already exist.
     */
    #canCreateEdge(fromId, toId) {
        return (
            this.nodeMap.has(fromId) &&
            this.nodeMap.has(toId) &&
            fromId !== toId &&
            !this.edgeExists(fromId, toId)
        );
    }

    /**
     * Store an edge in lookup storage and render order.
     *
     * @param {Edge} edge - Edge.
     */
    #storeEdge(edge) {
        this.edgeMap.set(edge.id, edge);
        this.edgeOrder.push(edge.id);
    }

    /**
     * Remove an edge id from render order.
     *
     * @param {string} edgeId - Edge id.
     */
    #removeEdgeFromOrder(edgeId) {
        this.edgeOrder = this.edgeOrder.filter(function keep(id) {
            return id !== edgeId;
        });
    }

    /**
     * Remove edge ids from the render order when their edges no longer exist.
     */
    #removeMissingEdgesFromOrder() {
        this.edgeOrder = this.edgeOrder.filter(function keep(edgeId) {
            return this.edgeMap.has(edgeId);
        }, this);
    }

    /**
     * Check whether an existing edge matches a requested connection.
     * Directed graphs require a matching direction.
     * Undirected graphs also allow reversed endpoints.
     *
     * @param {Edge} edge - Existing edge.
     * @param {string} fromId - Requested source node id.
     * @param {string} toId - Requested target node id.
     * @returns {boolean} True when the edge matches the requested connection.
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
     * Compare two adjacency neighbor descriptors.
     * Weighted graphs compare by edge weight first.
     * Ties and unweighted graphs compare by destination node label.
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
     * Find the topmost node containing a world point.
     * Nodes later in the render order are checked first.
     *
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @returns {Node|null} Matching node, or null when none is hit.
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
     * Find the topmost edge containing a world point.
     * Edges later in render order are checked first.
     *
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @returns {Edge|null} Matching edge, or null when none is hit.
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
     * Compare adjacency neighbors by edge weight when the graph is weighted.
     *
     * @param {object} a - First adjacency neighbor.
     * @param {object} b - Second adjacency neighbor.
     * @returns {number} Sort result, or 0 when weights should not decide order.
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
     * Compare adjacency neighbors by destination node label.
     *
     * @param {object} a - First adjacency neighbor.
     * @param {object} b - Second adjacency neighbor.
     * @returns {number} Sort result, or 0 when either node is missing.
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
     * @param {App} app - App instance used to resolve traversal distance badges.
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
     * Export the graph as plain serializable data.
     * Render state, traversal state, and undo history are not exported.
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
     * Import serialized graph data.
     * Existing graph data is cleared before import. Invalid duplicate nodes and invalid edges are skipped.
     *
     * @param {object} data - Serialized graph data.
     * @throws {Error} When data is not an object.
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
     *
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
     *
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
     * Import valid nodes from serialized node data.
     * Duplicate node ids are skipped.
     *
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
     * Import valid edges from serialized edge data.
     * Invalid edges are skipped.
     *
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
     * Check whether an imported edge is valid for the current graph.
     *
     * Imported edges must:
     * - have a unique edge id
     * - reference existing source and target nodes
     *
     * @param {Edge} edge - Imported edge.
     * @returns {boolean} True when the edge can be imported.
     */
    #canImportEdge(edge) {
        return (
            !this.edgeMap.has(edge.id) &&
            this.nodeMap.has(edge.from) &&
            this.nodeMap.has(edge.to)
        );
    }
}


/**
 * Base class for graph traversal and pathfinding planners.
 * Subclasses build deterministic visual execution plans for specific graph algorithms.
 */
class Traversal {

    /**
     * Create a traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     */
    constructor(graph) {
        this.graph = graph;
    }

    /**
     * Create a mutable traversal state used while building a plan.
     *
     * @returns {object} Traversal state.
     */
    createSearchState() {
        return {
            parent: new Map(),
            steps: [],
            order: []
        };
    }

    /**
     * Create the final traversal plan result returned to the UI.
     *
     * @param {string} name - Human-readable algorithm name.
     * @param {string} algorithm - Algorithm id.
     * @param {string} startId - Start node id.
     * @param {object} state - Traversal state.
     * @param {string|null} endId - Optional target node id.
     * @param {Map<string, number>|null} distances - Optional distance table.
     * @param {object} metadata - Optional algorithm metadata.
     * @returns {object} Traversal plan.
     */
    createPlanResult(name, algorithm, startId, state, endId = null, distances = null, metadata = {}) {
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
     * Record how a node was reached during traversal.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} nodeId - Reached node id.
     * @param {string} previousId - Previous node id.
     * @param {string} edgeId - Edge used to reach the node.
     */
    setPredecessor(parent, nodeId, previousId, edgeId) {
        parent.set(nodeId, {
            prev: previousId,
            edgeId
        });
    }

    /**
     * Record a traversal visit step.
     *
     * @param {object} state - Traversal state.
     * @param {string} nodeId - Visited node id.
     * @param {string|null} edgeId - Incoming edge id.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     */
    recordVisitStep(state, nodeId, edgeId = null, distances = null) {
        state.order.push(nodeId);
        state.steps.push(this.#createAnimationStep("visit", null, nodeId, edgeId, distances));
    }

    /**
     * Record a traversal discovery step.
     * Discovery steps visualize the algorithm exploring or relaxing an edge.
     *
     * @param {object} state - Traversal state.
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {string} edgeId - Traversed edge id.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     */
    recordDiscoveryStep(state, fromId, toId, edgeId, distances = null) {
        state.steps.push(this.#createAnimationStep("active", fromId, toId, edgeId, distances));
    }

    /**
     * Build a sorted adjacency list from the current graph.
     * Undirected graph edges are added in both directions.
     *
     * @returns {Map<string, Array<object>>} Adjacency list.
     */
    buildAdjacencyList() {
        const adjacency = new Map();

        this.graph.nodeOrder.forEach(function addNode(nodeId) {
            if (this.graph.nodeMap.has(nodeId)) {
                adjacency.set(nodeId, []);
            }
        }, this);

        this.graph.edgeOrder.forEach(function addGraphEdge(edgeId) {
            const edge = this.graph.edgeMap.get(edgeId);

            if (edge) {
                this.#addNeighbor(adjacency, edge.from, edge.to, edge.id, edge.weight);

                if (!this.graph.directed) {
                    this.#addNeighbor(adjacency, edge.to, edge.from, edge.id, edge.weight);
                }
            }
        }, this);

        adjacency.forEach(function sortNeighborList(neighbors) {
            this.#sortAdjacencyNeighbors(neighbors);
        }, this);

        return adjacency;
    }

    /**
     * Create a normalized adjacency neighbor descriptor.
     *
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {number} weight - Raw edge weight.
     * @returns {object} Neighbor descriptor.
     */
    createNeighbor(fromId, toId, edgeId, weight) {
        return {
            from: fromId,
            to: toId,
            edgeId,
            weight: this.#getEdgeCost(weight)
        };
    }

    /**
     * Create an initialized distance table.
     * Every node starts at Infinity except the start node, which starts at 0.
     *
     * @param {string} startId - Start node id.
     * @returns {Map<string, number>} Distance table.
     */
    initializeDistances(startId) {
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
     * Attempt to relax an edge using the current distance table.
     *
     * @param {object} edge - Neighbor descriptor.
     * @param {Map<string, number>} distances - Distance table.
     * @param {object} state - Traversal state.
     * @param {boolean} visitAfterRelaxation - Whether to record a visit step after improvement.
     * @returns {boolean} True when the distance improved.
     */
    relax(edge, distances, state, visitAfterRelaxation = false) {
        let improved = false;
        const fromDistance = distances.get(edge.from);

        if (Number.isFinite(fromDistance)) {
            const candidateDistance = fromDistance + edge.weight;

            if (candidateDistance < distances.get(edge.to)) {
                distances.set(edge.to, candidateDistance);
                this.setPredecessor(state.parent, edge.to, edge.from, edge.edgeId);
                this.recordDiscoveryStep(state, edge.from, edge.to, edge.edgeId, distances);

                if (visitAfterRelaxation) {
                    this.recordVisitStep(state, edge.to, edge.edgeId, distances);
                }

                improved = true;
            }
        }

        return improved;
    }

    /**
     * Create one traversal animation step.
     *
     * @param {string} type - Step type.
     * @param {string|null} fromId - Source node id.
     * @param {string} nodeId - Current node id.
     * @param {string|null} edgeId - Edge id.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     * @returns {object} Animation step.
     */
    #createAnimationStep(type, fromId, nodeId, edgeId, distances = null) {
        const step = {type, nodeId};

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

    /**
     * Add one directed adjacency neighbor entry.
     *
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {number} weight - Raw edge weight.
     */
    #addNeighbor(adjacency, fromId, toId, edgeId, weight) {
        if (adjacency.has(fromId)) {
            adjacency.get(fromId).push(this.createNeighbor(fromId, toId, edgeId, weight));
        }
    }

    /**
     * Resolve the traversal cost of an edge.
     *
     * Unweighted graphs use cost 1 for every edge.
     *
     * @param {number} weight - Raw edge weight.
     * @returns {number} Traversal edge cost.
     */
    #getEdgeCost(weight) {
        return this.graph.weighted ? Number(weight) : 1;
    }

    /**
     * Sort adjacency neighbors using graph-defined ordering rules.
     *
     * @param {Array<object>} neighbors - Neighbor descriptors.
     */
    #sortAdjacencyNeighbors(neighbors) {
        const graph = this.graph;
        neighbors.sort(function compareNeighbors(a, b) {
            return graph.compareNeighbors(a, b);
        });
    }
}

/**
 * Builds Breadth-First Search traversal plans.
 */
class BreadthFirst extends Traversal {

    /**
     * Build a Breadth-First Search traversal plan.
     * BFS explores nodes level by level using a FIFO queue.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     * @returns {object} BFS traversal plan.
     */
    createPlan(startId, endId = null) {
        const adjacency = super.buildAdjacencyList();
        const state = super.createSearchState();
        const visited = new Set([startId]);
        const queue = [{nodeId: startId, edgeId: null}];

        let queueIndex = 0;
        let targetFound = false;

        while (queueIndex < queue.length && !targetFound) {
            const current = queue[queueIndex];

            queueIndex += 1;
            super.recordVisitStep(state, current.nodeId, current.edgeId);

            if (endId !== null && current.nodeId === endId) {
                targetFound = true;
            } else {
                this.#enqueueUnvisitedNeighbors(current.nodeId, adjacency, visited, queue, state);
            }
        }

        return super.createPlanResult("Breadth-First Search", "BFS", startId, state, endId);
    }

    /**
     * Enqueue every unvisited neighbor reachable from the current BFS node.
     *
     * @param {string} currentId - Current node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited node ids.
     * @param {object[]} queue - BFS queue.
     * @param {object} state - Traversal state.
     */
    #enqueueUnvisitedNeighbors(currentId, adjacency, visited, queue, state) {
        const neighbors = adjacency.get(currentId) || [];

        for (let i = 0; i < neighbors.length; i += 1) {
            const edge = neighbors[i];

            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                queue.push({nodeId: edge.to, edgeId: edge.edgeId});
                super.setPredecessor(state.parent, edge.to, currentId, edge.edgeId);
                super.recordDiscoveryStep(state, currentId, edge.to, edge.edgeId);
            }
        }
    }
}

/**
 * Builds Depth-First Search traversal plans.
 */
class DepthFirst extends Traversal {

    /**
     * Build a Depth-First Search traversal plan.
     * DFS explores as far as possible along one branch before backtracking.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     * @returns {object} DFS traversal plan.
     */
    createPlan(startId, endId = null) {
        const adjacency = super.buildAdjacencyList();
        const state = super.createSearchState();
        const visited = new Set();

        this.#walk(startId, adjacency, visited, state, endId);

        return super.createPlanResult("Depth-First Search", "DFS", startId, state, endId);
    }

    /**
     * Visit one DFS node and recursively explore unvisited neighbors.
     *
     * @param {string} nodeId - Current node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited node ids.
     * @param {object} state - Traversal state.
     * @param {string|null} endId - Optional target node id.
     * @param {string|null} incomingEdgeId - Edge used to reach the current node.
     * @returns {boolean} True when the target has been found.
     */
    #walk(nodeId, adjacency, visited, state, endId = null, incomingEdgeId = null) {
        let targetFound;

        visited.add(nodeId);
        super.recordVisitStep(state, nodeId, incomingEdgeId);

        if (endId !== null && nodeId === endId) {
            targetFound = true;
        } else {
            targetFound = this.#tryBranches(nodeId, adjacency, visited, state, endId);
        }

        return targetFound;
    }

    /**
     * Try each unvisited DFS branch from the current node.
     *
     * @param {string} nodeId - Current node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} visited - Visited node ids.
     * @param {object} state - Traversal state.
     * @param {string|null} endId - Optional target node id.
     * @returns {boolean} True when the target has been found.
     */
    #tryBranches(nodeId, adjacency, visited, state, endId = null) {
        const neighbors = adjacency.get(nodeId) || [];
        let targetFound = false;

        for (let i = 0; i < neighbors.length && !targetFound; i += 1) {
            const edge = neighbors[i];

            if (!visited.has(edge.to)) {
                super.setPredecessor(state.parent, edge.to, nodeId, edge.edgeId);
                super.recordDiscoveryStep(state, nodeId, edge.to, edge.edgeId);
                targetFound = this.#walk(edge.to, adjacency, visited, state, endId, edge.edgeId);
            }
        }

        return targetFound;
    }
}

/**
 * Builds Dijkstra shortest-path traversal plans.
 */
class Dijkstra extends Traversal {

    /**
     * Build a Dijkstra shortest-path traversal plan.
     * Dijkstra repeatedly settles the unsettled node with the smallest known distance and relaxes its outgoing edges.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     * @returns {object} Dijkstra traversal plan.
     */
    createPlan(startId, endId = null) {
        const adjacency = super.buildAdjacencyList();
        const state = super.createSearchState();
        const distances = super.initializeDistances(startId);
        const settled = new Set();

        let targetSettled = false;
        let reachableNodesRemain = true;

        while (settled.size < this.graph.nodeMap.size && !targetSettled && reachableNodesRemain) {
            const currentId = this.#chooseNearestUnsettledNode(distances, settled);

            if (currentId === null) {
                reachableNodesRemain = false;
            } else {
                settled.add(currentId);
                this.#recordSettledNode(state, currentId, distances);

                if (endId !== null && currentId === endId) {
                    targetSettled = true;
                } else {
                    this.#relaxOutgoingEdges(currentId, adjacency, distances, settled, state);
                }
            }
        }

        return super.createPlanResult("Dijkstra", "Dijkstra", startId, state, endId, distances);
    }

    /**
     * Record a visit step for a settled node.
     *
     * @param {object} state - Traversal state.
     * @param {string} nodeId - Settled node id.
     * @param {Map<string, number>} distances - Current distance table.
     */
    #recordSettledNode(state, nodeId, distances) {
        const predecessor = state.parent.get(nodeId);
        const edgeId = predecessor ? predecessor.edgeId : null;
        super.recordVisitStep(state, nodeId, edgeId, distances);
    }

    /**
     * Choose the unsettled node with the smallest finite known distance.
     *
     * @param {Map<string, number>} distances - Distance table.
     * @param {Set<string>} settled - Settled node ids.
     * @returns {string|null} Node id, or null when no reachable unsettled node remains.
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
     * Relax every outgoing edge from the current settled node.
     * Edges leading to already-settled nodes are ignored.
     *
     * @param {string} currentId - Current node id.
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Map<string, number>} distances - Distance table.
     * @param {Set<string>} settled - Settled node ids.
     * @param {object} state - Traversal state.
     */
    #relaxOutgoingEdges(currentId, adjacency, distances, settled, state) {
        const neighbors = adjacency.get(currentId) || [];

        for (let i = 0; i < neighbors.length; i += 1) {
            const edge = neighbors[i];

            if (!settled.has(edge.to)) {
                super.relax(edge, distances, state);
            }
        }
    }
}

/**
 * Builds Prim minimum-spanning-tree traversal plans.
 */
class Prim extends Traversal {

    /**
     * Build a Prim minimum-spanning-tree traversal plan.
     * Prim grows a tree by repeatedly adding the cheapest edge from the current tree to a node outside the tree.
     * Disconnected graphs produce a partial tree.
     *
     * @param {string} startId - Start node id.
     * @returns {object} Prim traversal plan.
     */
    createPlan(startId) {
        const adjacency = super.buildAdjacencyList();
        const state = super.createSearchState();
        const treeNodes = new Set([startId]);

        let totalWeight = 0;
        let disconnected = false;

        super.recordVisitStep(state, startId);

        while (treeNodes.size < this.graph.nodeMap.size && !disconnected) {
            const cheapestEdge = this.#chooseCheapestCrossingEdge(adjacency, treeNodes);

            if (cheapestEdge === null) {
                disconnected = true;
            } else {
                treeNodes.add(cheapestEdge.to);
                totalWeight += cheapestEdge.weight;
                super.setPredecessor(state.parent, cheapestEdge.to, cheapestEdge.from, cheapestEdge.edgeId);
                super.recordDiscoveryStep(state, cheapestEdge.from, cheapestEdge.to, cheapestEdge.edgeId);
                super.recordVisitStep(state, cheapestEdge.to, cheapestEdge.edgeId);
            }
        }

        return super.createPlanResult("Prim's Minimum Spanning Tree", "Prim", startId, state, null, null,
            {totalWeight, connected: treeNodes.size === this.graph.nodeMap.size
        });
    }

    /**
     * Choose the cheapest edge crossing from the tree to an outside node.
     *
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {Set<string>} treeNodes - Node ids already in the tree.
     * @returns {object|null} Cheapest crossing edge, or null when none exists.
     */
    #chooseCheapestCrossingEdge(adjacency, treeNodes) {
        let cheapestEdge = null;

        treeNodes.forEach(function inspectTreeNode(fromId) {
            const neighbors = adjacency.get(fromId) || [];

            for (let i = 0; i < neighbors.length; i += 1) {
                const edge = neighbors[i];

                if (!treeNodes.has(edge.to) && this.#isBetterCrossingEdge(edge, cheapestEdge)) {
                    cheapestEdge = edge;
                }
            }
        }, this);

        return cheapestEdge;
    }

    /**
     * Check whether a candidate crossing edge is better than the current best edge.
     * Lower weight wins. Equal weights use a deterministic endpoint-id tiebreaker.
     *
     * @param {object} candidate - Candidate edge.
     * @param {object|null} currentBest - Current best edge.
     * @returns {boolean} True when a candidate should replace current best.
     */
    #isBetterCrossingEdge(candidate, currentBest) {
        let better = false;

        if (currentBest === null) {
            better = true;
        } else if (candidate.weight < currentBest.weight) {
            better = true;
        } else if (candidate.weight === currentBest.weight) {
            better = this.#isTieBreakerSmaller(candidate, currentBest);
        }

        return better;
    }

    /**
     * Break ties between equal-weight crossing edges.
     * The edge with the lexicographically smaller source id wins.
     * If source ids match, the edge with the lexicographically smaller target id wins.
     *
     * @param {object} candidate - Candidate edge.
     * @param {object} currentBest - Current best edge.
     * @returns {boolean} True when a candidate sorts before current best.
     */
    #isTieBreakerSmaller(candidate, currentBest) {
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
}

/**
 * Builds Bellman-Ford shortest-path traversal plans.
 */
class BellmanFord extends Traversal {

    /**
     * Build a Bellman-Ford shortest-path traversal plan.
     * Bellman-Ford relaxes every edge up to node-count minus one times, and then
     * checks whether a reachable negative cycle can still improve a distance.
     *
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     * @returns {object} Bellman-Ford traversal plan.
     */
    createPlan(startId, endId = null) {
        const state = super.createSearchState();
        const distances = super.initializeDistances(startId);
        const edges = this.#buildRelaxationEdges();

        super.recordVisitStep(state, startId, null, distances);
        this.#repeatRelaxationPasses(edges, distances, state);

        return super.createPlanResult("Bellman-Ford", "Bellman-Ford", startId, state, endId, distances,
            {negativeCycle: this.#hasReachableNegativeCycle(edges, distances)
        });
    }

    /**
     * Build the directed edge list used for Bellman-Ford relaxation.
     * Undirected graph edges are represented as two directed relaxation edges.
     *
     * @returns {object[]} Relaxation edge descriptors.
     */
    #buildRelaxationEdges() {
        const edges = [];

        this.graph.edgeOrder.forEach(function addGraphEdge(edgeId) {
            const edge = this.graph.edgeMap.get(edgeId);

            if (edge) {
                edges.push(this.createNeighbor(edge.from, edge.to, edge.id, edge.weight));

                if (!this.graph.directed) {
                    edges.push(this.createNeighbor(edge.to, edge.from, edge.id, edge.weight));
                }
            }
        }, this);

        return edges;
    }

    /**
     * Repeat relaxation passes until no distance improves or the maximum pass count is reached.
     *
     * @param {object[]} edges - Relaxation-edge descriptors.
     * @param {Map<string, number>} distances - Distance table.
     * @param {object} state - Traversal state.
     */
    #repeatRelaxationPasses(edges, distances, state) {
        let changed = true;
        for (let pass = 1; pass < this.graph.nodeMap.size && changed; pass += 1) {
            changed = this.#relaxEveryEdge(edges, distances, state);
        }
    }

    /**
     * Relax every edge once.
     *
     * @param {object[]} edges - Relaxation-edge descriptors.
     * @param {Map<string, number>} distances - Distance table.
     * @param {object} state - Traversal state.
     * @returns {boolean} True when at least one distance improved.
     */
    #relaxEveryEdge(edges, distances, state) {
        let changed = false;

        for (let i = 0; i < edges.length; i += 1) {
            const improved = super.relax(edges[i], distances, state, true);

            if (improved) {
                changed = true;
            }
        }

        return changed;
    }

    /**
     * Check whether a reachable negative cycle exists.
     *
     * A reachable negative cycle exists when an edge can still improve a distance
     * after the normal Bellman-Ford relaxation passes.
     *
     * @param {object[]} edges - Relaxation-edge descriptors.
     * @param {Map<string, number>} distances - Distance table.
     * @returns {boolean} True when a reachable negative cycle exists.
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
 * The available modes and their default ordering come directly from the mode-select element in the HTML.
 */
class AppMode {

    /**
     * Get every available application mode from the mode select element.
     *
     * @param {HTMLSelectElement} select - Mode select element.
     * @returns {string[]} Mode values in UI order.
     */
    static values(select) {
        return (select && select.options)
            ? Array.from(select.options, function mapOption(option) {return option.value;})
            : [];
    }

    /**
     * Get the default application mode from the first mode select option.
     *
     * @param {HTMLSelectElement} select - Mode select element.
     * @returns {string} Default mode value.
     */
    static getDefault(select) {
        return (select && select.options && select.options.length > 0) ? select.options[0].value : "";
    }

    /**
     * Get the DOM panel id associated with an application mode.
     *
     * @param {string} mode - Mode value.
     * @returns {string} Mode panel id.
     */
    static getPanelId(mode) {
        return `panel-${mode}`;
    }
}


/**
 * Coordinates graph data, canvas rendering, UI controls, and user interaction.
 */
class App {

    graph = new Graph();
    #elements;
    #ctx;
    #uiState;

    /**
     * Create the application, bind UI events, initialize controls, and draw the scene.
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
     * Convert a positive one-based number to an alphabetic spreadsheet-style label.
     *
     * @param {number} value - Positive one-based number.
     * @returns {string} Alphabetic label.
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
     * Get the current traversal distance displayed for a node.
     *
     * @param {string} nodeId - Node id.
     * @returns {number|undefined} Distance value, or undefined when no distance is available.
     */
    getTraversalDistance(nodeId) {
        return this.#uiState.traversal.distances.get(nodeId);
    }

    /**
     * Create all mutable UI state used by the application.
     *
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
     * Collect required DOM elements used by the graph editor.
     *
     * @returns {object} DOM element references.
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
            statusBox: document.getElementById("graph-status")
        };
    }

    /**
     * Bind all DOM event listeners used by the graph editor.
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
     * Handle undo and redo keyboard shortcuts.
     *
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
     * Resize the canvas for the current CSS size and device pixel ratio.
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
     * Draw the full graph editor scene.
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
     * Draw the viewport-aware background grid.
     *
     * @param {number} width - Canvas CSS width.
     * @param {number} height - Canvas CSS height.
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
     * Convert a pointer event to canvas screen coordinates and graph world coordinates.
     *
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
     * Synchronize visible controls with the current graph and UI state.
     */
    syncControls() {
        this.#syncModePanels();
        this.#syncComposeControls();
        this.#syncEditControls();
    }

    /**
     * Set the active application mode and synchronize mode-dependent controls.
     *
     * @param {string} mode - Mode id.
     */
    #setMode(mode) {
        this.#uiState.mode = mode;
        this.#elements.modeSelect.value = mode;
        this.syncControls();
    }

    /**
     * Show the active mode panel and hide inactive mode panels.
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
     * Synchronize graph composition controls.
     */
    #syncComposeControls() {
        this.#elements.defaultNodeRadiusInput.value = String(Node.DEFAULT_RADIUS);
        this.#elements.directedToggle.checked = this.graph.directed;
        this.#elements.weightedToggle.checked = this.graph.weighted;
        this.#elements.edgeWeightRow.hidden = !this.graph.weighted;
        this.#elements.edgeWeightInput.value = String(this.#uiState.edgeWeightDraft);
    }

    /**
     * Synchronize edit controls for the current node or edge edit selection.
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
     * Synchronize node edit controls from a node edit selection.
     *
     * @param {object} selection - Node edit selection.
     */
    #syncNodeEditControls(selection) {
        this.#elements.editNodeLabelInput.value = selection.label;
        this.#elements.editNodeRadiusInput.value = selection.radius === null ? "" : String(selection.radius);
        this.#elements.editNodeRadiusInput.placeholder = String(Node.DEFAULT_RADIUS);
    }

    /**
     * Synchronize edge edit controls from an edge edit selection.
     *
     * @param {object} selection - Edge edit selection.
     */
    #syncEdgeEditControls(selection) {
        this.#elements.editEdgeWeightRow.hidden = !this.graph.weighted;
        this.#elements.edgeUnweightedHelp.hidden = this.graph.weighted;
        this.#elements.editEdgeWeightInput.value = String(selection.weight);
    }

    /**
     * Display a status message in the graph status box.
     *
     * @param {string} message - Status message.
     */
    #setStatus(message) {
        this.#elements.statusBox.textContent = message;
    }

    /**
     * Clear the selected render state from every node and edge.
     */
    #clearSelectedState() {
        this.graph.nodeMap.forEach(function clearNode(node) {
            node.renderState.selected(false);
        });

        this.graph.edgeMap.forEach(function clearEdge(edge) {
            edge.renderState.selected(false);
        });
    }

    /**
     * Clear hover render state from the currently hovered node or edge.
     */
    #clearHoverState() {
        const node = this.graph.getNodeById(this.#uiState.hoveredNodeId);
        const edge = this.graph.getEdgeById(this.#uiState.hoveredEdgeId);

        if (node) {
            node.renderState.hovered(false);
        }

        if (edge) {
            edge.renderState.hovered(false);
        }

        this.#uiState.hoveredNodeId = null;
        this.#uiState.hoveredEdgeId = null;
    }

    /**
     * Clear edit selection, edge-source selection, and selected render state.
     */
    #clearEditSelectionState() {
        this.#uiState.editSelection = null;
        this.#uiState.selectedNodeIdForEdge = null;
        this.#clearSelectedState();
        this.syncControls();
    }

    /**
     * Clear temporary selections used while composing graph changes.
     */
    #resetComposeSelection() {
        this.#clearEditSelectionState();
    }

    /**
     * Undo the most recent graph history change and reset the transient UI state.
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
     * Redo the most recently undone graph history change and reset transient UI state.
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
     * Handle changing the active editor mode from the mode select control.
     */
    handleModeChange() {
        this.#setMode(this.#elements.modeSelect.value);
        this.#resetComposeSelection();
        this.#setStatus("Mode changed.");
        this.draw();
    }

    /**
     * Handle changing the label style used for new nodes.
     */
    handleNodeLabelModeChange() {
        this.#setStatus("New nodes will use selected label style.");
    }

    /**
     * Handle editing the default radius used by nodes without a custom radius.
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
     * Handle enabling or disabling directed graph mode.
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
     * Handle enabling or disabling weighted graph mode.
     * Disabling weighted mode normalizes all edge weights to 1.
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
     * Store the current edge-weight draft when the weight input contains a valid number.
     */
    handleEdgeWeightDraft() {
        const parsed = Number(this.#elements.edgeWeightInput.value);

        if (Number.isFinite(parsed)) {
            this.#uiState.edgeWeightDraft = parsed;
        }
    }

    /**
     * Handle double-click deletion of a node or edge.
     * Nodes take priority over edges when both are under the pointer.
     *
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
     * Delete a clicked node or edge and clear dependent UI state.
     *
     * @param {Node|null} node - Node to delete.
     * @param {Edge|null} edge - Edge to delete.
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
     * Handle normal canvas clicks after suppressing clicks caused by double-clicks or drag/pan completion.
     *
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
     * Route a canvas click based on the clicked entity and current mode.
     * Empty-canvas clicks either clear the selection state or create a node.
     * Clicks in add-edge mode select a source, create an edge, or cancel edge creation.
     * Repeated selected-node clicks enter edge-creation mode.
     * All other entity clicks enter edit mode.
     *
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
     * Check whether the clicked node is the currently selected edit node.
     * Repeated clicks on the selected node are routed to edge creation.
     *
     * @param {Node|null} node - Clicked node.
     * @returns {boolean} True when the clicked node matches the current edit selection.
     */
    #isCurrentEditNode(node) {
        const selection = this.#uiState.editSelection;
        return Boolean(node && selection && selection.type === "node" && selection.id === node.id);
    }

    /**
     * Handle an empty canvas click.
     * If an edit selection or edge-source selection exists, the click clears that selection instead of creating a node.
     * If nothing is selected, the click switches to add-node mode and creates a node at the pointer.
     *
     * @param {object} point - Pointer position.
     */
    #handleEmptyCanvasClick(point) {
        if (this.#uiState.editSelection || this.#uiState.selectedNodeIdForEdge !== null) {
            this.clearEditSelection("Selection cleared.");
        } else {
            this.#setMode("add-node");
            this.#cancelEdgeSource();
            this.#handleAddNode(point, null);
        }
    }

    /**
     * Add a node at the pointer when no existing node blocks placement.
     *
     * @param {object} point - Pointer position.
     * @param {Node|null} existingNode - Existing node at the pointer.
     */
    #handleAddNode(point, existingNode) {
        if (!existingNode) {
            this.graph.addNode(point.x, point.y, this.#createNodeLabel());
            this.refreshNodeSelectors();
            this.#setStatus("Node added.");
        }
    }

    /**
     * Create a label for a new node based on the selected label mode.
     *
     * @returns {string|null} Alphabetic label, or null to let the graph choose a numeric label.
     */
    #createNodeLabel() {
        let label = null;

        if (this.#elements.nodeLabelModeSelect.value === "alphabetic") {
            label = App.numberToLetters(this.graph.nodeOrder.length + 1);
        }

        return label;
    }

    /**
     * Switch to add-edge mode using the selected node as the edge source.
     *
     * @param {Node} node - Source node.
     */
    #startEdgeFromSelectedNode(node) {
        this.#setMode("add-edge");
        this.#selectEdgeSource(node);
    }

    /**
     * Handle clicks while in add-edge mode.
     * The first node click selects an edge source.
     * Clicking a different node creates an edge from the selected source node.
     * Clicking the selected source node again cancels edge creation.
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
     * Select a node as the source for a new edge.
     *
     * @param {Node} node - Source node.
     */
    #selectEdgeSource(node) {
        this.#clearSelectedState();
        this.#uiState.selectedNodeIdForEdge = node.id;
        node.renderState.selected(true);

        this.syncControls();
        this.#setStatus(`Source node ${node.label} selected.`);
    }

    /**
     * Clear the current edge-source selection and selected render state.
     */
    #cancelEdgeSource() {
        this.#uiState.selectedNodeIdForEdge = null;
        this.#clearSelectedState();
        this.syncControls();
        this.#setStatus("Edge selection canceled.");
    }

    /**
     * Create an edge from the selected source node to the clicked destination node.
     *
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
     * Resolve the edge weight to use for a new edge.
     *
     * @returns {number|null} Edge weight, or null when the weighted input is invalid.
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
     * Handle selecting a node or edge for editing.
     * Clicking a different entity replaces the current edit selection.
     * Clicking the same selected edge clears the selection.
     * Clicking the same selected node is handled before this method and starts edge creation.
     *
     * @param {Node|null} node - Clicked node.
     * @param {Edge|null} edge - Clicked edge.
     */
    #handleEditMode(node, edge) {
        if (this.#isRepeatedEditSelection(node, edge)) {
            this.clearEditSelection("Selection cleared.");
        } else {
            this.#clearSelectedState();

            if (node) {
                this.#uiState.editSelection = this.#createNodeEditSelection(node);
                node.renderState.selected(true);
                this.#setStatus(`Loaded node ${node.label}.`);
            } else if (edge) {
                this.#uiState.editSelection = this.#createEdgeEditSelection(edge);
                edge.renderState.selected(true);
                this.#setStatus("Loaded edge.");
            }

            this.syncControls();
        }
    }

    /**
     * Check whether the clicked edit entity is already selected.
     * This only catches repeated edit selections that reach edit handling.
     * Repeated selected-node clicks are routed earlier to edge creation.
     *
     * @param {Node|null} node - Clicked node.
     * @param {Edge|null} edge - Clicked edge.
     * @returns {boolean} True when the clicked entity matches the current edit selection.
     */
    #isRepeatedEditSelection(node, edge) {
        const selection = this.#uiState.editSelection;
        let repeated = false;

        if (selection && node && selection.type === "node" && selection.id === node.id) {
            repeated = true;
        } else if (selection && edge && selection.type === "edge" && selection.id === edge.id) {
            repeated = true;
        }

        return repeated;
    }

    /**
     * Create an editable snapshot for a node selection.
     *
     * @param {Node} node - Selected node.
     * @returns {object} Node edit selection.
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
     * Create an editable snapshot for an edge selection.
     *
     * @param {Edge} edge - Selected edge.
     * @returns {object} Edge edit selection.
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
     * Update the selected node edit the draft label from the label input.
     */
    handleEditNodeLabelInput() {
        const selection = this.#uiState.editSelection;

        if (selection && selection.type === "node") {
            selection.label = this.#elements.editNodeLabelInput.value;
        }
    }

    /**
     * Update the selected node edit the draft radius from the radius input.
     * Empty input removes the node radius override.
     */
    handleEditNodeRadiusInput() {
        const selection = this.#uiState.editSelection;

        if (selection && selection.type === "node") {
            const value = this.#elements.editNodeRadiusInput.value.trim();
            selection.radius = value === "" ? null : Number(value);
        }
    }

    /**
     * Update the selected edge edit draft weight when the weight input is valid.
     */
    handleEditEdgeWeightInput() {
        const selection = this.#uiState.editSelection;
        const parsed = Number(this.#elements.editEdgeWeightInput.value);

        if (selection && selection.type === "edge" && Number.isFinite(parsed)) {
            selection.weight = parsed;
        }
    }

    /**
     * Apply the current node or edge edit selection to the graph.
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
     * Validate and apply the current node-edit selection.
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
     * Validate and apply the current edge edit selection.
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
     * Clear edit selection and edge-source selection state.
     *
     * @param {string|null} status - Optional status message.
     */
    clearEditSelection(status = null) {
        this.#clearEditSelectionState();
        this.#setStatus(status || "Edit selection cleared.");
        this.draw();
    }

    /**
     * Start node dragging or viewport panning from a mouse-down event.
     *
     * Left-clicking a node starts dragging.
     * Middle-clicking, Alt-clicking, or pressing on empty space, starts viewport panning.
     *
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
     * Update hover state, node dragging, or viewport panning during mouse movement.
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
     * Finish any active node drag or viewport pan.
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
     * Complete a node drag and clear edit selection if the node moved.
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
     * Update hovered node or edge render state from a pointer position.
     * Nodes take priority over edges when both are under the pointer.
     *
     * @param {object} point - Pointer position.
     */
    #updateHover(point) {
        const node = this.graph.findNodeAt(point.x, point.y);
        const edge = node ? null : this.graph.findEdgeAt(point.x, point.y);

        this.#clearHoverState();

        if (node) {
            node.renderState.hovered(true);
            this.#uiState.hoveredNodeId = node.id;
        } else if (edge) {
            edge.renderState.hovered(true);
            this.#uiState.hoveredEdgeId = edge.id;
        }
    }

    /**
     * Move the currently dragged node to the pointer position.
     * The first actual movement records undo-history.
     *
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
     * Start dragging the viewport from a pointer position.
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
     * Move the viewport by the pointer delta since the last pan update.
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
     * Stop viewport panning.
     */
    #stopPan() {
        this.#uiState.viewport.dragging = false;
        this.#elements.canvas.classList.remove("panning");
    }

    /**
     * Zoom the viewport around the current pointer position.
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
     * Rebuild traversal start and end node selector options.
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
     * Add the "None" option to the traversal end-node selector.
     */
    #appendEndNodeNoneOption() {
        const option = document.createElement("option");

        option.value = "";
        option.textContent = "None";

        this.#elements.endNodeSelect.appendChild(option);
    }

    /**
     * Add every graph node to the traversal start and end selectors.
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
     * Add one node option to a traversal selector.
     *
     * @param {HTMLSelectElement} select - Selector to update.
     * @param {Node} node - Node represented by the option.
     */
    #appendNodeOption(select, node) {
        const option = document.createElement("option");

        option.value = node.id;
        option.textContent = `${node.label} (id:${node.id})`;

        select.appendChild(option);
    }

    /**
     * Restore previous traversal selector values when possible.
     * If the previous start node no longer exists, the first available node is used.
     * If the previous end node no longer exists, the end selection is cleared.
     *
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
     * Read and validate traversal settings from the UI.
     *
     * @returns {object|null} Traversal settings, or null when settings are invalid.
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
     * Create traversal settings after validating algorithm-specific constraints.
     *
     * @returns {object|null} Traversal settings, or null when constraints fail.
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
     * Check whether any graph edge has a negative weight.
     *
     * @returns {boolean} True when at least one edge weight is negative.
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
     * Prepare and run the selected traversal animation.
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
     * Advance the selected traversal by one step.
     * A reusable existing plan is continued.
     * Otherwise, a new plan is prepared.
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
     * Create a fresh traversal plan from the current graph and settings.
     *
     * @param {object} settings - Traversal settings.
     */
    #prepareTraversal(settings) {
        let traversal;

        if (settings.algorithm === "BFS") {
            traversal = new BreadthFirst(this.graph);
        } else if (settings.algorithm === "DFS") {
            traversal = new DepthFirst(this.graph);
        } else if (settings.algorithm === "Dijkstra") {
            traversal = new Dijkstra(this.graph);
        } else if (settings.algorithm === "Prim") {
            traversal = new Prim(this.graph);
        } else if (settings.algorithm === "Bellman-Ford") {
            traversal = new BellmanFord(this.graph);
        } else {
            throw new Error(`Unknown traversal algorithm: ${settings.algorithm}`);
        }

        this.clearTraversal();
        this.#uiState.traversal.plan = traversal.createPlan(settings.startId, settings.endId);
        this.#uiState.traversal.index = 0;
        this.#setStatus(`${this.#uiState.traversal.plan.name} ready.`);
    }

    /**
     * Check whether the current traversal plan matches the requested settings.
     *
     * @param {object} settings - Traversal settings.
     * @returns {boolean} True when the current plan can be reused.
     */
    #hasReusableTraversalPlan(settings) {
        const plan = this.#uiState.traversal.plan;

        return Boolean(plan) &&
            plan.algorithm === settings.algorithm &&
            plan.startId === settings.startId &&
            plan.endId === settings.endId;
    }

    /**
     * Step the prepared traversal plan once or finish it when the last step is reached.
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
     * Animate the prepared traversal plan until it completes or is stopped.
     *
     * @param {number} delay - Delay between steps in milliseconds.
     * @param {number} token - Traversal run token used to cancel stale animations.
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
     * Check whether the current traversal animation should continue.
     *
     * @param {number} token - Traversal run token.
     * @returns {boolean} True when the animation should keep advancing.
     */
    #shouldContinueTraversal(token) {
        const traversal = this.#uiState.traversal;

        return Boolean(traversal.plan) &&
            traversal.index < traversal.plan.steps.length &&
            token === traversal.token;
    }

    /**
     * Advance the prepared traversal by one visual step.
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
     * Apply render-state changes for one traversal step.
     * Active steps mark the current node and edge as active.
     * Visit steps mark the current node and incoming edge as visited.
     * Distance snapshots replace the visible traversal distance table.
     *
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
     * Mark the node and edge involved in an active traversal step.
     *
     * @param {object} step - Traversal step.
     */
    #markActiveTraversalEntity(step) {
        const node = this.graph.getNodeById(step.nodeId);
        const edge = step.edgeId ? this.graph.getEdgeById(step.edgeId) : null;

        if (node) {
            node.renderState.active(true);
        }

        if (edge) {
            edge.renderState.active(true);
        }
    }

    /**
     * Mark the node and incoming edge involved in a traversal visit step.
     *
     * @param {object} step - Traversal step.
     */
    #markVisitedTraversalEntity(step) {
        const node = this.graph.getNodeById(step.nodeId);
        const edge = step.edgeId ? this.graph.getEdgeById(step.edgeId) : null;

        if (node) {
            node.renderState.visited(true);
        }

        if (edge) {
            edge.renderState.visited(true);
        }
    }

    /**
     * Clear the active traversal state from every node and edge.
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
     * Resolve after a delay.
     *
     * @param {number} ms - Delay in milliseconds.
     * @returns {Promise<void>} Promise that resolves after the delay.
     */
    #sleep(ms) {
        return new Promise(function resolveLater(resolve) {
            window.setTimeout(resolve, ms);
        });
    }

    /**
     * Complete the current traversal and render the final path or tree highlights.
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
     * Mark the final shortest path or minimum spanning tree for a completed plan.
     * Prim marks every parent edge in the tree.
     * Other algorithms only mark a final path when an end node was selected.
     *
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
     * Mark every parent edge and endpoint node in a Prim tree.
     *
     * @param {Map<string, object>} parent - Parent map.
     */
    #markTreePath(parent) {
        parent.forEach(function markTreeNode(step, nodeId) {
            const edge = this.graph.getEdgeById(step.edgeId);
            const node = this.graph.getNodeById(nodeId);
            const prevNode = this.graph.getNodeById(step.prev);

            if (edge) {
                edge.renderState.path(true);
            }

            if (node) {
                node.renderState.path(true);
            }

            if (prevNode) {
                prevNode.renderState.path(true);
            }
        }, this);
    }

    /**
     * Mark the final path from the start node to the selected target node.
     * No path is marked when the target cannot be reached.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} startId - Start node id.
     * @param {string} endId - Target node id.
     */
    #markTargetPath(parent, startId, endId) {
        let cursor = endId;

        while (cursor !== startId && parent.has(cursor)) {
            const step = parent.get(cursor);
            const edge = this.graph.getEdgeById(step.edgeId);
            const node = this.graph.getNodeById(cursor);

            if (edge) {
                edge.renderState.path(true);
            }

            if (node) {
                node.renderState.path(true);
            }

            cursor = step.prev;
        }

        this.#markPathStartNode(parent, startId, endId);
    }

    /**
     * Mark the start node when a valid target path exists.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} startId - Start node id.
     * @param {string} endId - Target node id.
     */
    #markPathStartNode(parent, startId, endId) {
        const startNode = this.graph.getNodeById(startId);

        if (startNode && (endId === startId || parent.has(endId))) {
            startNode.renderState.path(true);
        }
    }

    /**
     * Write the final traversal result for the completed plan.
     *
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
     * Write a plain traversal-order result.
     *
     * @param {object} plan - Traversal plan.
     */
    #writeTraversalOrderOutput(plan) {
        this.#elements.traversalOutput.innerHTML =
            `${plan.name} order:<hr>${this.#formatNodeOrder(plan.order)}`;
    }

    /**
     * Write shortest-path algorithm output.
     * If no target node is selected, only the visit order is shown.
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
     * Write shortest-path output for a selected target node.
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
     * Write Bellman-Ford output, including negative-cycle reporting.
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
     * Write Prim minimum-spanning-tree output.
     *
     * @param {object} plan - Traversal plan.
     */
    #writePrimOutput(plan) {
        const status = plan.metadata.connected ? "MST Complete" : "MST Partial";

        this.#elements.traversalOutput.innerHTML =
            `${status}, Order:<hr><p>${this.#formatNodeOrder(plan.order)}</p><hr>Weight: ${plan.metadata.totalWeight}`;
    }

    /**
     * Get a display label for a node id.
     *
     * @param {string} nodeId - Node id.
     * @returns {string} Node label, or the id when the node is missing.
     */
    #getNodeLabel(nodeId) {
        const node = this.graph.getNodeById(nodeId);
        return node ? node.label : String(nodeId);
    }

    /**
     * Format a traversal node-id order as display labels.
     *
     * @param {string[]} order - Ordered node ids.
     * @returns {string} Display order.
     */
    #formatNodeOrder(order) {
        return order.map(function formatNodeId(nodeId) {
            return this.#getNodeLabel(nodeId);
        }, this).join(" → ");
    }

    /**
     * Clear traversal plan, traversal progress, traversal visuals, and distance badges.
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
     * Stop the running traversal animation and clear active traversal highlights.
     */
    stopTraversal() {
        this.#uiState.traversal.running = false;
        this.#uiState.traversal.token += 1;
        this.#clearActiveTraversalStates();
        this.#setStatus("Traversal stopped.");
        this.draw();
    }

    /**
     * Export the current graph as formatted JSON in the JSON text area.
     */
    exportGraph() {
        this.#elements.jsonArea.value = JSON.stringify(this.graph.export(), null, 2);
        this.#setStatus("Graph exported.");
    }

    /**
     * Import graph JSON from the JSON text area.
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
     * Save the current graph to local storage.
     */
    saveLocal() {
        window.localStorage.setItem("graph-state", JSON.stringify(this.graph.export()));
        this.#setStatus("Saved locally.");
    }

    /**
     * Load a graph from local storage when a saved graph exists.
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
     * Parse and load a serialized graph from local storage.
     *
     * @param {string} raw - Serialized graph JSON.
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
     * Clear the graph and reset undo history.
     */
    clearGraph() {
        this.graph.reset();
        this.graph.clearHistory();
        this.#resetAfterGraphLoad();
        this.#setStatus("Graph cleared.");
    }

    /**
     * Load the sample graph from the sample graph JSON file.
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
     * Reset the active mode to the default mode declared in the HTML.
     */
    #resetModeToDefault() {
        this.#setMode(AppMode.getDefault(this.#elements.modeSelect));
    }

    /**
     * Reset the transient UI state after a full graph load, undo, redo, import, or clear.
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
 * Startup helpers.
 */
class AppStartup {

    /**
     * Start the application boot sequence.
     *
     * This initializes:
     * - footer copyright year
     * - aside navigation scrolling
     * - application instance
     */
    static start() {
        AppStartup.updateCopyrightYear();
        AppStartup.bindAsideNavigation();

        window.graphApp = new App();
    }

    /**
     * Update footer copyright year using the current system year.
     * Missing footer elements are ignored.
     */
    static updateCopyrightYear() {
        const copyrightYear = document.getElementById("copyright-year");

        if (copyrightYear) {
            copyrightYear.textContent = String(new Date().getFullYear());
        }
    }

    /**
     * Bind aside the navigation button click handlers.
     * Each button scrolls the aside container horizontally to its target panel.
     */
    static bindAsideNavigation() {
        const asideNavButtons = document.querySelectorAll("aside nav button");

        asideNavButtons.forEach(function bindAsideButton(button) {
            button.addEventListener(
                "click",
                function handleAsideClick() {
                    AppStartup.scrollAsideToButtonTarget(button);
                }
            );
        });
    }

    /**
     * Scroll the aside container to a target panel.
     * Target panels are resolved from the button's data-target attribute.
     * Missing targets are ignored.
     *
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


/**
 * Start the application after the DOM is ready.
 */
window.addEventListener("DOMContentLoaded", function startApplication() {
    AppStartup.start();
});