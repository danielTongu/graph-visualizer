"use strict";

/**
 * Stores transient visual state for a graph node or edge.
 * RenderState only controls a presentation state used during rendering and traversal visualization.
 */
class RenderState {

    static STYLE_BASE = Object.freeze({
        fill: "#1e293b",
        stroke: "#64748b",
        lineWidth: 2
    });

    static STYLE_OVERRIDES = Object.freeze({
        discovered: Object.freeze({
            fill: "#78350f",
            stroke: "#f89d00",
            lineWidth: 1
        }),

        exploring: Object.freeze({
            fill: "#08130d",
            stroke: "#166534"
        }),

        explored: Object.freeze({
            fill: "#166534",
            stroke: "#4ade80",
            lineWidth: 3
        }),

        path: Object.freeze({
            fill: "#f87171",
            stroke: "#a80000",
            lineWidth: 4
        }),

        selected: Object.freeze({
            fill: "#4c1d95",
            stroke: "#c084fc"
        }),

        hovered: Object.freeze({
            fill: "#c084fc",
            stroke: "#4c1d95"
        })
    });

    #state = {
        hovered: false,
        selected: false,
        discovered: false,
        exploring: false,
        explored: false,
        path: false
    };

    /**
     * Read or update a render-state flag.
     *
     * @param {string} key - State flag name.
     * @param {boolean|null} value - New value, or null to read.
     * @returns {boolean} The current value of the flag.
     */
    #stateValue(key, value = null) {
        if (value !== null) {
            this.#state[key] = Boolean(value);
        }
        return this.#state[key];
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
     * Read or update a selected state.
     *
     * @param {boolean|null} value - New selected state, or null to read.
     * @returns {boolean|undefined} Current selected state when reading.
     */
    selected(value = null) {
        return this.#stateValue("selected", value);
    }

    /**
     * Read or update discovered traversal state.
     *
     * @param {boolean|null} value - Newly discovered state, or null to read.
     * @returns {boolean|undefined} Current discovered state when reading.
     */
    discovered(value = null) {
        return this.#stateValue("discovered", value);
    }

    /**
     * Read or update exploring traversal state.
     *
     * @param {boolean|null} value - New exploring state, or null to read.
     * @returns {boolean|undefined} Current exploring state when reading.
     */
    exploring(value = null) {
        return this.#stateValue("exploring", value);
    }

    /**
     * Read or update explored traversal state.
     *
     * @param {boolean|null} value - New explored state, or null to read.
     * @returns {boolean|undefined} Current explored state when reading.
     */
    explored(value = null) {
        return this.#stateValue("explored", value);
    }

    /**
     * Read or update a final traversal path state.
     *
     * @param {boolean|null} value - New path state, or null to read.
     * @returns {boolean|undefined} Current path state when reading.
     */
    path(value = null) {
        return this.#stateValue("path", value);
    }

    /**
     * Resolve the active draw style for the current render state.
     *
     * State precedence (highest wins):
     * discovered < explored < path < selected < hovered < exploring
     *
     * @returns {object} Active draw style.
     */
    getDrawStyle() {
        const style = Object.assign({}, RenderState.STYLE_BASE);
        const stateOrder = ["discovered", "explored", "path", "selected", "hovered", "exploring"];

        for (let i = 0; i < stateOrder.length; i += 1) {
            const stateName = stateOrder[i];
            if (this.#state[stateName]) {
                Object.assign(style, RenderState.STYLE_OVERRIDES[stateName]);
            }
        }

        return style;
    }

    /**
     * Clear temporary traversal focus state.
     */
    clearExploring() {
        this.#state.exploring = false;
    }

    /**
     * Clear traversal-related visual state.
     */
    clearTraversal() {
        this.#state.discovered = false;
        this.#state.exploring = false;
        this.#state.explored = false;
        this.#state.path = false;
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
            const ratio = (
                ((px - x1) * dx + (py - y1) * dy) /
                (dx * dx + dy * dy)
            );

            const t = Math.max(0, Math.min(1, ratio));
            const projectedX = x1 + t * dx;
            const projectedY = y1 + t * dy;

            distance = Geometry.distance(px, py, projectedX, projectedY);
        }

        return distance;
    }
}


/**
 * Represents one graph node and owns its drawing and hit-testing logic.
 */
class Node {

    static DEFAULT_RADIUS = 17;
    static LABEL_FONT = "bold 16px Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";
    static BADGE_FONT = "9px Inter, Arial, sans-serif";

    /**
     * Create a node.
     *
     * @param {string} id - Stable node id.
     * @param {string} label - Display label.
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @param {number|string|null|undefined} radius - Optional radius override.
     */
    constructor(id, label, x, y, radius) {
        this.id = String(id);
        this.label = String(label);
        this.x = Number(x);
        this.y = Number(y);
        this.radius = Node.normalizeRadius(radius);
        this.renderState = new RenderState();
    }

    /**
     * Normalize a node radius.
     * Invalid or non-positive values become null.
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
     * Serialize the node as plain graph data.
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
     * Set node radius override.
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
     * Get the effective node radius.
     *
     * @returns {number} Effective node radius.
     */
    getRadius() {
        return this.radius !== null ? this.radius : Node.DEFAULT_RADIUS;
    }

    /**
     * Check whether a world point intersects the node circle.
     *
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @returns {boolean} True when the point intersects the node.
     */
    containsPoint(x, y) {
        return Geometry.distance(x, y, this.x, this.y) <= this.getRadius();
    }

    /**
     * Draw the node and optional traversal distance badge.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {number|undefined} distance - Optional traversal distance.
     */
    draw(ctx, distance) {
        const style = this.renderState.getDrawStyle();

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
        ctx.font = Node.LABEL_FONT;
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
        return distance === Infinity ? "\u221E" : String(distance);
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
            width: width,
            height: height,
            radius: 6
        };
    }

    /**
     * Draw the distance badge background.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {object} badge - Badge bounds.
     */
    #drawRoundedBadgeBackground(ctx, badge) {
        ctx.beginPath();

        if (typeof ctx.roundRect === "function") {
            ctx.roundRect(badge.x, badge.y, badge.width, badge.height, badge.radius);
        } else {
            this.#drawRoundedRectPolyfill(ctx, badge);
        }

        ctx.fill();
        ctx.stroke();
    }

    /**
     * Polyfill for CanvasRenderingContext2D.roundRect.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {object} badge - Badge bounds with radius property.
     */
    #drawRoundedRectPolyfill(ctx, badge) {
        const x = badge.x;
        const y = badge.y;
        const w = badge.width;
        const h = badge.height;
        const r = badge.radius;

        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
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
        ctx.font = Node.BADGE_FONT;
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
    static WEIGHT_FONT = "8px Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

    /**
     * Create an edge.
     *
     * @param {string} id - Stable edge id.
     * @param {string} from - Source node id.
     * @param {string} to - Target node id.
     * @param {number|string} weight - Edge weight.
     */
    constructor(id, from, to, weight = 1) {
        if (weight === undefined) {
            weight = 1;
        }

        this.id = String(id);
        this.from = String(from);
        this.to = String(to);
        this.weight = Edge.normalizeWeight(weight);
        this.renderState = new RenderState();
    }

    /**
     * Normalize an edge weight.
     *
     * @param {number|string} weight - Weight candidate.
     * @returns {number} Normalized weight.
     */
    static normalizeWeight(weight) {
        const parsed = Number(weight);
        return Number.isFinite(parsed) ? parsed : 1;
    }

    /**
     * Serialize the edge as plain graph data.
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
     * Check whether a world point intersects the edge hit area.
     *
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @param {Graph} graph - Graph instance.
     * @returns {boolean} True when the point intersects the edge.
     */
    containsPoint(x, y, graph) {
        const endpoints = this.#getEndpoints(graph);
        let hit = false;
        let distance;

        if (endpoints !== null) {
            distance = Geometry.distanceToSegment(
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
     * Draw the edge line, optional direction arrow, and optional weight label.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Graph} graph - Graph instance.
     */
    draw(ctx, graph) {
        const endpoints = this.#getEndpoints(graph);

        if (endpoints !== null) {
            const style = this.renderState.getDrawStyle();

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
     * Resolve edge endpoint nodes from the graph.
     *
     * @param {Graph} graph - Graph instance.
     * @returns {object|null} Endpoint nodes, or null when either node is missing.
     */
    #getEndpoints(graph) {
        const fromNode = graph.getNodeById(this.from);
        const toNode = graph.getNodeById(this.to);
        return (fromNode && toNode) ? {fromNode: fromNode, toNode: toNode} : null;
    }

    /**
     * Draw the main edge line between two nodes, trimmed to node borders.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {object} style - Active render style.
     */
    #drawEdgeLine(ctx, fromNode, toNode, style) {
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const startX = fromNode.x + Math.cos(angle) * fromNode.getRadius();
        const startY = fromNode.y + Math.sin(angle) * fromNode.getRadius();
        const endX = toNode.x - Math.cos(angle) * toNode.getRadius();
        const endY = toNode.y - Math.sin(angle) * toNode.getRadius();

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
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
     * Draw the edge weight label at the midpoint with a background pill.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {object} style - Active render style.
     */
    #drawWeightLabel(ctx, fromNode, toNode, style) {
        const midpoint = this.#getMidpoint(fromNode, toNode);
        const label = String(this.weight);
        const padding = 2;

        ctx.save();
        ctx.font = Edge.WEIGHT_FONT;

        const metrics = ctx.measureText(label);
        const textWidth = metrics.width;
        const textHeight = 12;
        const bgX = midpoint.x - textWidth / 2 - padding;
        const bgY = midpoint.y - textHeight / 2 - padding;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = textHeight + padding * 2;
        const isHighlighted = this.renderState.selected() || this.renderState.path();

        ctx.fillStyle = isHighlighted ? "black" : "rgba(0, 0, 0, 0.5)";
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = 0.5;

        if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 4);
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
            ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
        }

        ctx.fillStyle = this.renderState.hovered() ? style.fill : style.stroke;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, midpoint.x, midpoint.y);
        ctx.restore();
    }

    /**
     * Calculate arrowhead geometry for a directed edge.
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
            tipX: tipX,
            tipY: tipY,
            leftX: tipX - Edge.ARROW_SIZE * Math.cos(angle - Edge.ARROW_ANGLE),
            leftY: tipY - Edge.ARROW_SIZE * Math.sin(angle - Edge.ARROW_ANGLE),
            rightX: tipX - Edge.ARROW_SIZE * Math.cos(angle + Edge.ARROW_ANGLE),
            rightY: tipY - Edge.ARROW_SIZE * Math.sin(angle + Edge.ARROW_ANGLE)
        };
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
 * Fixed-capacity double-ended stack used for undo and redo history.
 * Automatically discards the oldest entries when capacity is exceeded.
 */
