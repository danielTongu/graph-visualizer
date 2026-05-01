# Graph Visualizer

> Interactive graph editor + algorithm visualizer built with Canvas and vanilla JavaScript.

---

## 🚀 Features

- Full graph editing (add / move / delete nodes & edges)
- Directed & undirected graphs
- Weighted & unweighted edges
- Undo / Redo system
- Pan & zoom canvas
- Animated + step traversal
- Local save/load
- JSON import/export
- Sample dataset (US cities graph)

---

## 🧠 Algorithms

| Algorithm | Type | Notes |
|----------|------|------|
| DFS | Traversal | Depth-first |
| BFS | Traversal | Level-order |
| Dijkstra | Shortest path | No negative weights |
| Bellman-Ford | Shortest path | Supports negatives |
| Prim | MST | Undirected only |

---

## 🖥️ Demo Controls

| Action | Input |
|------|------|
| Add Node | Add Node mode + click |
| Add Edge | Add Edge mode + click nodes |
| Move | Drag node |
| Pan | Drag background / Alt-drag |
| Zoom | Scroll |
| Undo | Ctrl/Cmd + Z |
| Redo | Ctrl/Cmd + Shift + Z |

---

## 📦 Project Structure

```
graph-visualizer/
├── index.html
├── index.css
├── index.js
└── README.md
```

---

## ▶️ Run

```bash
git clone https://github.com/danielTongu/graph-app.git
cd graph-app
python -m http.server
```

---

## 📄 JSON Format

```json
{
  "directed": false,
  "weighted": true,
  "nodes": [...],
  "edges": [...]
}
```

---

## ⚠️ Limitations

- No backend persistence
- Limited mobile support
- Large graphs may lag

---

## 🔮 Future

- Layout algorithms
- SVG/PNG export
- Better mobile UX
- More algorithms

---

## 🧑‍💻 Author

Daniel Tongu  
GitHub: https://github.com/danielTongu

---

## 📜 License

MIT
