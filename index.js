"use strict";

/**
 * Custom event emitter for decoupled communication between components.
 * Provides a lightweight pub/sub-system for graph editor events.
 */
class EventEmitter {
    /** @type {Map<string, Set<Function>>} */
    #listeners = new Map();

    /**
     * Subscribe to an event.
     *
     * @param {string} event - Event name.
     * @param {Function} callback - Event handler.
     */
    on(event, callback) {
        if (!this.#listeners.has(event)) {
            this.#listeners.set(event, new Set());
        }
        this.#listeners.get(event).add(callback);
    }

    /**
     * Unsubscribe from an event.
     *
     * @param {string} event - Event name.
     * @param {Function} callback - Event handler to remove.
     */
    off(event, callback) {
        const listeners = this.#listeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * Emit an event to all subscribers.
     *
     * @param {string} event - Event name.
     * @param {*} [data=null] - Event payload.
     */
    emit(event, data = null) {
        const listeners = this.#listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for "${event}":`, error);
                }
            });
        }
    }

    /**
     * Remove all event listeners.
     */
    clear() {
        this.#listeners.clear();
    }
}

/**
 * Type assertion helper for runtime validation.
 * Used to ensure critical parameters meet expected types.
 */
class TypeAssert {
    /**
     * Assert that a value is of a specific type.
     *
     * @param {*} value - Value to check.
     * @param {string} type - Expected typeof result.
     * @param {string} name - Parameter name for error messages.
     * @throws {TypeError} When the value does not match the expected type.
     */
    static isType(value, type, name) {
        if (typeof value !== type) {
            throw new TypeError(`${name} must be of type ${type}, got ${typeof value}`);
        }
    }

    /**
     * Assert that a value is a finite number.
     *
     * @param {*} value - Value to check.
     * @param {string} name - Parameter name for error messages.
     * @throws {TypeError} When the value is not a finite number.
     */
    static isFiniteNumber(value, name) {
        if (!Number.isFinite(value)) {
            throw new TypeError(`${name} must be a finite number, got ${value}`);
        }
    }

    /**
     * Assert that a value is a non-empty string.
     *
     * @param {*} value - Value to check.
     * @param {string} name - Parameter name for error messages.
     * @throws {TypeError} When the value is not a non-empty string.
     */
    static isNonEmptyString(value, name) {
        TypeAssert.isType(value, "string", name);
        if (value.trim().length === 0) {
            throw new TypeError(`${name} must be a non-empty string`);
        }
    }
}

/**
 * Stores transient visual state for a graph node or edge.
 * RenderState only controls a presentation state used during rendering and traversal visualization.
 * Implements a precedence-based style resolution system.
 */
class RenderState {
    /** @type {string} Shared font family for all graph text rendering */
    static FONT_FAMILY = "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif";

    /** @type {string} Shared font weight for all graph text rendering */
    static FONT_WEIGHT = "bold";

    /** @type {Object} Base drawing style applied to all entities */
    static STYLE_BASE = Object.freeze({
        fill: "#1e293b",
        stroke: "#64748b",
        lineWidth: 2
    });

    /** @type {Object} State-specific style overrides with precedence rules */
    static STYLE_OVERRIDES = Object.freeze({
        hovered: Object.freeze({
            fill: "#c084fc",
            stroke: "#4c1d95"
        }),
        selected: Object.freeze({
            fill: "#4c1d95",
            stroke: "#c084fc"
        }),
        discovered: Object.freeze({
            fill: "#78350f",
            stroke: "#ff9100",
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
        })
    });

    /** @type {Object} Internal state flags for visual modes */
    #state = {
        hovered: false,
        selected: false,
        discovered: false,
        exploring: false,
        explored: false,
        path: false
    };

    /** @type {number} Cached style version for efficient style recalculation */
    #styleVersion = 0;

    /** @type {Object|null} Cached resolved style */
    #cachedStyle = null;

    /**
     * Build a canvas font string using the shared graph font family.
     *
     * @param {number} size - Font size in pixels.
     * @returns {string} Canvas font string.
     * @throws {TypeError} When size is not a finite positive number.
     */
    static createFont(size) {
        TypeAssert.isFiniteNumber(size, "size");
        if (size <= 0) {
            throw new TypeError("Font size must be positive");
        }
        return `${RenderState.FONT_WEIGHT} ${Math.round(size)}px ${RenderState.FONT_FAMILY}`;
    }

    /**
     * Read or update a render-state flag.
     * Updates trigger style cache invalidation.
     *
     * @param {string} key - State flag name.
     * @param {boolean|null} value - New value, or null to read.
     * @returns {boolean} The current value of the flag.
     */
    #stateValue(key, value = null) {
        if (value !== null) {
            const newValue = Boolean(value);
            if (this.#state[key] !== newValue) {
                this.#state[key] = newValue;
                this.#styleVersion++;
                this.#cachedStyle = null;
            }
        }
        return this.#state[key];
    }

    /**
     * Read or update hovered state.
     *
     * @param {boolean|null} [value=null] - New hovered state, or null to read.
     * @returns {boolean} Current hovered state when reading, undefined when setting.
     */
    hovered(value = null) {
        return this.#stateValue("hovered", value);
    }

    /**
     * Read or update the selected state.
     *
     * @param {boolean|null} [value=null] - New selected state, or null to read.
     * @returns {boolean} Current selected state when reading, undefined when setting.
     */
    selected(value = null) {
        return this.#stateValue("selected", value);
    }

    /**
     * Read or update discovered traversal state.
     *
     * @param {boolean|null} [value=null] - Newly discovered state, or null to read.
     * @returns {boolean} Current discovered state when reading, undefined when setting.
     */
    discovered(value = null) {
        return this.#stateValue("discovered", value);
    }

    /**
     * Read or update exploring traversal state.
     *
     * @param {boolean|null} [value=null] - New exploring state, or null to read.
     * @returns {boolean} Current exploring state when reading, undefined when setting.
     */
    exploring(value = null) {
        return this.#stateValue("exploring", value);
    }

    /**
     * Read or update explored traversal state.
     *
     * @param {boolean|null} [value=null] - New explored state, or null to read.
     * @returns {boolean} Current explored state when reading, undefined when setting.
     */
    explored(value = null) {
        return this.#stateValue("explored", value);
    }

    /**
     * Read or update the final traversal path state.
     *
     * @param {boolean|null} [value=null] - New path state, or null to read.
     * @returns {boolean} Current path state when reading, undefined when setting.
     */
    path(value = null) {
        return this.#stateValue("path", value);
    }

    /**
     * Resolve the active draw style for the current render state.
     * State precedence (highest wins): discovered < exploring < explored < path < selected < hovered
     * Results are cached until the state changes.
     *
     * @returns {Object} Active draw style (frozen object).
     */
    getDrawStyle() {
        if (this.#cachedStyle !== null) {
            return this.#cachedStyle;
        }

        const stateOrder = ["discovered", "exploring", "explored", "path", "selected", "hovered"];
        let hasOverrides = false;

        for (let i = 0; i < stateOrder.length; i++) {
            if (this.#state[stateOrder[i]]) {
                hasOverrides = true;
                break;
            }
        }

        if (!hasOverrides) {
            this.#cachedStyle = RenderState.STYLE_BASE;
            return RenderState.STYLE_BASE;
        }

        const style = Object.assign({}, RenderState.STYLE_BASE);
        for (let i = 0; i < stateOrder.length; i++) {
            const stateName = stateOrder[i];
            if (this.#state[stateName]) {
                Object.assign(style, RenderState.STYLE_OVERRIDES[stateName]);
            }
        }

        this.#cachedStyle = Object.freeze(style);
        return this.#cachedStyle;
    }

    /**
     * Invalidate the style cache, forcing recalculation on the next getDrawStyle () call.
     */
    invalidateStyle() {
        this.#cachedStyle = null;
        this.#styleVersion++;
    }

    /**
     * Clear temporary traversal focus state.
     */
    clearExploring() {
        if (this.#state.exploring) {
            this.#state.exploring = false;
            this.#cachedStyle = null;
            this.#styleVersion++;
        }
    }

    /**
     * Clear all traversal-related visual state.
     */
    clearTraversal() {
        const hadTraversalState = this.#state.discovered || this.#state.exploring || this.#state.explored || this.#state.path;

        this.#state.discovered = false;
        this.#state.exploring = false;
        this.#state.explored = false;
        this.#state.path = false;

        if (hadTraversalState) {
            this.#cachedStyle = null;
            this.#styleVersion++;
        }
    }

    /**
     * Check if any traversal-related state is active.
     *
     * @returns {boolean} True when any traversal state is active.
     */
    hasTraversalState() {
        return this.#state.discovered || this.#state.exploring || this.#state.explored || this.#state.path;
    }

    /**
     * Get a snapshot of the current state flags.
     *
     * @returns {Object} Copy of current state flags.
     */
    getStateSnapshot() {
        return Object.assign({}, this.#state);
    }
}

/**
 * Geometry helpers for graph hit testing and drawing calculations.
 * All methods are pure functions with no side effects.
 */
class Geometry {
    /** @type {number} Small epsilon value for floating-point comparisons */
    static EPSILON = 1e-10;

    /**
     * Calculate Euclidean distance between two points.
     *
     * @param {number} x1 - First point x coordinate.
     * @param {number} y1 - First point y coordinate.
     * @param {number} x2 - Second point x coordinate.
     * @param {number} y2 - Second point y coordinate.
     * @returns {number} Distance between the points.
     * @throws {TypeError} When coordinates are not finite numbers.
     */
    static distance(x1, y1, x2, y2) {
        TypeAssert.isFiniteNumber(x1, "x1");
        TypeAssert.isFiniteNumber(y1, "y1");
        TypeAssert.isFiniteNumber(x2, "x2");
        TypeAssert.isFiniteNumber(y2, "y2");

        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate the shortest distance from a point to a line segment.
     * Handles edge cases where the segment has zero length.
     *
     * @param {number} px - Point x coordinate.
     * @param {number} py - Point y coordinate.
     * @param {number} x1 - Segment start x coordinate.
     * @param {number} y1 - Segment start y coordinate.
     * @param {number} x2 - Segment end x coordinate.
     * @param {number} y2 - Segment end y coordinate.
     * @returns {number} Shortest point-to-segment distance.
     * @throws {TypeError} When coordinates are not finite numbers.
     */
    static distanceToSegment(px, py, x1, y1, x2, y2) {
        TypeAssert.isFiniteNumber(px, "px");
        TypeAssert.isFiniteNumber(py, "py");
        TypeAssert.isFiniteNumber(x1, "x1");
        TypeAssert.isFiniteNumber(y1, "y1");
        TypeAssert.isFiniteNumber(x2, "x2");
        TypeAssert.isFiniteNumber(y2, "y2");

        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;

        // Handle degenerate segment (single point)
        if (lengthSquared < Geometry.EPSILON) {
            return Geometry.distance(px, py, x1, y1);
        }

        const ratio = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        const t = Math.max(0, Math.min(1, ratio));
        const projectedX = x1 + t * dx;
        const projectedY = y1 + t * dy;

        return Geometry.distance(px, py, projectedX, projectedY);
    }

    /**
     * Calculate the angle between two points in radians.
     *
     * @param {number} x1 - First point x coordinate.
     * @param {number} y1 - First point y coordinate.
     * @param {number} x2 - Second point x coordinate.
     * @param {number} y2 - Second point y coordinate.
     * @returns {number} Angle in radians between -PI and PI.
     */
    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    /**
     * Calculate the midpoint between two points.
     *
     * @param {number} x1 - First point x coordinate.
     * @param {number} y1 - First point y coordinate.
     * @param {number} x2 - Second point x coordinate.
     * @param {number} y2 - Second point y coordinate.
     * @returns {Object} Midpoint with x and y properties.
     */
    static midpoint(x1, y1, x2, y2) {
        return {
            x: (x1 + x2) / 2,
            y: (y1 + y2) / 2
        };
    }

    /**
     * Calculate a point along a line at a given distance from the start.
     *
     * @param {number} x1 - Start point x coordinate.
     * @param {number} y1 - Start point y coordinate.
     * @param {number} x2 - End point x coordinate.
     * @param {number} y2 - End point y coordinate.
     * @param {number} distance - Distance from start point.
     * @returns {Object} Point at the specified distance with x and y properties.
     */
    static pointAlongLine(x1, y1, x2, y2, distance) {
        const angle = Geometry.angle(x1, y1, x2, y2);
        return {
            x: x1 + Math.cos(angle) * distance,
            y: y1 + Math.sin(angle) * distance
        };
    }
}

/**
 * Represents one graph node and owns its drawing and hit-testing logic.
 * Nodes support customizable labels, radii, and render states.
 *
 * @extends EventEmitter
 */
class Node extends EventEmitter {
    /** @type {number} Default radius for nodes without explicit radius */
    static DEFAULT_RADIUS = 17;

    /** @type {number} Scale factor for label font relative to radius */
    static LABEL_FONT_SCALE = 0.8;

    /** @type {number} Font size for distance badges */
    static BADGE_FONT_SIZE = 8;

    /** @type {number} Minimum allowed node radius */
    static MIN_RADIUS = 5;

    /** @type {number} Maximum allowed node radius */
    static MAX_RADIUS = 200;

    /**
     * Create a node.
     *
     * @param {string} id - Stable node id.
     * @param {string} label - Display label.
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @param {number|string|null|undefined} [radius=null] - Optional radius override.
     * @throws {TypeError} When id or label is not a non-empty string.
     * @throws {TypeError} When coordinates are not finite numbers.
     */
    constructor(id, label, x, y, radius = null) {
        super();

        TypeAssert.isNonEmptyString(id, "id");
        TypeAssert.isNonEmptyString(label, "label");
        TypeAssert.isFiniteNumber(x, "x");
        TypeAssert.isFiniteNumber(y, "y");

        /** @type {string} Unique node identifier */
        this.id = String(id);

        /** @type {string} Display label for the node */
        this.label = String(label);

        /** @type {number} World x coordinate */
        this.x = Number(x);

        /** @type {number} World y coordinate */
        this.y = Number(y);

        /** @type {number|null} Custom radius override, or null for default */
        this.radius = Node.normalizeRadius(radius);

        /** @type {RenderState} Visual state manager for this node */
        this.renderState = new RenderState();
    }

    /**
     * Normalize a node radius to a valid value or null.
     * Invalid or out-of-range values become null.
     *
     * @param {number|string|null|undefined} radius - Radius candidate.
     * @returns {number|null} Normalized radius, or null for default.
     */
    static normalizeRadius(radius) {
        if (radius === null || radius === undefined) {
            return null;
        }

        const parsed = Number(radius);

        if (!Number.isFinite(parsed) ||
            parsed < Node.MIN_RADIUS ||
            parsed > Node.MAX_RADIUS) {
            return null;
        }

        return parsed;
    }

    /**
     * Set the global default node radius.
     * Must be within the allowed range.
     *
     * @param {number|string} radius - Radius candidate.
     * @throws {TypeError} When radius is not a valid number.
     */
    static setDefaultRadius(radius) {
        const normalized = Node.normalizeRadius(radius);

        if (normalized !== null) {
            Node.DEFAULT_RADIUS = normalized;
        } else {
            throw new TypeError("Default radius must be a finite number between " +
                Node.MIN_RADIUS + " and " + Node.MAX_RADIUS);
        }
    }

    /**
     * Serialize the node as plain graph data.
     *
     * @returns {Object} Serialized node data with id, label, x, y, and optional radius.
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
     * @returns {number} Negative when this < other, positive when this > other, 0 when equal.
     */
    compareTo(other) {
        return this.label.localeCompare(other.label);
    }

    /**
     * Set node label.
     *
     * @param {string} label - New node label.
     * @throws {TypeError} When label is not a non-empty string.
     */
    setLabel(label) {
        TypeAssert.isNonEmptyString(label, "label");
        const oldLabel = this.label;
        this.label = String(label);

        if (oldLabel !== this.label) {
            this.emit("label-changed", {node: this, oldLabel, newLabel: this.label});
        }
    }

    /**
     * Set node radius override.
     *
     * @param {number|string|null|undefined} radius - Radius candidate.
     */
    setRadius(radius) {
        const oldRadius = this.radius;
        this.radius = Node.normalizeRadius(radius);

        if (oldRadius !== this.radius) {
            this.emit("radius-changed", {node: this, oldRadius, newRadius: this.radius});
        }
    }

    /**
     * Move the node to a new world position.
     *
     * @param {number} x - New world x coordinate.
     * @param {number} y - New world y coordinate.
     * @throws {TypeError} When coordinates are not finite numbers.
     */
    moveTo(x, y) {
        TypeAssert.isFiniteNumber(x, "x");
        TypeAssert.isFiniteNumber(y, "y");

        const oldX = this.x;
        const oldY = this.y;
        this.x = Number(x);
        this.y = Number(y);

        if (oldX !== this.x || oldY !== this.y) {
            this.emit("position-changed", {
                node: this,
                oldX, oldY,
                newX: this.x, newY: this.y
            });
        }
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
     * Get a label font sized proportionally to the node radius.
     * The font size will never be smaller than the default node radius font.
     *
     * @returns {string} Canvas font string.
     */
    #getLabelFont() {
        const baseSize = Math.max(Node.DEFAULT_RADIUS, this.getRadius());
        const size = Math.round(baseSize * Node.LABEL_FONT_SCALE);
        return RenderState.createFont(size);
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
     * @param {number|undefined} [distance=undefined] - Optional traversal distance.
     */
    draw(ctx, distance) {
        const style = this.renderState.getDrawStyle();

        this.#drawNodeCircle(ctx, style);
        this.#drawNodeLabel(ctx);

        if (distance !== undefined && distance !== null) {
            this.#drawDistanceBadge(ctx, distance);
        }
    }

    /**
     * Draw the node circle with fill and stroke.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Object} style - Active render style.
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
     * Uses shadow effects for better readability.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     */
    #drawNodeLabel(ctx) {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.font = this.#getLabelFont();
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
     * Shows distance information from traversal algorithms.
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
     * Handles special cases like Infinity.
     *
     * @param {number} distance - Traversal distance.
     * @returns {string} Formatted badge label.
     */
    #formatDistanceLabel(distance) {
        if (distance === Infinity) {
            return "\u221E"; // ∞ symbol
        }
        if (!Number.isFinite(distance)) {
            return "?";
        }
        // Format large numbers
        if (Math.abs(distance) > 999999) {
            return distance.toExponential(1);
        }
        // Format with limited precision
        return Number.isInteger(distance) ? String(distance) : distance.toFixed(1);
    }

    /**
     * Get the distance badge bounds relative to the node position.
     * Positioned above the node circle.
     *
     * @returns {Object} Badge bounds with x, y, width, height, and radius.
     */
    #getDistanceBadgeBounds() {
        const width = 32;
        const height = 20;

        // Ensure badge doesn't go off-screen (basic check)
        const badgeY = this.y - this.getRadius() - 20;

        return {
            x: this.x - width / 2,
            y: badgeY,
            width: width,
            height: height,
            radius: 6
        };
    }

    /**
     * Draw the distance badge background with rounded corners.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Object} badge - Badge bounds.
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
     * Provides rounded rectangle support for older browsers.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Object} badge - Badge bounds with radius property.
     */
    #drawRoundedRectPolyfill(ctx, badge) {
        const {x, y, width: w, height: h, radius: r} = badge;

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
     * @param {Object} badge - Badge bounds.
     */
    #drawDistanceBadgeText(ctx, label, badge) {
        ctx.fillStyle = "#54a1ea";
        ctx.font = RenderState.createFont(Node.BADGE_FONT_SIZE);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, this.x, badge.y + badge.height / 2);
    }
}

/**
 * Represents one graph edge and owns its drawing and hit-testing logic.
 * Supports directional arrows, weight labels, and interactive hit testing.
 *
 * @extends EventEmitter
 */
class Edge extends EventEmitter {
    /** @type {number} Hit test tolerance in pixels for edge selection */
    static HIT_TOLERANCE = 8;

    /** @type {number} Arrow head size for directed edges */
    static ARROW_SIZE = 10;

    /** @type {number} Arrow head angle in radians */
    static ARROW_ANGLE = Math.PI / 6;

    /** @type {number} Font size for weight labels */
    static WEIGHT_FONT_SIZE = 8;

    /** @type {number} Maximum allowed edge weight */
    static MAX_WEIGHT = 1e6;

    /** @type {number} Minimum allowed edge weight */
    static MIN_WEIGHT = -1e6;