class Deque {
    #items = {};
    #front = 0;
    #back = 0;
    #size = 0;
    #maxSize;

    /**
     * Create a fixed-capacity deque.
     *
     * @param {number} maxSize - Maximum number of stored items.
     */
    constructor(maxSize = 100) {
        this.#maxSize = maxSize;
    }

    /**
     * @returns {number} Current stored item count.
     */
    get length() {
        return this.#size;
    }

    /**
     * Push an item onto the back of the deque.
     * Removes items from the front when the deque exceeds capacity.
     *
     * @param {*} item - Item to store.
     */
    push(item) {
        this.#items[this.#back] = item;
        this.#back++;
        this.#size++;

        // Auto-trim from front if over capacity
        while (this.#size > this.#maxSize) {
            delete this.#items[this.#front];
            this.#front++;
            this.#size--;
        }
    }

    /**
     * Remove and return the newest item.
     *
     * @returns {*|undefined} Removed item, or undefined when empty.
     */
    pop() {
        if (this.#size === 0) return undefined;

        this.#back--;
        this.#size--;
        const item = this.#items[this.#back];
        delete this.#items[this.#back];
        return item;
    }

    /**
     * Remove all items and reset deque indexes.
     */
    clear() {
        this.#items = {};
        this.#front = 0;
        this.#back = 0;
        this.#size = 0;
    }
}


/**
 * Stores graph nodes, edges, indexes, rendering order, and undo/redo history.
 * Owns graph mutation, serialization, import/export, hit testing, and drawing delegation.
 */
class Graph {
    #undoStack;
    #redoStack;
    #historyLocked = false;
    #connectionMap = new Map();
    #edgesByNode = new Map();

    /**
     * Creates a graph instance.
     *
     * @param {Object} [options={}] - Graph configuration.
     * @param {number} [options.historyLimit=25] - Maximum undo/redo history entries.
     */
    constructor(options = {}) {
        const historyLimit = Graph.#normalizeHistoryLimit(options.historyLimit);

        this.#undoStack = new Deque(historyLimit);
        this.#redoStack = new Deque(historyLimit);

        /**
         * Map of node id to Node instance.
         *
         * @type {Map<string, Node>}
         */
        this.nodeMap = new Map();

        /**
         * Map of edge id to Edge instance.
         *
         * @type {Map<string, Edge>}
         */
        this.edgeMap = new Map();

        /**
         * Node ids in render/insertion order.
         *
         * @type {string[]}
         */
        this.nodeOrder = [];

        /**
         * Edge ids in render/insertion order.
         *
         * @type {string[]}
         */
        this.edgeOrder = [];

        /**
         * Whether graph edges are directional.
         *
         * @type {boolean}
         */
        this.directed = false;

        /**
         * Whether graph-edge weights are displayed and used.
         *
         * @type {boolean}
         */
        this.weighted = false;
    }

    /**
     * Normalizes the history limit option.
     *
     * @param {*} limit - Candidate history limit.
     * @returns {number} Positive integer history limit.
     */
    static #normalizeHistoryLimit(limit) {
        const parsed = Number(limit);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : 25;
    }

    /**
     * Loads bundled sample graph JSON data.
     *
     * @returns {Promise<Object>} Parsed sample graph data.
     * @throws {Error} When the sample data request fails.
     */
    static async loadSampleAsync() {
        const response = await fetch("./sample-graph-data.json");

        if (!response.ok) {
            throw new Error("Failed to load sample graph data.");
        }

        return response.json();
    }

    /**
     * Creates a unique node id.
     *
     * @returns {string} Node id prefixed with `n:`.
     */
    static createNodeId() {
        return (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
            ? `n:${crypto.randomUUID()}`
            : `n:${Graph.#createFallbackId()}`;
    }

    /**
     * Creates an edge id for the supplied endpoints.
     *
     * @param {string|number} from - Source node id.
     * @param {string|number} to - Target node id.
     * @param {boolean} directed - Whether the edge is directed.
     * @returns {string} Edge id prefixed with `e:`.
     */
    static createEdgeId(from, to, directed) {
        const fromId = String(from);
        const toId = String(to);
        return directed ? `e:${fromId}->${toId}` : Graph.#createUndirectedEdgeId(fromId, toId);
    }

    /**
     * Creates a stable undirected edge id.
     *
     * @param {string|number} firstId - First endpoint id.
     * @param {string|number} secondId - Second endpoint id.
     * @returns {string} Undirected edge id.
     */
    static #createUndirectedEdgeId(firstId, secondId) {
        const ordered = [String(firstId), String(secondId)].sort();
        return `e:${ordered[0]}--${ordered[1]}`;
    }

