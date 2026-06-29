"use client";

import { CELLS, TRANSITIONS, WIN_SQUARE, ROW_LENGTH } from "@/game/board";

interface PlayerMarker {
  position: number;
  color: string;
  name: string;
  isActive: boolean;
}

interface Props {
  position: number;
  history: { cellNumber: number | null }[];
  playerMarkers?: PlayerMarker[];
}

function cellToGrid(n: number): { col: number; row: number } {
  const rowIndex = Math.floor((n - 1) / ROW_LENGTH);
  const posInRow = (n - 1) % ROW_LENGTH;
  const col = rowIndex % 2 === 0 ? posInRow : ROW_LENGTH - 1 - posInRow;
  return { col, row: rowIndex };
}

const CELL_SIZE = 44;
const PADDING = 8;
const COLS = 9;
const ROWS = 8;
const W = COLS * CELL_SIZE + PADDING * 2;
const H = ROWS * CELL_SIZE + PADDING * 2;

function gridToXY(col: number, row: number) {
  const x = PADDING + col * CELL_SIZE + CELL_SIZE / 2;
  const y = PADDING + (ROWS - 1 - row) * CELL_SIZE + CELL_SIZE / 2;
  return { x, y };
}

export default function Board({ position, history, playerMarkers }: Props) {
  const visited = new Set(history.map((m) => m.cellNumber).filter(Boolean) as number[]);
  const isMultiplayer = playerMarkers && playerMarkers.length > 1;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[500px] mx-auto"
        style={{ minWidth: "300px" }}
      >
        <rect x={0} y={0} width={W} height={H} fill="#08090f" />

        {/* Змеи */}
        {TRANSITIONS.filter((t) => t.type === "snake").map((t) => {
          const from = cellToGrid(t.from);
          const to = cellToGrid(t.to);
          const p1 = gridToXY(from.col, from.row);
          const p2 = gridToXY(to.col, to.row);
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2 - 20;
          return (
            <g key={`snake-${t.from}-${t.to}`}>
              <path
                d={`M${p1.x},${p1.y} Q${mx},${my} ${p2.x},${p2.y}`}
                fill="none" stroke="#b04a4a" strokeWidth={2} strokeDasharray="4,2" opacity={0.7}
              />
              <circle cx={p1.x} cy={p1.y} r={3} fill="#b04a4a" opacity={0.9} />
              <polygon
                points={`${p2.x},${p2.y - 5} ${p2.x - 4},${p2.y + 4} ${p2.x + 4},${p2.y + 4}`}
                fill="#b04a4a" opacity={0.9}
              />
            </g>
          );
        })}

        {/* Стрелы */}
        {TRANSITIONS.filter((t) => t.type === "arrow").map((t) => {
          const from = cellToGrid(t.from);
          const to = cellToGrid(t.to);
          const p1 = gridToXY(from.col, from.row);
          const p2 = gridToXY(to.col, to.row);
          const mx = (p1.x + p2.x) / 2 + 15;
          const my = (p1.y + p2.y) / 2;
          return (
            <g key={`arrow-${t.from}-${t.to}`}>
              <defs>
                <marker id={`arr-${t.from}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 z" fill="#5d9e8e" opacity={0.8} />
                </marker>
              </defs>
              <path
                d={`M${p1.x},${p1.y} Q${mx},${my} ${p2.x},${p2.y}`}
                fill="none" stroke="#5d9e8e" strokeWidth={2}
                markerEnd={`url(#arr-${t.from})`} opacity={0.7}
              />
            </g>
          );
        })}

        {/* Клетки */}
        {CELLS.map((cell) => {
          const { col, row } = cellToGrid(cell.number);
          const { x, y } = gridToXY(col, row);
          const isCurrent = !isMultiplayer && cell.number === position;
          const isVisited = visited.has(cell.number);
          const isWin = cell.number === WIN_SQUARE;
          const hasTransition = TRANSITIONS.find((t) => t.from === cell.number);

          // В мультиплеере — подсветка если хоть один активный игрок здесь
          const activeMarker = playerMarkers?.find((m) => m.position === cell.number && m.isActive);
          const anyMarker = playerMarkers?.find((m) => m.position === cell.number);

          let bg = "#0d0f1a";
          let stroke = "#1a1d30";
          let textColor = "#7b8099";

          if (isWin) { bg = "#1a2d2a"; stroke = "#5d9e8e"; textColor = "#73b8a6"; }
          else if (hasTransition?.type === "snake") { bg = "#1f1010"; stroke = "#8b3a3a33"; }
          else if (hasTransition?.type === "arrow") { bg = "#0f1f1c"; stroke = "#4a7c6f33"; }
          if (isVisited) { textColor = "#c8cde0"; stroke = "#222640"; }
          if (isCurrent) { bg = "#1e1b0e"; stroke = "#d4a853"; textColor = "#d4a853"; }
          if (isMultiplayer && activeMarker) { stroke = activeMarker.color; }
          else if (isMultiplayer && anyMarker) { stroke = "#222640"; }

          const half = CELL_SIZE / 2 - 2;
          const markersOnCell = playerMarkers?.filter((m) => m.position === cell.number) ?? [];

          return (
            <g key={cell.number}>
              <rect
                x={x - half} y={y - half}
                width={half * 2} height={half * 2}
                fill={bg} stroke={stroke}
                strokeWidth={isCurrent || (isMultiplayer && activeMarker) ? 1.5 : 1}
                rx={2}
              />
              <text
                x={x} y={y - 5}
                textAnchor="middle" fill={textColor}
                fontSize={isCurrent ? 10 : 9}
                fontWeight={isCurrent ? "bold" : "normal"}
              >
                {cell.number}
              </text>

              {/* Одиночная игра — анимированная точка */}
              {isCurrent && (
                <circle cx={x} cy={y + 6} r={3} fill="#d4a853" opacity={0.9}>
                  <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Мультиплеер — цветные кружки */}
              {isMultiplayer && markersOnCell.length > 0 && (
                <g>
                  {markersOnCell.map((m, mi) => {
                    const total = markersOnCell.length;
                    const offsetX = total > 1 ? (mi - (total - 1) / 2) * 6 : 0;
                    return (
                      <circle
                        key={m.name}
                        cx={x + offsetX}
                        cy={y + 7}
                        r={m.isActive ? 4 : 3}
                        fill={m.color}
                        opacity={m.isActive ? 1 : 0.65}
                      >
                        {m.isActive && (
                          <>
                            <animate attributeName="r" values="4;5.5;4" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
                          </>
                        )}
                      </circle>
                    );
                  })}
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-[#7b8099]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#b04a4a]" style={{ display: "inline-block" }} />
          Змея
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#5d9e8e]" style={{ display: "inline-block" }} />
          Стрела
        </span>
        {!isMultiplayer && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d4a853] inline-block" />
            Вы здесь
          </span>
        )}
      </div>
    </div>
  );
}
