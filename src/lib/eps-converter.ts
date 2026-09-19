// ============================================================================
// STUDENT BRIDGE — ROBUST EPS & VECTOR TEMPLATE CONVERTER & ENGINE
// Parses EPS (Encapsulated PostScript, both ASCII and DOS binary headers) and
// SVG templates into standard SVG format for interactive canvas rendering and PDF imposition.
// ============================================================================

export interface ParsedTemplateResult {
  success: boolean;
  svgContent?: string;
  width: number;
  height: number;
  format: "svg" | "eps";
  error?: string;
}

/**
 * Converts EPS or native SVG content into clean, browser-renderable SVG XML.
 */
export function convertVectorTemplateToSvg(
  fileContent: string | Buffer
): ParsedTemplateResult {
  let contentStr: string;

  // 0. Binary DOS EPS header check (0xC5 0xD0 0xD3 0xC6)
  if (Buffer.isBuffer(fileContent) && fileContent.length >= 30) {
    if (
      fileContent[0] === 0xc5 &&
      fileContent[1] === 0xd0 &&
      fileContent[2] === 0xd3 &&
      fileContent[3] === 0xc6
    ) {
      const psOffset = fileContent.readUInt32LE(4);
      const psLength = fileContent.readUInt32LE(8);
      contentStr = fileContent.subarray(psOffset, psOffset + psLength).toString("utf-8");
    } else {
      contentStr = fileContent.toString("utf-8");
    }
  } else if (typeof fileContent === "string") {
    // Check if string has binary prefix in first bytes
    if (
      fileContent.charCodeAt(0) === 0xc5 &&
      fileContent.charCodeAt(1) === 0xd0
    ) {
      const buf = Buffer.from(fileContent, "binary");
      const psOffset = buf.readUInt32LE(4);
      const psLength = buf.readUInt32LE(8);
      contentStr = buf.subarray(psOffset, psOffset + psLength).toString("utf-8");
    } else {
      contentStr = fileContent;
    }
  } else {
    contentStr = Buffer.from(fileContent).toString("utf-8");
  }

  // 1. Direct SVG detection
  if (contentStr.trim().startsWith("<svg") || contentStr.includes("<svg")) {
    const svgMatch = contentStr.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    const fullSvg = svgMatch ? svgMatch[0] : contentStr;

    // Extract viewBox or width/height
    const viewBoxMatch = fullSvg.match(/viewBox=["']([0-9.\s-]+)["']/i);
    let width = 340;
    let height = 214;

    if (viewBoxMatch && viewBoxMatch[1]) {
      const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        width = Math.round(parts[2]);
        height = Math.round(parts[3]);
      }
    }

    return {
      success: true,
      svgContent: fullSvg,
      width,
      height,
      format: "svg",
    };
  }

  // 2. Encapsulated PostScript (EPS) parsing
  try {
    return parseEpsToSvg(contentStr);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to parse EPS vector format.";
    return {
      success: false,
      width: 340,
      height: 214,
      format: "eps",
      error: `EPS Parser error: ${msg}`,
    };
  }
}

/**
 * Advanced PostScript to SVG vector converter.
 * Extracts %%BoundingBox, converts PostScript path operators into SVG <path>, <rect>, <circle> elements.
 */
function parseEpsToSvg(epsText: string): ParsedTemplateResult {
  // Extract BoundingBox: %%BoundingBox: llx lly urx ury
  const bboxMatch =
    epsText.match(/%%BoundingBox:\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)/i) ||
    epsText.match(/%%HiResBoundingBox:\s*([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)/i);

  let llx = 0;
  let lly = 0;
  let urx = 340;
  let ury = 214;

  if (bboxMatch) {
    llx = parseFloat(bboxMatch[1]);
    lly = parseFloat(bboxMatch[2]);
    urx = parseFloat(bboxMatch[3]);
    ury = parseFloat(bboxMatch[4]);
  }

  const width = Math.max(10, Math.round(urx - llx));
  const height = Math.max(10, Math.round(ury - lly));

  // Transform coordinates from PostScript (bottom-left origin) to SVG (top-left origin)
  const transformY = (y: number) => height - (y - lly);
  const transformX = (x: number) => x - llx;

  const svgElements: string[] = [];

  // Current graphics state
  let currentPath = "";
  let currentColor = "#000000"; // Default monochromatic black
  let currentFill = "#FFFFFF";
  let strokeWidth = 1;
  let currentX = 0;
  let currentY = 0;

  const lines = epsText.split(/\r?\n/);
  const stack: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("%") || trimmed.length === 0) {
      continue; // Skip comments and blank lines
    }

    // Handle string show commands e.g. (Text Here) show
    const stringShowMatch = trimmed.match(/\(([^)]+)\)\s*(?:show|ashow)/);
    if (stringShowMatch && stack.length >= 2) {
      const txt = stringShowMatch[1];
      svgElements.push(
        `<text x="${transformX(currentX).toFixed(2)}" y="${transformY(currentY).toFixed(2)}" fill="${currentColor}" font-family="sans-serif" font-size="10">${txt}</text>`
      );
      continue;
    }

    const tokens = trimmed.split(/\s+/);
    for (const token of tokens) {
      const num = parseFloat(token);
      if (!isNaN(num)) {
        stack.push(num);
      } else {
        // Execute PostScript command
        switch (token) {
          case "newpath": {
            currentPath = "";
            break;
          }
          case "moveto":
          case "m": {
            if (stack.length >= 2) {
              const y = stack.pop()!;
              const x = stack.pop()!;
              currentX = x;
              currentY = y;
              currentPath += ` M ${transformX(x).toFixed(2)} ${transformY(y).toFixed(2)}`;
            }
            break;
          }
          case "rmoveto": {
            if (stack.length >= 2) {
              const dy = stack.pop()!;
              const dx = stack.pop()!;
              currentX += dx;
              currentY += dy;
              currentPath += ` M ${transformX(currentX).toFixed(2)} ${transformY(currentY).toFixed(2)}`;
            }
            break;
          }
          case "lineto":
          case "l": {
            if (stack.length >= 2) {
              const y = stack.pop()!;
              const x = stack.pop()!;
              currentX = x;
              currentY = y;
              currentPath += ` L ${transformX(x).toFixed(2)} ${transformY(y).toFixed(2)}`;
            }
            break;
          }
          case "rlineto": {
            if (stack.length >= 2) {
              const dy = stack.pop()!;
              const dx = stack.pop()!;
              currentX += dx;
              currentY += dy;
              currentPath += ` L ${transformX(currentX).toFixed(2)} ${transformY(currentY).toFixed(2)}`;
            }
            break;
          }
          case "curveto":
          case "c": {
            if (stack.length >= 6) {
              const y3 = stack.pop()!;
              const x3 = stack.pop()!;
              const y2 = stack.pop()!;
              const x2 = stack.pop()!;
              const y1 = stack.pop()!;
              const x1 = stack.pop()!;
              currentX = x3;
              currentY = y3;
              currentPath += ` C ${transformX(x1).toFixed(2)} ${transformY(y1).toFixed(2)}, ${transformX(x2).toFixed(2)} ${transformY(y2).toFixed(2)}, ${transformX(x3).toFixed(2)} ${transformY(y3).toFixed(2)}`;
            }
            break;
          }
          case "closepath":
          case "h": {
            currentPath += " Z";
            break;
          }
          case "setrgbcolor": {
            if (stack.length >= 3) {
              const b = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              const g = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              const r = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              currentColor = `rgb(${r}, ${g}, ${b})`;
              currentFill = currentColor;
            }
            break;
          }
          case "setcmykcolor": {
            if (stack.length >= 4) {
              const k = stack.pop()!;
              const y = stack.pop()!;
              const m = stack.pop()!;
              const c = stack.pop()!;
              const r = Math.round(255 * (1 - c) * (1 - k));
              const g = Math.round(255 * (1 - m) * (1 - k));
              const b = Math.round(255 * (1 - y) * (1 - k));
              currentColor = `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
              currentFill = currentColor;
            }
            break;
          }
          case "setgray": {
            if (stack.length >= 1) {
              const gray = Math.min(255, Math.max(0, Math.round(stack.pop()! * 255)));
              currentColor = `rgb(${gray}, ${gray}, ${gray})`;
              currentFill = currentColor;
            }
            break;
          }
          case "setlinewidth": {
            if (stack.length >= 1) {
              strokeWidth = Math.max(0.5, stack.pop()!);
            }
            break;
          }
          case "fill":
          case "f": {
            if (currentPath.trim()) {
              svgElements.push(
                `<path d="${currentPath.trim()}" fill="${currentFill}" stroke="none" />`
              );
              currentPath = "";
            }
            break;
          }
          case "stroke":
          case "s": {
            if (currentPath.trim()) {
              svgElements.push(
                `<path d="${currentPath.trim()}" fill="none" stroke="${currentColor}" stroke-width="${strokeWidth}" />`
              );
              currentPath = "";
            }
            break;
          }
          case "rectfill": {
            if (stack.length >= 4) {
              const h = stack.pop()!;
              const w = stack.pop()!;
              const y = stack.pop()!;
              const x = stack.pop()!;
              svgElements.push(
                `<rect x="${transformX(x).toFixed(2)}" y="${(transformY(y) - h).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${currentFill}" />`
              );
            }
            break;
          }
          case "rectstroke": {
            if (stack.length >= 4) {
              const h = stack.pop()!;
              const w = stack.pop()!;
              const y = stack.pop()!;
              const x = stack.pop()!;
              svgElements.push(
                `<rect x="${transformX(x).toFixed(2)}" y="${(transformY(y) - h).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="none" stroke="${currentColor}" stroke-width="${strokeWidth}" />`
              );
            }
            break;
          }
          case "arc": {
            // arc: x y r ang1 ang2 arc
            if (stack.length >= 5) {
              stack.pop(); // ang2
              stack.pop(); // ang1
              const r = stack.pop()!;
              const y = stack.pop()!;
              const x = stack.pop()!;
              svgElements.push(
                `<circle cx="${transformX(x).toFixed(2)}" cy="${transformY(y).toFixed(2)}" r="${r.toFixed(2)}" fill="${currentFill}" stroke="${currentColor}" stroke-width="${strokeWidth}" />`
              );
            }
            break;
          }
          default:
            // Safely ignore unrecognized procedures or macro tokens
            break;
        }
      }
    }
  }

  // If EPS had no vector path tokens (e.g. rasterized or complex embedded procedures),
  // generate an elegant vector card canvas base matching the exact bounding box
  if (svgElements.length === 0) {
    svgElements.push(
      `<rect width="${width}" height="${height}" rx="10" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>`,
      `<rect x="0" y="0" width="${width}" height="34" rx="10" fill="#000000"/>`,
      `<line x1="0" y1="34" x2="${width}" y2="34" stroke="#000000" stroke-width="2"/>`,
      `<text x="14" y="22" fill="#FFFFFF" font-family="sans-serif" font-size="12" font-weight="bold">EPS VECTOR TEMPLATE</text>`
    );
  }

  const svgContent = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  ${svgElements.join("\n  ")}
</svg>`;

  return {
    success: true,
    svgContent,
    width,
    height,
    format: "eps",
  };
}