    /**
     * Creates a fallback unique id when crypto.randomUUID is unavailable.
     *
     * @returns {string} Fallback id.
     */
    static #createFallbackId() {
        return `${Date.now().toString(36)}-${Graph.#randomString(10)}`;
    }

    /**
     * Creates a random lowercase alphanumeric string.
     *
     * @param {number} length - Desired string length.
     * @returns {string} Random string.
     */
    static #randomString(length) {
        const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";

        for (let i = 0; i < length; i += 1) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return result;
    }

    /**
     * Creates a normalized connection key for edge lookup.
     *
     * @param {string|number} from - Source node id.
     * @param {string|number} to - Target node id.
     * @returns {string} Connection key.
     */
    #createConnectionKey(from, to) {
        const fromId = String(from);
        const toId = String(to);
        let key;

        if (this.directed) {
            key = `${fromId}->${toId}`;
        } else {
            key = [fromId, toId].sort().join("--");
        }

        return key;
    }

    /**
     * Adds a node to graph indexes and render order.
     *
     * @param {Node} node - Node to index.
     * @returns {void}
     */
    #indexNode(node) {
        this.nodeMap.set(node.id, node);
        this.nodeOrder.push(node.id);
        this.#edgesByNode.set(node.id, new Set());
    }

    /**
     * Adds an edge to graph indexes and render order.
     *
     * @param {Edge} edge - Edge to index.
     * @returns {void}
     */
    #indexEdge(edge) {
        const connectionKey = this.#createConnectionKey(edge.from, edge.to);

        this.edgeMap.set(edge.id, edge);
        this.edgeOrder.push(edge.id);
        this.#connectionMap.set(connectionKey, edge.id);

        this.#edgesByNode.get(edge.from).add(edge.id);
        this.#edgesByNode.get(edge.to).add(edge.id);
    }

    /**
     * Removes an edge from lookup indexes.
     *
     * @param {Edge} edge - Edge to remove from indexes.
     * @returns {void}
     */
    #unindexEdge(edge) {
        const fromEdges = this.#edgesByNode.get(edge.from);
        const toEdges = this.#edgesByNode.get(edge.to);

        this.#connectionMap.delete(this.#createConnectionKey(edge.from, edge.to));
        this.edgeMap.delete(edge.id);

        if (fromEdges) {
            fromEdges.delete(edge.id);
        }

        if (toEdges) {
            toEdges.delete(edge.id);
        }
    }

    /**
     * Saves the current graph snapshot to undo history.
     *
     * @returns {void}
     */
    saveHistory() {
        if (!this.#historyLocked) {
            this.#undoStack.push(this.export());
            this.#redoStack.clear();
        }
    }

    /**
     * Restores the previous graph snapshot.
     *
     * @returns {boolean} True when the graph changed.
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
     * Restores the next graph snapshot after undo.
     *
     * @returns {boolean} True when the graph changed.
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
     * Clears undo and redo history.
     *
     * @returns {void}
     */
    clearHistory() {
        this.#undoStack.clear();
        this.#redoStack.clear();
    }

    /**
     * Restores a graph snapshot without recording another history entry.
     *
     * @param {Object} snapshot - Exported graph snapshot.
     * @returns {void}
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
     * Removes all nodes, edges, and lookup indexes.
     *
     * @returns {void}
     */
    reset() {
        this.nodeMap.clear();
        this.edgeMap.clear();
        this.#connectionMap.clear();
        this.#edgesByNode.clear();
        this.nodeOrder.length = 0;
        this.edgeOrder.length = 0;
    }

    /**
     * Loads graph data and clears history.
     *
     * @param {Object} data - Serialized graph data.
     * @returns {void}
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
     * Checks whether any edge has a negative weight.
     *
     * @returns {boolean} True when at least one edge has a negative weight.
     */
    hasNegativeWeight() {
        let hasNegative = false;

        for (const edge of this.edgeMap.values()) {
            if (edge.weight < 0) {
                hasNegative = true;
                break;
            }
        }

        return hasNegative;
    }

    /**
     * Adds a node to the graph.
     *
     * @param {number} x - Node x-coordinate.
     * @param {number} y - Node y-coordinate.
     * @param {string|number|null} [label=null] - Optional node label.
     * @param {number|null} [radius=null] - Optional node radius.
     * @returns {Node} Created node.
     */
    addNode(x, y, label = null, radius = null) {
        this.saveHistory();

        const node = new Node(
            Graph.createNodeId(),
            this.#resolveNodeLabel(label),
            x,
            y,
            radius
        );

        this.#indexNode(node);

        return node;
    }

    /**
     * Removes a node and all connected edges.
     *
     * @param {string|number} id - Node id.
     * @returns {void}
     */
    removeNode(id) {
        const nodeId = String(id);

        if (this.nodeMap.has(nodeId)) {
            this.saveHistory();
            this.#removeEdgesConnectedToNode(nodeId);
            this.nodeMap.delete(nodeId);
            this.#edgesByNode.delete(nodeId);
            this.#removeNodeFromOrder(nodeId);
        }
    }

    /**
     * Gets a node by id.
     *
     * @param {string|number} id - Node id.
     * @returns {Node|null} Matching node, or null.
     */
    getNodeById(id) {
        return this.nodeMap.get(String(id)) || null;
    }

    /**
     * Resolves a node label.
     *
     * @param {string|number|null} label - Candidate label.
     * @returns {string} Resolved label.
     */
    #resolveNodeLabel(label) {
        return label === null ? String(this.nodeOrder.length) : String(label);
    }

    /**
     * Removes a node id from render order.
     *
     * @param {string} nodeId - Node id.
     * @returns {void}
     */
    #removeNodeFromOrder(nodeId) {
        const filtered = [];

        for (let i = 0; i < this.nodeOrder.length; i += 1) {
            if (this.nodeOrder[i] !== nodeId) {
                filtered.push(this.nodeOrder[i]);
            }
        }

        this.nodeOrder = filtered;
    }

    /**
     * Removes all edges connected to a node.
     *
     * @param {string} nodeId - Node id.
     * @returns {void}
     */
    #removeEdgesConnectedToNode(nodeId) {
        const edgeIds = this.#edgesByNode.get(nodeId);

        if (edgeIds) {
            const idsToRemove = Array.from(edgeIds);

            for (let i = 0; i < idsToRemove.length; i += 1) {
                const edge = this.edgeMap.get(idsToRemove[i]);

                if (edge) {
                    this.#unindexEdge(edge);
                }
            }

            this.#removeMissingEdgesFromOrder();
        }
    }

    /**
     * Adds an edge between two existing nodes.
     *
     * @param {string|number} from - Source node id.
     * @param {string|number} to - Target node id.
     * @param {number} [weight=1] - Edge weight.
     * @returns {Edge|null} Created edge, or null when invalid.
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

            this.#indexEdge(edge);
        }

        return edge;
    }

    /**
     * Removes an edge by id.
     *
     * @param {string|number} id - Edge id.
     * @returns {void}
     */
    removeEdge(id) {
        const edge = this.edgeMap.get(String(id));

        if (edge) {
            this.saveHistory();
            this.#unindexEdge(edge);
            this.#removeEdgeFromOrder(edge.id);
        }
    }

    /**
     * Checks whether an edge exists between two nodes.
     *
     * @param {string|number} from - Source node id.
     * @param {string|number} to - Target node id.
     * @returns {boolean} True when an edge exists.
     */
    edgeExists(from, to) {
        return this.#connectionMap.has(this.#createConnectionKey(from, to));
    }

    /**
     * Gets an edge by id.
     *
     * @param {string|number} id - Edge id.
     * @returns {Edge|null} Matching edge, or null.
     */
    getEdgeById(id) {
        return this.edgeMap.get(String(id)) || null;
    }

    /**
     * Sets all edge weights to 1.
     *
     * @returns {void}
     */
    normalizeWeights() {
        for (const edge of this.edgeMap.values()) {
            edge.setWeight(1);
        }
    }

    /**
     * Checks whether an edge can be created.
     *
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @returns {boolean} True when the edge can be created.
     */
    #canCreateEdge(fromId, toId) {
        let canCreate = true;

        if (fromId === toId) {
            canCreate = false;
        } else if (!this.nodeMap.has(fromId) || !this.nodeMap.has(toId)) {
            canCreate = false;
        } else if (this.edgeExists(fromId, toId)) {
            canCreate = false;
        }

        return canCreate;
    }

    /**
     * Removes an edge id from render order.
     *
     * @param {string} edgeId - Edge id.
     * @returns {void}
     */
    #removeEdgeFromOrder(edgeId) {
        const filtered = [];

        for (let i = 0; i < this.edgeOrder.length; i += 1) {
            if (this.edgeOrder[i] !== edgeId) {
                filtered.push(this.edgeOrder[i]);
            }
        }

        this.edgeOrder = filtered;
    }

    /**
     * Removes stale edge ids from render order.
     *
     * @returns {void}
     */
    #removeMissingEdgesFromOrder() {
        const filtered = [];

        for (let i = 0; i < this.edgeOrder.length; i += 1) {
            if (this.edgeMap.has(this.edgeOrder[i])) {
                filtered.push(this.edgeOrder[i]);
            }
        }

        this.edgeOrder = filtered;
    }

    /**
     * Rebuilds all edge ids and indexes after the directed setting changes.
     *
     * Edge ids encode direction, so toggling directed/undirected mode requires
     * regenerating ids and connection keys for every existing edge.
     *
     * @returns {void}
     */
    rebuildEdgesOnDirectionChange() {
        const edges = this.#exportEdges();

        this.edgeMap.clear();
        this.edgeOrder.length = 0;
        this.#connectionMap.clear();

        for (const edgeIds of this.#edgesByNode.values()) {
            edgeIds.clear();
        }

        for (let i = 0; i < edges.length; i += 1) {
            const rawEdge = edges[i];
            const edge = new Edge(
                Graph.createEdgeId(rawEdge.from, rawEdge.to, this.directed),
                rawEdge.from,
                rawEdge.to,
                rawEdge.weight
            );

            if (this.#canImportEdge(edge)) {
                this.#indexEdge(edge);
            }
        }
    }

    /**
     * Compares two neighbor records by edge weight, then by target node.
     *
     * @param {Object} first - First neighbor record.
     * @param {string} first.edgeId - First-edge id.
     * @param {string} first.to - First target node id.
     * @param {Object} second - Second neighbor record.
     * @param {string} second.edgeId - Second-edge id.
     * @param {string} second.to - Second target node id.
     * @returns {number} Sort comparison result.
     */
    compareNeighbors(first, second) {
        let result = this.#compareNeighborEdges(first, second);

        if (result === 0) {
            result = this.#compareNeighborNodes(first, second);
        }

        return result;
    }

    /**
     * Finds the topmost node containing a point.
     *
     * @param {number} x - Point x-coordinate.
     * @param {number} y - Point y-coordinate.
     * @returns {Node|null} Found node, or null.
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
     * Finds the topmost edge containing a point.
     *
     * @param {number} x - Point x-coordinate.
     * @param {number} y - Point y-coordinate.
     * @returns {Edge|null} Found edge, or null.
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
     * Compares two neighbor records by their edge weights.
     *
     * @param {Object} first - First neighbor record.
     * @param {Object} second - Second neighbor record.
     * @returns {number} Sort comparison result.
     */
    #compareNeighborEdges(first, second) {
        const firstEdge = this.getEdgeById(first.edgeId);
        const secondEdge = this.getEdgeById(second.edgeId);
        return this.weighted && firstEdge && secondEdge ? firstEdge.compareTo(secondEdge) : 0;
    }

    /**
     * Compares two neighbor records by their target nodes.
     *
     * @param {Object} first - First neighbor record.
     * @param {Object} second - Second neighbor record.
     * @returns {number} Sort comparison result.
     */
    #compareNeighborNodes(first, second) {
        const firstNode = this.getNodeById(first.to);
        const secondNode = this.getNodeById(second.to);
        return firstNode && secondNode ? firstNode.compareTo(secondNode) : 0;
    }

    /**
     * Draws all edges in render order.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
     * @returns {void}
     */
    drawEdges(ctx) {
        for (let i = 0; i < this.edgeOrder.length; i += 1) {
            const edge = this.edgeMap.get(this.edgeOrder[i]);

            if (edge) {
                edge.draw(ctx, this);
            }
        }
    }

    /**
     * Draws all nodes in render order.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
     * @param {Object} controller - Controller providing traversal distances.
     * @returns {void}
     */
    drawNodes(ctx, controller) {
        for (let i = 0; i < this.nodeOrder.length; i += 1) {
            const node = this.nodeMap.get(this.nodeOrder[i]);

            if (node) {
                node.draw(ctx, controller.getTraversalDistance(node.id));
            }
        }
    }

    /**
     * Serializes the graph.
     *
     * @returns {Object} Serialized graph data.
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
     * Imports serialized graph data.
     *
     * @param {Object} data - Serialized graph data.
     * @returns {void}
     * @throws {Error} When graph data is invalid.
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
     * Serializes nodes in render order.
     *
     * @returns {Object[]} Serialized nodes.
     */
    #exportNodes() {
        const nodes = [];

        for (let i = 0; i < this.nodeOrder.length; i += 1) {
            const node = this.nodeMap.get(this.nodeOrder[i]);

            if (node) {
                nodes.push(node.toJSON());
            }
        }

        return nodes;
    }

    /**
     * Serializes edges in render order.
     *
     * @returns {Object[]} Serialized edges.
     */
    #exportEdges() {
        const edges = [];

        for (let i = 0; i < this.edgeOrder.length; i += 1) {
            const edge = this.edgeMap.get(this.edgeOrder[i]);

            if (edge) {
                edges.push(edge.toJSON());
            }
        }

        return edges;
    }

    /**
     * Imports valid serialized nodes.
     *
     * @param {Object[]} nodes - Serialized nodes.
     * @returns {void}
     */
    #importNodes(nodes) {
        if (Array.isArray(nodes)) {
            for (let i = 0; i < nodes.length; i += 1) {
                const node = this.#createValidNode(nodes[i]);

                if (node && !this.nodeMap.has(node.id)) {
                    this.#indexNode(node);
                }
            }
        }
    }

    /**
     * Creates a Node instance from serialized data.
     *
     * @param {Object} raw - Raw node data.
     * @returns {Node|null} Valid node, or null.
     */
    #createValidNode(raw) {
        let node = null;

        if (raw && typeof raw === "object") {
            const id = String(raw.id);
            const label = raw.label === undefined ? id : String(raw.label);
            const x = Number(raw.x);
            const y = Number(raw.y);

            if (id && Number.isFinite(x) && Number.isFinite(y)) {
                node = new Node(id, label, x, y, raw.radius);
            }
        }

        return node;
    }

    /**
     * Imports valid serialized edges.
     *
     * @param {Object[]} edges - Serialized edges.
     * @returns {void}
     */
    #importEdges(edges) {
        if (Array.isArray(edges)) {
            for (let i = 0; i < edges.length; i += 1) {
                const edge = this.#createValidEdge(edges[i]);

                if (edge && this.#canImportEdge(edge)) {
                    this.#indexEdge(edge);
                }
            }
        }
    }

    /**
     * Creates an Edge instance from serialized data.
     *
     * @param {Object} raw - Raw edge data.
     * @returns {Edge|null} Valid edge, or null.
     */
    #createValidEdge(raw) {
        let edge = null;

        if (raw && typeof raw === "object") {
            const from = String(raw.from);
            const to = String(raw.to);

            if (from && to) {
                edge = new Edge(
                    Graph.createEdgeId(from, to, this.directed),
                    from,
                    to,
                    raw.weight
                );
            }
        }

        return edge;
    }

    /**
     * Checks whether an imported edge can be indexed.
     *
     * @param {Edge} edge - Edge to validate.
     * @returns {boolean} True when the edge can be imported.
     */
    #canImportEdge(edge) {
        return (
            edge.from !== edge.to &&
            this.nodeMap.has(edge.from) &&
            this.nodeMap.has(edge.to) &&
            !this.edgeMap.has(edge.id) &&
            !this.edgeExists(edge.from, edge.to)
        );
    }
}