    /**
     * Create an edge.
     *
     * @param {string} id - Stable edge id.
     * @param {string} from - Source node id.
     * @param {string} to - Target node id.
     * @param {number|string} [weight=1] - Edge weight.
     * @throws {TypeError} When parameters are invalid.
     */
    constructor(id, from, to, weight = 1) {
        super();

        TypeAssert.isNonEmptyString(id, "id");
        TypeAssert.isNonEmptyString(from, "from");
        TypeAssert.isNonEmptyString(to, "to");

        if (from === to) {
            throw new TypeError("Edge cannot connect a node to itself");
        }

        if (weight === undefined || weight === null) {
            weight = 1;
        }

        /** @type {string} Unique edge identifier */
        this.id = String(id);

        /** @type {string} Source node identifier */
        this.from = String(from);

        /** @type {string} Target node identifier */
        this.to = String(to);

        /** @type {number} Edge weight for weighted graphs */
        this.weight = Edge.normalizeWeight(weight);

        /** @type {RenderState} Visual state manager for this edge */
        this.renderState = new RenderState();
    }

    /**
     * Normalize an edge weight to a valid value.
     * Out-of-range values are clamped to allowed bounds.
     *
     * @param {number|string} weight - Weight candidate.
     * @returns {number} Normalized weight.
     */
    static normalizeWeight(weight) {
        const parsed = Number(weight);

        if (!Number.isFinite(parsed)) {
            return 1;
        }

        return Math.max(Edge.MIN_WEIGHT, Math.min(Edge.MAX_WEIGHT, parsed));
    }

    /**
     * Serialize the edge as plain graph data.
     *
     * @returns {Object} Serialized edge data with id, from, to, and weight.
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
     * @returns {number} Negative when this < other, positive when this > other, 0 when equal.
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
        const oldWeight = this.weight;
        this.weight = Edge.normalizeWeight(weight);

        if (oldWeight !== this.weight) {
            this.emit("weight-changed", {edge: this, oldWeight, newWeight: this.weight});
        }
    }

    /**
     * Check whether a world point intersects the edge hit area.
     *
     * @param {number} x - World x coordinate.
     * @param {number} y - World y coordinate.
     * @param {Graph} graph - Graph instance for endpoint lookup.
     * @returns {boolean} True when the point intersects the edge.
     */
    containsPoint(x, y, graph) {
        const endpoints = this.#getEndpoints(graph);

        if (endpoints === null) {
            return false;
        }

        const distance = Geometry.distanceToSegment(
            x, y,
            endpoints.fromNode.x, endpoints.fromNode.y,
            endpoints.toNode.x, endpoints.toNode.y
        );

        return distance < Edge.HIT_TOLERANCE;
    }

    /**
     * Draw the edge line, optional direction arrow, and optional weight label.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Graph} graph - Graph instance for endpoint lookup.
     */
    draw(ctx, graph) {
        const endpoints = this.#getEndpoints(graph);

        if (endpoints === null) {
            return;
        }

        const style = this.renderState.getDrawStyle();

        this.#drawEdgeLine(ctx, endpoints.fromNode, endpoints.toNode, style);

        if (graph.directed) {
            this.#drawDirectionArrow(ctx, endpoints.fromNode, endpoints.toNode, style);
        }

        if (graph.weighted) {
            this.#drawWeightLabel(ctx, endpoints.fromNode, endpoints.toNode, style);
        }
    }

    /**
     * Resolve edge endpoint nodes from the graph.
     *
     * @param {Graph} graph - Graph instance.
     * @returns {Object|null} Endpoint nodes {fromNode, toNode}, or null when either node is missing.
     */
    #getEndpoints(graph) {
        const fromNode = graph.getNodeById(this.from);
        const toNode = graph.getNodeById(this.to);

        if (!fromNode || !toNode) {
            console.warn(`Edge ${this.id}: missing endpoint(s) from=${this.from} to=${this.to}`);
            return null;
        }

        return {fromNode, toNode};
    }

    /**
     * Draw the main edge line between two nodes, trimmed to node borders.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {Object} style - Active render style.
     */
    #drawEdgeLine(ctx, fromNode, toNode, style) {
        const angle = Geometry.angle(fromNode.x, fromNode.y, toNode.x, toNode.y);

        // Calculate line endpoints at the border of each node circle
        const startPoint = Geometry.pointAlongLine(
            fromNode.x, fromNode.y, toNode.x, toNode.y, fromNode.getRadius()
        );
        const endPoint = Geometry.pointAlongLine(
            toNode.x, toNode.y, fromNode.x, fromNode.y, toNode.getRadius()
        );

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = style.lineWidth;
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw a direction arrow for a directed edge at the target node border.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {Object} style - Active render style.
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
     * Highlighted when the edge is selected or on the final path.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @param {Object} style - Active render style.
     */
    #drawWeightLabel(ctx, fromNode, toNode, style) {
        const midpoint = Geometry.midpoint(fromNode.x, fromNode.y, toNode.x, toNode.y);
        const label = String(this.weight);
        const padding = 2;

        ctx.save();
        ctx.font = RenderState.createFont(Edge.WEIGHT_FONT_SIZE);

        const metrics = ctx.measureText(label);
        const textWidth = metrics.width;
        const textHeight = 12;
        const bgX = midpoint.x - textWidth / 2 - padding;
        const bgY = midpoint.y - textHeight / 2 - padding;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = textHeight + padding * 2;
        const isHighlighted = this.renderState.selected() || this.renderState.path();

        // Background pill
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

        // Label text
        ctx.fillStyle = this.renderState.hovered() ? style.fill : style.stroke;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, midpoint.x, midpoint.y);
        ctx.restore();
    }

    /**
     * Calculate arrowhead geometry for a directed edge.
     * The arrow tip is placed at the target node border.
     *
     * @param {Node} fromNode - Source node.
     * @param {Node} toNode - Target node.
     * @returns {Object} Arrow geometry with tipX, tipY, leftX, leftY, rightX, rightY.
     */
    #getArrowGeometry(fromNode, toNode) {
        const angle = Geometry.angle(fromNode.x, fromNode.y, toNode.x, toNode.y);

        // Arrow tip at the target node border
        const tipPoint = Geometry.pointAlongLine(
            toNode.x, toNode.y, fromNode.x, fromNode.y, toNode.getRadius()
        );

        return {
            tipX: tipPoint.x,
            tipY: tipPoint.y,
            leftX: tipPoint.x - Edge.ARROW_SIZE * Math.cos(angle - Edge.ARROW_ANGLE),
            leftY: tipPoint.y - Edge.ARROW_SIZE * Math.sin(angle - Edge.ARROW_ANGLE),
            rightX: tipPoint.x - Edge.ARROW_SIZE * Math.cos(angle + Edge.ARROW_ANGLE),
            rightY: tipPoint.y - Edge.ARROW_SIZE * Math.sin(angle + Edge.ARROW_ANGLE)
        };
    }

    /**
     * Check if the edge connects two specific nodes (order matters for directed edges).
     *
     * @param {string} nodeId1 - First node id.
     * @param {string} nodeId2 - Second node id.
     * @param {boolean} directed - Whether direction matters.
     * @returns {boolean} True when the edge connects the specified nodes.
     */
    connects(nodeId1, nodeId2, directed = false) {
        if (directed) {
            return this.from === nodeId1 && this.to === nodeId2;
        }
        return (this.from === nodeId1 && this.to === nodeId2) || (this.from === nodeId2 && this.to === nodeId1);
    }

    /**
     * Get the other endpoint of the edge given one endpoint.
     *
     * @param {string} nodeId - One endpoint node id.
     * @returns {string|null} The other endpoint node id, or null if not an endpoint.
     */
    getOtherEndpoint(nodeId) {
        if (this.from === nodeId) return this.to;
        if (this.to === nodeId) return this.from;
        return null;
    }
}

/**
 * Fixed-capacity double-ended queue (deque) used for undo and redo history.
 * Automatically discards the oldest entries when capacity is exceeded.
 * Optimized for push/pop operations with O(1) amortized time complexity.
 */
class Deque {
    /** @type {Object} Internal storage using object for sparse array-like behavior */
    #items = {};

    /** @type {number} Index of the front element */
    #front = 0;

    /** @type {number} Index after the last element */
    #back = 0;

    /** @type {number} Current number of items */
    #size = 0;

    /** @type {number} Maximum capacity */
    #maxSize;

    /** @type {number} Minimum capacity to prevent memory issues */
    static MIN_CAPACITY = 1;

    /** @type {number} Maximum capacity to prevent memory exhaustion */
    static MAX_CAPACITY = 10000;

    /**
     * Create a fixed-capacity deque.
     *
     * @param {number} [maxSize=100] - Maximum number of stored items.
     * @throws {TypeError} When maxSize is not a valid integer.
     */
    constructor(maxSize = 100) {
        const parsed = Number(maxSize);

        if (!Number.isInteger(parsed) || parsed < Deque.MIN_CAPACITY) {
            throw new TypeError(`maxSize must be an integer >= ${Deque.MIN_CAPACITY}`);
        }

        this.#maxSize = Math.min(parsed, Deque.MAX_CAPACITY);
    }

    /**
     * Current stored item count.
     *
     * @returns {number} Number of items.
     */
    get length() {
        return this.#size;
    }

    /**
     * Maximum capacity of the deque.
     *
     * @returns {number} Maximum size.
     */
    get capacity() {
        return this.#maxSize;
    }

    /**
     * Whether the deque is empty.
     *
     * @returns {boolean} True when empty.
     */
    isEmpty() {
        return this.#size === 0;
    }

