// Presentation of existing simulation remarks, never a dialogue/story generator.
export function golferRemarks(parent) {
  const root = document.createElement("div");
  root.className = "golfer-remarks";
  parent.append(root);
  const entries = new Map();
  return {
    update(golfers, time, project, viewport) {
      const live = new Set(golfers.map((g) => g.visualId ?? g.id));
      for (const [id, e] of entries)
        if (!live.has(id)) {
          e.node.remove();
          entries.delete(id);
        }
      const occupied = [];
      for (const g of golfers) {
        const id = g.visualId ?? g.id;
        let e = entries.get(id);
        if (!e) {
          const node = document.createElement("div");
          node.className = "golfer-remark";
          node.hidden = true;
          const name = document.createElement("strong"),
            text = document.createElement("span");
          node.append(name, text);
          root.append(node);
          e = { node, name, text, comment: null, until: 0 };
          entries.set(id, e);
        }
        if (e.comment !== g.comment) {
          e.comment = g.comment;
          e.until = time + 6;
          e.name.textContent = g.name;
          e.text.textContent = g.comment || "";
        }
        e.node.hidden = true;
        if (
          !g.comment ||
          time > e.until ||
          occupied.length >= 3 ||
          ["departed", "finished"].includes(g.phase)
        )
          continue;
        const p = project(g.pos);
        if (
          p.depth < -1 ||
          p.depth > 1 ||
          p.y < 130 ||
          p.y > viewport.bottom - 15 ||
          p.x < 20 ||
          p.x > viewport.width - 20
        )
          continue;
        const left = Math.max(8, Math.min(viewport.width - 228, p.x - 110)),
          top = p.y - 68;
        if (
          occupied.some(
            (r) => Math.abs(r.x - left) < 228 && Math.abs(r.y - top) < 78,
          )
        )
          continue;
        occupied.push({ x: left, y: top });
        e.node.style.transform = `translate(${left}px,${top}px)`;
        e.node.hidden = false;
      }
    },
  };
}