// ---------------------------------------------------------------------
//---------------------- TRAVERSAL -------------------------------------
// ---------------------------------------------------------------------

/**
 * Formats traversal results and applies the final path / tree visual state.
 */
class TraversalResult {

    /**
     * Mark the final path or tree for a completed traversal plan.
     *
     * @param {object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     */
    static markFinalPath(plan, graph) {
        if (plan.algorithm === "Prim") {
            TraversalResult.#markTreePath(plan.parent, graph);
        } else if (plan.endId !== null) {
            TraversalResult.#markTargetPath(plan.parent, plan.startId, plan.endId, graph);
        }
    }

    /**
     * Format the final traversal output.
     *
     * @param {object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @returns {string} Traversal output HTML.
     */
    static formatOutput(plan, graph) {
        let output;

        if (plan.algorithm === "Dijkstra") {
            output = TraversalResult.#formatShortestPathOutput(plan, graph, "Dijkstra");
        } else if (plan.algorithm === "Bellman-Ford") {
            output = TraversalResult.#formatBellmanFordOutput(plan, graph);
        } else if (plan.algorithm === "Prim") {
            output = TraversalResult.#formatPrimOutput(plan, graph);
        } else {
            output = `${plan.name} order:<hr>${TraversalResult.#formatNodeOrder(plan.order, graph)}`;
        }

        return output;
    }

    /**
     * Mark every parent edge and endpoint node in a tree.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {Graph} graph - Graph instance.
     */
    static #markTreePath(parent, graph) {
        parent.forEach(function markTreeNode(step, nodeId) {
            const edge = graph.getEdgeById(step.edgeId);
            const node = graph.getNodeById(nodeId);
            const prevNode = graph.getNodeById(step.prev);

            if (edge) {
                edge.renderState.path(true);
            }
            if (node) {
                node.renderState.path(true);
            }
            if (prevNode) {
                prevNode.renderState.path(true);
            }
        });
    }

    /**
     * Mark the final path from start to target.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} startId - Start node id.
     * @param {string} endId - Target node id.
     * @param {Graph} graph - Graph instance.
     */
    static #markTargetPath(parent, startId, endId, graph) {
        let cursor = endId;

        while (cursor !== startId && parent.has(cursor)) {
            const step = parent.get(cursor);
            const edge = graph.getEdgeById(step.edgeId);
            const node = graph.getNodeById(cursor);

            if (edge) {
                edge.renderState.path(true);
            }
            if (node) {
                node.renderState.path(true);
            }

            cursor = step.prev;
        }

        TraversalResult.#markPathStartNode(parent, startId, endId, graph);
    }

    /**
     * Mark the start node when a valid target path exists.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} startId - Start node id.
     * @param {string} endId - Target node id.
     * @param {Graph} graph - Graph instance.
     */
    static #markPathStartNode(parent, startId, endId, graph) {
        const startNode = graph.getNodeById(startId);

        if (startNode && (endId === startId || parent.has(endId))) {
            startNode.renderState.path(true);
        }
    }

    /**
     * Format shortest-path algorithm output.
     *
     * @param {object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @param {string} name - Algorithm display name.
     * @returns {string} Output HTML.
     */
    static #formatShortestPathOutput(plan, graph, name) {
        let output;

        if (plan.endId === null) {
            output = `${name} explored: ${TraversalResult.#formatNodeOrder(plan.order, graph)}`;
        } else {
            output = TraversalResult.#formatTargetDistanceOutput(plan, graph, name);
        }

        return output;
    }

    /**
     * Format shortest-path target output.
     *
     * @param {object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @param {string} name - Algorithm display name.
     * @returns {string} Output HTML.
     */
    static #formatTargetDistanceOutput(plan, graph, name) {
        const target = graph.getNodeById(plan.endId);
        const distance = plan.distances.get(plan.endId);
        const label = target ? target.label : String(plan.endId);

        let output;

        if (Number.isFinite(distance)) {
            output = `${name} explored:<hr>${TraversalResult.#formatNodeOrder(plan.order, graph)}<hr>Shortest distance to ${label}: ${distance}.`;
        } else {
            output = `${name} explored:<hr>${TraversalResult.#formatNodeOrder(plan.order, graph)}<hr>No path to ${label}.`;
        }

        return output;
    }

    /**
     * Format Bellman-Ford output.
     *
     * @param {object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @returns {string} Output HTML.
     */
    static #formatBellmanFordOutput(plan, graph) {
        let output;

        if (plan.metadata.negativeCycle) {
            output = "Negative cycle detected.";
        } else {
            output = TraversalResult.#formatShortestPathOutput(plan, graph, "Bellman-Ford");
        }

        return output;
    }

    /**
     * Format Prim output.
     *
     * @param {object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @returns {string} Output HTML.
     */
    static #formatPrimOutput(plan, graph) {
        const status = plan.metadata.connected ? "MST Complete" : "MST Partial";
        return `${status}, Order:<hr><p>${TraversalResult.#formatNodeOrder(plan.order, graph)}</p><hr>Weight: ${plan.metadata.totalWeight}`;
    }

    /**
     * Format node ids as display labels.
     *
     * @param {string[]} order - Node id order.
     * @param {Graph} graph - Graph instance.
     * @returns {string} Display order.
     */
    static #formatNodeOrder(order, graph) {
        return order.map(function formatNodeId(nodeId) {
            const node = graph.getNodeById(nodeId);
            return node ? node.label : String(nodeId);
        }).join(" → ");
    }
}

/**
 * Base class for graph traversal planners.
 *
 * Owns common traversal setup, adjacency list building, and animation step recording.
 * Supports asynchronous plan creation to keep the UI responsive for large graphs.
 */
class Traversal {

    /**
     * Create a traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        this.graph = graph;
        this.startId = String(startId);
        this.endId = endId === null ? null : String(endId);
        this.adjacency = this.buildAdjacencyList();
        this.state = this.createSearchState();
    }

    /**
     * Create a traversal instance by algorithm id.
     *
     * @param {string} algorithm - Algorithm id.
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     * @returns {Traversal} Traversal instance.
     */
    static create(algorithm, graph, startId, endId = null) {
        let traversal;

        if (algorithm === "BFS") {
            traversal = new BreadthFirst(graph, startId, endId);
        } else if (algorithm === "DFS") {
            traversal = new DepthFirst(graph, startId, endId);
        } else if (algorithm === "Dijkstra") {
            traversal = new Dijkstra(graph, startId, endId);
        } else if (algorithm === "Prim") {
            traversal = new Prim(graph, startId, endId);
        } else if (algorithm === "Bellman-Ford") {
            traversal = new BellmanFord(graph, startId, endId);
        } else {
            throw new Error("Unknown traversal algorithm: " + algorithm);
        }

        return traversal;
    }

    /**
     * Validate whether this traversal can run.
     *
     * @returns {string|null} Error message, or null when valid.
     */
    validate() {
        return null;
    }

    /**
     * Create the traversal plan synchronously.
     *
     * Child classes must override this method.
     *
     * @returns {object} Traversal plan.
     */
    createPlan() {
        throw new Error("Traversal subclasses must implement createPlan().");
    }

    /**
     * Create the traversal plan asynchronously with periodic yielding.
     *
     * Child classes should override this for expensive traversals.
     * The default implementation wraps the synchronous createPlan().
     *
     * @param {object} options - Async options.
     * @param {function} options.yieldFn - Function to call to yield to the browser.
     * @param {number} options.yieldEvery - Yield after processing this many items.
     * @returns {Promise<object>} Traversal plan.
     */
    async createPlanAsync(options) {
        let plan;

        await options.yieldFn();
        plan = this.createPlan();

        return plan;
    }

    /**
     * Create mutable traversal state.
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
     * Create the final traversal plan result.
     *
     * @param {string} name - Human-readable algorithm name.
     * @param {string} algorithm - Algorithm id.
     * @param {Map<string, number>|null} distances - Optional distance table.
     * @param {object} metadata - Optional algorithm metadata.
     * @returns {object} Traversal plan.
     */
    createPlanResult(name, algorithm, distances = null, metadata = {}) {
        if (distances === undefined) {
            distances = null;
        }

        if (metadata === undefined) {
            metadata = {};
        }

        return {
            name: name,
            algorithm: algorithm,
            startId: this.startId,
            endId: this.endId,
            steps: this.state.steps,
            order: this.state.order,
            parent: this.state.parent,
            distances: distances,
            metadata: metadata,
            index: 0
        };
    }