    /**
     * Whether the deque is full.
     *
     * @returns {boolean} True when at capacity.
     */
    isFull() {
        return this.#size >= this.#maxSize;
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
     * Remove and return the newest item (from the back).
     *
     * @returns {*|undefined} Removed item, or undefined when empty.
     */
    pop() {
        if (this.#size === 0) {
            return undefined;
        }

        this.#back--;
        this.#size--;
        const item = this.#items[this.#back];
        delete this.#items[this.#back];

        // Reset indices if empty to prevent unbounded growth
        if (this.#size === 0) {
            this.#front = 0;
            this.#back = 0;
        }

        return item;
    }

    /**
     * Remove and return the oldest item (from the front).
     *
     * @returns {*|undefined} Removed item, or undefined when empty.
     */
    shift() {
        if (this.#size === 0) {
            return undefined;
        }

        const item = this.#items[this.#front];
        delete this.#items[this.#front];
        this.#front++;
        this.#size--;

        if (this.#size === 0) {
            this.#front = 0;
            this.#back = 0;
        }

        return item;
    }

    /**
     * Peek at the newest item without removing it.
     *
     * @returns {*|undefined} Newest item, or undefined when empty.
     */
    peek() {
        if (this.#size === 0) {
            return undefined;
        }
        return this.#items[this.#back - 1];
    }

    /**
     * Peek at the oldest item without removing it.
     *
     * @returns {*|undefined} Oldest item, or undefined when empty.
     */
    peekFront() {
        if (this.#size === 0) {
            return undefined;
        }
        return this.#items[this.#front];
    }

    /**
     * Get an item at a specific index (0 = oldest).
     *
     * @param {number} index - Zero-based index from the front.
     * @returns {*|undefined} Item at index, or undefined if out of bounds.
     */
    at(index) {
        if (index < 0 || index >= this.#size) {
            return undefined;
        }
        return this.#items[this.#front + index];
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

    /**
     * Get an array copy of all items in order (oldest first).
     *
     * @returns {Array} Array of items.
     */
    toArray() {
        const result = [];
        for (let i = 0; i < this.#size; i++) {
            result.push(this.#items[this.#front + i]);
        }
        return result;
    }

    /**
     * Iterate over items from oldest to newest.
     *
     * @param {Function} callback - Function to call for each item.
     */
    forEach(callback) {
        for (let i = 0; i < this.#size; i++) {
            const item = this.#items[this.#front + i];
            callback(item, i, this);
        }
    }
}

/**
 * Stores graph nodes, edges, indexes, rendering order, and undo/redo history.
 * Owns graph mutation, serialization, import/export, hit testing, and drawing delegation.
 * Provides the central data model for the graph editor application.
 *
 * @extends EventEmitter
 */
class Graph extends EventEmitter {
    /** @type {Deque} Undo history stack */
    #undoStack;

    /** @type {Deque} Redo history stack */
    #redoStack;

    /** @type {boolean} Prevents history recording during import/restore operations */
    #historyLocked = false;

    /** @type {Map<string, string>} Maps connection keys to edge ids for fast edge lookup */
    #connectionMap = new Map();

    /** @type {Map<string, Set<string>>} Maps node ids to sets of connected edge ids */
    #edgesByNode = new Map();

    /**
     * Creates a graph instance.
     *
     * @param {Object} [options={}] - Graph configuration.
     * @param {number} [options.historyLimit=25] - Maximum undo/redo history entries.
     * @throws {TypeError} When historyLimit is invalid.
     */
    constructor(options = {}) {
        super();

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
     * Clamps to a safe range.
     *
     * @param {*} limit - Candidate history limit.
     * @returns {number} Positive integer history limit.
     */
    static #normalizeHistoryLimit(limit) {
        const parsed = Number(limit);
        if (!Number.isInteger(parsed) || parsed < 1) {
            return 25; // Default
        }
        return Math.min(parsed, 1000); // Cap at 1000 for memory safety
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
            throw new Error(`Failed to load sample graph data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Validate sample data structure
        if (!data || typeof data !== "object") {
            throw new Error("Invalid sample graph data format");
        }

        return data;
    }

    /**
     * Creates a unique node id using crypto.randomUUID when available.
     *
     * @returns {string} Node id prefixed with `n:`.
     */
    static createNodeId() {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return `n:${crypto.randomUUID()}`;
        }
        return `n:${Graph.#createFallbackId()}`;
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

        if (fromId === toId) {
            throw new TypeError("Cannot create edge id for self-loop");
        }

        return directed ? `e:${fromId}->${toId}` : Graph.#createUndirectedEdgeId(fromId, toId);
    }

    /**
     * Creates a stable undirected edge id by sorting endpoints.
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
     * Uses timestamp plus random string for uniqueness.
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

        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return result;
    }

    /**
     * Gets the total number of nodes in the graph.
     *
     * @returns {number} Node count.
     */
    get nodeCount() {
        return this.nodeMap.size;
    }

    /**
     * Gets the total number of edges in the graph.
     *
     * @returns {number} Edge count.
     */
    get edgeCount() {
        return this.edgeMap.size;
    }

    /**
     * Gets the number of undo operations available.
     *
     * @returns {number} Undo stack size.
     */
    get undoCount() {
        return this.#undoStack.length;
    }

    /**
     * Gets the number of redo operations available.
     *
     * @returns {number} Redo stack size.
     */
    get redoCount() {
        return this.#redoStack.length;
    }

    /**
     * Creates a normalized connection key for edge lookup.
     * For undirected graphs, sorts the endpoint order for consistency.
     *
     * @param {string|number} from - Source node id.
     * @param {string|number} to - Target node id.
     * @returns {string} Connection key.
     */
    #createConnectionKey(from, to) {
        const fromId = String(from);
        const toId = String(to);

        if (fromId === toId) {
            throw new TypeError("Cannot create connection key for self-loop");
        }

        if (this.directed) {
            return `${fromId}->${toId}`;
        }

        return [fromId, toId].sort().join("--");
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

        // Listen for node changes
        node.on("label-changed", () => this.emit("graph-changed", {type: "node-label", node}));
        node.on("position-changed", () => this.emit("graph-changed", {type: "node-position", node}));
        node.on("radius-changed", () => this.emit("graph-changed", {type: "node-radius", node}));
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

        // Add to both endpoint node's edge sets
        const fromEdges = this.#edgesByNode.get(edge.from);
        const toEdges = this.#edgesByNode.get(edge.to);

        if (fromEdges) fromEdges.add(edge.id);
        if (toEdges) toEdges.add(edge.id);

        // Listen for edge changes
        edge.on("weight-changed", () => this.emit("graph-changed", {type: "edge-weight", edge}));
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
     * Gets all edges connected to a node.
     *
     * @param {string|number} nodeId - Node id.
     * @returns {Edge[]} Array of connected edges.
     */
    getEdgesForNode(nodeId) {
        const id = String(nodeId);
        const edgeIds = this.#edgesByNode.get(id);

        if (!edgeIds) return [];

        const edges = [];
        for (const edgeId of edgeIds) {
            const edge = this.edgeMap.get(edgeId);
            if (edge) edges.push(edge);
        }

        return edges;
    }

    /**
     * Gets the degree (number of connections) of a node.
     *
     * @param {string|number} nodeId - Node id.
     * @returns {number} Node degree, or 0 if node doesn't exist.
     */
    getNodeDegree(nodeId) {
        const edgeIds = this.#edgesByNode.get(String(nodeId));
        return edgeIds ? edgeIds.size : 0;
    }

    /**
     * Gets all neighbor node ids for a given node.
     *
     * @param {string|number} nodeId - Node id.
     * @returns {string[]} Array of neighbor node ids.
     */
    getNeighbors(nodeId) {
        const id = String(nodeId);
        const edges = this.getEdgesForNode(id);
        const neighbors = new Set();

        for (const edge of edges) {
            const other = edge.getOtherEndpoint(id);
            if (other) neighbors.add(other);
        }

        return Array.from(neighbors);
    }

    /**
     * Saves the current graph snapshot to undo history.
     * Clears redo stack on new actions.
     *
     * @returns {void}
     */
    saveHistory() {
        if (!this.#historyLocked) {
            this.#undoStack.push(this.export());
            this.#redoStack.clear();
            this.emit("history-changed", {
                undoCount: this.#undoStack.length,
                redoCount: this.#redoStack.length
            });
        }
    }

    /**
     * Restores the previous graph snapshot.
     *
     * @returns {boolean} True when the graph changed.
     */
    undo() {
        if (this.#undoStack.length === 0) {
            return false;
        }

        const snapshot = this.#undoStack.pop();

        try {
            this.#redoStack.push(this.export());
            this.#restoreSnapshot(snapshot);
            this.emit("history-changed", {
                undoCount: this.#undoStack.length,
                redoCount: this.#redoStack.length
            });
            return true;
        } catch (error) {
            // Restore failed - put snapshot back
            console.error("Undo failed:", error);
            this.#undoStack.push(snapshot);
            this.#redoStack.pop();
            throw error;
        }
    }

    /**
     * Restores the next graph snapshot after undo.
     *
     * @returns {boolean} True when the graph changed.
     */
    redo() {
        if (this.#redoStack.length === 0) {
            return false;
        }

        this.#undoStack.push(this.export());
        this.#restoreSnapshot(this.#redoStack.pop());
        this.emit("history-changed", {
            undoCount: this.#undoStack.length,
            redoCount: this.#redoStack.length
        });

        return true;
    }

    /**
     * Clears undo and redo history.
     *
     * @returns {void}
     */
    clearHistory() {
        this.#undoStack.clear();
        this.#redoStack.clear();
        this.emit("history-changed", {undoCount: 0, redoCount: 0});
    }

    /**
     * Restores a graph snapshot without recording another history entry.
     *
     * @param {Object} snapshot - Exported graph snapshot.
     * @returns {void}
     * @throws {Error} When snapshot is invalid.
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
        // Clean up event listeners on all entities
        for (const node of this.nodeMap.values()) {
            node.renderState.clearTraversal();
        }
        for (const edge of this.edgeMap.values()) {
            edge.renderState.clearTraversal();
        }

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
        this.emit("graph-loaded");
    }

    /**
     * Checks whether any edge has a negative weight.
     *
     * @returns {boolean} True when at least one edge has a negative weight.
     */
    hasNegativeWeight() {
        for (const edge of this.edgeMap.values()) {
            if (edge.weight < 0) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks whether the graph is connected (all nodes reachable from any start).
     *
     * @returns {boolean} True when the graph is connected.
     */
    isConnected() {
        if (this.nodeMap.size <= 1) return true;

        const startNode = this.nodeOrder[0];
        if (!startNode) return false;

        const visited = new Set();
        const queue = [startNode];
        visited.add(startNode);

        while (queue.length > 0) {
            const current = queue.shift();
            const neighbors = this.getNeighbors(current);

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        return visited.size === this.nodeMap.size;
    }

    /**
     * Adds a node to the graph.
     *
     * @param {number} x - Node x-coordinate.
     * @param {number} y - Node y-coordinate.
     * @param {string|number|null} [label=null] - Optional node label.
     * @param {number|null} [radius=null] - Optional node radius.
     * @returns {Node} Created node.
     * @throws {Error} When coordinates are invalid.
     */
    addNode(x, y, label = null, radius = null) {
        TypeAssert.isFiniteNumber(x, "x");
        TypeAssert.isFiniteNumber(y, "y");

        this.saveHistory();

        const nodeLabel = this.#resolveNodeLabel(label);
        const node = new Node(Graph.createNodeId(), nodeLabel, x, y, radius);
        this.#indexNode(node);

        this.emit("node-added", {node});
        return node;
    }

    /**
     * Removes a node and all connected edges.
     *
     * @param {string|number} id - Node id.
     * @returns {boolean} True when the node was removed.
     */
    removeNode(id) {
        const nodeId = String(id);

        if (!this.nodeMap.has(nodeId)) {
            return false;
        }

        this.saveHistory();
        this.#removeEdgesConnectedToNode(nodeId);

        const node = this.nodeMap.get(nodeId);
        this.nodeMap.delete(nodeId);
        this.#edgesByNode.delete(nodeId);
        this.#removeNodeFromOrder(nodeId);

        this.emit("node-removed", {nodeId, node});
        return true;
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
     * Gets all nodes in render order.
     *
     * @returns {Node[]} Array of nodes.
     */
    getNodes() {
        const nodes = [];
        for (const nodeId of this.nodeOrder) {
            const node = this.nodeMap.get(nodeId);
            if (node) nodes.push(node);
        }
        return nodes;
    }

    /**
     * Resolves a node label when creating a new node.
     *
     * @param {string|number|null} label - Candidate label.
     * @returns {string} Resolved label.
     */
    #resolveNodeLabel(label) {
        if (label === null || label === undefined) {
            return String(this.nodeOrder.length);
        }
        const str = String(label).trim();
        return str.length > 0 ? str : String(this.nodeOrder.length);
    }

    /**
     * Removes a node id from render order.
     *
     * @param {string} nodeId - Node id.
     * @returns {void}
     */
    #removeNodeFromOrder(nodeId) {
        this.nodeOrder = this.nodeOrder.filter(id => id !== nodeId);
    }

    /**
     * Removes all edges connected to a node.
     *
     * @param {string} nodeId - Node id.
     * @returns {void}
     */
    #removeEdgesConnectedToNode(nodeId) {
        const edgeIds = this.#edgesByNode.get(nodeId);

        if (edgeIds && edgeIds.size > 0) {
            const idsToRemove = Array.from(edgeIds);

            for (const edgeId of idsToRemove) {
                const edge = this.edgeMap.get(edgeId);
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

        if (!this.#canCreateEdge(fromId, toId)) {
            return null;
        }

        this.saveHistory();

        const edge = new Edge(Graph.createEdgeId(fromId, toId, this.directed), fromId, toId, weight);
        this.#indexEdge(edge);
        this.emit("edge-added", {edge});

        return edge;
    }

    /**
     * Removes an edge by id.
     *
     * @param {string|number} id - Edge id.
     * @returns {boolean} True when the edge was removed.
     */
    removeEdge(id) {
        const edge = this.edgeMap.get(String(id));

        if (!edge) {
            return false;
        }

        this.saveHistory();
        this.#unindexEdge(edge);
        this.#removeEdgeFromOrder(edge.id);
        this.emit("edge-removed", {edgeId: edge.id, edge});

        return true;
    }

    /**
     * Removes an edge between two nodes if it exists.
     *
     * @param {string|number} from - Source node id.
     * @param {string|number} to - Target node id.
     * @returns {boolean} True when an edge was removed.
     */
    removeEdgeBetween(from, to) {
        const connectionKey = this.#createConnectionKey(from, to);
        const edgeId = this.#connectionMap.get(connectionKey);

        if (edgeId) {
            return this.removeEdge(edgeId);
        }
        return false;
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
     * Gets the edge between two nodes if it exists.
     *
     * @param {string|number} from - Source node id.
     * @param {string|number} to - Target node id.
     * @returns {Edge|null} Matching edge, or null.
     */
    getEdgeBetween(from, to) {
        const connectionKey = this.#createConnectionKey(from, to);
        const edgeId = this.#connectionMap.get(connectionKey);
        return edgeId ? this.edgeMap.get(edgeId) : null;
    }

    /**
     * Gets all edges in render order.
     *
     * @returns {Edge[]} Array of edges.
     */
    getEdges() {
        const edges = [];
        for (const edgeId of this.edgeOrder) {
            const edge = this.edgeMap.get(edgeId);
            if (edge) edges.push(edge);
        }
        return edges;
    }

    /**
     * Sets all edge weights to 1.
     *
     * @returns {void}
     */
    normalizeWeights() {
        this.saveHistory();
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
        if (fromId === toId) {
            return false;
        }

        if (!this.nodeMap.has(fromId) || !this.nodeMap.has(toId)) {
            return false;
        }

        if (this.edgeExists(fromId, toId)) {
            return false;
        }

        return true;
    }

    /**
     * Removes an edge id from render order.
     *
     * @param {string} edgeId - Edge id.
     * @returns {void}
     */
    #removeEdgeFromOrder(edgeId) {
        this.edgeOrder = this.edgeOrder.filter(id => id !== edgeId);
    }

    /**
     * Removes stale edge ids from render order.
     *
     * @returns {void}
     */
    #removeMissingEdgesFromOrder() {
        this.edgeOrder = this.edgeOrder.filter(id => this.edgeMap.has(id));
    }

    /**
     * Rebuilds all edge ids and indexes after the directed setting changes.
     * Edge ids encode direction, so toggling directed/undirected mode requires
     * regenerating ids and connection keys for every existing edge.
     *
     * @returns {void}
     */
    rebuildEdgesOnDirectionChange() {
        const edges = this.#exportEdges();

        // Clear existing edge indexes
        this.edgeMap.clear();
        this.edgeOrder.length = 0;
        this.#connectionMap.clear();

        for (const edgeIds of this.#edgesByNode.values()) {
            edgeIds.clear();
        }

        // Rebuild edges with new direction setting
        for (const rawEdge of edges) {
            try {
                const edge = new Edge(
                    Graph.createEdgeId(rawEdge.from, rawEdge.to, this.directed),
                    rawEdge.from,
                    rawEdge.to,
                    rawEdge.weight
                );

                if (this.#canImportEdge(edge)) {
                    this.#indexEdge(edge);
                }
            } catch (error) {
                console.warn(`Failed to rebuild edge ${rawEdge.from}->${rawEdge.to}:`, error);
            }
        }
    }

    /**
     * Compares two neighbor records by edge weight, then by target node label.
     *
     * @param {Object} first - First neighbor record with edgeId and to properties.
     * @param {Object} second - Second neighbor record with edgeId and to properties.
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
     * Searches in reverse render order to prioritize nodes drawn on top.
     *
     * @param {number} x - Point x-coordinate.
     * @param {number} y - Point y-coordinate.
     * @returns {Node|null} Found node, or null.
     */
    findNodeAt(x, y) {
        // Search in reverse order (topmost nodes drawn last)
        for (let i = this.nodeOrder.length - 1; i >= 0; i--) {
            const node = this.nodeMap.get(this.nodeOrder[i]);
            if (node && node.containsPoint(x, y)) {
                return node;
            }
        }
        return null;
    }

    /**
     * Finds all nodes containing a point (for overlapping nodes).
     *
     * @param {number} x - Point x-coordinate.
     * @param {number} y - Point y-coordinate.
     * @returns {Node[]} Array of nodes at the point (topmost first).
     */
    findNodesAt(x, y) {
        const nodes = [];
        for (let i = this.nodeOrder.length - 1; i >= 0; i--) {
            const node = this.nodeMap.get(this.nodeOrder[i]);
            if (node && node.containsPoint(x, y)) {
                nodes.push(node);
            }
        }
        return nodes;
    }

    /**
     * Finds the topmost edge containing a point.
     * Searches in reverse render order to prioritize edges drawn on top.
     *
     * @param {number} x - Point x-coordinate.
     * @param {number} y - Point y-coordinate.
     * @returns {Edge|null} Found edge, or null.
     */
    findEdgeAt(x, y) {
        for (let i = this.edgeOrder.length - 1; i >= 0; i--) {
            const edge = this.edgeMap.get(this.edgeOrder[i]);
            if (edge && edge.containsPoint(x, y, this)) {
                return edge;
            }
        }
        return null;
    }

    /**
     * Finds all edges containing a point (for overlapping edges).
     *
     * @param {number} x - Point x-coordinate.
     * @param {number} y - Point y-coordinate.
     * @returns {Edge[]} Array of edges at the point (topmost first).
     */
    findEdgesAt(x, y) {
        const edges = [];
        for (let i = this.edgeOrder.length - 1; i >= 0; i--) {
            const edge = this.edgeMap.get(this.edgeOrder[i]);
            if (edge && edge.containsPoint(x, y, this)) {
                edges.push(edge);
            }
        }
        return edges;
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
     * Compares two neighbor records by their target node labels.
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
        for (const edgeId of this.edgeOrder) {
            const edge = this.edgeMap.get(edgeId);
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
        for (const nodeId of this.nodeOrder) {
            const node = this.nodeMap.get(nodeId);
            if (node) {
                node.draw(ctx, controller.getTraversalDistance(nodeId));
            }
        }
    }

    /**
     * Serializes the graph to a plain object.
     *
     * @returns {Object} Serialized graph data with version, directed, weighted, nodes, and edges.
     */
    export() {
        return {
            version: 1,
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
            throw new Error("Invalid graph data: expected an object");
        }

        if (!this.#historyLocked) {
            this.saveHistory();
        }

        this.reset();

        // Handle version differences in the future
        const version = data.version || 1;

        this.directed = Boolean(data.directed);
        this.weighted = Boolean(data.weighted);
        this.#importNodes(data.nodes);
        this.#importEdges(data.edges);

        this.emit("graph-imported", {nodeCount: this.nodeCount, edgeCount: this.edgeCount});
    }

    /**
     * Serializes nodes in render order.
     *
     * @returns {Object[]} Serialized nodes.
     */
    #exportNodes() {
        const nodes = [];

        for (const nodeId of this.nodeOrder) {
            const node = this.nodeMap.get(nodeId);
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

        for (const edgeId of this.edgeOrder) {
            const edge = this.edgeMap.get(edgeId);
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
        if (!Array.isArray(nodes)) {
            return;
        }

        for (const raw of nodes) {
            const node = this.#createValidNode(raw);
            if (node && !this.nodeMap.has(node.id)) {
                this.#indexNode(node);
            }
        }
    }

    /**
     * Creates a Node instance from serialized data.
     * Validates all required fields.
     *
     * @param {Object} raw - Raw node data.
     * @returns {Node|null} Valid node, or null if invalid.
     */
    #createValidNode(raw) {
        if (!raw || typeof raw !== "object") {
            return null;
        }

        const id = String(raw.id || "");
        if (!id) {
            console.warn("Skipping node with empty id");
            return null;
        }

        const label = raw.label === undefined || raw.label === null ? id : String(raw.label);
        const x = Number(raw.x);
        const y = Number(raw.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            console.warn(`Skipping node ${id}: invalid coordinates (${raw.x}, ${raw.y})`);
            return null;
        }

        try {
            return new Node(id, label, x, y, raw.radius);
        } catch (error) {
            console.warn(`Skipping node ${id}: ${error.message}`);
            return null;
        }
    }

    /**
     * Imports valid serialized edges.
     *
     * @param {Object[]} edges - Serialized edges.
     * @returns {void}
     */
    #importEdges(edges) {
        if (!Array.isArray(edges)) {
            return;
        }

        for (const raw of edges) {
            const edge = this.#createValidEdge(raw);
            if (edge && this.#canImportEdge(edge)) {
                this.#indexEdge(edge);
            }
        }
    }

    /**
     * Creates an Edge instance from serialized data.
     * Validates all required fields.
     *
     * @param {Object} raw - Raw edge data.
     * @returns {Edge|null} Valid edge, or null if invalid.
     */
    #createValidEdge(raw) {
        if (!raw || typeof raw !== "object") {
            return null;
        }

        const from = String(raw.from || "");
        const to = String(raw.to || "");

        if (!from || !to) {
            console.warn("Skipping edge with empty endpoints");
            return null;
        }

        if (from === to) {
            console.warn(`Skipping self-loop edge ${from} -> ${to}`);
            return null;
        }

        try {
            return new Edge(
                Graph.createEdgeId(from, to, this.directed), from, to, raw.weight);
        } catch (error) {
            console.warn(`Skipping edge ${from}->${to}: ${error.message}`);
            return null;
        }
    }

    /**
     * Checks whether an imported edge can be indexed.
     *
     * @param {Edge} edge - Edge to validate.
     * @returns {boolean} True when the edge can be imported.
     */
    #canImportEdge(edge) {
        // Check that both endpoints exist
        if (!this.nodeMap.has(edge.from) || !this.nodeMap.has(edge.to)) {
            console.warn(`Skipping edge ${edge.id}: missing endpoint(s)`);
            return false;
        }

        // Check for duplicate edge
        if (this.edgeMap.has(edge.id)) {
            console.warn(`Skipping duplicate edge ${edge.id}`);
            return false;
        }

        // Check for duplicate connection
        if (this.edgeExists(edge.from, edge.to)) {
            console.warn(`Skipping duplicate connection ${edge.from} -> ${edge.to}`);
            return false;
        }

        return true;
    }

    /**
     * Validates the graph structure and returns any issues found.
     *
     * @returns {Object} Validation result with valid flag and issues array.
     */
    validate() {
        const issues = [];

        // Check for nodes with no connections (isolated nodes)
        for (const nodeId of this.nodeOrder) {
            const degree = this.getNodeDegree(nodeId);
            if (degree === 0) {
                issues.push({
                    type: "warning",
                    message: `Node ${nodeId} is isolated (no edges)`,
                    nodeId
                });
            }
        }

        // Check for edges referencing missing nodes (shouldn't happen, but verify)
        for (const edge of this.edgeMap.values()) {
            if (!this.nodeMap.has(edge.from)) {
                issues.push({
                    type: "error",
                    message: `Edge ${edge.id} references missing source node ${edge.from}`,
                    edgeId: edge.id
                });
            }
            if (!this.nodeMap.has(edge.to)) {
                issues.push({
                    type: "error",
                    message: `Edge ${edge.id} references missing target node ${edge.to}`,
                    edgeId: edge.id
                });
            }
        }

        // Check for inconsistencies in undirected graphs
        if (!this.directed) {
            const checkedPairs = new Set();
            for (const edge of this.edgeMap.values()) {
                const pairKey = [edge.from, edge.to].sort().join("--");
                if (checkedPairs.has(pairKey)) {
                    issues.push({
                        type: "warning",
                        message: `Duplicate undirected edge between ${edge.from} and ${edge.to}`,
                        edgeId: edge.id
                    });
                }
                checkedPairs.add(pairKey);
            }
        }

        // Check for negative cycles (only for directed weighted graphs)
        if (this.directed && this.weighted && this.hasNegativeWeight()) {
            issues.push({
                type: "warning",
                message: "Graph contains negative edge weights which may cause issues with some algorithms"
            });
        }

        return {
            valid: issues.filter(i => i.type === "error").length === 0,
            issues
        };
    }

    /**
     * Creates a deep clone of the graph.
     *
     * @returns {Graph} New graph instance with the same data.
     */
    clone() {
        const clone = new Graph();
        clone.import(this.export());
        return clone;
    }

    /**
     * Computes basic graph statistics.
     *
     * @returns {Object} Graph statistics.
     */
    getStatistics() {
        const degrees = [];
        for (const nodeId of this.nodeOrder) {
            degrees.push(this.getNodeDegree(nodeId));
        }

        const totalDegree = degrees.reduce((sum, d) => sum + d, 0);
        const avgDegree = degrees.length > 0 ? totalDegree / degrees.length : 0;
        const maxDegree = degrees.length > 0 ? Math.max(...degrees) : 0;
        const minDegree = degrees.length > 0 ? Math.min(...degrees) : 0;

        let totalWeight = 0;
        let minWeight = Infinity;
        let maxWeight = -Infinity;

        for (const edge of this.edgeMap.values()) {
            totalWeight += edge.weight;
            minWeight = Math.min(minWeight, edge.weight);
            maxWeight = Math.max(maxWeight, edge.weight);
        }

        if (!isFinite(minWeight)) minWeight = 0;
        if (!isFinite(maxWeight)) maxWeight = 0;

        return {
            nodeCount: this.nodeCount,
            edgeCount: this.edgeCount,
            directed: this.directed,
            weighted: this.weighted,
            connected: this.isConnected(),
            hasNegativeWeights: this.hasNegativeWeight(),
            avgDegree: Math.round(avgDegree * 100) / 100,
            maxDegree,
            minDegree,
            totalWeight: this.weighted ? totalWeight : null,
            avgWeight: this.weighted && this.edgeCount > 0 ? Math.round((totalWeight / this.edgeCount) * 100) / 100 : null,
            minWeight: this.weighted && isFinite(minWeight) ? minWeight : null,
            maxWeight: this.weighted && isFinite(maxWeight) ? maxWeight : null,
            density: this.nodeCount > 1 ? Math.round((2 * this.edgeCount / (this.nodeCount * (this.nodeCount - 1))) * 1000) / 1000 : 0
        };
    }
}

// ---------------------------------------------------------------------------------

/**
 * Formats traversal results and applies the final path / tree visual state.
 * Handles output formatting for all supported traversal algorithms.
 */
class TraversalResult {
    /** @type {string} Arrow character used in path display */
    static ARROW = " → ";

    /**
     * Mark the final path or tree for a completed traversal plan.
     *
     * @param {Object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     */
    static markFinalPath(plan, graph) {
        if (!plan || !graph) return;

        if (plan.algorithm === "Prim") {
            TraversalResult.#markTreePath(plan.parent, graph);
        } else if (plan.endId !== null) {
            TraversalResult.#markTargetPath(plan.parent, plan.startId, plan.endId, graph);
        }
    }

    /**
     * Format the final traversal output as HTML.
     *
     * @param {Object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @returns {string} Traversal output HTML.
     */
    static formatOutput(plan, graph) {
        if (!plan || !graph) {
            return "No traversal results.";
        }

        switch (plan.algorithm) {
            case "Dijkstra":
                return TraversalResult.#formatShortestPathOutput(plan, graph, "Dijkstra");
            case "Bellman-Ford":
                return TraversalResult.#formatBellmanFordOutput(plan, graph);
            case "Prim":
                return TraversalResult.#formatPrimOutput(plan, graph);
            case "BFS":
                return `${plan.name} order:<hr>${TraversalResult.#formatNodeOrder(plan.order, graph)}`;
            case "DFS":
                return `${plan.name} order:<hr>${TraversalResult.#formatNodeOrder(plan.order, graph)}`;
            default:
                return `${plan.name} order:<hr>${TraversalResult.#formatNodeOrder(plan.order, graph)}`;
        }
    }

    /**
     * Mark every parent edge and endpoint node in a tree (for MST visualization).
     *
     * @param {Map<string, Object>} parent - Parent map.
     * @param {Graph} graph - Graph instance.
     */
    static #markTreePath(parent, graph) {
        if (!parent) return;

        parent.forEach((step, nodeId) => {
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
     * Marks the final path from start to the target node.
     * Traces back through parent pointers from target to start.
     *
     * @param {Map<string, Object>} parent - Parent map.
     * @param {string} startId - Start node id.
     * @param {string} endId - Target node id.
     * @param {Graph} graph - Graph instance.
     */
    static #markTargetPath(parent, startId, endId, graph) {
        if (!parent || !parent.has(endId)) {
            // No path to target
            return;
        }

        let cursor = endId;
        const visited = new Set(); // Prevent infinite loops

        while (cursor !== startId && parent.has(cursor) && !visited.has(cursor)) {
            visited.add(cursor);
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
     * @param {Map<string, Object>} parent - Parent map.
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
     * @param {Object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @param {string} name - Algorithm display name.
     * @returns {string} Output HTML.
     */
    static #formatShortestPathOutput(plan, graph, name) {
        if (plan.endId === null) {
            return `${name} explored:<hr>${TraversalResult.#formatNodeOrder(plan.order, graph)}`;
        }
        return TraversalResult.#formatTargetDistanceOutput(plan, graph, name);
    }

    /**
     * Format shortest-path target output with distance information.
     *
     * @param {Object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @param {string} name - Algorithm display name.
     * @returns {string} Output HTML.
     */
    static #formatTargetDistanceOutput(plan, graph, name) {
        const target = graph.getNodeById(plan.endId);
        const distance = plan.distances ? plan.distances.get(plan.endId) : undefined;
        const label = target ? target.label : String(plan.endId);

        let output = `${name} explored:<hr>${TraversalResult.#formatNodeOrder(plan.order, graph)}<hr>`;

        if (distance !== undefined && Number.isFinite(distance)) {
            output += `<hr>Shortest distance to ${label}: ${distance}`;

            // Add path reconstruction
            const path = TraversalResult.#reconstructPath(plan.parent, plan.startId, plan.endId, graph);
            if (path) {
                output += `<hr>Path: ${path}`;
            }
        } else {
            output += `<hr>No path to ${label}.`;
        }

        return output;
    }

    /**
     * Reconstruct the path from start to target as a string.
     *
     * @param {Map<string, Object>} parent - Parent map.
     * @param {string} startId - Start node id.
     * @param {string} endId - Target node id.
     * @param {Graph} graph - Graph instance.
     * @returns {string|null} Path string, or null if no path exists.
     */
    static #reconstructPath(parent, startId, endId, graph) {
        if (!parent || !parent.has(endId) && endId !== startId) {
            return null;
        }

        const path = [];
        let cursor = endId;
        const visited = new Set();

        while (cursor !== startId && parent.has(cursor) && !visited.has(cursor)) {
            visited.add(cursor);
            const node = graph.getNodeById(cursor);
            path.unshift(node ? node.label : cursor);
            cursor = parent.get(cursor).prev;
        }

        if (cursor === startId || endId === startId) {
            const startNode = graph.getNodeById(startId);
            path.unshift(startNode ? startNode.label : startId);
        }

        return path.join(TraversalResult.ARROW);
    }

    /**
     * Format Bellman-Ford output with negative cycle detection.
     *
     * @param {Object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @returns {string} Output HTML.
     */
    static #formatBellmanFordOutput(plan, graph) {
        if (plan.metadata && plan.metadata.negativeCycle) {
            return "⚠ Negative cycle detected. Shortest paths are undefined.";
        }
        return TraversalResult.#formatShortestPathOutput(plan, graph, "Bellman-Ford");
    }

    /**
     * Format Prim MST output with tree weight.
     *
     * @param {Object} plan - Traversal plan.
     * @param {Graph} graph - Graph instance.
     * @returns {string} Output HTML.
     */
    static #formatPrimOutput(plan, graph) {
        const status = plan.metadata && plan.metadata.connected
            ? "MST Complete"
            : "MST Partial (graph not connected)";
        const weight = plan.metadata ? plan.metadata.totalWeight : 0;

        return `${status}, Order:<hr><p>${TraversalResult.#formatNodeOrder(plan.order, graph)}</p><hr><hr>Total Weight: ${weight}`;
    }

    /**
     * Format node ids as display labels joined by arrows.
     *
     * @param {string[]} order - Node id order.
     * @param {Graph} graph - Graph instance.
     * @returns {string} Display order string.
     */
    static #formatNodeOrder(order, graph) {
        if (!order || order.length === 0) {
            return "(empty)";
        }

        return order.map(nodeId => {
            const node = graph.getNodeById(nodeId);
            return node ? node.label : `(${nodeId})`;
        }).join(TraversalResult.ARROW);
    }
}

/**
 * Binary heap-based minimum priority queue.
 * Used by Dijkstra and Prim algorithms for efficient minimum selection.
 *
 * Time complexity:
 * - insert/update: O(log n)
 * - extractMin: O(log n)
 * - decreaseKey: O(log n) with position tracking
 *
 * Space complexity: O(n)
 */
class MinPriorityQueue {
    /** @type {Array<{nodeId: string, priority: number}>} Internal heap array */
    #heap = [];

    /** @type {Map<string, number>} Tracks positions for fast updates */
    #indexMap = new Map();

    /**
     * Number of items in the queue.
     *
     * @returns {number} Queue size.
     */
    get size() {
        return this.#heap.length;
    }

    /**
     * Whether the queue is empty.
     *
     * @returns {boolean} True when empty.
     */
    isEmpty() {
        return this.#heap.length === 0;
    }

    /**
     * Insert a new node or update its priority if it already exists.
     *
     * @param {string} nodeId - Node identifier.
     * @param {number} priority - Priority value (lower is better).
     */
    insert(nodeId, priority) {
        if (this.#indexMap.has(nodeId)) {
            this.decreaseKey(nodeId, priority);
        } else {
            this.#heap.push({nodeId, priority});
            const index = this.#heap.length - 1;
            this.#indexMap.set(nodeId, index);
            this.#bubbleUp(index);
        }
    }

    /**
     * Remove and return the minimum priority node.
     *
     * @returns {Object|null} Minimum priority node {nodeId, priority}, or null when empty.
     */
    extractMin() {
        if (this.#heap.length === 0) return null;

        if (this.#heap.length === 1) {
            const min = this.#heap.pop();
            this.#indexMap.delete(min.nodeId);
            return min;
        }

        const min = this.#heap[0];
        this.#indexMap.delete(min.nodeId);

        const last = this.#heap.pop();
        this.#heap[0] = last;
        this.#indexMap.set(last.nodeId, 0);

        this.#bubbleDown(0);
        return min;
    }

    /**
     * Decrease the priority of an existing node.
     *
     * @param {string} nodeId - Node to update.
     * @param {number} newPriority - New priority (must be lower than the current priority).
     * @returns {boolean} True when the priority was decreased.
     */
    decreaseKey(nodeId, newPriority) {
        const index = this.#indexMap.get(nodeId);
        if (index === undefined) return false;

        const currentPriority = this.#heap[index].priority;
        if (newPriority < currentPriority) {
            this.#heap[index].priority = newPriority;
            this.#bubbleUp(index);
            return true;
        }
        return false;
    }

    /**
     * Check if a node exists in the queue.
     *
     * @param {string} nodeId - Node to check.
     * @returns {boolean} True when node exists.
     */
    contains(nodeId) {
        return this.#indexMap.has(nodeId);
    }

    /**
     * Get the current priority of a node in the queue.
     *
     * @param {string} nodeId - Node to query.
     * @returns {number|undefined} Current priority, or undefined if not in queue.
     */
    getPriority(nodeId) {
        const index = this.#indexMap.get(nodeId);
        if (index === undefined) return undefined;
        return this.#heap[index].priority;
    }

    /**
     * Peek at the minimum priority node without removing it.
     *
     * @returns {Object|null} Minimum priority node, or null when empty.
     */
    peek() {
        if (this.#heap.length === 0) return null;
        return {...this.#heap[0]};
    }

    /**
     * Remove all items from the queue.
     */
    clear() {
        this.#heap = [];
        this.#indexMap.clear();
    }

    /**
     * Get all items in the queue as an array (not in priority order).
     *
     * @returns {Array<{nodeId: string, priority: number}>} Queue items.
     */
    toArray() {
        return [...this.#heap];
    }

    /**
     * Bubbles an element up to maintain heap property.
     *
     * @param {number} index - Index of element to bubble up.
     */
    #bubbleUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);

            if (this.#heap[index].priority >= this.#heap[parentIndex].priority) {
                break;
            }

            this.#swap(index, parentIndex);
            index = parentIndex;
        }
    }

    /**
     * Bubbles an element down to maintain heap property.
     *
     * @param {number} index - Index of element to bubble down.
     */
    #bubbleDown(index) {
        const length = this.#heap.length;

        while (true) {
            let smallest = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;

            if (leftChild < length &&
                this.#heap[leftChild].priority < this.#heap[smallest].priority) {
                smallest = leftChild;
            }

            if (rightChild < length &&
                this.#heap[rightChild].priority < this.#heap[smallest].priority) {
                smallest = rightChild;
            }

            if (smallest === index) break;

            this.#swap(index, smallest);
            index = smallest;
        }
    }

    /**
     * Swap two elements in the heap and update the index map.
     *
     * @param {number} i - First index.
     * @param {number} j - Second index.
     */
    #swap(i, j) {
        // Update index map
        this.#indexMap.set(this.#heap[i].nodeId, j);
        this.#indexMap.set(this.#heap[j].nodeId, i);

        // Swap in heap array
        [this.#heap[i], this.#heap[j]] = [this.#heap[j], this.#heap[i]];
    }
}

/**
 * Base class for graph traversal planners.
 *
 * Owns common traversal setup, adjacency list building, and animation step recording.
 * Subclasses implement the template methods to define specific algorithm behavior.
 * Uses a template method pattern where `_execute()` handles both synchronous and
 * asynchronous execution, delegating algorithm-specific logic to hook methods.
 */
class Traversal {
    /** @type {Graph} Reference to the graph being traversed */
    graph;

    /** @type {string} Start node id */
    startId;

    /** @type {string|null} Optional target node id */
    endId;

    /** @type {Map<string, Array<Object>>} Adjacency list for traversal */
    adjacency;

    /** @type {Object} Mutable traversal state (parent, steps, order) */
    state;

    /**
     * Create a traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} [endId=null] - Optional target node id.
     * @throws {Error} When start node does not exist.
     */
    constructor(graph, startId, endId = null) {
        if (!graph) {
            throw new Error("Graph is required for traversal");
        }

        const startNodeId = String(startId);
        if (!graph.getNodeById(startNodeId)) {
            throw new Error(`Start node ${startNodeId} does not exist in the graph`);
        }

        this.graph = graph;
        this.startId = startNodeId;
        this.endId = endId !== null && endId !== undefined ? String(endId) : null;

        // Validate end node if specified
        if (this.endId !== null && !graph.getNodeById(this.endId)) {
            console.warn(`End node ${this.endId} does not exist in the graph`);
            this.endId = null;
        }

        this.adjacency = this.buildAdjacencyList();
        this.state = this.createSearchState();
    }

    /**
     * Create a traversal instance by algorithm id.
     *
     * @param {string} algorithm - Algorithm id (BFS, DFS, Dijkstra, Prim, Bellman-Ford).
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} [endId=null] - Optional target node id.
     * @returns {Traversal} Traversal instance.
     * @throws {Error} When algorithm id is unknown.
     */
    static create(algorithm, graph, startId, endId = null) {
        switch (algorithm) {
            case "BFS":
                return new BreadthFirst(graph, startId, endId);
            case "DFS":
                return new DepthFirst(graph, startId, endId);
            case "Dijkstra":
                return new Dijkstra(graph, startId, endId);
            case "Prim":
                return new Prim(graph, startId, endId);
            case "Bellman-Ford":
                return new BellmanFord(graph, startId, endId);
            default:
                throw new Error(`Unknown traversal algorithm: ${algorithm}`);
        }
    }

    /**
     * Validate whether this traversal can run on the current graph.
     * Override in subclasses for algorithm-specific validation.
     *
     * @returns {string|null} Error message, or null when valid.
     */
    validate() {
        if (this.graph.nodeCount === 0) {
            return "Graph has no nodes.";
        }
        return null;
    }

    /**
     * Create the traversal plan synchronously.
     * Delegates to the shared `_execute()` method.
     *
     * @returns {Object} Traversal plan.
     */
    createPlan() {
        return this._execute(null);
    }

    /**
     * Create the traversal plan asynchronously with periodic yielding.
     * Delegates to the shared `_execute()` method with async options.
     *
     * @param {Object} options - Async options.
     * @param {Function} options.yieldFn - Function to call to yield to the browser.
     * @param {number} [options.yieldEvery=50] - Yield after processing this many items.
     * @returns {Promise<Object>} Traversal plan.
     */
    async createPlanAsync(options) {
        if (!options || typeof options.yieldFn !== "function") {
            throw new TypeError("Async options must include a yieldFn function");
        }
        return this._execute(options);
    }

    /**
     * Execute the traversal algorithm with optional async yielding.
     *
     * Template method that orchestrates the traversal lifecycle by calling
     * the hook methods implemented by subclasses. Supports both synchronous
     * and asynchronous execution modes.
     *
     * @param {Object|null} options - Async options, or null for synchronous execution.
     * @param {Function} [options.yieldFn] - Function to call to yield to the browser.
     * @param {number} [options.yieldEvery=50] - Yield after processing this many items.
     * @returns {Object|Promise<Object>} Traversal plan.
     */
    async _execute(options = null) {
        const isAsync = options !== null;
        const yieldEvery = isAsync ? (options.yieldEvery || 50) : Infinity;
        let processed = 0;

        this._initializeExecution();

        while (!this._isComplete()) {
            this._executeStep();

            processed++;
            if (isAsync && processed % yieldEvery === 0) {
                await options.yieldFn();
            }
        }

        return this._buildResult();
    }

    /**
     * Initialize algorithm-specific data structures before traversal begins.
     * Override in subclasses to set up queues, stacks, distance tables, etc.
     *
     * @abstract
     */
    _initializeExecution() {
        throw new Error("Subclasses must implement _initializeExecution()");
    }

    /**
     * Execute one step of the traversal algorithm.
     * Override in subclasses with algorithm-specific logic.
     *
     * @abstract
     */
    _executeStep() {
        throw new Error("Subclasses must implement _executeStep()");
    }

    /**
     * Check whether the traversal is complete.
     * Override in subclasses with algorithm-specific termination logic.
     *
     * @returns {boolean} True when traversal is finished.
     *
     * @abstract
     */
    _isComplete() {
        throw new Error("Subclasses must implement _isComplete()");
    }

    /**
     * Build the final traversal plan result.
     * Override in subclasses to include algorithm-specific metadata.
     *
     * @returns {Object} Traversal plan.
     *
     * @abstract
     */
    _buildResult() {
        throw new Error("Subclasses must implement _buildResult()");
    }

    /**
     * Creates a mutable traversal state for tracking parent pointers,
     * animation steps, and node order.
     *
     * @returns {Object} Traversal state.
     */
    createSearchState() {
        return {
            parent: new Map(),
            steps: [],
            order: []
        };
    }

    /**
     * Create the final traversal plan result object.
     *
     * @param {string} name - Human-readable algorithm name.
     * @param {string} algorithm - Algorithm id.
     * @param {Map<string, number>|null} [distances=null] - Optional distance table.
     * @param {Object} [metadata={}] - Optional algorithm metadata.
     * @returns {Object} Traversal plan.
     */
    createPlanResult(name, algorithm, distances = null, metadata = {}) {
        return {
            name,
            algorithm,
            startId: this.startId,
            endId: this.endId,
            steps: this.state.steps,
            order: this.state.order,
            parent: this.state.parent,
            distances,
            metadata,
            index: 0
        };
    }

    /**
     * Build a graph adjacency list from the current graph state.
     *
     * Creates a map from node id to a sorted array of neighbor descriptors.
     * Each descriptor includes the target node id, edge id, and traversal cost.
     *
     * @returns {Map<string, Array<Object>>} Adjacency list.
     */
    buildAdjacencyList() {
        const adjacency = new Map();

        // Initialize empty arrays for all nodes
        for (const nodeId of this.graph.nodeOrder) {
            adjacency.set(nodeId, []);
        }

        // Add edges to adjacency list
        for (const edgeId of this.graph.edgeOrder) {
            const edge = this.graph.edgeMap.get(edgeId);

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
     * Sort every adjacency neighbor list using the graph's comparison function.
     *
     * @param {Map<string, Array<Object>>} adjacency - Adjacency list to sort.
     */
    #sortAdjacencyList(adjacency) {
        const compareFn = this.graph.compareNeighbors.bind(this.graph);

        adjacency.forEach(neighbors => {
            neighbors.sort(compareFn);
        });
    }

    /**
     * Add one adjacency neighbor to the adjacency list.
     *
     * @param {Map<string, Array<Object>>} adjacency - Adjacency list.
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {number} weight - Raw edge weight.
     */
    addNeighbor(adjacency, fromId, toId, edgeId, weight) {
        const cost = this.getEdgeCost(weight);

        adjacency.get(fromId).push({
            from: fromId,
            to: toId,
            edgeId,
            weight: cost
        });
    }

    /**
     * Record how a node was reached during traversal.
     *
     * @param {Map<string, Object>} parent - Parent map.
     * @param {string} nodeId - Reached node id.
     * @param {string} previousId - Previous node id.
     * @param {string|null} edgeId - Edge used to reach the node.
     */
    setPredecessor(parent, nodeId, previousId, edgeId) {
        parent.set(nodeId, {
            prev: previousId,
            edgeId
        });
    }

    /**
     * Record a node discovery animation step.
     *
     * @param {string} fromId - Source node id.
     * @param {string} toId - Discovered node id.
     * @param {string|null} [edgeId=null] - Edge used for discovery.
     * @param {Map<string, number>|null} [distances=null] - Optional distance snapshot.
     */
    recordDiscoverStep(fromId, toId, edgeId = null, distances = null) {
        this.state.order.push(toId);
        this.state.steps.push(this.#createAnimationStep("discover", fromId, toId, edgeId, distances));
    }

    /**
     * Record a node exploration animation step.
     *
     * @param {string} nodeId - Exploring node id.
     * @param {string|null} [edgeId=null] - Incoming edge id.
     * @param {Map<string, number>|null} [distances=null] - Optional distance snapshot.
     */
    recordExploreStep(nodeId, edgeId = null, distances = null) {
        this.state.steps.push(this.#createAnimationStep("explore", null, nodeId, edgeId, distances));
    }

    /**
     * Record a node exploration completion animation step.
     *
     * @param {string} nodeId - Finished node id.
     * @param {string|null} [edgeId=null] - Incoming edge id.
     * @param {Map<string, number>|null} [distances=null] - Optional distance snapshot.
     */
    recordFinishStep(nodeId, edgeId = null, distances = null) {
        this.state.steps.push(this.#createAnimationStep("finish", null, nodeId, edgeId, distances));
    }

    /**
     * Resolve traversal edge cost based on graph weight mode.
     * In weighted graphs, uses the edge weight directly.
     * In unweighted graphs, all edges have cost 1.
     *
     * @param {number} weight - Raw edge weight.
     * @returns {number} Traversal cost.
     */
    getEdgeCost(weight) {
        return this.graph.weighted ? Number(weight) : 1;
    }

    /**
     * Create one animation step descriptor.
     *
     * @param {string} type - Step type (discover, explore, finish).
     * @param {string|null} fromId - Source node id.
     * @param {string} nodeId - Current node id.
     * @param {string|null} edgeId - Edge id.
     * @param {Map<string, number>|null} distances - Optional distance snapshot.
     * @returns {Object} Animation step descriptor.
     */
    #createAnimationStep(type, fromId, nodeId, edgeId, distances) {
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
     * Get statistics about the traversal plan.
     *
     * @returns {Object} Traversal statistics.
     */
    getStatistics() {
        return {
            stepsCount: this.state.steps.length,
            nodesVisited: this.state.order.length,
            startId: this.startId,
            endId: this.endId,
            graphNodeCount: this.graph.nodeCount,
            graphEdgeCount: this.graph.edgeCount
        };
    }
}

/**
 * Builds Breadth-First Search traversal plans.
 *
 * BFS explores nodes level by level using a FIFO queue, guaranteeing the shortest paths in unweighted graphs.
 * The algorithm visits all neighbors of a node before moving to the next level.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @extends Traversal
 */
class BreadthFirst extends Traversal {

    /**
     * Create a Breadth-First Search traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} [endId=null] - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
        /** @type {Set<string>} Set of discovered node ids */
        this.discovered = new Set();
        /** @type {Array<{nodeId: string, incomingEdgeId: string|null}>} BFS queue */
        this.queue = [];
        /** @type {boolean} Whether the target has been found */
        this.targetFound = false;
    }

    /**
     * Validate BFS prerequisites.
     *
     * @returns {string|null} Error message, or null when valid.
     */
    validate() {
        return super.validate();
    }

    /**
     * Initialize BFS by discovering the start node.
     * @override
     */
    _initializeExecution() {
        this.#discover(this.startId, this.startId, null);
    }

    /**
     * Execute one step: explore the next node in the queue.
     * @override
     */
    _executeStep() {
        this.#exploreNextInQueue();
    }

    /**
     * Check if BFS is complete.
     *
     * @returns {boolean} True when queue is empty or target is found.
     * @override
     */
    _isComplete() {
        return this.queue.length === 0 || this.targetFound;
    }

    /**
     * Build the BFS traversal plan result.
     *
     * @returns {Object} BFS traversal plan.
     * @override
     */
    _buildResult() {
        return super.createPlanResult("Breadth-First Search", "BFS");
    }

    /**
     * Discover a node and add it to the exploration queue.
     *
     * @param {string} nodeId - Discovered node id.
     * @param {string} fromId - Source node id.
     * @param {string|null} edgeId - Edge used to reach the node.
     */
    #discover(nodeId, fromId, edgeId) {
        this.discovered.add(nodeId);
        super.recordDiscoverStep(fromId, nodeId, edgeId);
        this.queue.push({
            nodeId,
            incomingEdgeId: edgeId
        });
    }

    /**
     * Explore the node at the front of the queue.
     * Records exploration steps and discovers all unvisited neighbors.
     */
    #exploreNextInQueue() {
        const item = this.queue.shift();

        super.recordExploreStep(item.nodeId, item.incomingEdgeId);

        // Check if target reached
        if (this.endId !== null && item.nodeId === this.endId) {
            this.targetFound = true;
            return;
        }

        // Explore all neighbors
        const neighbors = this.adjacency.get(item.nodeId) || [];

        for (let i = 0; i < neighbors.length && !this.targetFound; i++) {
            const neighbor = neighbors[i];

            if (!this.discovered.has(neighbor.to)) {
                super.setPredecessor(this.state.parent, neighbor.to, item.nodeId, neighbor.edgeId);
                this.#discover(neighbor.to, item.nodeId, neighbor.edgeId);
            }
        }

        super.recordFinishStep(item.nodeId, item.incomingEdgeId);
    }
}

/**
 * Builds Depth-First Search traversal plans.
 *
 * DFS explores as far as possible along each branch before backtracking.
 * Uses an explicit stack to avoid recursion depth limits.
 * Stack frames track neighbor iteration progress to enable efficient backtracking.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * @extends Traversal
 */
class DepthFirst extends Traversal {

    /**
     * Create a Depth-First Search traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} [endId=null] - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
        /** @type {Set<string>} Set of discovered node ids */
        this.discovered = new Set();
        /** @type {Array<Object>} DFS stack with frame objects */
        this.stack = [];
        /** @type {boolean} Whether the target has been found */
        this.targetFound = false;
    }

    /**
     * Validate DFS prerequisites.
     *
     * @returns {string|null} Error message, or null when valid.
     */
    validate() {
        return super.validate();
    }

    /**
     * Initialize DFS by discovering and pushing the start node.
     * @override
     */
    _initializeExecution() {
        this.discovered.add(this.startId);
        super.recordDiscoverStep(this.startId, this.startId, null);

        this.stack.push({
            nodeId: this.startId,
            fromId: this.startId,
            edgeId: null,
            neighborIndex: 0
        });
    }

    /**
     * Execute one step: process the top stack frame.
     *
     * If the current node has unvisited neighbors, pushes the first one.
     * If all neighbors are visited, pops the frame and backtracks.
     * @override
     */
    _executeStep() {
        if (this.stack.length === 0) return;

        const frame = this.stack[this.stack.length - 1];

        // First time visiting this frame - record exploration
        if (frame.neighborIndex === 0) {
            super.recordExploreStep(frame.nodeId, frame.edgeId);

            if (this.endId !== null && frame.nodeId === this.endId) {
                this.targetFound = true;
                return;
            }
        }

        const neighbors = this.adjacency.get(frame.nodeId) || [];
        let pushedNewNode = false;

        // Try to find the next undiscovered neighbor
        for (let i = frame.neighborIndex; i < neighbors.length; i++) {
            const neighbor = neighbors[i];

            if (!this.discovered.has(neighbor.to)) {
                this.discovered.add(neighbor.to);
                super.setPredecessor(this.state.parent, neighbor.to, frame.nodeId, neighbor.edgeId);
                super.recordDiscoverStep(frame.nodeId, neighbor.to, neighbor.edgeId);

                frame.neighborIndex = i + 1;
                this.stack.push({
                    nodeId: neighbor.to,
                    fromId: frame.nodeId,
                    edgeId: neighbor.edgeId,
                    neighborIndex: 0
                });

                pushedNewNode = true;
                break;
            }
        }

        // All neighbors explored - backtrack
        if (!pushedNewNode) {
            super.recordFinishStep(frame.nodeId, frame.edgeId);
            this.stack.pop();
        }
    }

    /**
     * Check if DFS is complete.
     *
     * @returns {boolean} True when stack is empty or target is found.
     * @override
     */
    _isComplete() {
        return this.stack.length === 0 || this.targetFound;
    }

    /**
     * Build the DFS traversal plan result.
     *
     * @returns {Object} DFS traversal plan.
     * @override
     */
    _buildResult() {
        return super.createPlanResult("Depth-First Search", "DFS");
    }
}

/**
 * Base class for shortest-path traversal planners.
 * Provides distance table initialization shared by Dijkstra and Bellman-Ford.
 *
 * @extends Traversal
 */
class ShortestPathTraversal extends Traversal {

    /**
     * Create a shortest-path traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} [endId=null] - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
    }

    /**
     * Create an initialized distance table.
     * All nodes start at Infinity except the start node at distance 0.
     *
     * @returns {Map<string, number>} Distance table.
     */
    initializeDistances() {
        const distances = new Map();

        for (const nodeId of this.graph.nodeOrder) {
            distances.set(nodeId, Infinity);
        }

        distances.set(this.startId, 0);

        return distances;
    }

    /**
     * Get the distance to a specific node.
     *
     * @param {Map<string, number>} distances - Distance table.
     * @param {string} nodeId - Node id.
     * @returns {number} Distance, or Infinity if unreachable.
     */
    getDistance(distances, nodeId) {
        return distances.has(nodeId) ? distances.get(nodeId) : Infinity;
    }

    /**
     * Check if a node is reachable from the start.
     *
     * @param {Map<string, number>} distances - Distance table.
     * @param {string} nodeId - Node id.
     * @returns {boolean} True when reachable.
     */
    isReachable(distances, nodeId) {
        return Number.isFinite(this.getDistance(distances, nodeId));
    }

    /**
     * Get all reachable nodes with their distances.
     *
     * @param {Map<string, number>} distances - Distance table.
     * @returns {Map<string, number>} Map of reachable nodes to distances.
     */
    getReachableNodes(distances) {
        const reachable = new Map();

        distances.forEach((distance, nodeId) => {
            if (Number.isFinite(distance)) {
                reachable.set(nodeId, distance);
            }
        });

        return reachable;
    }
}

/**
 * Builds Dijkstra shortest-path traversal plans.
 *
 * Dijkstra greedily selects the nearest unexplored node and relaxes its outgoing edges.
 * Uses a binary heap priority queue for O((V+E) log V) performance.
 * Does not support negative edge weights.
 *
 * Time Complexity: O((V + E) log V)
 * Space Complexity: O(V)
 *
 * @extends ShortestPathTraversal
 */
class Dijkstra extends ShortestPathTraversal {

    /**
     * Create a Dijkstra traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} [endId=null] - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
        /** @type {Map<string, number>|null} Distance table */
        this.distances = null;
        /** @type {Set<string>|null} Set of explored node ids */
        this.explored = null;
        /** @type {MinPriorityQueue|null} Priority queue for node selection */
        this.pq = null;
    }

    /**
     * Validate whether Dijkstra can run on the current graph.
     * Fails if the graph contains negative edge weights.
     *
     * @returns {string|null} Error message, or null when valid.
     * @override
     */
    validate() {
        const baseValidation = super.validate();
        if (baseValidation) return baseValidation;

        if (this.graph.hasNegativeWeight()) {
            return "Dijkstra's algorithm does not support negative weights. Use Bellman-Ford instead.";
        }
        return null;
    }

    /**
     * Initialize Dijkstra with a distance table and priority queue.
     * @override
     */
    _initializeExecution() {
        this.distances = super.initializeDistances();
        this.explored = new Set();
        this.pq = new MinPriorityQueue();

        this.pq.insert(this.startId, 0);
        super.recordDiscoverStep(this.startId, this.startId, null, this.distances);
    }

    /**
     * Execute one step: extract and explore the nearest unexplored node.
     * @override
     */
    _executeStep() {
        if (!this.pq || this.pq.isEmpty()) return;

        const current = this.pq.extractMin();
        if (!current) return;

        const nodeId = current.nodeId;

        // Skip stale entries for nodes already explored
        if (this.explored.has(nodeId)) return;

        this.#exploreNode(nodeId);
    }

    /**
     * Check if Dijkstra is complete.
     *
     * @returns {boolean} True when all reachable nodes are explored or target is found.
     * @override
     */
    _isComplete() {
        if (!this.pq) return true;

        return this.pq.isEmpty() ||
            this.explored.size >= this.graph.nodeMap.size ||
            (this.endId !== null && this.explored.has(this.endId));
    }

    /**
     * Build the Dijkstra traversal plan result.
     *
     * @returns {Object} Dijkstra traversal plan.
     * @override
     */
    _buildResult() {
        const result = super.createPlanResult("Dijkstra", "Dijkstra", this.distances);

        // Add reachable count to metadata
        result.metadata.reachableCount = this.explored ? this.explored.size : 0;

        return result;
    }

    /**
     * Explore a node by relaxing all its outgoing edges.
     *
     * For each neighbor, checks if a shorter path exists through this node.
     * Updates distances and priority queue when improvements are found.
     *
     * @param {string} nodeId - Node to explore.
     */
    #exploreNode(nodeId) {
        const incomingEdgeId = this.#getIncomingEdgeId(nodeId);
        super.recordExploreStep(nodeId, incomingEdgeId, this.distances);
        this.explored.add(nodeId);

        const neighbors = this.adjacency.get(nodeId) || [];

        for (const neighbor of neighbors) {
            // Skip already explored nodes
            if (this.explored.has(neighbor.to)) continue;

            const currentDistance = this.distances.get(neighbor.from);

            // Skip if current node is unreachable (shouldn't happen in Dijkstra, but be safe)
            if (!Number.isFinite(currentDistance)) continue;

            const candidateDistance = currentDistance + neighbor.weight;

            if (candidateDistance < this.distances.get(neighbor.to)) {
                this.distances.set(neighbor.to, candidateDistance);
                super.setPredecessor(this.state.parent, neighbor.to, neighbor.from, neighbor.edgeId);
                super.recordDiscoverStep(neighbor.from, neighbor.to, neighbor.edgeId, this.distances);

                // Update or insert into priority queue
                this.pq.insert(neighbor.to, candidateDistance);
            }
        }

        super.recordFinishStep(nodeId, incomingEdgeId, this.distances);
    }

    /**
     * Get the edge id used to reach a node.
     *
     * @param {string} nodeId - Node id.
     * @returns {string|null} Incoming edge id, or null for the start node.
     */
    #getIncomingEdgeId(nodeId) {
        const predecessor = this.state.parent.get(nodeId);
        return predecessor ? predecessor.edgeId : null;
    }
}

/**
 * Builds Bellman-Ford shortest-path traversal plans.
 *
 * Bellman-Ford handles negative edge weights and detects negative cycles by performing V-1 relaxation passes over all edges.
 * For undirected graphs, each edge is processed in both directions without storing duplicates.
 *
 * Time Complexity: O(V * E)
 * Space Complexity: O(V)
 *
 * @extends ShortestPathTraversal
 */
class BellmanFord extends ShortestPathTraversal {

