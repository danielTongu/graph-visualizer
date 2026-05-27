# Graph Visualizer

> Interactive graph editor and algorithm visualizer built with HTML5 Canvas and vanilla JavaScript.

Graph Visualizer is a browser-based application for building, editing, traversing, and visualizing graphs in real time.

It focuses on:

- deterministic traversal behavior
- interactive graph editing
- real-time algorithm visualization
- clear rendering architecture
- maintainable object-oriented design
---

# Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Rendering System](#rendering-system)
4. [Interaction Model](#interaction-model)
5. [Algorithms](#algorithms)
6. [Traversal Engine](#traversal-engine)
7. [Graph Editing](#graph-editing)
8. [Undo / Redo](#undo--redo)
9. [Persistence](#persistence)
10. [Controls](#controls)
11. [JSON Format](#json-format)
12. [Project Structure](#project-structure)
13. [Design Principles](#design-principles)
14. [Limitations](#limitations)
15. [Future Improvements](#future-improvements)
16. [Running Locally](#running-locally)
17. [Author](#author)
18. [License](#license)
---

# Features

## Graph Editing

- Add, move, edit, and delete nodes
- Add and delete edges interactively
- Directed and undirected graph support
- Weighted and unweighted graph support
- Adjustable node radius (5–200 pixels)
- Numeric and alphabetic node labeling
- Stable deterministic edge IDs
- Stable unique node IDs (UUID-based)

## Visualization

- Real-time Canvas rendering with high-DPI support
- Viewport pan and zoom (0.05×–100×)
- Minor and major background grid rendering
- Hover and selection highlighting
- Traversal animation with configurable delay
- Distance badge rendering during shortest-path algorithms
- Final shortest-path and MST highlighting
- Step-by-step traversal playback
- Path reconstruction in output

## Algorithms

| Algorithm    | Category      | Notes                                              |
|:-------------|:--------------|:---------------------------------------------------|
| BFS          | Traversal     | Level-order traversal                              |
| DFS          | Traversal     | Depth-first traversal with explicit stack          |
| Dijkstra     | Shortest Path | Non-negative weights only; O((V+E) log V)          |
| Bellman-Ford | Shortest Path | Supports negative weights; detects negative cycles |
| Prim         | MST           | Undirected graphs only; O((V+E) log V)             |

## Persistence

- JSON import/export
- Local storage save/load with timestamps
- Bundled sample graph loading

## History

- Unlimited undo/redo (configurable, default 25)
- Snapshot-based restoration
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)

---

# Architecture

The application follows a layered top-to-bottom architecture with clear separation of concerns.

## Core Systems

| Class                   | Responsibility                              |
|:------------------------|:--------------------------------------------|
| `EventEmitter`          | Custom pub/sub event system                 |
| `TypeAssert`            | Runtime type validation helpers             |
| `RenderState`           | Visual traversal state with style caching   |
| `Geometry`              | Pure math utilities (distance, hit-testing) |
| `Node`                  | Node data and Canvas rendering              |
| `Edge`                  | Edge data and Canvas rendering              |
| `Deque`                 | Fixed-capacity double-ended queue           |
| `Graph`                 | Graph structure, indexes, and history       |
| `TraversalResult`       | Output formatting and path marking          |
| `MinPriorityQueue`      | Binary heap for Dijkstra and Prim           |
| `Traversal`             | Base class with template method pattern     |
| `BreadthFirst`          | BFS traversal planner                       |
| `DepthFirst`            | DFS traversal planner                       |
| `ShortestPathTraversal` | Shared distance-table initialization        |
| `Dijkstra`              | Dijkstra shortest-path planner              |
| `BellmanFord`           | Bellman-Ford planner with cycle detection   |
| `Prim`                  | Prim MST planner                            |
| `ModeOptions`           | UI mode management                          |
| `App`                   | Main application controller                 |
| `PerformanceMonitor`    | FPS and operation timing (dev mode)         |
| `ErrorBoundary`         | Global unhandled error handler              |

## Rendering Pipeline

```text
App.draw()
    → clear canvas
    → drawGrid(width, height)
    → save context
    → translate/scale viewport
    → graph.drawEdges(ctx)
    → graph.drawNodes(ctx, controller)
    → restore context
```

## Traversal Pipeline
```text
App.runTraversal()
    → get settings
    → validate graph
    → Traversal.create(algorithm, graph, startId, endId)
    → traversal.validate()
    → traversal.createPlanAsync(asyncOptions)
        → _initializeExecution()
        → while !_isComplete():
            → _executeStep()
            → yield to browser periodically
        → _buildResult()
    → animateTraversal(delay, token)
        → advanceTraversalStep()
        → markTraversalStep(step)
        → draw()
    → finishTraversal()
```
---

# Rendering System

Rendering uses the HTML5 Canvas API with high-DPI support via `devicePixelRatio`.

The renderer draws in this deterministic order:

1. Background grid (minor lines, then major lines)
2. Edges (in `edgeOrder`)
3. Nodes (in `nodeOrder`)
4. Labels (centered inside nodes with shadow)
5. Distance badges (above nodes during traversal)

## Render State Precedence

Visual states follow strict priority ordering (highest wins):

```text
discovered < exploring < explored < path < selected < hovered
```
## Render States

| State      | Meaning                                | Fill       | Stroke     |
|:-----------|:---------------------------------------|:-----------|:-----------|
| Default    | Normal state                           | `#1e293b`  | `#64748b`  |
| Discovered | Found but not yet explored             | `#78350f`  | `#ff9100`  |
| Exploring  | Currently being processed              | `#08130d`  | `#166534`  |
| Explored   | Processing complete                    | `#166534`  | `#4ade80`  |
| Path       | Final solution path (shortest/MST)     | `#f87171`  | `#a80000`  |
| Hovered    | Mouse interaction                      | `#c084fc`  | `#4c1d95`  |
| Selected   | Manual user selection                  | `#4c1d95`  | `#c084fc`  |

---

# Interaction Model

The editor combines persistent modes with transient interactions.

## Persistent Modes

| Mode     | Purpose                       |
|:---------|:------------------------------|
| Add Node | Create nodes on empty canvas  |
| Add Edge | Create edges between nodes    |
| Edit     | Edit labels, radii, weights   |
| Traversal| Run algorithm visualizations  |

## Transient Interactions

| Interaction         | Behavior                            |
|:--------------------|:------------------------------------|
| Drag node           | Move node (auto-saves history)      |
| Double-click node   | Delete node and connected edges     |
| Double-click edge   | Delete edge                         |
| Click empty space   | Add node (in Add Node mode)         |
| Drag background     | Pan viewport                        |
| Alt + drag          | Alternate pan                       |
| Middle mouse drag   | Pan viewport                        |
| Scroll wheel        | Zoom in/out centered on pointer     |
| Delete key          | Delete selected entity              |
| Ctrl+Z              | Undo                                |
| Ctrl+Y / Ctrl+Shift+Z | Redo                              |
| Ctrl+=              | Zoom in                             |
| Ctrl+-              | Zoom out                            |
| Ctrl+0              | Reset zoom                          |

---

# Algorithms

## Breadth-First Search (BFS)

Explores graph layers level-by-level using a FIFO queue.

- Time: O(V + E)
- Space: O(V)
- Guarantees shortest paths in unweighted graphs
- Deterministic neighbor order via sorted adjacency

## Depth-First Search (DFS)

Explores as deeply as possible before backtracking using an explicit stack.

- Time: O(V + E)
- Space: O(V)
- Stack frames track neighbor iteration progress
- Deterministic branch ordering

## Dijkstra

Computes single-source shortest paths using a binary heap priority queue.

- Time: O((V + E) log V)
- Space: O(V)
- Requires non-negative edge weights
- Validates graph before execution

## Bellman-Ford

Computes single-source shortest paths via repeated edge relaxation.

- Time: O(V · E)
- Space: O(V)
- Supports negative weights
- Detects reachable negative cycles
- Requires directed graph when negative weights present

## Prim MST

Grows a minimum spanning tree by adding the cheapest crossing edge.

- Time: O((V + E) log V)
- Space: O(V)
- Requires undirected graph
- Tracks total MST weight and connectivity

---

# Traversal Engine

Traversal execution is separated from rendering. Algorithms generate traversal plans composed of discrete animation steps.

## Traversal Step Types

| Step     | Meaning                                    |
|:---------|:-------------------------------------------|
| discover | Node first found; record in order          |
| explore  | Node currently being processed             |
| finish   | Node processing complete; mark as explored |

Each step may include:
- `nodeId` — affected node
- `edgeId` — edge used to reach node
- `from` — predecessor node
- `distances` — snapshot of distance table

## Traversal Features

- Automatic playback with configurable delay (0–∞ ms)
- Manual stepping through individual steps
- Traversal cancellation mid-animation
- Traversal reset (clears all visual state)
- Distance badge rendering during shortest-path algorithms
- Final path/MST highlighting on completion
- Full-speed execution when delay is zero

---

# Graph Editing

## Adding Nodes

Nodes are created by clicking empty canvas space in Add Node mode.

Labels may be:
- **Numeric** — sequential numbers (0, 1, 2, …)
- **Alphabetic** — spreadsheet-style (A, B, …, Z, AA, AB, …)

## Adding Edges

Edges are created by selecting source and target nodes in Add Edge mode. The source node must already be selected in Edit mode (click it twice).

The editor prevents:
- Duplicate edges (same endpoints)
- Self-loops
- Edges to missing nodes

## Moving Nodes

Nodes support drag-and-drop repositioning. History is saved when the drag exceeds 4 pixels. Connected edges update automatically.

## Editing Nodes

Editable properties:

| Property | Description        | Constraints       |
|:---------|:-------------------|:------------------|
| Label    | Display label      | Non-empty string  |
| Radius   | Visual size        | 5–200, or default |

## Editing Edges

Editable properties:

| Property | Description | Constraints                |
|:---------|:------------|:---------------------------|
| Weight   | Edge cost   | Finite number, −10⁶–10⁶    |

## Deleting Entities

- **Double-click node** — deletes node and all connected edges
- **Double-click edge** — deletes single edge
- **Delete key** — deletes currently selected entity

---

# Undo / Redo

Undo and redo are snapshot-based. Each graph mutation stores a serialized graph snapshot in a fixed-capacity deque.

## Undoable Operations

- Add node
- Delete node
- Add edge
- Delete edge
- Move node
- Edit node label/radius
- Edit edge weight
- Toggle directed/weighted mode
- Import graph
- Clear graph
- Load sample/local graph

## History Configuration

- **Default capacity:** 25 snapshots per stack
- **Configurable range:** 1–1000
- Redo stack is cleared on new mutations
- History is cleared on explicit graph loads

---

# Persistence

## JSON Import/Export

Graphs may be serialized to JSON for persistence and sharing. The export format includes versioning for future compatibility.

## Local Storage

The current graph may be saved locally with a timestamp. Loaded saves include the save time in the status message.

## Sample Graph

The application can load bundled sample graph data via `fetch`. Loading states are handled gracefully with button feedback.

---

# Controls

## Mouse Controls

| Action              | Input                          |
|:--------------------|:-------------------------------|
| Add node            | Click empty canvas             |
| Select entity       | Click node/edge                |
| Start edge creation | Click selected edit-node again |
| Move node           | Drag node                      |
| Delete node         | Double-click node              |
| Delete edge         | Double-click edge              |
| Pan viewport        | Drag background / Alt+drag     |
| Zoom                | Mouse wheel                    |

## Keyboard Shortcuts

| Action         | Shortcut              |
|:---------------|:----------------------|
| Undo           | Ctrl/Cmd + Z          |
| Redo           | Ctrl/Cmd + Shift + Z  |
| Alternate redo | Ctrl/Cmd + Y          |
| Zoom in        | Ctrl/Cmd + =          |
| Zoom out       | Ctrl/Cmd + -          |
| Reset zoom     | Ctrl/Cmd + 0          |
| Delete entity  | Delete / Backspace    |

---

# JSON Format

Example:

```json
{
  "version": 1,
  "directed": false,
  "weighted": true,
  "nodes": [
    {
      "id": "n:550e8400-e29b-41d4-a716-446655440000",
      "label": "A",
      "x": 100,
      "y": 120,
      "radius": 18
    }
  ],
  "edges": [
    {
      "id": "e:n1--n2",
      "from": "n1",
      "to": "n2",
      "weight": 5
    }
  ]
}
```

Notes:
- `version` — format version for future compatibility
- `radius` — `null` uses the global default (17)
- Directed edge IDs use `->`; undirected use `--`
- Edge IDs are deterministic based on endpoints and direction

---

# Project Structure

```text
graph-visualizer/
├── index.html              # Main HTML structure and UI panels
├── index.css               # Styles for layout, panels, and controls
├── index.js                # Complete application source
├── sample-graph-data.json  # Bundled sample graph
└── README.md               # This documentation

```

---

# Design Principles

## Deterministic Behavior

Traversal ordering is intentionally deterministic wherever possible. Neighbor lists are sorted by edge weight (if weighted), then by node label. Node and edge render order is insertion-order stable.

## Single Responsibility

Classes own their own logic:
- `Graph` owns graph structure and history
- Traversal subclasses own algorithm logic
- `Node` and `Edge` own their rendering
- `App` owns UI coordination
- `RenderState` owns visual state transitions

## Style Caching

Render styles are computed once and cached until state changes, reducing per-frame overhead during animations.

## Top-to-Bottom Readability

The source file is organized so readers encounter systems before they are used: utilities → data model → algorithms → UI.

## Minimal Duplication

Shared traversal behavior is centralized in `Traversal` and `ShortestPathTraversal` base classes using the template method pattern.

---

# Limitations

- No backend persistence
- Limited mobile/touch UX
- Large graphs (>1000 nodes) may reduce performance
- No automatic layout algorithms
- Canvas renderer is immediate-mode only (no retained mode)
- No multi-edge support (parallel edges)
- No self-loop rendering
- No WebGL acceleration
- Bellman-Ford step count equals edge count × (V−1), which can be slow to animate

---

# Future Improvements

- Force-directed and hierarchical layout algorithms
- SVG export for vector graphics
- PNG export for raster images
- Additional algorithms (A*, Kruskal, Floyd-Warshall, Topological Sort)
- Graph statistics panel (density, diameter, clustering)
- Multi-edge and self-loop rendering
- WebGL renderer for large graphs
- Touch gesture support (pinch zoom, two-finger pan)
- Undo/redo for individual traversal steps
- Dark/light theme support
- Keyboard-only graph editing mode

---

# Running Locally

## Clone Repository

```bash
git clone https://github.com/danielTongu/graph-app.git
```
## Enter Project
```bash
cd graph-app
```
## Start Local Server
```bash
# Python 3
python -m http.server

# Node.js (if npx available)
npx serve

# Or any static file server
```
## Open Browser
```bash
http://localhost:8000

# Or, Python 3
python -m webbrowser http://localhost:8000
```
No build step, package manager, or dependencies required.

---

# Author

**Daniel Tongu**

GitHub: [https://github.com/danielTongu](https://github.com/danielTongu)