    /**
     * Build a graph adjacency list.
     *
     * @returns {Map<string, Array<object>>} Adjacency list.
     */
    buildAdjacencyList() {
        let adjacency = new Map();
        let i;
        let edge;

        for (i = 0; i < this.graph.nodeOrder.length; i += 1) {
            adjacency.set(this.graph.nodeOrder[i], []);
        }

        for (i = 0; i < this.graph.edgeOrder.length; i += 1) {
            edge = this.graph.edgeMap.get(this.graph.edgeOrder[i]);

            if (edge && adjacency.has(edge.from) && adjacency.has(edge.to)) {
                this.addNeighbor(adjacency, edge.from, edge.to, edge.id, edge.weight);

                if (!this.graph.directed) {
                    this.addNeighbor(adjacency, edge.to, edge.from, edge.id, edge.weight);
                }
            }
        }

        this.#sortAdjacencyList(adjacency);

        return adjacency;
    }

    /**
     * Sort every adjacency neighbor list by destination node label.
     *
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     */
    #sortAdjacencyList(adjacency) {
        let self = this;

        adjacency.forEach(function sortNeighbors(neighbors) {
            neighbors.sort(self.graph.compareNeighbors.bind(self.graph));
        });
    }

    /**
     * Add one adjacency neighbor.
     *
     * @param {Map<string, Array<object>>} adjacency - Adjacency list.
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {number} weight - Edge weight.
     */
    addNeighbor(adjacency, fromId, toId, edgeId, weight) {
        adjacency.get(fromId).push({
            from: fromId,
            to: toId,
            edgeId: edgeId,
            weight: this.getEdgeCost(weight)
        });
    }

    /**
     * Record how a node was reached.
     *
     * @param {Map<string, object>} parent - Parent map.
     * @param {string} nodeId - Reached node id.
     * @param {string} previousId - Previous node id.
     * @param {string|null} edgeId - Edge used to reach node.
     */
    setPredecessor(parent, nodeId, previousId, edgeId) {
        parent.set(nodeId, {
            prev: previousId,
            edgeId: edgeId
        });
    }

    /**
     * Record that a node or edge has been discovered.
     *
     * @param {string} fromId - Source node id.
     * @param {string} toId - Discovered node id.
     * @param {string|null} edgeId - Edge used for discovery.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     */
    recordDiscoverStep(fromId, toId, edgeId = null, distances = null) {
        if (distances === undefined) {
            distances = null;
        }

        this.state.order.push(toId);
        this.state.steps.push(
            this.#createAnimationStep("discover", fromId, toId, edgeId, distances)
        );
    }

    /**
     * Record that a node is being explored.
     *
     * @param {string} nodeId - Exploring node id.
     * @param {string|null} edgeId - Incoming edge id.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     */
    recordExploreStep(nodeId, edgeId = null, distances = null) {
        if (distances === undefined) {
            distances = null;
        }

        this.state.steps.push(
            this.#createAnimationStep("explore", null, nodeId, edgeId, distances)
        );
    }

    /**
     * Record that a node has finished exploration.
     *
     * @param {string} nodeId - Finished node id.
     * @param {string|null} edgeId - Incoming edge id.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     */
    recordFinishStep(nodeId, edgeId = null, distances = null) {
        if (distances === undefined) {
            distances = null;
        }

        this.state.steps.push(
            this.#createAnimationStep("finish", null, nodeId, edgeId, distances)
        );
    }

    /**
     * Resolve traversal edge cost.
     *
     * @param {number} weight - Raw edge weight.
     * @returns {number} Traversal cost.
     */
    getEdgeCost(weight) {
        return this.graph.weighted ? Number(weight) : 1;
    }

    /**
     * Create one animation step.
     *
     * @param {string} type - Step type.
     * @param {string|null} fromId - Source node id.
     * @param {string} nodeId - Current node id.
     * @param {string|null} edgeId - Edge id.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     * @returns {object} Animation step.
     */
    #createAnimationStep(type, fromId, nodeId, edgeId, distances) {
        let step = {type: type, nodeId: nodeId};

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
}

/**
 * Builds Breadth-First Search traversal plans.
 *
 * BFS explores nodes in FIFO order, guaranteeing the shortest paths in
 * unweighted graphs. Yields to the browser every N nodes for large graphs.
 */
class BreadthFirst extends Traversal {

    /**
     * Create a Breadth-First Search traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
        this.discovered = new Set();
        this.queue = [];
        this.targetFound = false;
    }

    /**
     * Build a Breadth-First Search traversal plan synchronously.
     *
     * @returns {object} BFS traversal plan.
     */
    createPlan() {
        this.#discover(this.startId, this.startId, null);
        this.#exploreQueue();

        return super.createPlanResult("Breadth-First Search", "BFS");
    }

    /**
     * Build a Breadth-First Search traversal plan asynchronously.
     *
     * Yields to the browser after processing chunks of the queue.
     *
     * @param {object} options - Async options.
     * @param {function} options.yieldFn - Function to call to yield to the browser.
     * @param {number} options.yieldEvery - Yield after processing this many nodes.
     * @returns {Promise<object>} BFS traversal plan.
     */
    async createPlanAsync(options) {
        let yieldEvery = options.yieldEvery || 50;
        let processed = 0;

        this.#discover(this.startId, this.startId, null);

        while (this.queue.length > 0 && !this.targetFound) {
            this.#exploreNextInQueue();

            processed += 1;

            if (processed % yieldEvery === 0) {
                await options.yieldFn();
            }
        }

        return super.createPlanResult("Breadth-First Search", "BFS");
    }

    /**
     * Discover a node and enqueue it for later exploration.
     *
     * @param {string} nodeId - Discovered node id.
     * @param {string} fromId - Source node id.
     * @param {string|null} edgeId - Edge used to reach the node.
     */
    #discover(nodeId, fromId, edgeId) {
        this.discovered.add(nodeId);
        super.recordDiscoverStep(fromId, nodeId, edgeId);
        this.queue.push({
            nodeId: nodeId,
            incomingEdgeId: edgeId
        });
    }

    /**
     * Explore the next node in the queue.
     *
     * Discovers all undiscovered neighbors and enqueues them.
     */
    #exploreNextInQueue() {
        let item = this.queue.shift();
        let neighbors = this.adjacency.get(item.nodeId) || [];
        let i;
        let edge;

        super.recordExploreStep(item.nodeId, item.incomingEdgeId);

        if (this.endId !== null && item.nodeId === this.endId) {
            this.targetFound = true;
        }

        for (i = 0; i < neighbors.length && !this.targetFound; i += 1) {
            edge = neighbors[i];

            if (!this.discovered.has(edge.to)) {
                super.setPredecessor(this.state.parent, edge.to, item.nodeId, edge.edgeId);
                this.#discover(edge.to, item.nodeId, edge.edgeId);
            }
        }

        super.recordFinishStep(item.nodeId, item.incomingEdgeId);
    }

    /**
     * Explore queued nodes in FIFO order.
     *
     * Used by the synchronous createPlan().
     */
    #exploreQueue() {
        while (this.queue.length > 0 && !this.targetFound) {
            this.#exploreNextInQueue();
        }
    }
}

/**
 * Builds Depth-First Search traversal plans.
 *
 * DFS explores as far as possible along each branch before backtracking.
 * Uses an explicit stack to avoid recursion depth limits and yields
 * periodically to keep the UI responsive.
 *
 * Stack frames alternate between:
 * - "enter": Discover and begin exploring a node.
 * - "resume": Finish a node after all neighbors are explored.
 */
class DepthFirst extends Traversal {

    /**
     * Create a Depth-First Search traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
        this.discovered = new Set();
        this.targetFound = false;
    }

    /**
     * Build a Depth-First Search traversal plan synchronously.
     *
     * @returns {object} DFS traversal plan.
     */
    createPlan() {
        this.discovered.add(this.startId);
        super.recordDiscoverStep(this.startId, this.startId, null);

        const stack = [];

        stack.push({
            nodeId: this.startId,
            fromId: this.startId,
            edgeId: null,
            neighborIndex: 0
        });

        while (stack.length > 0 && !this.targetFound) {
            const frame = stack[stack.length - 1];

            if (frame.neighborIndex === 0) {
                super.recordExploreStep(frame.nodeId, frame.edgeId);

                if (this.endId !== null && frame.nodeId === this.endId) {
                    this.targetFound = true;
                    break;
                }
            }

            const neighbors = this.adjacency.get(frame.nodeId) || [];
            let allNeighborsExplored = true;

            for (let i = frame.neighborIndex; i < neighbors.length; i += 1) {
                const neighbor = neighbors[i];

                if (!this.discovered.has(neighbor.to)) {
                    this.discovered.add(neighbor.to);
                    super.setPredecessor(this.state.parent, neighbor.to, frame.nodeId, neighbor.edgeId);
                    super.recordDiscoverStep(frame.nodeId, neighbor.to, neighbor.edgeId);

                    frame.neighborIndex = i + 1;

                    stack.push({
                        nodeId: neighbor.to,
                        fromId: frame.nodeId,
                        edgeId: neighbor.edgeId,
                        neighborIndex: 0
                    });

                    allNeighborsExplored = false;
                    break;
                }
            }

            if (allNeighborsExplored) {
                super.recordFinishStep(frame.nodeId, frame.edgeId);
                stack.pop();
            }
        }

        return super.createPlanResult("Depth-First Search", "DFS");
    }