    /**
     * Create a Bellman-Ford traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} [endId=null] - Optional target node id.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);
        /** @type {Map<string, number>|null} Distance table */
        this.distances = null;
        /** @type {Array<Object>|null} Edge descriptors for relaxation */
        this.edges = null;
        /** @type {number} Current relaxation pass number */
        this.pass = 0;
        /** @type {boolean} Whether any distance changed in the last pass */
        this.changed = true;
        /** @type {number} Number of nodes in the graph */
        this.nodeCount = 0;
    }

    /**
     * Validate whether Bellman-Ford can run on the current graph.
     * Warns about negative weights in undirected graphs.
     *
     * @returns {string|null} Error message, or null when valid.
     * @override
     */
    validate() {
        const baseValidation = super.validate();
        if (baseValidation) return baseValidation;

        if (!this.graph.directed && this.graph.hasNegativeWeight()) {
            return "Bellman-Ford with negative weights requires a directed graph. " +
                "Negative weights in undirected graphs create negative cycles.";
        }
        return null;
    }

    /**
     * Initialize Bellman-Ford with distance table and edge descriptors.
     * @override
     */
    _initializeExecution() {
        this.distances = super.initializeDistances();
        this.edges = this.#buildRelaxationEdges();
        this.nodeCount = this.graph.nodeMap.size;
        this.pass = 1;
        this.changed = true;

        super.recordDiscoverStep(this.startId, this.startId, null, this.distances);
    }

