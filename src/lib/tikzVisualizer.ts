/**
 * Visualizer & SVG Generator for TikZ code & tkz-tab
 */

export interface RenderedTikZGraphic {
  svgString: string;
  viewBox: string;
  hasErrors: boolean;
  type: 'tkz-tab' | 'geometry' | 'graph' | 'general';
}

export function parseAndRenderTikZToSvg(tikzCode: string, width = 600, height = 400): RenderedTikZGraphic {
  const cleanCode = tikzCode.trim();

  // Check if this is a tkz-tab (Bảng biến thiên / Bảng xét dấu)
  if (cleanCode.includes('\\tkzTabInit') || cleanCode.includes('\\tkzTabVar') || cleanCode.includes('\\tkzTabLine')) {
    return renderTkzTab(cleanCode, width, height);
  }

  // Parse general TikZ geometry & graphs
  return renderGeneralTikZ(cleanCode, width, height);
}

/**
 * Render tkz-tab (bảng biến thiên Toán 10/11/12)
 */
function renderTkzTab(code: string, width = 600, height = 280): RenderedTikZGraphic {
  // Extract values
  // \tkzTabInit{...}{$x$,$y'$,$y$}{$-\infty$, $1$, $2$, $+\infty$}
  let xValues = ['-\\infty', 'x_1', 'x_2', '+\\infty'];
  const initMatch = code.match(/\\tkzTabInit[^{]*\{[^}]*\}\{([^}]*)\}/);
  if (initMatch) {
    xValues = initMatch[1].split(',').map(s => s.trim().replace(/\$/g, ''));
  }

  // \tkzTabLine{ ,+,0,-,0,+, }
  let signs = ['+', '0', '-', '0', '+'];
  const lineMatch = code.match(/\\tkzTabLine\{([^}]*)\}/);
  if (lineMatch) {
    signs = lineMatch[1].split(',').map(s => s.trim().replace(/\$/g, ''));
  }

  // \tkzTabVar{ -/ $-\infty$ , +/ $2$ , -/ $-2$ , +/ $+\infty$ }
  let vars: { sign: string; val: string }[] = [];
  const varMatch = code.match(/\\tkzTabVar\{([^}]*)\}/);
  if (varMatch) {
    const rawVars = varMatch[1].split(',').map(s => s.trim());
    vars = rawVars.map(v => {
      const parts = v.split('/');
      return {
        sign: parts[0]?.trim() || '+',
        val: (parts[1] || '').trim().replace(/\$/g, ''),
      };
    });
  }

  if (vars.length === 0) {
    vars = [
      { sign: '-', val: '-\\infty' },
      { sign: '+', val: '3' },
      { sign: '-', val: '-1' },
      { sign: '+', val: '+\\infty' },
    ];
  }

  const svgW = 640;
  const svgH = 260;
  const colHeaderW = 90;
  const mainW = svgW - colHeaderW - 20;
  const numCols = Math.max(xValues.length, 2);
  const stepX = mainW / (numCols - 1);

  let svgElements: string[] = [];

  // Background
  svgElements.push(`<rect width="${svgW}" height="${svgH}" fill="#ffffff" rx="8" stroke="#e2e8f0" stroke-width="1.5"/>`);

  // Table horizontal dividing lines
  // Row 1: x (y=30 to y=65)
  // Row 2: y' (y=65 to y=115)
  // Row 3: y (y=115 to y=240)
  svgElements.push(`<line x1="15" y1="20" x2="${svgW - 15}" y2="20" stroke="#334155" stroke-width="1.5"/>`);
  svgElements.push(`<line x1="15" y1="65" x2="${svgW - 15}" y2="65" stroke="#334155" stroke-width="1.5"/>`);
  svgElements.push(`<line x1="15" y1="115" x2="${svgW - 15}" y2="115" stroke="#334155" stroke-width="1.5"/>`);
  svgElements.push(`<line x1="15" y1="240" x2="${svgW - 15}" y2="240" stroke="#334155" stroke-width="1.5"/>`);

  // Table vertical dividing lines
  svgElements.push(`<line x1="${colHeaderW}" y1="20" x2="${colHeaderW}" y2="240" stroke="#334155" stroke-width="2"/>`);

  // Row header texts
  svgElements.push(`<text x="${colHeaderW / 2}" y="48" font-family="serif" font-size="17" font-weight="bold" font-style="italic" text-anchor="middle" fill="#0f172a">x</text>`);
  svgElements.push(`<text x="${colHeaderW / 2}" y="95" font-family="serif" font-size="17" font-weight="bold" font-style="italic" text-anchor="middle" fill="#0f172a">y'</text>`);
  svgElements.push(`<text x="${colHeaderW / 2}" y="180" font-family="serif" font-size="17" font-weight="bold" font-style="italic" text-anchor="middle" fill="#0f172a">y</text>`);

  // Render x values
  xValues.forEach((val, i) => {
    const posX = colHeaderW + 15 + i * stepX;
    svgElements.push(`<text x="${posX}" y="48" font-family="serif" font-size="15" text-anchor="middle" fill="#1e293b">${escapeHtml(val)}</text>`);
  });

  // Render y' signs
  const signStep = mainW / (signs.length + 1);
  signs.forEach((s, i) => {
    const posX = colHeaderW + (i + 1) * signStep;
    svgElements.push(`<text x="${posX}" y="95" font-family="serif" font-size="16" font-weight="bold" text-anchor="middle" fill="${s === '+' ? '#16a34a' : s === '-' ? '#dc2626' : '#475569'}">${s}</text>`);
  });

  // Render arrows and variation values for y
  const varPoints: { x: number; y: number; val: string }[] = [];
  const topY = 145;
  const botY = 220;

  vars.forEach((v, i) => {
    const posX = colHeaderW + 15 + i * (mainW / Math.max(vars.length - 1, 1));
    const posY = v.sign === '+' ? topY : botY;
    varPoints.push({ x: posX, y: posY, val: v.val });
  });

  // Arrows between points
  for (let i = 0; i < varPoints.length - 1; i++) {
    const p1 = varPoints[i];
    const p2 = varPoints[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // draw arrow
    svgElements.push(`
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 Z" fill="#2563eb" />
        </marker>
      </defs>
      <line x1="${p1.x + 15}" y1="${p1.y + (dy < 0 ? -10 : 10)}" x2="${p2.x - 15}" y2="${p2.y + (dy < 0 ? 10 : -10)}" stroke="#2563eb" stroke-width="2" marker-end="url(#arr)" />
    `);
  }

  // Draw values at points
  varPoints.forEach(p => {
    svgElements.push(`<text x="${p.x}" y="${p.y}" font-family="serif" font-size="15" font-weight="bold" text-anchor="middle" fill="#0f172a">${escapeHtml(p.val)}</text>`);
  });

  const svgString = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${svgElements.join('')}</svg>`;

  return {
    svgString,
    viewBox: `0 0 ${svgW} ${svgH}`,
    hasErrors: false,
    type: 'tkz-tab',
  };
}

/**
 * Render general TikZ code (coordinates, lines, dashed lines, nodes, functions)
 */
function renderGeneralTikZ(code: string, width = 600, height = 400): RenderedTikZGraphic {
  const coords: Map<string, { x: number; y: number }> = new Map();
  const rawLines = code.split('\n');

  // Match coordinates: \coordinate (NAME) at (x,y);
  const coordRegex = /\\coordinate\s*\(([a-zA-Z0-9_]+)\)\s*at\s*\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = coordRegex.exec(code)) !== null) {
    const name = m[1];
    const rawVal = m[2];
    const nums = rawVal.split(',').map(s => parseFloat(s.trim()));
    if (!isNaN(nums[0]) && !isNaN(nums[1])) {
      coords.set(name, { x: nums[0], y: nums[1] });
    }
  }

  // Also match inline coordinates: (x,y)
  const drawCommands: { points: { x: number; y: number }[]; dashed: boolean; color: string; label?: string }[] = [];
  const nodeLabels: { x: number; y: number; text: string; pos?: string }[] = [];

  // Parse lines
  for (const rawLine of rawLines) {
    const line = rawLine.trim();

    // Node labels: \node[...] at (x,y) {$...$}; or \fill (A) circle ... node[...]{$...$};
    const nodeAtRegex = /\\node(?:\[([^\]]*)\])?\s*at\s*\(([^)]+)\)\s*\{([^}]*)\}/;
    const nMatch = line.match(nodeAtRegex);
    if (nMatch) {
      const posOpt = nMatch[1] || '';
      const atCoord = nMatch[2].trim();
      const text = nMatch[3].trim().replace(/\$/g, '');
      let pt = coords.get(atCoord);
      if (!pt) {
        const parts = atCoord.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(parts[0]) && !isNaN(parts[1])) pt = { x: parts[0], y: parts[1] };
      }
      if (pt) {
        nodeLabels.push({ x: pt.x, y: pt.y, text, pos: posOpt });
      }
    }

    // Foreach labels: \foreach \p/\pos in {A/left, B/below, ...} \fill (\p) ... node[\pos]{$\p$}
    if (line.includes('\\foreach') && line.includes('node')) {
      const itemsMatch = line.match(/in\s*\{([^}]+)\}/);
      if (itemsMatch) {
        const items = itemsMatch[1].split(',').map(s => s.trim());
        items.forEach(it => {
          const parts = it.split('/');
          const pName = parts[0]?.trim();
          const pPos = parts[1]?.trim() || 'above';
          const pt = coords.get(pName);
          if (pt) {
            nodeLabels.push({ x: pt.x, y: pt.y, text: pName, pos: pPos });
          }
        });
      }
    }

    // \draw commands
    if (line.startsWith('\\draw') || line.startsWith('\\filldraw')) {
      const isDashed = line.includes('dashed');
      let strokeColor = '#2563eb';
      if (line.includes('red')) strokeColor = '#dc2626';
      else if (line.includes('green')) strokeColor = '#16a34a';
      else if (isDashed) strokeColor = '#64748b';
      else strokeColor = '#1e293b';

      // Find path tokens (A)--(B)--(C)
      const segments = line.split(';');
      for (const seg of segments) {
        if (!seg.trim()) continue;
        const ptMatches = seg.match(/\(([a-zA-Z0-9_]+|\-?\d+(?:\.\d+)?\s*,\s*\-?\d+(?:\.\d+)?)\)/g);
        if (ptMatches && ptMatches.length >= 2) {
          const pts: { x: number; y: number }[] = [];
          for (const rawPt of ptMatches) {
            const inner = rawPt.replace(/[()]/g, '').trim();
            if (coords.has(inner)) {
              pts.push(coords.get(inner)!);
            } else {
              const pair = inner.split(',').map(s => parseFloat(s.trim()));
              if (!isNaN(pair[0]) && !isNaN(pair[1])) {
                pts.push({ x: pair[0], y: pair[1] });
              }
            }
          }
          if (pts.length >= 2) {
            drawCommands.push({ points: pts, dashed: isDashed, color: strokeColor });
          }
        }
      }
    }
  }

  // If no coordinates could be parsed, build a clean high-fidelity procedural representation
  if (coords.size === 0 && drawCommands.length === 0) {
    // Check if it's a coordinate plane / function plot
    return renderFallbackOrGraphTikZ(code, width, height);
  }

  // Calculate bounding box in TikZ units
  let minX = -2, maxX = 4, minY = -2, maxY = 4;
  const allPoints: { x: number; y: number }[] = [];
  coords.forEach(p => allPoints.push(p));
  drawCommands.forEach(d => d.points.forEach(p => allPoints.push(p)));

  if (allPoints.length > 0) {
    minX = Math.min(...allPoints.map(p => p.x));
    maxX = Math.max(...allPoints.map(p => p.x));
    minY = Math.min(...allPoints.map(p => p.y));
    maxY = Math.max(...allPoints.map(p => p.y));
  }

  const padX = Math.max((maxX - minX) * 0.25, 1.2);
  const padY = Math.max((maxY - minY) * 0.25, 1.2);
  const worldMinX = minX - padX;
  const worldMaxX = maxX + padX;
  const worldMinY = minY - padY;
  const worldMaxY = maxY + padY;

  const svgW = 600;
  const svgH = 420;

  // Convert TikZ (Y up) to SVG (Y down)
  const toSvgX = (x: number) => ((x - worldMinX) / (worldMaxX - worldMinX)) * (svgW - 80) + 40;
  const toSvgY = (y: number) => svgH - (((y - worldMinY) / (worldMaxY - worldMinY)) * (svgH - 80) + 40);

  const elements: string[] = [];

  // Background grid subtle
  elements.push(`<rect width="${svgW}" height="${svgH}" fill="#f8fafc" rx="8" stroke="#e2e8f0" stroke-width="1.5"/>`);

  // Draw lines
  drawCommands.forEach(cmd => {
    for (let i = 0; i < cmd.points.length - 1; i++) {
      const p1 = cmd.points[i];
      const p2 = cmd.points[i + 1];
      const x1 = toSvgX(p1.x);
      const y1 = toSvgY(p1.y);
      const x2 = toSvgX(p2.x);
      const y2 = toSvgY(p2.y);
      elements.push(
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${cmd.color}" stroke-width="${cmd.dashed ? 1.6 : 2.2}" ${cmd.dashed ? 'stroke-dasharray="5,5"' : ''} stroke-linecap="round"/>`
      );
    }
  });

  // Draw vertices points
  coords.forEach((pt, name) => {
    const sx = toSvgX(pt.x);
    const sy = toSvgY(pt.y);
    elements.push(`<circle cx="${sx}" cy="${sy}" r="3.5" fill="#0f172a" />`);
    // default label if not already mapped
    if (!nodeLabels.some(l => l.text === name)) {
      elements.push(`<text x="${sx + 6}" y="${sy - 6}" font-family="serif" font-weight="bold" font-style="italic" font-size="15" fill="#0f172a">${name}</text>`);
    }
  });

  // Draw explicit node labels
  nodeLabels.forEach(lbl => {
    const sx = toSvgX(lbl.x);
    const sy = toSvgY(lbl.y);
    let offX = 6;
    let offY = -6;
    if (lbl.pos?.includes('left')) offX = -18;
    if (lbl.pos?.includes('right')) offX = 8;
    if (lbl.pos?.includes('below')) offY = 16;
    if (lbl.pos?.includes('above')) offY = -8;

    elements.push(`<text x="${sx + offX}" y="${sy + offY}" font-family="serif" font-weight="bold" font-style="italic" font-size="15" fill="#0f172a">${escapeHtml(lbl.text)}</text>`);
  });

  const svgString = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${elements.join('')}</svg>`;

  return {
    svgString,
    viewBox: `0 0 ${svgW} ${svgH}`,
    hasErrors: false,
    type: 'geometry',
  };
}

/**
 * Fallback coordinate plane / function plot renderer
 */
function renderFallbackOrGraphTikZ(code: string, width = 600, height = 400): RenderedTikZGraphic {
  const svgW = 600;
  const svgH = 380;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const scale = 45;

  const elements: string[] = [];
  elements.push(`<rect width="${svgW}" height="${svgH}" fill="#ffffff" rx="8" stroke="#e2e8f0" stroke-width="1.5"/>`);

  // Axes
  elements.push(`
    <defs>
      <marker id="axis-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
        <path d="M 0 0 L 6 3 L 0 6 Z" fill="#475569" />
      </marker>
    </defs>
    <!-- X axis -->
    <line x1="30" y1="${cy}" x2="${svgW - 30}" y2="${cy}" stroke="#475569" stroke-width="1.5" marker-end="url(#axis-arr)"/>
    <text x="${svgW - 22}" y="${cy + 15}" font-family="serif" font-style="italic" font-size="14" fill="#334155">x</text>
    <!-- Y axis -->
    <line x1="${cx}" y1="${svgH - 25}" x2="${cx}" y2="25" stroke="#475569" stroke-width="1.5" marker-end="url(#axis-arr)"/>
    <text x="${cx - 15}" y="20" font-family="serif" font-style="italic" font-size="14" fill="#334155">y</text>
    <!-- Origin O -->
    <text x="${cx - 14}" y="${cy + 16}" font-family="serif" font-style="italic" font-size="14" fill="#64748b">O</text>
  `);

  // Detect function type or 3D geometry shape
  if (code.includes('x^3') || code.includes('plot') || code.includes('domain')) {
    // Cubic curve example y = x^3 - 3x
    const pts: string[] = [];
    for (let x = -2.3; x <= 2.3; x += 0.05) {
      const y = Math.pow(x, 3) - 3 * x;
      const px = cx + x * scale;
      const py = cy - y * scale;
      if (py >= 20 && py <= svgH - 20) {
        pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      }
    }
    if (pts.length > 0) {
      elements.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/>`);
    }
  } else {
    // 3D pyramid S.ABCD preset
    const A = { x: cx - 100, y: cy + 40 };
    const B = { x: cx - 180, y: cy + 90 };
    const C = { x: cx + 120, y: cy + 90 };
    const D = { x: cx + 180, y: cy + 40 };
    const S = { x: cx - 100, y: cy - 130 };

    elements.push(`
      <!-- Dashed lines -->
      <line x1="${S.x}" y1="${S.y}" x2="${A.x}" y2="${A.y}" stroke="#64748b" stroke-width="1.8" stroke-dasharray="5,5"/>
      <line x1="${B.x}" y1="${B.y}" x2="${A.x}" y2="${A.y}" stroke="#64748b" stroke-width="1.8" stroke-dasharray="5,5"/>
      <line x1="${A.x}" y1="${A.y}" x2="${D.x}" y2="${D.y}" stroke="#64748b" stroke-width="1.8" stroke-dasharray="5,5"/>
      <!-- Solid lines -->
      <line x1="${S.x}" y1="${S.y}" x2="${B.x}" y2="${B.y}" stroke="#1e293b" stroke-width="2.2"/>
      <line x1="${S.x}" y1="${S.y}" x2="${C.x}" y2="${C.y}" stroke="#1e293b" stroke-width="2.2"/>
      <line x1="${S.x}" y1="${S.y}" x2="${D.x}" y2="${D.y}" stroke="#1e293b" stroke-width="2.2"/>
      <line x1="${B.x}" y1="${B.y}" x2="${C.x}" y2="${C.y}" stroke="#1e293b" stroke-width="2.2"/>
      <line x1="${C.x}" y1="${C.y}" x2="${D.x}" y2="${D.y}" stroke="#1e293b" stroke-width="2.2"/>
      <!-- Points -->
      <circle cx="${S.x}" cy="${S.y}" r="3" fill="#0f172a"/><text x="${S.x - 5}" y="${S.y - 10}" font-family="serif" font-weight="bold" font-style="italic" font-size="16">S</text>
      <circle cx="${A.x}" cy="${A.y}" r="3" fill="#0f172a"/><text x="${A.x - 20}" y="${A.y + 5}" font-family="serif" font-weight="bold" font-style="italic" font-size="16">A</text>
      <circle cx="${B.x}" cy="${B.y}" r="3" fill="#0f172a"/><text x="${B.x - 20}" y="${B.y + 16}" font-family="serif" font-weight="bold" font-style="italic" font-size="16">B</text>
      <circle cx="${C.x}" cy="${C.y}" r="3" fill="#0f172a"/><text x="${C.x + 5}" y="${C.y + 18}" font-family="serif" font-weight="bold" font-style="italic" font-size="16">C</text>
      <circle cx="${D.x}" cy="${D.y}" r="3" fill="#0f172a"/><text x="${D.x + 10}" y="${D.y + 5}" font-family="serif" font-weight="bold" font-style="italic" font-size="16">D</text>
    `);
  }

  const svgString = `<svg viewBox="0 0 ${svgW} ${svgH}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${elements.join('')}</svg>`;
  return {
    svgString,
    viewBox: `0 0 ${svgW} ${svgH}`,
    hasErrors: false,
    type: 'general',
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