    /**
     * Build a Depth-First Search traversal plan asynchronously.
     *
     * Yields to the browser after processing chunks of frames.
     *
     * @param {object} options - Async options.
     * @param {function} options.yieldFn - Function to call to yield to the browser.
     * @param {number} options.yieldEvery - Yield after processing this many frames.
     * @returns {Promise<object>} DFS traversal plan.
     */
    async createPlanAsync(options) {
        this.discovered.add(this.startId);
        super.recordDiscoverStep(this.startId, this.startId, null);

        const stack = [];
        stack.push({
            nodeId: this.startId,
            fromId: this.startId,
            edgeId: null,
            neighborIndex: 0
        });

        const yieldEvery = options.yieldEvery || 50;
        let processed = 0;

        while (stack.length > 0 && !this.targetFound) {
            const frame = stack[stack.length - 1];

            if (frame.neighborIndex === 0) {
                super.recordExploreStep(frame.nodeId, frame.edgeId);

                if (this.endId !== null && frame.nodeId === this.endId) {
                    this.targetFound = true;
                    break;
                }
            }

            const neighbors = this.adjacency.get(frame.nodeId) || [];
            let allNeighborsExplored = true;

            for (let i = frame.neighborIndex; i < neighbors.length; i += 1) {
                const neighbor = neighbors[i];

                if (!this.discovered.has(neighbor.to)) {
                    this.discovered.add(neighbor.to);
                    super.setPredecessor(this.state.parent, neighbor.to, frame.nodeId, neighbor.edgeId);
                    super.recordDiscoverStep(frame.nodeId, neighbor.to, neighbor.edgeId);

                    frame.neighborIndex = i + 1;

                    stack.push({
                        nodeId: neighbor.to,
                        fromId: frame.nodeId,
                        edgeId: neighbor.edgeId,
                        neighborIndex: 0
                    });

                    allNeighborsExplored = false;
                    break;
                }
            }

            if (allNeighborsExplored) {
                super.recordFinishStep(frame.nodeId, frame.edgeId);
                stack.pop();
            }

            processed += 1;

            if (processed % yieldEvery === 0) {
                await options.yieldFn();
            }
        }

        return super.createPlanResult("Depth-First Search", "DFS");
    }
}

/**
 * Base class for shortest-path traversal planners.
 *
 * Provides distance table initialization and edge relaxation helpers.
 */
class ShortestPathTraversal extends Traversal {

    /**
     * Create an initialized distance table.
     *
     * All nodes start at Infinity except the start node at 0.
     *
     * @returns {Map<string, number>} Distance table.
     */
    initializeDistances() {
        let distances = new Map();
        let i;

        for (i = 0; i < this.graph.nodeOrder.length; i += 1) {
            distances.set(this.graph.nodeOrder[i], Infinity);
        }

        distances.set(this.startId, 0);

        return distances;
    }
}

/**
 * Builds Dijkstra shortest-path traversal plans.
 *
 * Dijkstra greedily selects the nearest unexplored node and relaxes its
 * outgoing edges. Yields to the browser after processing chunks of nodes.
 */
class Dijkstra extends ShortestPathTraversal {

    /**
     * Create a Dijkstra traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
    }

    /**
     * Validate whether Dijkstra can run on the current graph.
     *
     * @returns {string|null} Error message, or null when valid.
     */
    validate() {
        if (this.graph.hasNegativeWeight()) {
            return "Dijkstra does not support negative weights. Use Bellman-Ford.";
        }

        return super.validate();
    }

    /**
     * Build a Dijkstra shortest-path traversal plan synchronously.
     *
     * @returns {object} Dijkstra traversal plan.
     */
    createPlan() {
        let distances = super.initializeDistances();
        let explored = new Set();
        let currentId;

        super.recordDiscoverStep(this.startId, this.startId, null, distances);

        while (explored.size < this.graph.nodeMap.size) {
            currentId = this.#chooseNearestUnexploredNode(distances, explored);

            if (currentId === null) {
                break;
            }

            this.#exploreNode(currentId, distances, explored);

            if (this.endId !== null && currentId === this.endId) {
                break;
            }
        }

        return super.createPlanResult("Dijkstra", "Dijkstra", distances);
    }

    /**
     * Build a Dijkstra traversal plan asynchronously.
     *
     * Yields to the browser after exploring chunks of nodes.
     *
     * @param {object} options - Async options.
     * @param {function} options.yieldFn - Function to call to yield to the browser.
     * @param {number} options.yieldEvery - Yield after exploring this many nodes.
     * @returns {Promise<object>} Dijkstra traversal plan.
     */
    async createPlanAsync(options) {
        let distances = super.initializeDistances();
        let explored = new Set();
        let yieldEvery = options.yieldEvery || 20;
        let processed = 0;
        let currentId;

        super.recordDiscoverStep(this.startId, this.startId, null, distances);

        while (explored.size < this.graph.nodeMap.size) {
            currentId = this.#chooseNearestUnexploredNode(distances, explored);

            if (currentId === null) {
                break;
            }

            this.#exploreNode(currentId, distances, explored);

            processed += 1;

            if (processed % yieldEvery === 0) {
                await options.yieldFn();
            }

            if (this.endId !== null && currentId === this.endId) {
                break;
            }
        }

        return super.createPlanResult("Dijkstra", "Dijkstra", distances);
    }

    /**
     * Explore a node by relaxing all its outgoing edges.
     *
     * @param {string} nodeId - Node to explore.
     * @param {Map<string, number>} distances - Distance table.
     * @param {Set<string>} explored - Explored node ids.
     */
    #exploreNode(nodeId, distances, explored) {
        let incomingEdgeId = this.#getIncomingEdgeId(nodeId);
        let neighbors = this.adjacency.get(nodeId) || [];
        let i;
        let edge;
        let fromDistance;
        let candidateDistance;

        super.recordExploreStep(nodeId, incomingEdgeId, distances);
        explored.add(nodeId);

        for (i = 0; i < neighbors.length; i += 1) {
            edge = neighbors[i];

            if (explored.has(edge.to)) {
                continue;
            }

            fromDistance = distances.get(edge.from);

            if (Number.isFinite(fromDistance)) {
                candidateDistance = fromDistance + edge.weight;

                if (candidateDistance < distances.get(edge.to)) {
                    distances.set(edge.to, candidateDistance);
                    super.setPredecessor(this.state.parent, edge.to, edge.from, edge.edgeId);
                    super.recordDiscoverStep(edge.from, edge.to, edge.edgeId, distances);
                }
            }
        }

        super.recordFinishStep(nodeId, incomingEdgeId, distances);
    }

    /**
     * Get the edge id used to reach a node.
     *
     * @param {string} nodeId - Node id.
     * @returns {string|null} Incoming edge id, or null for the start node.
     */
    #getIncomingEdgeId(nodeId) {
        let predecessor = this.state.parent.get(nodeId);
        return predecessor ? predecessor.edgeId : null;
    }

    /**
     * Choose the unexplored node with the smallest finite distance.
     *
     * @param {Map<string, number>} distances - Distance table.
     * @param {Set<string>} explored - Explored node ids.
     * @returns {string|null} Node id, or null when no reachable unexplored nodes remain.
     */
    #chooseNearestUnexploredNode(distances, explored) {
        let bestId = null;
        let bestDistance = Infinity;

        distances.forEach(function inspectDistance(distance, nodeId) {
            if (!explored.has(nodeId) && distance < bestDistance) {
                bestId = nodeId;
                bestDistance = distance;
            }
        });

        return bestId;
    }
}

/**
 * Builds Bellman-Ford shortest-path traversal plans.
 *
 * Bellman-Ford handles negative edge weights and detects negative cycles.
 * Yields to the browser between relaxation passes for large graphs.
 */
class BellmanFord extends ShortestPathTraversal {

    /**
     * Create a Bellman-Ford traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
    }

    /**
     * Validate whether Bellman-Ford can run on the current graph.
     *
     * @returns {string|null} Error message, or null when valid.
     */
    validate() {
        if (!this.graph.directed && this.graph.hasNegativeWeight()) {
            return "Bellman-Ford negative weights require a directed graph.";
        }

        return super.validate();
    }

    /**
     * Build a Bellman-Ford shortest-path traversal plan synchronously.
     *
     * @returns {object} Bellman-Ford traversal plan.
     */
    createPlan() {
        let distances = super.initializeDistances();
        let edges = this.#buildRelaxationEdges();
        let nodeCount = this.graph.nodeMap.size;

        super.recordDiscoverStep(this.startId, this.startId, null, distances);
        this.#relaxUntilStable(edges, distances, nodeCount);

        return super.createPlanResult("Bellman-Ford", "Bellman-Ford", distances, {
            negativeCycle: this.#detectNegativeCycle(edges, distances)
        });
    }

    /**
     * Build a Bellman-Ford traversal plan asynchronously.
     *
     * Yields to the browser after each relaxation-pass.
     *
     * @param {object} options - Async options.
     * @param {function} options.yieldFn - Function to call to yield to the browser.
     * @param {number} options.yieldEvery - Unused, yields every pass regardless.
     * @returns {Promise<object>} Bellman-Ford traversal plan.
     */
    async createPlanAsync(options) {
        let distances = super.initializeDistances();
        let edges = this.#buildRelaxationEdges();
        let nodeCount = this.graph.nodeMap.size;
        let changed = true;
        let pass;

        super.recordDiscoverStep(this.startId, this.startId, null, distances);

        for (pass = 1; pass < nodeCount && changed; pass += 1) {
            changed = this.#relaxAllEdgesOnce(edges, distances);

            await options.yieldFn();

            if (this.endId !== null &&
                Number.isFinite(distances.get(this.endId)) &&
                !changed) {
                break;
            }
        }

        return super.createPlanResult("Bellman-Ford", "Bellman-Ford", distances, {
            negativeCycle: this.#detectNegativeCycle(edges, distances)
        });
    }

    /**
     * Builds directed relaxation edge descriptors from every graph edge.
     *
     * @returns {Array<object>} Relaxation edge descriptors.
     */
    #buildRelaxationEdges() {
        let edges = [];
        let i;
        let edge;