    /**
     * Execute one step: perform one complete relaxation pass over all edges.
     * @override
     */
    _executeStep() {
        this.changed = this.#relaxAllEdgesOnce();
        this.pass++;
    }

    /**
     * Check if Bellman-Ford is complete.
     *
     * @returns {boolean} True when all passes are done or no changes occurred.
     * @override
     */
    _isComplete() {
        // All V-1 passes completed
        if (this.pass >= this.nodeCount || !this.changed) {
            return true;
        }

        // Early termination: target reached and no more improvements in last pass
        if (this.endId !== null &&
            Number.isFinite(this.distances.get(this.endId)) &&
            !this.changed) {
            return true;
        }

        return false;
    }

    /**
     * Build the Bellman-Ford traversal plan result.
     * Includes negative cycle detection metadata.
     *
     * @returns {Object} Bellman-Ford traversal plan.
     * @override
     */
    _buildResult() {
        const result = super.createPlanResult(
            "Bellman-Ford",
            "Bellman-Ford",
            this.distances,
            {
                negativeCycle: this.#detectNegativeCycle(),
                passesCompleted: this.pass
            }
        );

        return result;
    }

    /**
     * Builds relaxation edge descriptors without duplication.
     *
     * Each descriptor has a `bidirectional` flag for undirected graphs
     * to process both directions during relaxation without storing duplicates.
     * Total descriptors always equal the number of graph edges (E).
     *
     * @returns {Array<Object>} Relaxation edge descriptors.
     */
    #buildRelaxationEdges() {
        const edges = [];

        for (const edgeId of this.graph.edgeOrder) {
            const edge = this.graph.edgeMap.get(edgeId);
            if (!edge) continue;

            // Verify both endpoints exist
            if (!this.graph.getNodeById(edge.from) || !this.graph.getNodeById(edge.to)) {
                continue;
            }

            edges.push({
                from: edge.from,
                to: edge.to,
                edgeId: edge.id,
                weight: super.getEdgeCost(edge.weight),
                bidirectional: !this.graph.directed
            });
        }

        return edges;
    }

    /**
     * Relax every edge exactly once, processing both directions for undirected graphs.
     *
     * @returns {boolean} True when at least one distance improved.
     */
    #relaxAllEdgesOnce() {
        let changed = false;

        for (const edge of this.edges) {
            changed = this.#tryRelaxEdge(edge.from, edge.to, edge.edgeId, edge.weight) || changed;

            if (edge.bidirectional) {
                changed = this.#tryRelaxEdge(edge.to, edge.from, edge.edgeId, edge.weight) || changed;
            }
        }

        return changed;
    }

    /**
     * Attempt to relax an edge in one direction.
     *
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {string} edgeId - Edge id.
     * @param {number} weight - Edge weight.
     * @returns {boolean} True when distance improved.
     */
    #tryRelaxEdge(fromId, toId, edgeId, weight) {
        const fromDistance = this.distances.get(fromId);

        // Skip if source node is unreachable
        if (!Number.isFinite(fromDistance)) return false;

        super.recordExploreStep(fromId, edgeId, this.distances);

        const candidateDistance = fromDistance + weight;

        if (candidateDistance < this.distances.get(toId)) {
            this.distances.set(toId, candidateDistance);
            super.setPredecessor(this.state.parent, toId, fromId, edgeId);
            super.recordDiscoverStep(fromId, toId, edgeId, this.distances);
            super.recordFinishStep(fromId, edgeId, this.distances);
            return true;
        }

        super.recordFinishStep(fromId, edgeId, this.distances);
        return false;
    }

    /**
     * Detect whether a reachable negative cycle exists in the graph.
     * Performs one additional relaxation pass.
     * If any distance can still be improved, a reachable negative cycle exists.
     *
     * @returns {boolean} True when a reachable negative cycle exists.
     */
    #detectNegativeCycle() {
        for (const edge of this.edges) {
            if (this.#canRelaxEdge(edge.from, edge.to, edge.weight)) {
                return true;
            }

            if (edge.bidirectional && this.#canRelaxEdge(edge.to, edge.from, edge.weight)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if an edge can still be relaxed in one direction.
     *
     * @param {string} fromId - Source node id.
     * @param {string} toId - Target node id.
     * @param {number} weight - Edge weight.
     * @returns {boolean} True when edge can still be relaxed.
     */
    #canRelaxEdge(fromId, toId, weight) {
        const fromDistance = this.distances.get(fromId);
        return Number.isFinite(fromDistance) &&
            (fromDistance + weight < this.distances.get(toId));
    }
}

/**
 * Builds Prim minimum-spanning-tree traversal plans.
 *
 * Prim grows a minimum spanning tree by repeatedly adding the cheapest edge connecting the current tree to a node outside the tree.
 * Uses a binary heap priority queue for O((V+E) log V) performance.
 * Only works on undirected graphs.
 *
 * Time Complexity: O((V + E) log V)
 * Space Complexity: O(V)
 *
 * @extends Traversal
 */
class Prim extends Traversal {

    /**
     * Create a Prim MST traversal planner.
     *
     * @param {Graph} graph - Graph instance.
     * @param {string} startId - Start node id.
     * @param {string|null} [endId=null] - Unused for Prim, accepted for API consistency.
     */
    constructor(graph, startId, endId = null) {
        super(graph, startId, endId);

        /** @type {Set<string>|null} Set of nodes already in the tree */
        this.treeNodes = null;

        /** @type {number} Total weight of edges in the MST */
        this.totalWeight = 0;

        /** @type {MinPriorityQueue|null} Priority queue for cheapest edge selection */
        this.pq = null;

        /** @type {Map<string, Object>|null} Tracks cheapest edge to each node outside the tree */
        this.cheapestEdgeTo = null;
    }

    /**
     * Validate whether Prim can run on the current graph.
     * Requires an undirected graph.
     *
     * @returns {string|null} Error message, or null when valid.
     * @override
     */
    validate() {
        const baseValidation = super.validate();
        if (baseValidation) return baseValidation;

        if (this.graph.directed) {
            return "Prim's MST algorithm requires an undirected graph. Please toggle off directed mode.";
        }

        if (this.graph.nodeCount < 1) {
            return "Graph must have at least one node for Prim's algorithm.";
        }

        return null;
    }

    /**
     * Initializes Prim with an empty tree, priority queue, and start node.
     * @override
     */
    _initializeExecution() {
        this.treeNodes = new Set();
        this.totalWeight = 0;
        this.pq = new MinPriorityQueue();
        this.cheapestEdgeTo = new Map();

        // Add start node to tree
        this.#acceptTreeNode(this.startId, this.startId, null);
        this.treeNodes.add(this.startId);
        this.#addEdgesToQueue(this.startId);
    }

    /**
     * Execute one step: add the cheapest crossing edge's target node to the tree.
     * @override
     */
    _executeStep() {
        if (!this.pq || this.pq.isEmpty()) return;

        const current = this.pq.extractMin();
        if (!current) return;

        const nodeId = current.nodeId;

        // Skip stale entries for nodes already in tree
        if (this.treeNodes.has(nodeId)) return;

        const edge = this.cheapestEdgeTo.get(nodeId);
        if (!edge) return;

        // Add node to tree
        this.totalWeight += edge.weight;
        this.treeNodes.add(nodeId);
        super.setPredecessor(this.state.parent, nodeId, edge.from, edge.edgeId);
        this.#acceptTreeNode(nodeId, edge.from, edge.edgeId);
        this.#addEdgesToQueue(nodeId);
    }

    /**
     * Check if Prim is complete.
     *
     * @returns {boolean} True when all nodes are in the tree or no crossing edges exist.
     * @override
     */
    _isComplete() {
        if (!this.pq) return true;
        return this.pq.isEmpty() || this.treeNodes.size >= this.graph.nodeMap.size;
    }

    /**
     * Build the Prim traversal plan result.
     * Includes MST weight and connectivity metadata.
     *
     * @returns {Object} Prim traversal plan.
     * @override
     */
    _buildResult() {
        const connected = this.treeNodes.size === this.graph.nodeMap.size;

        const result = super.createPlanResult(
            "Prim's Minimum Spanning Tree",
            "Prim",
            null,
            {
                totalWeight: this.totalWeight,
                connected,
                treeSize: this.treeNodes.size,
                totalNodes: this.graph.nodeMap.size
            }
        );

        return result;
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
     * Add all crossing edges from a newly added tree node to the priority queue.
     *
     * For each neighbor not yet in the tree, updates the cheapest known edge to that neighbor.
     * If a cheaper edge is found, the priority queue is updated.
     *
     * @param {string} nodeId - Node just added to the tree.
     */
    #addEdgesToQueue(nodeId) {
        const neighbors = this.adjacency.get(nodeId) || [];

        for (const neighbor of neighbors) {
            // Skip nodes already in the tree
            if (this.treeNodes.has(neighbor.to)) continue;

            const existingEdge = this.cheapestEdgeTo.get(neighbor.to);

            // Update if this edge is cheaper than the current cheapest
            if (!existingEdge || neighbor.weight < existingEdge.weight) {
                this.cheapestEdgeTo.set(neighbor.to, {
                    from: nodeId,
                    edgeId: neighbor.edgeId,
                    weight: neighbor.weight
                });
                this.pq.insert(neighbor.to, neighbor.weight);
            }
        }
    }

