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

1. Features
2. Architecture
3. Rendering System
4. Interaction Model
5. Algorithms
6. Traversal Engine
7. Graph Editing
8. Undo / Redo
9. Persistence
10. Controls
11. JSON Format
12. Project Structure
13. Design Principles
14. Limitations
15. Future Improvements
16. Running Locally
17. Author
18. License

---

# Features

## Graph Editing

- Add, move, edit, and delete nodes
- Add and delete edges interactively
- Directed and undirected graph support
- Weighted and unweighted graph support
- Adjustable node radius
- Numeric and alphabetic node labeling
- Stable deterministic edge IDs
- Stable unique node IDs

---

## Visualization

- Real-time Canvas rendering
- Viewport pan and zoom
- Background grid rendering
- Hover and selection highlighting
- Traversal animation
- Distance badge rendering
- Final shortest-path highlighting
- Minimum spanning tree highlighting
- Step-by-step traversal playback

---

## Algorithms

| Algorithm    | Category      | Notes                     |
|:-------------|:--------------|:--------------------------|
| BFS          | Traversal     | Level-order traversal     |
| DFS          | Traversal     | Depth-first traversal     |
| Dijkstra     | Shortest Path | Non-negative weights only |
| Bellman-Ford | Shortest Path | Supports negative weights |
| Prim         | MST           | Undirected graphs only    |

---

## Persistence

- JSON import/export
- Local storage save/load
- Sample graph loading

---

## History

- Undo / Redo support
- Snapshot restoration
- Keyboard shortcuts

---

# Architecture

The application follows a layered top-to-bottom architecture.

---

## Core Systems

| Class                 | Responsibility                     |
|:----------------------|:-----------------------------------|
| RenderState           | Visual traversal state             |
| Geometry              | Shared geometry utilities          |
| Node                  | Node data and rendering            |
| Edge                  | Edge data and rendering            |
| Graph                 | Graph structure and history        |
| TraversalResult       | Traversal result container         |
| Traversal             | Shared traversal infrastructure    |
| BreadthFirst          | BFS traversal planner              |
| DepthFirst            | DFS traversal planner              |
| ShortestPathTraversal | Shared shortest-path behavior      |
| Dijkstra              | Dijkstra planner                   |
| BellmanFord           | Bellman-Ford planner               |
| Prim                  | Prim MST planner                   |
| TraversalFactory      | Traversal creation                 |
| AppMode               | UI mode helpers                    |
| GraphController       | Application controller             |

---

## Rendering Pipeline

```text
GraphController.draw()
    -> drawGrid()
    -> graph.drawEdges()
    -> graph.drawNodes()
```

---

## Traversal Pipeline

```text
Traversal.createPlan()
    -> Build adjacency list
    -> Execute algorithm
    -> Generate traversal steps
    -> Animate traversal
```

---

# Rendering System

Rendering uses the HTML5 Canvas API.

The renderer draws:

1. Background grid
2. Edges
3. Nodes
4. Labels
5. Distance badges

Render order is deterministic using:

```text
nodeOrder
edgeOrder
```

---

## Render State Priority

Visual states follow strict priority ordering:

```text
default < visited < active < path < hovered < selected
```

---

## Render States

| State    | Meaning               |
|:---------|:----------------------|
| Default  | Normal state          |
| Visited  | Previously processed  |
| Active   | Currently processed   |
| Path     | Final solution path   |
| Hovered  | Mouse interaction     |
| Selected | Manual user selection |

---

# Interaction Model

The editor combines persistent modes with transient interactions.

---

## Persistent Modes

| Mode     | Purpose       |
|:---------|:--------------|
| Add Node | Create nodes  |
| Add Edge | Create edges  |
| Edit     | Edit entities |

---

## Transient Interactions

| Interaction       | Behavior      |
|:------------------|:--------------|
| Drag node         | Move node     |
| Double click node | Delete node   |
| Double click edge | Delete edge   |
| Drag background   | Pan viewport  |
| Alt + drag        | Alternate pan |
| Middle mouse drag | Pan viewport  |

---

# Algorithms

## Breadth-First Search (BFS)

Explores graph layers level-by-level using a queue.

Characteristics:

- Iterative traversal
- Deterministic neighbor order
- Shortest path in unweighted graphs

---

## Depth-First Search (DFS)

Explores as deeply as possible before backtracking.

Characteristics:

- Recursive traversal
- Deterministic branch ordering
- Useful for structural exploration

---

## Dijkstra

Computes shortest paths using repeated edge relaxation.

Requirements:

- Weighted graph support
- No negative edge weights

Features:

- Distance tracking
- Path reconstruction
- Deterministic node settlement

---