        for (i = 0; i < this.graph.edgeOrder.length; i += 1) {
            edge = this.graph.edgeMap.get(this.graph.edgeOrder[i]);

            if (!edge) {
                continue;
            }

            edges.push({
                from: edge.from,
                to: edge.to,
                edgeId: edge.id,
                weight: super.getEdgeCost(edge.weight)
            });

            if (!this.graph.directed) {
                edges.push({
                    from: edge.to,
                    to: edge.from,
                    edgeId: edge.id,
                    weight: super.getEdgeCost(edge.weight)
                });
            }
        }

        return edges;
    }

    /**
     * Relax all edges in passes until no distance improves or the pass limit is reached.
     *
     * @param {Array<object>} edges - Relaxation-edge descriptors.
     * @param {Map<string, number>} distances - Distance table.
     * @param {number} nodeCount - Total number of graph nodes.
     */
    #relaxUntilStable(edges, distances, nodeCount) {
        let changed = true;
        let pass;

        for (pass = 1; pass < nodeCount && changed; pass += 1) {
            changed = this.#relaxAllEdgesOnce(edges, distances);

            if (this.endId !== null &&
                Number.isFinite(distances.get(this.endId)) &&
                !changed) {
                break;
            }
        }
    }

    /**
     * Relax every edge exactly once.
     *
     * Only processes edges whose source node has a finite distance.
     *
     * @param {Array<object>} edges - Relaxation-edge descriptors.
     * @param {Map<string, number>} distances - Distance table.
     * @returns {boolean} True when at least one distance improved.
     */
    #relaxAllEdgesOnce(edges, distances) {
        let changed = false;
        let i;
        let edge;
        let fromDistance;
        let candidateDistance;

        for (i = 0; i < edges.length; i += 1) {
            edge = edges[i];
            fromDistance = distances.get(edge.from);

            if (!Number.isFinite(fromDistance)) {
                continue;
            }

            super.recordExploreStep(edge.from, edge.edgeId, distances);

            candidateDistance = fromDistance + edge.weight;

            if (candidateDistance < distances.get(edge.to)) {
                distances.set(edge.to, candidateDistance);
                super.setPredecessor(this.state.parent, edge.to, edge.from, edge.edgeId);
                super.recordDiscoverStep(edge.from, edge.to, edge.edgeId, distances);
                changed = true;
            }

            super.recordFinishStep(edge.from, edge.edgeId, distances);
        }

        return changed;
    }

    /**
     * Detect whether a reachable negative cycle exists in the graph.
     *
     * @param {Array<object>} edges - Relaxation-edge descriptors.
     * @param {Map<string, number>} distances - Distance table.
     * @returns {boolean} True when a reachable negative cycle exists.
     */
    #detectNegativeCycle(edges, distances) {
        let i;
        let edge;
        let fromDistance;
        let candidateDistance;

        for (i = 0; i < edges.length; i += 1) {
            edge = edges[i];
            fromDistance = distances.get(edge.from);

            if (Number.isFinite(fromDistance)) {
                candidateDistance = fromDistance + edge.weight;

                if (candidateDistance < distances.get(edge.to)) {
                    return true;
                }
            }
        }

        return false;
    }
}

/**
 * Builds Prim minimum-spanning-tree traversal plans.
 *
 * Prim grows a minimum spanning tree by repeatedly adding the cheapest
 * edge connecting the current tree to a node outside the tree.
 * Yields to the browser after adding chunks of nodes to the tree.
 */
class Prim extends Traversal {

    /**
     * Create a Prim MST traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} endId - Unused for Prim, accepted for API consistency.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
    }

    /**
     * Validate whether Prim can run on the current graph.
     *
     * @returns {string|null} Error message, or null when valid.
     */
    validate() {
        if (this.graph.directed) {
            return "Prim's MST requires an undirected graph.";
        }

        return super.validate();
    }

    /**
     * Build a Prim minimum-spanning-tree traversal plan synchronously.
     *
     * @returns {object} Prim traversal plan.
     */
    createPlan() {
        let treeNodes = new Set();
        let totalWeight = 0;
        let edge;

        this.#acceptTreeNode(this.startId, this.startId, null);
        treeNodes.add(this.startId);

        while (treeNodes.size < this.graph.nodeMap.size) {
            edge = this.#chooseCheapestCrossingEdge(treeNodes);

            if (edge === null) {
                break;
            }

            totalWeight += edge.weight;
            treeNodes.add(edge.to);
            super.setPredecessor(this.state.parent, edge.to, edge.from, edge.edgeId);
            this.#acceptTreeNode(edge.to, edge.from, edge.edgeId);
        }

        return super.createPlanResult("Prim's Minimum Spanning Tree", "Prim", null, {
            totalWeight: totalWeight,
            connected: treeNodes.size === this.graph.nodeMap.size
        });
    }

    /**
     * Build a Prim traversal plan asynchronously.
     *
     * Yields to the browser after adding chunks of nodes to the tree.
     *
     * @param {object} options - Async options.
     * @param {function} options.yieldFn - Function to call to yield to the browser.
     * @param {number} options.yieldEvery - Yield after adding this many tree nodes.
     * @returns {Promise<object>} Prim traversal plan.
     */
    async createPlanAsync(options) {
        let treeNodes = new Set();
        let totalWeight = 0;
        let yieldEvery = options.yieldEvery || 20;
        let processed = 0;
        let edge;

        this.#acceptTreeNode(this.startId, this.startId, null);
        treeNodes.add(this.startId);

        while (treeNodes.size < this.graph.nodeMap.size) {
            edge = this.#chooseCheapestCrossingEdge(treeNodes);

            if (edge === null) {
                break;
            }

            totalWeight += edge.weight;
            treeNodes.add(edge.to);
            super.setPredecessor(this.state.parent, edge.to, edge.from, edge.edgeId);
            this.#acceptTreeNode(edge.to, edge.from, edge.edgeId);

            processed += 1;

            if (processed % yieldEvery === 0) {
                await options.yieldFn();
            }
        }

        return super.createPlanResult("Prim's Minimum Spanning Tree", "Prim", null, {
            totalWeight: totalWeight,
            connected: treeNodes.size === this.graph.nodeMap.size
        });
    }

    /**
     * Record animation steps for a node accepted into the MST.
     *
     * @param {string} nodeId - Accepted node id.
     * @param {string} fromId - Source node id.
     * @param {string|null} edgeId - Edge used to accept the node.
     */
    #acceptTreeNode(nodeId, fromId, edgeId) {
        super.recordDiscoverStep(fromId, nodeId, edgeId);
        super.recordExploreStep(nodeId, edgeId);
        super.recordFinishStep(nodeId, edgeId);
    }

    /**
     * Choose the cheapest edge crossing from the current tree to an outside node.
     *
     * @param {Set<string>} treeNodes - Node ids already in the tree.
     * @returns {object|null} Cheapest crossing-edge descriptor, or null when none exists.
     */
    #chooseCheapestCrossingEdge(treeNodes) {
        let cheapestEdge = null;
        let self = this;

        treeNodes.forEach(function inspectTreeNode(fromId) {
            let neighbors = self.adjacency.get(fromId) || [];
            let i;
            let edge;

            for (i = 0; i < neighbors.length; i += 1) {
                edge = neighbors[i];

                if (!treeNodes.has(edge.to)) {
                    if (cheapestEdge === null || edge.weight < cheapestEdge.weight) {
                        cheapestEdge = edge;
                    }
                }
            }
        });

        return cheapestEdge;
    }
}


/**
 * Graph compose mode.
 * Available modes and their default ordering come from the mode select element.
 */
class ModeOptions {