    /**
     * Get the MST edges after completion.
     *
     * @returns {Array<{from: string, to: string, edgeId: string, weight: number}>} MST edges.
     */
    getMSTEdges() {
        if (!this.treeNodes) return [];

        const edges = [];

        this.state.parent.forEach((step, nodeId) => {
            if (step.edgeId) {
                const edge = this.graph.getEdgeById(step.edgeId);
                edges.push({
                    from: step.prev,
                    to: nodeId,
                    edgeId: step.edgeId,
                    weight: edge ? edge.weight : 0
                });
            }
        });

        return edges;
    }

    /**
     * Check if a specific node is in the MST.
     *
     * @param {string} nodeId - Node id.
     * @returns {boolean} True when the node is in the tree.
     */
    isNodeInTree(nodeId) {
        return this.treeNodes ? this.treeNodes.has(nodeId) : false;
    }

    /**
     * Get the number of nodes currently in the tree.
     *
     * @returns {number} Tree node count.
     */
    getTreeSize() {
        return this.treeNodes ? this.treeNodes.size : 0;
    }
}

// ---------------------------------------------------------------------------------

/**
 * Graph compose mode management.
 * Available modes and their default ordering come from the mode select element.
 */
class ModeOptions {
    /** @type {Object<string, string>} Human-readable mode names */
    static MODE_NAMES = Object.freeze({
        "add-node": "Add Node",
        "add-edge": "Add Edge",
        "edit": "Edit",
        "traversal": "Traversal"
    });

    /**
     * Get every available option from the mode select element.
     *
     * @param {HTMLSelectElement} select - Mode select element.
     * @returns {string[]} Mode values in UI order.
     */
    static values(select) {
        if (!select || !select.options) return [];

        return Array.from(select.options, option => option.value);
    }

    /**
     * Get the default application mode from the first mode select option.
     *
     * @param {HTMLSelectElement} select - Mode select element.
     * @returns {string} Default mode value, or "add-node" as fallback.
     */
    static getDefault(select) {
        if (select && select.options && select.options.length > 0) {
            return select.options[0].value;
        }
        return "add-node";
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

    /**
     * Get a human-readable name for a mode.
     *
     * @param {string} mode - Mode value.
     * @returns {string} Human-readable mode name.
     */
    static getModeName(mode) {
        return ModeOptions.MODE_NAMES[mode] || mode;
    }

    /**
     * Check if a mode value is valid.
     *
     * @param {string} mode - Mode value to check.
     * @param {HTMLSelectElement} select - Mode select element for validation.
     * @returns {boolean} True when the mode is valid.
     */
    static isValid(mode, select) {
        return ModeOptions.values(select).includes(mode);
    }
}

/**
 * Coordinates graph data, rendering, traversal execution, and UI interaction.
 * Serves as the main application controller.
 *
 * @extends EventEmitter
 */
class App extends EventEmitter {
    /** @type {Graph} The graph data model */
    graph = new Graph();

    /** @type {Object} Cached DOM element references */
    #elements;

    /** @type {CanvasRenderingContext2D} Canvas 2D rendering context */
    #ctx;

    /** @type {Object} Mutable UI state */
    #uiState;

    /** @type {Function} Bound resize handler */
    _boundResize;

    /** @type {Function} Bound keyboard handler */
    _boundKeyDown;

    /** @type {ResizeObserver} Canvas resize observer */
    _resizeObserver;

    /** @type {boolean} Whether the grid needs redrawing */
    #viewportChanged = true;

    /**
     * Default yield configuration for async traversal plan creation.
     */
    static ASYNC_OPTIONS = Object.freeze({
        yieldEvery: 50,
        yieldFn: function defaultYield() {
            return new Promise(resolve => {
                window.setTimeout(resolve, 0);
            });
        }
    });

    /** @type {number} Minimum zoom level */
    static MIN_ZOOM = 0.05;

    /** @type {number} Maximum zoom level */
    static MAX_ZOOM = 100;

    /** @type {number} Zoom factor for zoom in */
    static ZOOM_IN_FACTOR = 1.25;

    /** @type {number} Zoom factor for zoom out */
    static ZOOM_OUT_FACTOR = 0.8;

    /**
     * Create the graph controller.
     * Initializes canvas, binds events, and starts the render loop.
     */
    constructor() {
        super();

        this.#elements = this.#getElements();

        const canvas = this.#elements.canvas;
        if (!canvas) {
            throw new Error("Canvas element not found");
        }

        this.#ctx = canvas.getContext("2d");
        if (!this.#ctx) {
            throw new Error("Could not get 2D context from canvas");
        }

        this.#uiState = this.#createUiState();
        this._boundResize = this.resizeCanvas.bind(this);
        this._boundKeyDown = this.#handleKeyDown.bind(this);
        this._resizeObserver = new ResizeObserver(this._boundResize);

        this.#bindEvents();
        this.resizeCanvas();
        this.refreshNodeSelectors();
        this.syncControls();
        this.#setStatus("Ready. Click or double-click on the canvas to add nodes.");
        this.draw();

        // Listen for graph changes
        this.graph.on("graph-changed", () => this.draw());
        this.graph.on("graph-loaded", () => this.#resetAfterGraphLoad());
        this.graph.on("history-changed", (data) => {
            this.#setStatus(`Undo: ${data.undoCount}, Redo: ${data.redoCount}`);
        });
    }

    /**
     * Clean up resources and remove event listeners.
     */
    destroy() {
        this._resizeObserver.disconnect();
        window.removeEventListener("resize", this._boundResize);
        window.removeEventListener("keydown", this._boundKeyDown);

        const canvas = this.#elements.canvas;
        canvas.removeEventListener("dblclick", this.handleCanvasDoubleClickBound);
        canvas.removeEventListener("click", this.handleCanvasClickBound);
        canvas.removeEventListener("pointerdown", this.handlePointerDownBound);
        canvas.removeEventListener("pointermove", this.handlePointerMoveBound);
        canvas.removeEventListener("pointerup", this.handlePointerUpBound);
        canvas.removeEventListener("pointercancel", this.handlePointerUpBound);
        canvas.removeEventListener("wheel", this.handleWheelBound);

        // Remove other event listeners
        this.#elements.directedToggle.removeEventListener("change", this.handleDirectedToggleBound);
        this.#elements.weightedToggle.removeEventListener("change", this.handleWeightedToggleBound);
        this.#elements.modeSelect.removeEventListener("change", this.handleModeChangeBound);

        // Clear graph
        this.graph.clearHistory();
        this.graph.reset();

        // Clear references
        window.graphController = null;
    }

    /**
     * Convert a positive one-based number to an alphabetic spreadsheet-style label.
     * Example: 1 -> A, 2 -> B, 26 -> Z, 27 -> AA, 28 -> AB
     *
     * @param {number} value - Positive one-based number.
     * @returns {string} Alphabetic label.
     */
    static numberToLetters(value) {
        let number = Math.max(1, Math.floor(Number(value)));
        let label = "";

        while (number > 0) {
            number -= 1;
            label = String.fromCharCode(65 + (number % 26)) + label;
            number = Math.floor(number / 26);
        }

        return label;
    }

    /**
     * Start the graph editor application.
     * Initializes UI components and creates the App instance.
     */
    static start() {
        App.updateCopyrightYear();
        App.bindAsideNavigation();

        if (window.graphController) {
            window.graphController.destroy();
        }

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
     * Binds aside navigation button click handlers for smooth scrolling.
     */
    static bindAsideNavigation() {
        const asideNavButtons = document.querySelectorAll("aside nav button");

        asideNavButtons.forEach(button => {
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
     * Create all mutable UI state with default values.
     *
     * @returns {Object} UI state object.
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
                moved: false,
                startX: 0,
                startY: 0
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
     * Collect required DOM elements and cache them.
     *
     * @returns {Object} DOM element references.
     * @throws {Error} When required elements are missing.
     */
    #getElements() {
        function get(id)  {
            const el = document.getElementById(id);
            if (!el) {
                onsole.warn(`Element #${id} not found`);
            }
            return el;
        };

        return {
            directedToggle: get("directed-toggle"),
            weightedToggle: get("weighted-toggle"),

            modeSelect: document.querySelector("#graph-mode select"),
            nodeLabelModeSelect: get("node-label-mode-select"),
            defaultNodeRadiusInput: get("default-node-radius-input"),
            saveLocalBtn: get("save-local-btn"),
            loadLocalBtn: get("load-local-btn"),
            clearGraphBtn: get("clear-graph-btn"),
            sampleGraphBtn: get("sample-graph-btn"),

            edgeWeightRow: get("edge-weight-row"),
            edgeWeightInput: get("edge-weight-input"),
            editEmptyHelp: get("edit-empty-help"),
            nodeEditControls: get("node-edit-controls"),
            edgeEditControls: get("edge-edit-controls"),
            editButtons: get("edit-buttons"),
            editNodeLabelInput: get("edit-node-label-input"),
            editNodeRadiusInput: get("edit-node-radius-input"),
            editEdgeWeightRow: get("edit-edge-weight-row"),
            editEdgeWeightInput: get("edit-edge-weight-input"),
            edgeUnweightedHelp: get("edge-unweighted-help"),
            applyEditBtn: get("apply-edit-btn"),
            clearEditSelectionBtn: get("clear-edit-selection-btn"),

            startNodeSelect: get("start-node-select"),
            endNodeSelect: get("end-node-select"),
            algorithmSelect: get("algorithm-select"),
            delayInput: get("delay-input"),
            traversalOutput: get("traversal-output"),
            runTraversalBtn: get("run-traversal-btn"),
            stepTraversalBtn: get("step-traversal-btn"),
            clearTraversalBtn: get("clear-traversal-btn"),
            stopTraversalBtn: get("stop-traversal-btn"),

            exportBtn: get("export-btn"),
            importBtn: get("import-btn"),
            jsonArea: get("json-area"),

            zoomOutBtn: get("zoom-out-btn"),
            zoomResetBtn: get("zoom-reset-btn"),
            zoomInBtn: get("zoom-in-btn"),
            statusBoxes: document.querySelectorAll(".graph-status"),
            canvas: document.querySelector("#graph-editor canvas"),
        };
    }

    /**
     * Bind all DOM event listeners used by the graph editor.
     * Creates bound method references for proper cleanup.
     */
    #bindEvents() {
        // Store bound references for cleanup
        this.handleDirectedToggleBound = this.handleDirectedToggle.bind(this);
        this.handleWeightedToggleBound = this.handleWeightedToggle.bind(this);
        this.handleModeChangeBound = this.handleModeChange.bind(this);
        this.handleCanvasDoubleClickBound = this.handleCanvasDoubleClick.bind(this);
        this.handleCanvasClickBound = this.handleCanvasClick.bind(this);
        this.handlePointerDownBound = this.handlePointerDown.bind(this);
        this.handlePointerMoveBound = this.handlePointerMove.bind(this);
        this.handlePointerUpBound = this.handlePointerUp.bind(this);
        this.handleWheelBound = this.handleWheel.bind(this);

        // Graph settings
        this.#elements.directedToggle.addEventListener("change", this.handleDirectedToggleBound);
        this.#elements.weightedToggle.addEventListener("change", this.handleWeightedToggleBound);

        // Mode and settings
        this.#elements.modeSelect.addEventListener("change", this.handleModeChangeBound);
        this.#elements.nodeLabelModeSelect.addEventListener("change", this.handleNodeLabelModeChange.bind(this));
        this.#elements.defaultNodeRadiusInput.addEventListener("input", this.handleDefaultNodeRadiusInput.bind(this));

        // Edge weight inputs
        this.#elements.edgeWeightInput.addEventListener("input", this.handleEdgeWeightDraft.bind(this));
        this.#elements.editNodeLabelInput.addEventListener("input", this.handleEditNodeLabelInput.bind(this));
        this.#elements.editNodeRadiusInput.addEventListener("input", this.handleEditNodeRadiusInput.bind(this));
        this.#elements.editEdgeWeightInput.addEventListener("input", this.handleEditEdgeWeightInput.bind(this));

        // Edit buttons
        this.#elements.applyEditBtn.addEventListener("click", this.applyEditSelection.bind(this));
        this.#elements.clearEditSelectionBtn.addEventListener("click", this.clearEditSelection.bind(this));

        // Data management
        this.#elements.saveLocalBtn.addEventListener("click", this.saveLocal.bind(this));
        this.#elements.loadLocalBtn.addEventListener("click", this.loadLocal.bind(this));
        this.#elements.clearGraphBtn.addEventListener("click", this.clearGraph.bind(this));
        this.#elements.sampleGraphBtn.addEventListener("click", this.loadSampleGraph.bind(this));

        // Traversal controls
        this.#elements.runTraversalBtn.addEventListener("click", this.runTraversal.bind(this));
        this.#elements.stepTraversalBtn.addEventListener("click", this.stepTraversal.bind(this));
        this.#elements.clearTraversalBtn.addEventListener("click", this.clearTraversal.bind(this));
        this.#elements.stopTraversalBtn.addEventListener("click", this.stopTraversal.bind(this));

        // Import/Export
        this.#elements.exportBtn.addEventListener("click", this.exportGraph.bind(this));
        this.#elements.importBtn.addEventListener("click", this.importGraph.bind(this));

        // Zoom controls
        this.#elements.zoomOutBtn.addEventListener("click", this.zoomOut.bind(this));
        this.#elements.zoomResetBtn.addEventListener("click", this.zoomReset.bind(this));
        this.#elements.zoomInBtn.addEventListener("click", this.zoomIn.bind(this));

        // Canvas interactions
        this.#elements.canvas.addEventListener("dblclick", this.handleCanvasDoubleClickBound);
        this.#elements.canvas.addEventListener("click", this.handleCanvasClickBound);
        this.#elements.canvas.addEventListener("pointerdown", this.handlePointerDownBound);
        this.#elements.canvas.addEventListener("pointermove", this.handlePointerMoveBound);
        this.#elements.canvas.addEventListener("pointerup", this.handlePointerUpBound);
        this.#elements.canvas.addEventListener("pointercancel", this.handlePointerUpBound);
        this.#elements.canvas.addEventListener("wheel", this.handleWheelBound, {passive: false});

        // Keyboard shortcuts
        window.addEventListener("keydown", this._boundKeyDown);

        // Canvas resizing
        this._resizeObserver.observe(this.#elements.canvas);
        window.addEventListener("resize", this._boundResize);

        this.#enhanceAccessibility();
    }

    /**
     * Add focus styling and ARIA metadata for the canvas.
     * Enhances keyboard navigation and screen reader support.
     */
    #enhanceAccessibility() {
        const canvas = this.#elements.canvas;

        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", "Interactive graph editor canvas");
        canvas.setAttribute("tabindex", "0");

        canvas.addEventListener("focus", () => {
            canvas.style.outline = "2px solid #4ade80";
        });

        canvas.addEventListener("blur", () => {
            canvas.style.outline = "none";
        });

        // Add keyboard shortcut for delete
        canvas.addEventListener("keydown", (event) => {
            if (event.key === "Delete" || event.key === "Backspace") {
                const selection = this.#uiState.editSelection;
                if (selection) {
                    event.preventDefault();
                    if (selection.type === "node") {
                        this.graph.removeNode(selection.id);
                        this.#clearEditSelectionState();
                        this.refreshNodeSelectors();
                        this.clearTraversal();
                        this.#setStatus("Node deleted.");
                        this.draw();
                    } else if (selection.type === "edge") {
                        this.graph.removeEdge(selection.id);
                        this.#clearEditSelectionState();
                        this.clearTraversal();
                        this.#setStatus("Edge deleted.");
                        this.draw();
                    }
                }
            }
        });
    }

    /**
     * Handle undo and redo keyboard shortcuts.
     * Ctrl+Z for undo, Ctrl+Y or Ctrl+Shift+Z for redo.
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
        } else if (modifierPressed && key === "0") {
            event.preventDefault();
            this.zoomReset();
        } else if (modifierPressed && key === "=") {
            event.preventDefault();
            this.zoomIn();
        } else if (modifierPressed && key === "-") {
            event.preventDefault();
            this.zoomOut();
        }
    }

    /**
     * Resize the canvas drawing buffer to match its displayed CSS size.
     * Keeps rendering crisp on high-DPI screens and prevents browser stretching.
     */
    resizeCanvas() {
        const canvas = this.#elements.canvas;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.#viewportChanged = true;
        this.draw();
    }

    /**
     * Draw the full graph editor scene.
     * Clears canvas, draws grid, then renders edges and nodes.
     */
    draw() {
        if (!this.#ctx) return;

        const width = this.#elements.canvas.clientWidth;
        const height = this.#elements.canvas.clientHeight;
        const viewport = this.#uiState.viewport;

        this.#ctx.clearRect(0, 0, width, height);

        // Draw grid (cached when viewport is stable)
        this.#drawGrid(width, height);
        this.#viewportChanged = false;

        this.#ctx.save();
        this.#ctx.translate(viewport.x, viewport.y);
        this.#ctx.scale(viewport.scale, viewport.scale);

        this.graph.drawEdges(this.#ctx);
        this.graph.drawNodes(this.#ctx, this);

        this.#ctx.restore();

        this.emit("draw-complete");
    }

    /**
     * Draw viewport-aware minor and major grid lines.
     * Minor lines help when nearby nodes differ by only a few units.
     * Major lines stay readable while zooming.
     *
     * @param {number} width - Canvas CSS width.
     * @param {number} height - Canvas CSS height.
     */
    #drawGrid(width, height) {
        const viewport = this.#uiState.viewport;
        const minorWorldSpacing = 10;
        const majorWorldSpacing = minorWorldSpacing * 10;

        this.#drawGridLayer(width, height, minorWorldSpacing, viewport, "rgba(148, 163, 184, 0.07)", 1);
        this.#drawGridLayer(width, height, majorWorldSpacing, viewport, "rgba(148, 163, 184, 0.12)", 1);
    }

    /**
     * Draws one grid layer for world-space spacing.
     * Skips drawing when screen spacing is too small to be useful.
     *
     * @param {number} width - Canvas CSS width.
     * @param {number} height - Canvas CSS height.
     * @param {number} worldSpacing - Grid spacing in graph-world units.
     * @param {Object} viewport - Current viewport state.
     * @param {string} strokeStyle - Grid line color.
     * @param {number} lineWidth - Grid line width.
     */
    #drawGridLayer(width, height, worldSpacing, viewport, strokeStyle, lineWidth) {
        const screenSpacing = worldSpacing * viewport.scale;

        // Don't draw if lines would be too dense
        if (screenSpacing < 6) {
            return;
        }

        const startX = ((viewport.x % screenSpacing) + screenSpacing) % screenSpacing;
        const startY = ((viewport.y % screenSpacing) + screenSpacing) % screenSpacing;

        this.#ctx.save();
        this.#ctx.strokeStyle = strokeStyle;
        this.#ctx.lineWidth = lineWidth;

        // Draw vertical lines
        for (let x = startX, lineCount = 0; x <= width && lineCount < 200; x += screenSpacing, lineCount++) {
            this.#ctx.beginPath();
            this.#ctx.moveTo(x, 0);
            this.#ctx.lineTo(x, height);
            this.#ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = startY, lineCount = 0; y <= height && lineCount < 200; y += screenSpacing, lineCount++) {
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
     * @param {MouseEvent|PointerEvent|WheelEvent} event - Pointer event.
     * @returns {Object} Pointer coordinates with screenX, screenY, x (world), y (world).
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
        if (!ModeOptions.isValid(mode, this.#elements.modeSelect)) {
            console.warn(`Invalid mode: ${mode}`);
            return;
        }

        const oldMode = this.#uiState.mode;
        this.#uiState.mode = mode;
        this.#elements.modeSelect.value = mode;
        this.syncControls();

        if (oldMode !== mode) {
            this.emit("mode-changed", {oldMode, newMode: mode});
        }
    }

    /**
     * Show the active mode panel and hide inactive mode panels.
     */
    #syncModePanels() {
        const currentMode = this.#uiState.mode;

        ModeOptions.values(this.#elements.modeSelect).forEach(mode => {
            const panel = document.getElementById(ModeOptions.getPanelId(mode));
            if (panel) {
                panel.hidden = mode !== currentMode;
            }
        });
    }

    /**
     * Synchronize graph composition controls.
     */
    #syncComposeControls() {
        if (this.#elements.defaultNodeRadiusInput) {
            this.#elements.defaultNodeRadiusInput.value = String(Node.DEFAULT_RADIUS);
        }
        if (this.#elements.directedToggle) {
            this.#elements.directedToggle.checked = this.graph.directed;
        }
        if (this.#elements.weightedToggle) {
            this.#elements.weightedToggle.checked = this.graph.weighted;
        }
        if (this.#elements.edgeWeightRow) {
            this.#elements.edgeWeightRow.hidden = !this.graph.weighted;
        }
        if (this.#elements.edgeWeightInput) {
            this.#elements.edgeWeightInput.value = String(this.#uiState.edgeWeightDraft);
        }
    }

    /**
     * Synchronize edit controls for the current node or edge edit selection.
     */
    #syncEditControls() {
        const selection = this.#uiState.editSelection;
        const hasNode = selection && selection.type === "node";
        const hasEdge = selection && selection.type === "edge";

        if (this.#elements.editEmptyHelp) {
            this.#elements.editEmptyHelp.hidden = hasNode || hasEdge;
        }
        if (this.#elements.nodeEditControls) {
            this.#elements.nodeEditControls.hidden = !hasNode;
        }
        if (this.#elements.edgeEditControls) {
            this.#elements.edgeEditControls.hidden = !hasEdge;
        }
        if (this.#elements.editButtons) {
            this.#elements.editButtons.hidden = !(hasNode || hasEdge);
        }

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
     * @param {Object} selection - Node edit selection.
     */
    #syncNodeEditControls(selection) {
        if (this.#elements.editNodeLabelInput) {
            this.#elements.editNodeLabelInput.value = selection.label;
        }
        if (this.#elements.editNodeRadiusInput) {
            this.#elements.editNodeRadiusInput.value = selection.radius === null ? "" : String(selection.radius);
            this.#elements.editNodeRadiusInput.placeholder = String(Node.DEFAULT_RADIUS);
        }
    }

    /**
     * Synchronize edge edit controls from an edge edit selection.
     *
     * @param {Object} selection - Edge edit selection.
     */
    #syncEdgeEditControls(selection) {
        if (this.#elements.editEdgeWeightRow) {
            this.#elements.editEdgeWeightRow.hidden = !this.graph.weighted;
        }
        if (this.#elements.edgeUnweightedHelp) {
            this.#elements.edgeUnweightedHelp.hidden = this.graph.weighted;
        }
        if (this.#elements.editEdgeWeightInput) {
            this.#elements.editEdgeWeightInput.value = String(selection.weight);
        }
    }

    /**
     * Display a status message in all status boxes.
     *
     * @param {string} message - Status message.
     */
    #setStatus(message) {
        const boxes = this.#elements.statusBoxes;
        if (boxes && boxes.length > 0) {
            boxes.forEach(box => {
                box.textContent = message;
            });
        }

        this.emit("status-changed", {message});
    }

