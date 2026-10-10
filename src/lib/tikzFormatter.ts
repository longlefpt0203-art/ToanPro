/**
 * Rule-based TikZ Formatter and Beautifier
 */

export interface FormattedTikZResult {
  formattedCode: string;
  stats: {
    coordinatesCount: number;
    drawCommandsCount: number;
    roundedNumbersCount: number;
    fixedSemicolons: number;
  };
}

export function formatTikZCode(code: string, options: {
  roundDecimals?: boolean;
  decimalPlaces?: number;
  groupCoordinates?: boolean;
  addStructuralComments?: boolean;
  standardizeOptions?: boolean;
} = {}): FormattedTikZResult {
  const {
    roundDecimals = true,
    decimalPlaces = 2,
    groupCoordinates = true,
    addStructuralComments = true,
    standardizeOptions = true,
  } = options;

  let fixedSemicolons = 0;
  let roundedNumbersCount = 0;

  // Extract inner body between \begin{tikzpicture}[...] and \end{tikzpicture}
  const beginMatch = code.match(/\\begin\{tikzpicture\}(\[[^\]]*\])?/);
  const endMatch = code.match(/\\end\{tikzpicture\}/);

  let headerOptions = '[scale=1, font=\\footnotesize, line join=round, line cap=round, >=stealth]';
  if (beginMatch && beginMatch[1]) {
    headerOptions = beginMatch[1];
    if (standardizeOptions && !headerOptions.includes('line join=round')) {
      headerOptions = headerOptions.replace(/\]$/, ', line join=round, line cap=round, >=stealth]');
    }
  }

  let body = code;
  if (beginMatch && endMatch) {
    const startIndex = beginMatch.index! + beginMatch[0].length;
    const endIndex = endMatch.index!;
    body = code.substring(startIndex, endIndex);
  }

  // Split lines and clean comments
  const rawLines = body.split('\n');
  const coordinates: string[] = [];
  const dashedDraws: string[] = [];
  const solidDraws: string[] = [];
  const nodesAndLabels: string[] = [];
  const otherLines: string[] = [];

  for (let rawLine of rawLines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Ignore existing grouping comments
    if (line.startsWith('% ---') || line.startsWith('%%')) continue;

    // Fix missing semicolon for typical commands
    if (
      (line.startsWith('\\draw') || line.startsWith('\\coordinate') || line.startsWith('\\node') || line.startsWith('\\fill') || line.startsWith('\\path')) &&
      !line.endsWith(';') &&
      !line.endsWith('{')
    ) {
      line += ';';
      fixedSemicolons++;
    }

    // Round long floats in coordinates like (2.333333, -1.6666667)
    if (roundDecimals) {
      line = line.replace(/(\-?\d+\.\d{3,})/g, (match) => {
        const num = parseFloat(match);
        if (!isNaN(num)) {
          roundedNumbersCount++;
          const rounded = num.toFixed(decimalPlaces);
          // Remove trailing zeroes if unnecessary: 2.50 -> 2.5
          return parseFloat(rounded).toString();
        }
        return match;
      });
    }

    // Classify line
    if (groupCoordinates && line.startsWith('\\coordinate')) {
      coordinates.push('  ' + line);
    } else if (line.includes('dashed') || line.includes('[dashed')) {
      dashedDraws.push('  ' + line);
    } else if (line.startsWith('\\draw') || line.startsWith('\\filldraw') || line.startsWith('\\path')) {
      solidDraws.push('  ' + line);
    } else if (line.startsWith('\\node') || line.startsWith('\\fill') || line.includes('circle (')) {
      nodesAndLabels.push('  ' + line);
    } else {
      otherLines.push('  ' + line);
    }
  }

  const resultLines: string[] = [];
  resultLines.push(`\\begin{tikzpicture}${headerOptions}`);

  if (groupCoordinates && coordinates.length > 0) {
    if (addStructuralComments) resultLines.push('  % 1. Tọa độ các điểm chính');
    resultLines.push(...coordinates);
    resultLines.push('');
  }

  if (dashedDraws.length > 0) {
    if (addStructuralComments) resultLines.push('  % 2. Cạnh khuất / Nét đứt (dashed)');
    resultLines.push(...dashedDraws);
    resultLines.push('');
  }

  if (solidDraws.length > 0) {
    if (addStructuralComments) resultLines.push('  % 3. Cạnh nhìn thấy & Đồ thị');
    resultLines.push(...solidDraws);
    resultLines.push('');
  }

  if (nodesAndLabels.length > 0) {
    if (addStructuralComments) resultLines.push('  % 4. Điểm mút & Nhãn tên (labels)');
    resultLines.push(...nodesAndLabels);
    resultLines.push('');
  }

  if (otherLines.length > 0) {
    if (addStructuralComments && !groupCoordinates) resultLines.push('  % Các lệnh khác');
    resultLines.push(...otherLines);
  }

  // Remove trailing blank line if any
  while (resultLines[resultLines.length - 1] === '') {
    resultLines.pop();
  }

  resultLines.push('\\end{tikzpicture}');

  return {
    formattedCode: resultLines.join('\n'),
    stats: {
      coordinatesCount: coordinates.length,
      drawCommandsCount: dashedDraws.length + solidDraws.length,
      roundedNumbersCount,
      fixedSemicolons,
    },
  };
}