## Bellman-Ford

Computes shortest paths using repeated relaxation passes.

Features:

- Supports negative weights
- Detects reachable negative cycles
- Distance relaxation visualization

---

## Prim MST

Builds a minimum spanning tree incrementally.

Requirements:

- Undirected graph

Features:

- Deterministic edge selection
- MST weight calculation
- Tree visualization

---

# Traversal Engine

Traversal execution is separated from rendering.

Algorithms generate traversal plans composed of discrete animation steps.

Example:

```js
{
    type: "visit",
    nodeId: "n:123",
    edgeId: "e:a--b"
}
```

---

## Traversal Step Types

| Step     | Meaning                   |
|:---------|:--------------------------|
| visit    | Node processing           |
| active   | Edge traversal/discovery  |

---

## Traversal Features

- Automatic playback
- Manual stepping
- Adjustable playback speed
- Traversal cancellation
- Traversal reset
- Distance tracking
- Final path reconstruction
- Full-speed execution when delay is zero

---

# Graph Editing

## Adding Nodes

Nodes are created by clicking empty canvas space.

Labels may be:

- Numeric
- Alphabetic

---

## Adding Edges

Edges are created by selecting:

1. Source node
2. Target node

The editor prevents:

- Duplicate edges
- Self-loops

---

## Moving Nodes

Nodes support drag-and-drop repositioning.

Connected edges update automatically.

---

## Editing Nodes

Editable properties:

| Property | Description   |
|:---------|:--------------|
| Label    | Display label |
| Radius   | Visual size   |

---

## Editing Edges

Editable properties:

| Property | Description |
|:---------|:------------|
| Weight   | Edge cost   |

---

## Deleting Entities

Deletion uses double-click interaction.

Deleting a node also removes all connected edges.

---

# Undo / Redo

Undo and redo are snapshot-based.

Each graph mutation stores a serialized graph snapshot.

---

## Undoable Operations

- Add node
- Delete node
- Add edge
- Delete edge
- Move node
- Edit node
- Edit edge
- Toggle graph modes
- Import graph

---

## History Limits

Maximum history size:

```text
100 snapshots
```

---

# Persistence

## JSON Import / Export

Graphs may be serialized to JSON for persistence and sharing.

---

## Local Storage

The current graph may be saved locally inside the browser.

---

## Sample Graph

The application can load bundled sample graph data.

---

# Controls

## Mouse Controls

| Action        | Input              |
|:--------------|:-------------------|
| Add node      | Click empty canvas |
| Select entity | Click node/edge    |
| Move node     | Drag node          |
| Delete node   | Double click node  |
| Delete edge   | Double click edge  |
| Pan           | Drag background    |
| Zoom          | Mouse wheel        |

---

## Keyboard Shortcuts

| Action         | Shortcut             |
|:---------------|:---------------------|
| Undo           | Ctrl/Cmd + Z         |
| Redo           | Ctrl/Cmd + Shift + Z |
| Alternate redo | Ctrl/Cmd + Y         |

---

# JSON Format

Example:

```json
{
  "directed": false,
  "weighted": true,
  "nodes": [
    {
      "id": "n:1",
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

---

# Project Structure

```text
graph-visualizer/
├── index.html
├── index.css
├── index.js
├── sample-graph-data.json
└── README.md
```

---

# Design Principles

## Deterministic Behavior

Traversal ordering is intentionally deterministic wherever possible.

Neighbor ordering is stable and repeatable.

---

## Single Responsibility

Classes own their own logic:

- Graph owns graph logic
- Traversals own traversal logic
- Nodes and edges own rendering
- GraphController owns UI coordination

---

## Top-to-Bottom Readability

The file is organized so readers encounter systems before they are used.

---

## Minimal Duplication

Shared traversal behavior is centralized in reusable traversal base classes.

---

# Limitations

- No backend persistence
- Limited mobile UX
- Large graphs may reduce performance
- No automatic layout algorithms
- Canvas renderer is immediate-mode only
- No multi-edge support
- No self-loop rendering

---

# Future Improvements

- Force-directed layouts
- SVG export
- PNG export
- Additional graph algorithms
- Graph statistics panel
- Multi-edge rendering
- Self-loop rendering
- WebGL renderer
- Touch/mobile interaction improvements

---

# Running Locally

## Clone Repository

```bash
git clone https://github.com/danielTongu/graph-app.git
```

---

## Enter Project

```bash
cd graph-app
```

---

## Start Local Server

```bash
python -m http.server
```

---

## Open Browser

```text
http://localhost:8000
```

---

# Author

Daniel Tongu

GitHub:

```text
https://github.com/danielTongu
```

---

# License

MIT