    /**
     * Clear the selected render state from every node and edge.
     */
    #clearSelectedState() {
        this.graph.nodeMap.forEach(node => {
            node.renderState.selected(false);
        });

        this.graph.edgeMap.forEach(edge => {
            edge.renderState.selected(false);
        });
    }

    /**
     * Clear hover render state from the currently hovered node or edge.
     */
    #clearHoverState() {
        const hoveredNode = this.graph.getNodeById(this.#uiState.hoveredNodeId);
        const hoveredEdge = this.graph.getEdgeById(this.#uiState.hoveredEdgeId);

        if (hoveredNode) {
            hoveredNode.renderState.hovered(false);
        }

        if (hoveredEdge) {
            hoveredEdge.renderState.hovered(false);
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
        try {
            if (this.graph.undo()) {
                this.#resetAfterGraphLoad();
                this.#setStatus("Undo.");
            } else {
                this.#setStatus("Nothing to undo.");
            }
        } catch (error) {
            console.error("Undo failed:", error);
            this.#setStatus("Undo failed.");
        }
    }

    /**
     * Redo the most recently undone graph history change and reset transient UI state.
     */
    redoGraphChange() {
        try {
            if (this.graph.redo()) {
                this.#resetAfterGraphLoad();
                this.#setStatus("Redo.");
            } else {
                this.#setStatus("Nothing to redo.");
            }
        } catch (error) {
            console.error("Redo failed:", error);
            this.#setStatus("Redo failed.");
        }
    }

    /**
     * Handle changing the active editor mode from the mode select control.
     */
    handleModeChange() {
        const newMode = this.#elements.modeSelect.value;
        this.#setMode(newMode);
        this.#clearEditSelectionState();
        this.#setStatus(`Mode: ${ModeOptions.getModeName(newMode)}`);
        this.draw();
    }

    /**
     * Handle changing the label style used for new nodes.
     */
    handleNodeLabelModeChange() {
        const mode = this.#elements.nodeLabelModeSelect.value;
        const descriptions = {
            "default": "New nodes will use default numeric labels.",
            "alphabetic": "New nodes will use alphabetic labels (A, B, C...)."
        };
        this.#setStatus(descriptions[mode] || "New nodes will use selected label style.");
    }

    /**
     * Handle editing the default radius used by nodes without a custom radius.
     */
    handleDefaultNodeRadiusInput() {
        const parsed = Number(this.#elements.defaultNodeRadiusInput.value);

        if (Number.isFinite(parsed) && parsed >= Node.MIN_RADIUS && parsed <= Node.MAX_RADIUS) {
            Node.setDefaultRadius(parsed);
            this.syncControls();
            this.#setStatus(`Default node radius set to ${parsed}.`);
            this.draw();
        } else {
            this.#setStatus(`Radius must be between ${Node.MIN_RADIUS} and ${Node.MAX_RADIUS}.`);
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
        this.#setStatus(this.graph.directed ? "Directed graph mode." : "Undirected graph mode.");
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
        this.#setStatus(this.graph.weighted ? "Weighted graph mode." : "Unweighted graph mode.");
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
     * Handle normal canvas clicks after suppressing clicks caused by
     * double-clicks or drag completion.
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
     * @param {Object} point - Pointer position with x, y in world coordinates.
     */
    #routeCanvasClick(point) {
        const node = this.graph.findNodeAt(point.x, point.y);
        const edge = node ? null : this.graph.findEdgeAt(point.x, point.y);

        if (!node && !edge) {
            this.#handleEmptyCanvasClick(point);
        } else if (this.#uiState.mode === "add-edge" && node) {
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
     * The first empty click exits the current non-add-node mode.
     * The next empty click adds a node.
     *
     * @param {Object} point - Pointer position.
     */
    #handleEmptyCanvasClick(point) {
        if (this.#uiState.mode !== "add-node") {
            this.#setMode("add-node");
            this.#cancelEdgeSource();
            this.#clearEditSelectionState();
            this.#setStatus("<Add Node> Click to place a node.");
        } else {
            this.graph.addNode(point.x, point.y, this.#createNodeLabel());
            this.refreshNodeSelectors();
            this.#setStatus("Node added.");
        }
    }

    /**
     * Create a label for a new node based on the selected label mode.
     *
     * @returns {string|null} Alphabetic label, or null for default graph label.
     */
    #createNodeLabel() {
        if (this.#elements.nodeLabelModeSelect.value === "alphabetic") {
            return App.numberToLetters(this.graph.nodeOrder.length + 1);
        }
        return null;
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
        if (!node) return;

        if (this.#uiState.selectedNodeIdForEdge === null) {
            this.#selectEdgeSource(node);
        } else if (this.#uiState.selectedNodeIdForEdge === node.id) {
            this.#cancelEdgeSource();
        } else {
            this.#createEdgeToNode(node);
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
        this.#setStatus(`<Add Edge> Source: ${node.label}. Click target node.`);
    }

    /**
     * Clear the current edge-source selection and selected render state.
     */
    #cancelEdgeSource() {
        this.#uiState.selectedNodeIdForEdge = null;
        this.#clearSelectedState();
        this.syncControls();
    }

    /**
     * Create an edge from the selected source node to the clicked destination node.
     *
     * @param {Node} node - Destination node.
     */
    #createEdgeToNode(node) {
        const fromId = this.#uiState.selectedNodeIdForEdge;
        const weight = this.#resolveEdgeWeight();

        if (weight === null) {
            this.#setStatus("Invalid weight. Please enter a valid number.");
        } else {
            const edge = this.graph.addEdge(fromId, node.id, weight);

            if (!edge) {
                this.#setStatus("That edge already exists or uses missing nodes.");
            } else {
                this.#setStatus(`Edge created: ${this.graph.getNodeById(fromId)?.label || fromId} → ${node.label}`);
            }
        }

        this.#cancelEdgeSource();
        this.draw();
    }

    /**
     * Resolve the edge weight to use for a new edge.
     *
     * @returns {number|null} Edge weight, or null when weighted input is invalid.
     */
    #resolveEdgeWeight() {
        if (!this.graph.weighted) {
            return 1;
        }

        const parsed = Number(this.#elements.edgeWeightInput.value);

        if (Number.isFinite(parsed)) {
            this.#uiState.edgeWeightDraft = parsed;
            return parsed;
        }

        return null;
    }

    /**
     * Handle selecting or unselecting a node or edge for editing.
     *
     * @param {Node|null} node - Clicked node.
     * @param {Edge|null} edge - Clicked edge.
     */
    #handleEditMode(node, edge) {
        const repeated = this.#isRepeatedEditSelection(node, edge);

        if (repeated) {
            this.clearEditSelection("Selection cleared.");
        } else {
            this.#clearSelectedState();

            if (node) {
                this.#uiState.editSelection = this.#createNodeEditSelection(node);
                node.renderState.selected(true);
                this.#setStatus(`<Edit Node> ${node.label}`);
            } else if (edge) {
                this.#uiState.editSelection = this.#createEdgeEditSelection(edge);
                edge.renderState.selected(true);
                this.#setStatus(`<Edit Edge> Weight: ${edge.weight}`);
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

        if (selection && node && selection.type === "node" && selection.id === node.id) {
            return true;
        }
        if (selection && edge && selection.type === "edge" && selection.id === edge.id) {
            return true;
        }

        return false;
    }

    /**
     * Create an editable snapshot for a node selection.
     *
     * @param {Node} node - Selected node.
     * @returns {Object} Node edit selection with type, id, label, and radius.
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
     * @returns {Object} Edge edit selection with type, id, labels, and weight.
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
     * Update the selected node edit draft label from the label input.
     */
    handleEditNodeLabelInput() {
        const selection = this.#uiState.editSelection;
        if (selection && selection.type === "node") {
            selection.label = this.#elements.editNodeLabelInput.value;
        }
    }

    /**
     * Update the selected node edit draft radius from the radius input.
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
        const radiusIsValid = radius === null ||
            (Number.isFinite(Number(radius)) && Number(radius) >= Node.MIN_RADIUS && Number(radius) <= Node.MAX_RADIUS);

        if (!node) {
            this.#setStatus("Selected node no longer exists.");
        } else if (!label) {
            this.#setStatus("Node label cannot be empty.");
        } else if (!radiusIsValid) {
            this.#setStatus(`Node radius must be between ${Node.MIN_RADIUS} and ${Node.MAX_RADIUS}, or empty for default.`);
        } else {
            this.graph.saveHistory();
            node.setLabel(label);
            node.setRadius(radius);
            this.refreshNodeSelectors();
            this.syncControls();
            this.#setStatus(`Node updated: ${label}`);
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
        } else if (this.graph.weighted && (parsed < Edge.MIN_WEIGHT || parsed > Edge.MAX_WEIGHT)) {
            this.#setStatus(`Edge weight must be between ${Edge.MIN_WEIGHT} and ${Edge.MAX_WEIGHT}.`);
        } else {
            this.graph.saveHistory();
            if (this.graph.weighted) {
                edge.setWeight(parsed);
            }
            this.syncControls();
            this.#setStatus(`Edge updated.`);
            this.draw();
        }
    }

    /**
     * Clear edit selection and edge-source selection state.
     *
     * @param {string|null} [status=null] - Optional status message.
     */
    clearEditSelection(status = null) {
        this.#clearEditSelectionState();
        this.#setStatus(status || "Edit selection cleared.");
        this.draw();
    }

    /**
     * Start node dragging or viewport panning from a pointer-down event.
     *
     * @param {PointerEvent} event - Pointer event.
     */
    handlePointerDown(event) {
        this.#elements.canvas.setPointerCapture(event.pointerId);

        const point = this.#getPointer(event);
        const node = this.graph.findNodeAt(point.x, point.y);
        const shouldPan = event.button === 1 || event.altKey || !node;

        if (node && !shouldPan) {
            this.#uiState.drag.nodeId = node.id;
            this.#uiState.drag.moved = false;
            this.#uiState.drag.startX = point.x;
            this.#uiState.drag.startY = point.y;
        } else if (shouldPan) {
            this.#startPan(point);
        }
    }

    /**
     * Update hover state, node dragging, or viewport panning during pointer movement.
     *
     * @param {PointerEvent} event - Pointer event.
     */
    handlePointerMove(event) {
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
     *
     * @param {PointerEvent} event - Pointer event.
     */
    handlePointerUp(event) {
        if (this.#elements.canvas.hasPointerCapture(event.pointerId)) {
            this.#elements.canvas.releasePointerCapture(event.pointerId);
        }

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
     * @param {Object} point - Pointer position.
     */
    #updateHover(point) {
        const node = this.graph.findNodeAt(point.x, point.y);
        const edge = node ? null : this.graph.findEdgeAt(point.x, point.y);

        // Skip update if hovering the same entity
        if ((node && node.id === this.#uiState.hoveredNodeId) ||
            (edge && edge.id === this.#uiState.hoveredEdgeId)) {
            return;
        }

        this.#clearHoverState();

        if (node) {
            node.renderState.hovered(true);
            this.#uiState.hoveredNodeId = node.id;
            this.#elements.canvas.style.cursor = this.#getCursorForMode("node");
        } else if (edge) {
            edge.renderState.hovered(true);
            this.#uiState.hoveredEdgeId = edge.id;
            this.#elements.canvas.style.cursor = this.#getCursorForMode("edge");
        } else {
            this.#elements.canvas.style.cursor = this.#getCursorForMode("canvas");
        }
    }

    /**
     * Get the appropriate cursor style based on the current mode and hover target.
     *
     * @param {string} target - Hover target type ("node", "edge", "canvas").
     * @returns {string} CSS cursor value.
     */
    #getCursorForMode(target) {
        if (this.#uiState.viewport.dragging) {
            return "grabbing";
        }

        switch (this.#uiState.mode) {
            case "add-node":
                return "crosshair";
            case "add-edge":
                return target === "node" ? "pointer" : "crosshair";
            case "edit":
                return target === "node" ? "grab" : target === "edge" ? "pointer" : "default";
            default:
                return "default";
        }
    }

    /**
     * Move the currently dragged node after the pointer exceeds a drag threshold.
     *
     * @param {Object} point - Pointer position.
     */
    #moveDraggedNode(point) {
        const nodeId = this.#uiState.drag.nodeId;
        if (!nodeId) return;

        const node = this.graph.getNodeById(nodeId);
        if (!node) return;

        const dragThreshold = 4;
        const dx = point.x - this.#uiState.drag.startX;
        const dy = point.y - this.#uiState.drag.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance >= dragThreshold) {
            if (!this.#uiState.drag.moved) {
                this.graph.saveHistory();
                this.#uiState.drag.moved = true;
            }

            node.moveTo(point.x, point.y);
            this.#elements.canvas.style.cursor = "grabbing";
        }
    }

    /**
     * Start dragging the viewport from a pointer position.
     *
     * @param {Object} point - Pointer position.
     */
    #startPan(point) {
        this.#uiState.viewport.dragging = true;
        this.#uiState.viewport.lastX = point.screenX;
        this.#uiState.viewport.lastY = point.screenY;
        this.#uiState.viewport.moved = false;
        this.#elements.canvas.classList.add("panning");
        this.#elements.canvas.style.cursor = "grabbing";
    }

    /**
     * Move the viewport by the pointer delta after the pointer exceeds a pan threshold.
     *
     * @param {Object} point - Pointer position.
     */
    #panViewport(point) {
        const dx = point.screenX - this.#uiState.viewport.lastX;
        const dy = point.screenY - this.#uiState.viewport.lastY;
        const panThreshold = 4;

        if (Math.abs(dx) + Math.abs(dy) >= panThreshold) {
            this.#uiState.viewport.x += dx;
            this.#uiState.viewport.y += dy;
            this.#uiState.viewport.lastX = point.screenX;
            this.#uiState.viewport.lastY = point.screenY;
            this.#uiState.viewport.moved = true;
            this.#viewportChanged = true;
        }
    }

    /**
     * Stop viewport panning.
     */
    #stopPan() {
        this.#uiState.viewport.dragging = false;
        this.#elements.canvas.classList.remove("panning");
        this.#elements.canvas.style.cursor = "";
    }

    /**
     * Zoom the viewport around the current pointer position.
     *
     * @param {WheelEvent} event - Wheel event.
     */
    handleWheel(event) {
        event.preventDefault();
        const point = this.#getPointer(event);
        const factor = event.deltaY < 0 ? App.ZOOM_IN_FACTOR : App.ZOOM_OUT_FACTOR;
        this.#zoomViewport(point.screenX, point.screenY, point.x, point.y, factor);
    }

    /**
     * Zoom the viewport around a fixed world-space point.
     *
     * @param {number} screenX - Screen-space X coordinate.
     * @param {number} screenY - Screen-space Y coordinate.
     * @param {number} worldX - World-space X coordinate.
     * @param {number} worldY - World-space Y coordinate.
     * @param {number} factor - Zoom multiplier.
     */
    #zoomViewport(screenX, screenY, worldX, worldY, factor) {
        const viewport = this.#uiState.viewport;
        const newScale = Math.max(App.MIN_ZOOM, Math.min(App.MAX_ZOOM, viewport.scale * factor));

        if (newScale !== viewport.scale) {
            viewport.x = screenX - worldX * newScale;
            viewport.y = screenY - worldY * newScale;
            viewport.scale = newScale;
            this.#viewportChanged = true;
            this.draw();
        }
    }

    /**
     * Zoom around the visual center of the canvas.
     *
     * @param {number} factor - Zoom multiplier.
     */
    #zoomCanvasCenter(factor) {
        const viewport = this.#uiState.viewport;

        if (viewport.scale <= 0) return; // Guard against invalid state

        const canvas = this.#elements.canvas;
        const screenX = canvas.clientWidth / 2;
        const screenY = canvas.clientHeight / 2;
        const worldX = (screenX - viewport.x) / viewport.scale;
        const worldY = (screenY - viewport.y) / viewport.scale;

        this.#zoomViewport(screenX, screenY, worldX, worldY, factor);
    }

    /**
     * Zoom in by a fixed factor centered on the canvas.
     */
    zoomIn() {
        this.#zoomCanvasCenter(App.ZOOM_IN_FACTOR);
        this.#setStatus(`Zoom: ${Math.round(this.#uiState.viewport.scale * 100)}%`);
    }

    /**
     * Zoom out by a fixed factor centered on the canvas.
     */
    zoomOut() {
        this.#zoomCanvasCenter(App.ZOOM_OUT_FACTOR);
        this.#setStatus(`Zoom: ${Math.round(this.#uiState.viewport.scale * 100)}%`);
    }

    /**
     * Reset viewport zoom and pan to the default state.
     */
    zoomReset() {
        const viewport = this.#uiState.viewport;
        viewport.x = 0;
        viewport.y = 0;
        viewport.scale = 1;
        this.#viewportChanged = true;
        this.#setStatus("Zoom reset to 100%.");
        this.draw();
    }

    /**
     * Rebuild traversal start and end node selector options.
     * Preserves previous selections when possible.
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
        option.textContent = "None (explore all)";
        this.#elements.endNodeSelect.appendChild(option);
    }

    /**
     * Add every graph node to the traversal start and end selectors.
     * Sorted by label for consistent ordering.
     */
    #appendNodeSelectorOptions() {
        // Get nodes sorted by label
        const nodes = this.graph.getNodes().sort((a, b) => a.compareTo(b));