    /**
     * Get every available option from the mode select element.
     *
     * @param {HTMLSelectElement} select - Mode select element.
     * @returns {string[]} Mode values in UI order.
     */
    static values(select) {
        return (select && select.options)
            ? Array.from(select.options, function mapOption(option) {
                return option.value;
            })
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
 * Coordinates graph data, rendering, traversal execution, and UI interaction.
 */
class App {

    graph = new Graph();
    #elements;
    #ctx;
    #uiState;

    /**
     * Create the graph controller.
     */
    constructor() {
        this.#elements = this.#getElements();
        this.#ctx = this.#elements.canvas.getContext("2d");
        this.#uiState = this.#createUiState();

        this._boundMouseUp = this.handleMouseUp.bind(this);
        this._boundResize = this.resizeCanvas.bind(this);
        this._boundKeyDown = this.#handleKeyDown.bind(this);

        this.#bindEvents();
        this.resizeCanvas();
        this.refreshNodeSelectors();
        this.syncControls();
        this.#setStatus("Ready.");
        this.draw();
    }

    /**
     * Default yield configuration for async traversal plan creation.
     */
    static ASYNC_OPTIONS = Object.freeze({
        yieldEvery: 50,
        yieldFn: function defaultYield() {
            return new Promise(function yieldPromise(resolve) {
                window.setTimeout(resolve, 0);
            });
        }
    });

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
     * Start the graph editor.
     */
    static start() {
        App.updateCopyrightYear();
        App.bindAsideNavigation();
        window.graphController = new App();
    }

    /**
     * Update footer copyright year using the current system year.
     */
    static updateCopyrightYear() {
        const copyrightYear = document.getElementById("copyright-year");

        if (copyrightYear) {
            copyrightYear.textContent = String(new Date().getFullYear());
        }
    }

    /**
     * Bind aside the navigation button click handlers.
     */
    static bindAsideNavigation() {
        const asideNavButtons = document.querySelectorAll("aside nav button");

        asideNavButtons.forEach(function bindAsideButton(button) {
            button.addEventListener("click", function handleAsideClick() {
                App.scrollAsideToButtonTarget(button);
            });
        });
    }

    /**
     * Scroll the aside container to a target panel.
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

    /**
     * Create all mutable UI state.
     *
     * @returns {object} UI state.
     */
    #createUiState() {
        return {
            mode: ModeOptions.getDefault(this.#elements.modeSelect),

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
     * Collect required DOM elements.
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

        window.addEventListener("mouseup", this._boundMouseUp);
        window.addEventListener("resize", this._boundResize);
        window.addEventListener("keydown", this._boundKeyDown);

        this.#enhanceAccessibility();
    }

    /**
     * Add focus styling and ARIA metadata for the canvas.
     */
    #enhanceAccessibility() {
        const self = this;

        this.#elements.canvas.setAttribute('role', 'img');
        this.#elements.canvas.setAttribute('aria-label', 'Interactive graph editor canvas');

        this.#elements.canvas.addEventListener('focus', function handleFocus() {
            self.#elements.canvas.style.outline = '2px solid #4ade80';
        });

        this.#elements.canvas.addEventListener('blur', function handleBlur() {
            self.#elements.canvas.style.outline = 'none';
        });
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
        } else if ((modifierPressed && key === "y") || (modifierPressed && event.shiftKey && key === "z")) {
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
     * Convert a pointer event to screen and graph-world coordinates.
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
        ModeOptions.values(this.#elements.modeSelect).forEach(function syncPanel(mode) {
            const panel = document.getElementById(ModeOptions.getPanelId(mode));

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
     * Display a status message.
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
        this.#clearEditSelectionState();
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
        this.graph.rebuildEdgesOnDirectionChange();
        this.#clearEditSelectionState();
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
        this.#clearEditSelectionState();

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
     * Handle normal canvas clicks after suppressing clicks caused by double-clicks or drag completion.
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
     * Empty clicks clear existing selections before creating new nodes.
     *
     * @param {object} point - Pointer position.
     */
    #handleEmptyCanvasClick(point) {
        if (this.#uiState.editSelection || this.#uiState.selectedNodeIdForEdge !== null) {
            this.clearEditSelection("Selection cleared.");
        } else {
            this.#setMode("add-node");
            this.#cancelEdgeSource();
            this.#handleAddNode(point);
        }
    }

    /**
     * Add a node at the pointer.
     *
     * @param {object} point - Pointer position.
     */
    #handleAddNode(point) {
        this.graph.addNode(point.x, point.y, this.#createNodeLabel());
        this.refreshNodeSelectors();
        this.#setStatus("Node added.");
    }

    /**
     * Create a label for a new node based on the selected label mode.
     *
     * @returns {string|null} Alphabetic label, or null for default graph label.
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
     * @returns {number|null} Edge weight, or null when weighted input is invalid.
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
     * The first actual movement records the undo history.
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
     * Prepare a traversal plan without blocking the UI.
     *
     * @param {object} settings - Traversal settings.
     * @returns {Promise<void>} Resolves when the plan is ready.
     */
    async #prepareTraversalAsync(settings) {
        let traversal;
        let validationMessage;
        let plan;

        traversal = Traversal.create(
            settings.algorithm,
            this.graph,
            settings.startId,
            settings.endId
        );

        validationMessage = traversal.validate();

        if (validationMessage !== null) {
            this.#setStatus(validationMessage);
            return;
        }

        this.clearTraversal();
        this.#setStatus("Building traversal plan...");

        await App.ASYNC_OPTIONS.yieldFn();

        try {
            plan = await traversal.createPlanAsync(App.ASYNC_OPTIONS);
            this.#uiState.traversal.plan = plan;
            this.#uiState.traversal.index = 0;
            this.#setStatus(plan.name + " ready.");
        } catch (error) {
            this.#setStatus("Failed to build traversal plan.");
        }
    }

    /**
     * Prepare and run the selected traversal animation.
     */
    async runTraversal() {
        let settings = this.#getTraversalSettings();

        if (!settings) {
            return;
        }

        if (this.#uiState.traversal.running) {
            this.#setStatus("Traversal is already running.");
            return;
        }

        if (!this.#hasReusableTraversalPlan(settings)) {
            await this.#prepareTraversalAsync(settings);
        }

        if (this.#uiState.traversal.plan && !this.#uiState.traversal.running) {
            this.#uiState.traversal.running = true;
            this.#uiState.traversal.token += 1;
            await this.#animateTraversal(settings.delay, this.#uiState.traversal.token);
        }
    }

    /**
     * Advance the selected traversal by one step.
     */
    async stepTraversal() {
        let settings = this.#getTraversalSettings();

        if (!settings) {
            return;
        }

        if (!this.#hasReusableTraversalPlan(settings)) {
            await this.#prepareTraversalAsync(settings);
        }

        if (this.#uiState.traversal.plan) {
            this.#stepPreparedTraversal();
        }
    }

    /**
     * Get the current traversal distance displayed for a node.
     *
     * @param {string} nodeId - Node id.
     * @returns {number|undefined} Distance value.
     */
    getTraversalDistance(nodeId) {
        return this.#uiState.traversal.distances.get(nodeId);
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
     * Create traversal settings from current UI controls.
     *
     * @returns {object} Traversal settings.
     */
    #createTraversalSettings() {
        return {
            algorithm: this.#elements.algorithmSelect.value,
            startId: this.#elements.startNodeSelect.value,
            endId: this.#elements.endNodeSelect.value || null,
            delay: Math.max(this.#elements.delayInput.min, Number(this.#elements.delayInput.value))
        };
    }

    /**
     * Check whether the current traversal plan matches requested settings.
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
            // Check token BEFORE advancing step to prevent glitch
            if (token !== this.#uiState.traversal.token) break;
            this.#advanceTraversalStep();
            if (delay > 0) {
                await this.#sleep(delay);
            }
        }

        // Double-check token before finishing
        if (token === this.#uiState.traversal.token && this.#uiState.traversal.plan &&
            this.#uiState.traversal.index >= this.#uiState.traversal.plan.steps.length) {
            this.#finishTraversal();
        }
        this.#uiState.traversal.running = false;
    }

    /**
     * Check whether the current traversal animation should continue.
     *
     * @param {number} token - Traversal run token.
     * @returns {boolean} True when animation should continue.
     */
    #shouldContinueTraversal(token) {
        const traversal = this.#uiState.traversal;
        return Boolean(traversal.plan) && traversal.index < traversal.plan.steps.length && token === traversal.token;
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
     * Apply one traversal animation step to graph-render state and distance badges.
     *
     * @param {object} step - Traversal animation step.
     */
    #markTraversalStep(step) {
        if (step) {
            if (step.type !== "discover") {
                this.#clearExploringTraversalStates();
            }

            this.#markTraversalEntity(step, step.type);

            if (step.distances) {// Apply distance deltas instead of replacing entire map
                this.#applyDistanceDelta(step.distances);
            }
        }
    }

    /**
     * Apply updated traversal distances to the UI distance map.
     *
     * @param {Map<string, number>|object} delta - Distance updates keyed by node id.
     */
    #applyDistanceDelta(delta) {
        const self = this;
        Object.entries(delta).forEach(function applyEntry(entry) {
            self.#uiState.traversal.distances.set(entry[0], entry[1]);
        });
    }

    /**
     * Apply a traversal render state to the step node and optional step edge.
     *
     * @param {object} step - Traversal animation step.
     * @param {string} stateName - Render state name.
     */
    #markTraversalEntity(step, stateName) {
        const node = this.graph.getNodeById(step.nodeId);
        const edge = step.edgeId ? this.graph.getEdgeById(step.edgeId) : null;

        if (node) {
            this.#applyTraversalState(node, stateName);
        }
        if (edge) {
            this.#applyTraversalState(edge, stateName);
        }
    }

    /**
     * Apply a traversal state transition to a node or edge.
     *
     * @param {Node|Edge} entity - Graph entity with render state.
     * @param {string} stateName - Traversal state name.
     */
    #applyTraversalState(entity, stateName) {
        if (stateName === "discover") {
            entity.renderState.discovered(true);
        } else if (stateName === "explore") {
            entity.renderState.exploring(true);
        } else if (stateName === "finish") {
            entity.renderState.exploring(false);
            entity.renderState.explored(true);
        }
    }

    /**
     * Clear temporary exploring highlights from all nodes and edges.
     */
    #clearExploringTraversalStates() {
        this.graph.nodeMap.forEach(function clearNode(node) {
            node.renderState.clearExploring();
        });

        this.graph.edgeMap.forEach(function clearEdge(edge) {
            edge.renderState.clearExploring();
        });
    }


    /**
     * Resolve after a delay.
     *
     * @param {number} ms - Delay in milliseconds.
     * @returns {Promise<void>} Promise that resolves after delay.
     */
    #sleep(ms) {
        return new Promise(function resolveLater(resolve) {
            window.setTimeout(resolve, ms);
        });
    }

    /**
     * Complete the current traversal and render final highlights.
     */
    #finishTraversal() {
        const plan = this.#uiState.traversal.plan;

        if (plan) {
            this.#clearExploringTraversalStates();
            TraversalResult.markFinalPath(plan, this.graph);
            this.#elements.traversalOutput.innerHTML = TraversalResult.formatOutput(plan, this.graph);
            this.#setStatus(`${plan.name} complete.`);
            this.draw();
        }
    }

    /**
     * Clear traversal plan, progress, visuals, and distance badges.
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
        this.#clearExploringTraversalStates();
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
    async loadSampleGraph() {
        const btn = this.#elements.sampleGraphBtn;
        const originalText = btn.textContent;

        try {
            btn.disabled = true;
            btn.textContent = "Loading...";
            this.#setStatus("Loading sample graph...");

            const data = await Graph.loadSampleAsync();
            this.graph.load(data);
            this.#resetAfterGraphLoad();
            this.#setStatus("Sample graph loaded.");
        } catch (error) {
            this.#setStatus(`Failed: ${error.message}`);
            btn.disabled = false;
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    /**
     * Reset the active mode to the default mode declared in the HTML.
     */
    #resetModeToDefault() {
        this.#setMode(ModeOptions.getDefault(this.#elements.modeSelect));
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
 * Start the application after the DOM is ready.
 */
window.addEventListener("DOMContentLoaded", function startApplication() {
    App.start();
});