        nodes.forEach(node => {
            this.#appendNodeOption(this.#elements.startNodeSelect, node);
            this.#appendNodeOption(this.#elements.endNodeSelect, node);
        });
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
        option.textContent = `${node.label} (id: ${node.id.substring(0, 8)}...)`;
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
            this.#elements.startNodeSelect.value =
                this.graph.getNodeById(previousStart) ? previousStart : fallbackStart;
        }

        this.#elements.endNodeSelect.value =
            this.graph.getNodeById(previousEnd) ? previousEnd : "";
    }

    /**
     * Prepare a traversal plan without blocking the UI.
     *
     * @param {Object} settings - Traversal settings.
     * @returns {Promise<void>} Resolves when the plan is ready.
     */
    async #prepareTraversalAsync(settings) {
        try {
            const traversal = Traversal.create(
                settings.algorithm,
                this.graph,
                settings.startId,
                settings.endId
            );

            const validationMessage = traversal.validate();

            if (validationMessage !== null) {
                this.#setStatus(validationMessage);
                return;
            }

            this.clearTraversal();
            this.#setStatus("Building traversal plan...");

            await App.ASYNC_OPTIONS.yieldFn();

            const plan = await traversal.createPlanAsync(App.ASYNC_OPTIONS);
            this.#uiState.traversal.plan = plan;
            this.#uiState.traversal.index = 0;
            this.#setStatus(`${plan.name} ready. (${plan.steps.length} steps)`);
        } catch (error) {
            console.error("Traversal preparation failed:", error);
            this.#setStatus(`Failed to build traversal plan: ${error.message}`);
            this.clearTraversal();
        }
    }

    /**
     * Prepare and run the selected traversal animation.
     */
    async runTraversal() {
        const settings = this.#getTraversalSettings();

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
            this.#uiState.traversal.token++;
            const token = this.#uiState.traversal.token;
            await this.#animateTraversal(settings.delay, token);
        }
    }

    /**
     * Advance the selected traversal by one step.
     */
    async stepTraversal() {
        const settings = this.#getTraversalSettings();

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
     * @returns {number|undefined} Distance value, or undefined if not set.
     */
    getTraversalDistance(nodeId) {
        return this.#uiState.traversal.distances.get(nodeId);
    }

    /**
     * Read and validate traversal settings from the UI.
     *
     * @returns {Object|null} Traversal settings, or null when settings are invalid.
     */
    #getTraversalSettings() {
        if (this.graph.nodeMap.size === 0) {
            this.#setStatus("There are no nodes in the graph.");
            return null;
        }

        if (!this.#elements.startNodeSelect.value) {
            this.#setStatus("Choose a start node.");
            return null;
        }

        return this.#createTraversalSettings();
    }

    /**
     * Create traversal settings from current UI controls.
     *
     * @returns {Object} Traversal settings with algorithm, startId, endId, and delay.
     */
    #createTraversalSettings() {
        const delayValue = Number(this.#elements.delayInput.value);
        const minDelay = Number(this.#elements.delayInput.min) || 0;

        return {
            algorithm: this.#elements.algorithmSelect.value,
            startId: this.#elements.startNodeSelect.value,
            endId: this.#elements.endNodeSelect.value || null,
            delay: Math.max(minDelay, Number.isFinite(delayValue) ? delayValue : 0)
        };
    }

    /**
     * Check whether the current traversal plan matches requested settings.
     *
     * @param {Object} settings - Traversal settings.
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

        if (!plan) {
            this.#setStatus("No traversal plan ready.");
            return;
        }

        if (this.#uiState.traversal.index < plan.steps.length) {
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
        const plan = this.#uiState.traversal.plan;
        this.#setStatus(`${plan.name} running...`);

        while (this.#shouldContinueTraversal(token)) {
            // Check token BEFORE advancing step to prevent glitch
            if (token !== this.#uiState.traversal.token) break;

            this.#advanceTraversalStep();

            if (delay > 0) {
                await this.#sleep(delay);
            }
        }

        // Double-check token before finishing
        if (token === this.#uiState.traversal.token &&
            this.#uiState.traversal.plan &&
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
        return Boolean(traversal.plan) &&
            traversal.index < traversal.plan.steps.length &&
            token === traversal.token &&
            traversal.running;
    }

    /**
     * Advance the prepared traversal by one visual step.
     * Updates render states and distance badges for the current step.
     */
    #advanceTraversalStep() {
        const plan = this.#uiState.traversal.plan;

        if (!plan || this.#uiState.traversal.index >= plan.steps.length) {
            return;
        }

        const step = plan.steps[this.#uiState.traversal.index];
        this.#markTraversalStep(step);
        this.#uiState.traversal.index++;

        const status = `${plan.name} — Step ${this.#uiState.traversal.index} of ${plan.steps.length}`;
        this.#elements.traversalOutput.textContent = status;
        this.draw();
        this.#setStatus(status);
    }

    /**
     * Apply one traversal animation step to graph render state and distance badges.
     *
     * @param {Object} step - Traversal animation step.
     */
    #markTraversalStep(step) {
        if (!step) return;

        // Clear exploring states before each non-discovery step
        if (step.type !== "discover") {
            this.#clearExploringTraversalStates();
        }

        this.#markTraversalEntity(step, step.type);

        if (step.distances) {
            this.#applyDistanceDelta(step.distances);
        }
    }

    /**
     * Apply updated traversal distances to the UI distance map.
     * Uses delta updates for efficiency rather than replacing the entire map.
     *
     * @param {Map<string, number>} delta - Distance updates keyed by node id.
     */
    #applyDistanceDelta(delta) {
        delta.forEach((distance, nodeId) => {
            this.#uiState.traversal.distances.set(nodeId, distance);
        });
    }

    /**
     * Apply a traversal render state to the step node and optional step edge.
     *
     * @param {Object} step - Traversal animation step.
     * @param {string} stateName - Render state name (discover, explore, finish).
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
        switch (stateName) {
            case "discover":
                entity.renderState.discovered(true);
                break;
            case "explore":
                entity.renderState.exploring(true);
                break;
            case "finish":
                entity.renderState.exploring(false);
                entity.renderState.explored(true);
                break;
        }
    }

    /**
     * Clear temporary exploring highlights from all nodes and edges.
     * Called before each exploration step to prevent stale highlights.
     */
    #clearExploringTraversalStates() {
        this.graph.nodeMap.forEach(node => {
            node.renderState.clearExploring();
        });

        this.graph.edgeMap.forEach(edge => {
            edge.renderState.clearExploring();
        });
    }

    /**
     * Resolve after a delay using setTimeout.
     *
     * @param {number} ms - Delay in milliseconds.
     * @returns {Promise<void>} Promise that resolves after the delay.
     */
    #sleep(ms) {
        return new Promise(resolve => {
            window.setTimeout(resolve, ms);
        });
    }

    /**
     * Complete the current traversal and render final highlights.
     * Marks the final path or MST and updates the output display.
     */
    #finishTraversal() {
        const plan = this.#uiState.traversal.plan;

        // Guard: only finish if plan exists and all steps are completed
        if (!plan || this.#uiState.traversal.index < plan.steps.length) {
            return;
        }

        this.#clearExploringTraversalStates();
        TraversalResult.markFinalPath(plan, this.graph);
        this.#elements.traversalOutput.innerHTML = TraversalResult.formatOutput(plan, this.graph);
        this.#setStatus(`${plan.name} complete.`);
        this.draw();

        this.emit("traversal-complete", {plan});
    }

    /**
     * Clear traversal plan, progress, visuals, and distance badges.
     * Resets all traversal-related states.
     */
    clearTraversal() {
        // Cancel any running animation
        this.#uiState.traversal.running = false;
        this.#uiState.traversal.plan = null;
        this.#uiState.traversal.index = 0;
        this.#uiState.traversal.token++;
        this.#uiState.traversal.distances.clear();

        // Clear traversal visuals from all entities
        this.graph.nodeMap.forEach(node => {
            node.renderState.clearTraversal();
        });

        this.graph.edgeMap.forEach(edge => {
            edge.renderState.clearTraversal();
        });

        this.#elements.traversalOutput.textContent = "Traversal output will appear here.";
        this.draw();
    }

    /**
     * Stop the running traversal animation and clear active exploration highlights.
     * The traversal plan remains intact for stepping.
     */
    stopTraversal() {
        if (!this.#uiState.traversal.running) {
            this.#setStatus("No traversal is running.");
            return;
        }

        this.#uiState.traversal.running = false;
        this.#uiState.traversal.token++;
        this.#clearExploringTraversalStates();
        this.#setStatus("Traversal stopped. Use Step or Clear.");
        this.draw();
    }

    /**
     * Export the current graph as formatted JSON in the JSON text area.
     */
    exportGraph() {
        try {
            const exported = this.graph.export();
            this.#elements.jsonArea.value = JSON.stringify(exported, null, 2);
            this.#setStatus(`Graph exported. (${exported.nodes.length} nodes, ${exported.edges.length} edges)`);
        } catch (error) {
            console.error("Export failed:", error);
            this.#setStatus("Export failed.");
        }
    }

    /**
     * Import graph JSON from the JSON text area.
     * Validates the JSON before importing.
     */
    importGraph() {
        const raw = this.#elements.jsonArea.value.trim();

        if (!raw) {
            this.#setStatus("JSON area is empty.");
            return;
        }

        try {
            const payload = JSON.parse(raw);

            // Basic validation
            if (!payload || typeof payload !== "object") {
                throw new Error("Invalid graph data structure");
            }

            if (!Array.isArray(payload.nodes)) {
                throw new Error("Graph data must contain a nodes array");
            }

            this.graph.load(payload);
            this.#resetAfterGraphLoad();
            this.#setStatus(`Graph imported. (${this.graph.nodeCount} nodes, ${this.graph.edgeCount} edges)`);
        } catch (error) {
            console.error("Import failed:", error);
            this.#setStatus(`Import failed: ${error.message}`);
        }
    }

    /**
     * Save the current graph to local storage.
     * Includes a timestamp for version tracking.
     */
    saveLocal() {
        try {
            const saveData = {
                version: 1,
                timestamp: Date.now(),
                data: this.graph.export()
            };
            window.localStorage.setItem("graph-state", JSON.stringify(saveData));

            const date = new Date(saveData.timestamp).toLocaleString();
            this.#setStatus(`Saved locally at ${date}.`);
        } catch (error) {
            console.error("Local save failed:", error);
            this.#setStatus("Save failed. Local storage may be full.");
        }
    }

    /**
     * Load a graph from local storage when a saved graph exists.
     */
    loadLocal() {
        try {
            const raw = window.localStorage.getItem("graph-state");

            if (!raw) {
                this.#setStatus("No saved graph found in local storage.");
                return;
            }

            this.#loadLocalGraph(raw);
        } catch (error) {
            console.error("Local load failed:", error);
            this.#setStatus("Failed to load from local storage.");
        }
    }

    /**
     * Parse and load a serialized graph from local storage.
     *
     * @param {string} raw - Serialized graph JSON string.
     */
    #loadLocalGraph(raw) {
        try {
            const saveData = JSON.parse(raw);

            // Handle both versioned and unversioned saves
            const graphData = saveData.data || saveData;

            if (!graphData.nodes || !Array.isArray(graphData.nodes)) {
                throw new Error("Invalid saved graph data");
            }

            this.graph.load(graphData);
            this.#resetAfterGraphLoad();

            const timestamp = saveData.timestamp
                ? ` (saved ${new Date(saveData.timestamp).toLocaleString()})`
                : "";
            this.#setStatus(`Loaded from local storage${timestamp}.`);
        } catch (error) {
            throw new Error(`Invalid saved graph data: ${error.message}`);
        }
    }

    /**
     * Clear the graph and reset undo history.
     */
    clearGraph() {
        if (this.graph.nodeCount === 0 && this.graph.edgeCount === 0) {
            this.#setStatus("Graph is already empty.");
            return;
        }

        this.graph.reset();
        this.graph.clearHistory();
        this.#resetAfterGraphLoad();
        this.#setStatus("Graph cleared.");
    }

    /**
     * Load the sample graph from the sample graph JSON file.
     * Handles loading states and errors gracefully.
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
            console.error("Sample graph load failed:", error);
            this.#setStatus(`Failed to load sample: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    /**
     * Reset the active mode to the default mode declared in the HTML.
     */
    #resetModeToDefault() {
        const defaultMode = ModeOptions.getDefault(this.#elements.modeSelect);
        this.#setMode(defaultMode);
    }

    /**
     * Reset the transient UI state after a full graph load, undo, redo, import, or clear.
     * Ensures consistent UI state after graph mutations.
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

        this.emit("graph-reset");
    }

    /**
     * Get graph statistics for display or debugging.
     *
     * @returns {Object} Graph statistics.
     */
    getGraphStatistics() {
        return this.graph.getStatistics();
    }

    /**
     * Get the current application state for testing or debugging.
     *
     * @returns {Object} Application state snapshot.
     */
    getState() {
        return {
            mode: this.#uiState.mode,
            viewport: {...this.#uiState.viewport},
            nodeCount: this.graph.nodeCount,
            edgeCount: this.graph.edgeCount,
            hasUndo: this.graph.undoCount > 0,
            hasRedo: this.graph.redoCount > 0,
            hasTraversal: this.#uiState.traversal.plan !== null,
            isTraversing: this.#uiState.traversal.running
        };
    }

    /**
     * Export the application state for testing.
     *
     * @returns {Object} Full state export.
     */
    exportForTesting() {
        return {
            graph: this.graph.export(),
            state: this.getState(),
            traversal: {
                plan: this.#uiState.traversal.plan,
                index: this.#uiState.traversal.index,
                running: this.#uiState.traversal.running
            }
        };
    }
}

/**
 * Performance monitoring utility for development.
 * Tracks frame rates and operation timing.
 */
class PerformanceMonitor {
    /** @type {boolean} Whether monitoring is enabled */
    static #enabled = false;

    /** @type {Map<string, number[]>} Timing data storage */
    static #timings = new Map();

    /** @type {number} Frame count for FPS calculation */
    static #frameCount = 0;

    /** @type {number} Last FPS calculation timestamp */
    static #lastFpsTime = 0;

    /** @type {number} Current FPS */
    static #currentFps = 0;

    /**
     * Enable or disable performance monitoring.
     *
     * @param {boolean} enabled - Whether to enable monitoring.
     */
    static setEnabled(enabled) {
        PerformanceMonitor.#enabled = enabled;
        if (!enabled) {
            PerformanceMonitor.#timings.clear();
        }
    }

    /**
     * Start timing an operation.
     *
     * @param {string} label - Operation label.
     */
    static start(label) {
        if (!PerformanceMonitor.#enabled) return;

        if (!PerformanceMonitor.#timings.has(label)) {
            PerformanceMonitor.#timings.set(label, []);
        }

        PerformanceMonitor.#timings.get(label).push(performance.now());
    }

    /**
     * End timing an operation and record the duration.
     *
     * @param {string} label - Operation label.
     * @returns {number|undefined} Duration in milliseconds, or undefined if not monitoring.
     */
    static end(label) {
        if (!PerformanceMonitor.#enabled) return;

        const timings = PerformanceMonitor.#timings.get(label);
        if (!timings || timings.length === 0) return;

        const startTime = timings.pop();
        const duration = performance.now() - startTime;

        // Store duration for averaging
        timings.push(duration);

        // Keep only last 100 measurements
        if (timings.length > 100) {
            timings.shift();
        }

        return duration;
    }

    /**
     * Record a frame for FPS calculation.
     */
    static recordFrame() {
        if (!PerformanceMonitor.#enabled) return;

        PerformanceMonitor.#frameCount++;
        const now = performance.now();

        if (now - PerformanceMonitor.#lastFpsTime >= 1000) {
            PerformanceMonitor.#currentFps = PerformanceMonitor.#frameCount;
            PerformanceMonitor.#frameCount = 0;
            PerformanceMonitor.#lastFpsTime = now;
        }
    }

    /**
     * Get the current FPS.
     *
     * @returns {number} Current frames per second.
     */
    static getFPS() {
        return PerformanceMonitor.#currentFps;
    }

    /**
     * Get average timing for an operation.
     *
     * @param {string} label - Operation label.
     * @returns {number} Average duration in milliseconds.
     */
    static getAverageTiming(label) {
        const timings = PerformanceMonitor.#timings.get(label);
        if (!timings || timings.length === 0) return 0;

        const sum = timings.reduce((a, b) => a + b, 0);
        return sum / timings.length;
    }

    /**
     * Get all timing statistics.
     *
     * @returns {Object} Timing statistics.
     */
    static getStats() {
        const stats = {
            fps: PerformanceMonitor.#currentFps
        };

        PerformanceMonitor.#timings.forEach((timings, label) => {
            if (timings.length > 0) {
                const sum = timings.reduce((a, b) => a + b, 0);
                stats[label] = {
                    avg: Math.round((sum / timings.length) * 100) / 100,
                    min: Math.round(Math.min(...timings) * 100) / 100,
                    max: Math.round(Math.max(...timings) * 100) / 100,
                    samples: timings.length
                };
            }
        });

        return stats;
    }

    /**
     * Reset all timing data.
     */
    static reset() {
        PerformanceMonitor.#timings.clear();
        PerformanceMonitor.#frameCount = 0;
        PerformanceMonitor.#lastFpsTime = 0;
        PerformanceMonitor.#currentFps = 0;
    }
}

/**
 * Error boundary for catching and displaying unhandled errors.
 */
class ErrorBoundary {
    /** @type {Function|null} Error display callback */
    static #displayCallback = null;

    /**
     * Initialize the error boundary with a display callback.
     *
     * @param {Function} callback - Function to call with error messages.
     */
    static init(callback) {
        ErrorBoundary.#displayCallback = callback;

        window.addEventListener("error", (event) => {
            console.error("Unhandled error:", event.error);
            ErrorBoundary.#displayError(event.error);
        });

        window.addEventListener("unhandledrejection", (event) => {
            console.error("Unhandled promise rejection:", event.reason);
            ErrorBoundary.#displayError(event.reason);
        });
    }

    /**
     * Display an error using the registered callback.
     *
     * @param {Error|string} error - Error to display.
     */
    static #displayError(error) {
        if (ErrorBoundary.#displayCallback) {
            const message = error instanceof Error ? error.message : String(error);
            ErrorBoundary.#displayCallback(`Error: ${message}`);
        }
    }

    /**
     * Wrap a function with error handling.
     *
     * @param {Function} fn - Function to wrap.
     * @param {string} context - Context description for error messages.
     * @returns {Function} Wrapped function.
     */
    static wrap(fn, context = "Operation") {
        return function wrappedFunction(...args) {
            try {
                return fn.apply(this, args);
            } catch (error) {
                console.error(`${context} failed:`, error);
                ErrorBoundary.#displayError(error);
                return null;
            }
        };
    }

    /**
     * Wrap an async function with error handling.
     *
     * @param {Function} fn - Async function to wrap.
     * @param {string} context - Context description for error messages.
     * @returns {Function} Wrapped async function.
     */
    static wrapAsync(fn, context = "Operation") {
        return async function wrappedAsyncFunction(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                console.error(`${context} failed:`, error);
                ErrorBoundary.#displayError(error);
                return null;
            }
        };
    }
}

// ---------------------------------------------------------------------------------

/**
 * Start the application after the DOM is ready.
 * Sets up error handling, keyboard shortcuts, and initializes the graph editor.
 */
window.addEventListener("DOMContentLoaded", function startApplication() {
    // Initialize error boundary
    ErrorBoundary.init((message) => {
        const statusBoxes = document.querySelectorAll(".graph-status");
        statusBoxes.forEach(box => {
            box.textContent = message;
            box.style.color = "#f87171"; // Red color for errors
        });

        // Reset color after 5 seconds
        setTimeout(() => {
            statusBoxes.forEach(box => {
                box.style.color = "";
            });
        }, 5000);
    });

    // Enable performance monitoring in development
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        PerformanceMonitor.setEnabled(true);
        console.log("Performance monitoring enabled for development.");

        // Expose performance stats globally
        window.__perf = {
            getStats: () => PerformanceMonitor.getStats(),
            reset: () => PerformanceMonitor.reset()
        };
    }

    // Start the application
    try {
        App.start();
        console.log("Graph editor initialized successfully.");

        // Log available keyboard shortcuts
        console.log(
            "Keyboard shortcuts:\n" +
            "  Ctrl+Z        - Undo\n" +
            "  Ctrl+Y        - Redo\n" +
            "  Ctrl+Shift+Z  - Redo (alternative)\n" +
            "  Ctrl+=        - Zoom in\n" +
            "  Ctrl+-        - Zoom out\n" +
            "  Ctrl+0        - Reset zoom\n" +
            "  Delete        - Delete selected node/edge\n" +
            "  Alt+drag      - Pan viewport\n" +
            "  Scroll        - Zoom in/out"
        );
    } catch (error) {
        console.error("Failed to initialize graph editor:", error);
        ErrorBoundary.init((msg) => {
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    font-family: system-ui, sans-serif;
                    color: #f87171;
                    text-align: center;
                    padding: 20px;
                ">
                    <div>
                        <h1>Initialization Error</h1>
                        <p>${msg}</p>
                        <p>Please check the console for details and refresh the page.</p>
                    </div>
                </div>
            `;
        });
    }
});

/**
 * Handle window unload for cleanup.
 */
window.addEventListener("beforeunload", function cleanupApplication() {
    if (window.graphController) {
        window.graphController.destroy();
        window.graphController = null;
    }
});

/**
 * Handle visibility change to pause/resume animations.
 */
document.addEventListener("visibilitychange", function handleVisibility() {
    if (document.hidden && window.graphController) {
        // Page is hidden, stop any running traversal
        const state = window.graphController.getState();
        if (state.isTraversing) {
            window.graphController.stopTraversal();
        }
    }
});
