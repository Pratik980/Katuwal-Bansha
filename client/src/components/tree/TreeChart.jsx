// src/components/tree/TreeChart.jsx
// Draws a family tree from the nested data of GET /families/:id/tree.
// Positions come from layoutTree, so cards never overlap and the connectors
// always meet the cards they belong to. The look of a card stays with the page:
// each page passes its own renderCard.
//
// Two looks:
//   cards – photo cards joined by green lines (the default)
//   book  – names only, thin black lines with arrows and the generation number
//           beside each row, like a page of a printed vanshawali
import { Fragment, forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { layoutTree } from '../../utils/treeLayout';

const LOOKS = {
  cards: { bandHeight: 48, lineColor: '#22c55e', lineWidth: 2, arrows: false, labelGutter: 0 },
  book: { bandHeight: 34, lineColor: '#111827', lineWidth: 1.2, arrows: true, labelGutter: 44 },
};
const ARROW = 6;

// A wide tree opens with its first ancestor in view instead of an empty corner.
const centerOnRoot = (chart) => {
  const rootCard = chart?.querySelector('[data-tree-root]');
  let scroller = chart?.parentElement;
  while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowX)) {
    scroller = scroller.parentElement;
  }
  if (!rootCard || !scroller) return;

  const scrollerBox = scroller.getBoundingClientRect();
  const cardBox = rootCard.getBoundingClientRect();
  const cardCenter = cardBox.left - scrollerBox.left + scroller.scrollLeft + cardBox.width / 2;
  scroller.scrollLeft = Math.max(0, cardCenter - scroller.clientWidth / 2);
};

const MarriageLink = ({ width, look }) => {
  if (look === LOOKS.book) {
    return (
      <div className="flex-none" style={{ width }}>
        <span className="block text-center text-[13px] leading-5 text-gray-500">═</span>
      </div>
    );
  }

  return (
    <div className="relative flex-none" style={{ width }}>
      <span className="absolute left-0 right-0 bottom-1/2 mb-1 text-center text-[8px] text-pink-500 whitespace-nowrap">
        विवाह
      </span>
      <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-pink-400" />
    </div>
  );
};

const ConnectorBand = ({ boxes, width, onToggle, look }) => {
  const parents = boxes.filter((box) => box.childCount > 0);
  if (parents.length === 0) return null;

  const height = look.bandHeight;
  const elbow = look.arrows ? Math.round(height * 0.4) : height / 2;
  const isBook = look === LOOKS.book;

  return (
    <div className="relative" style={{ height }}>
      <svg className="absolute inset-0" width={width} height={height} fill="none" stroke={look.lineColor} strokeWidth={look.lineWidth}>
        {parents
          .filter((box) => box.children.length > 0)
          .map((box) => {
            const drops = box.children.map((child) => child.dropX);
            const from = Math.min(box.stemX, ...drops);
            const to = Math.max(box.stemX, ...drops);
            return (
              <g key={box.node._id}>
                <path d={`M${box.stemX} 0V${elbow}`} />
                {to > from && <path d={`M${from} ${elbow}H${to}`} strokeLinecap="square" />}
                {drops.map((x, index) => (
                  <Fragment key={box.children[index].node._id}>
                    <path d={`M${x} ${elbow}V${look.arrows ? height - ARROW : height}`} />
                    {look.arrows && (
                      <path d={`M${x - 3.5} ${height - ARROW}L${x} ${height}L${x + 3.5} ${height - ARROW}Z`} fill={look.lineColor} stroke="none" />
                    )}
                  </Fragment>
                ))}
              </g>
            );
          })}
      </svg>

      {parents.map((box) =>
        box.collapsed ? (
          <button
            key={box.node._id}
            type="button"
            data-tree-control
            onClick={() => onToggle?.(box.node._id)}
            className={
              isBook
                ? 'absolute top-1 -translate-x-1/2 text-[11px] text-gray-700 hover:text-black flex items-center gap-1 border border-gray-300 bg-white px-2 py-0.5 rounded whitespace-nowrap'
                : 'absolute top-2 -translate-x-1/2 text-xs text-green-600 hover:text-green-700 flex items-center gap-1 bg-green-50 px-3 py-1 rounded-full whitespace-nowrap transition-colors'
            }
            style={{ left: box.stemX }}
          >
            <FaPlus className="text-[8px]" />
            {box.childCount} सन्तान हेर्नुहोस्
          </button>
        ) : (
          <button
            key={box.node._id}
            type="button"
            data-tree-control
            onClick={() => onToggle?.(box.node._id)}
            title="सन्तान लुकाउनुहोस्"
            className={
              isBook
                ? 'absolute top-0.5 -translate-x-1/2 bg-white text-gray-500 border border-gray-300 rounded-full w-3.5 h-3.5 flex items-center justify-center hover:text-black hover:border-gray-500 z-10'
                : 'absolute -top-2.5 -translate-x-1/2 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-green-600 transition-colors z-10'
            }
            style={{ left: box.stemX }}
          >
            <FaMinus className={isBook ? 'text-[6px]' : 'text-[8px]'} />
          </button>
        )
      )}
    </div>
  );
};

const TreeChart = forwardRef(
  (
    {
      roots, cardWidth, linkWidth = 48, siblingGap, rootGap, renderCard, collapsedIds, onToggle,
      variant = 'cards', rowLabel, className = '',
    },
    ref
  ) => {
    const look = LOOKS[variant] || LOOKS.cards;
    const isBook = look === LOOKS.book;

    const layout = useMemo(
      () =>
        layoutTree(roots, {
          cardWidth,
          linkWidth,
          ...(siblingGap !== undefined ? { siblingGap } : {}),
          ...(rootGap !== undefined ? { rootGap } : {}),
          isCollapsed: (id) => collapsedIds?.has(id) ?? false,
        }),
      [roots, cardWidth, linkWidth, siblingGap, rootGap, collapsedIds]
    );

    const chartRef = useRef(null);
    const setChartRef = useCallback(
      (element) => {
        chartRef.current = element;
        if (typeof ref === 'function') ref(element);
        else if (ref) ref.current = element;
      },
      [ref]
    );

    useEffect(() => {
      centerOnRoot(chartRef.current);
    }, [roots, variant]);

    const gutter = rowLabel ? look.labelGutter : 0;

    return (
      <div
        ref={setChartRef}
        className={`relative box-content ${className}`}
        style={{ width: layout.width, paddingLeft: gutter }}
      >
        {layout.rows.map((row, level) => (
          <Fragment key={level}>
            <div className="relative flex items-stretch">
              {rowLabel && (
                <span
                  className="absolute top-0 text-[12px] leading-5 text-gray-700 whitespace-nowrap"
                  style={{ left: -gutter }}
                >
                  {rowLabel(row, level)}
                </span>
              )}
              {row.map((box, index) => {
                const previous = row[index - 1];
                const previousRight = previous ? previous.x + previous.width : 0;
                const hasChildren = box.children.length > 0;

                return (
                  <div
                    key={box.node._id}
                    data-tree-root={level === 0 && index === 0 ? '' : undefined}
                    className="flex flex-none items-stretch"
                    style={{ marginLeft: box.x - previousRight, width: box.width }}
                  >
                    {box.cards.map((person, cardIndex) => {
                      // In the book look a name can be shorter than its row: the line to
                      // the children continues from under the name to the bottom of the row.
                      const carriesStem = isBook && hasChildren && cardIndex === box.mainIndex;
                      return (
                        <Fragment key={person._id}>
                          {cardIndex > 0 && <MarriageLink width={linkWidth} look={look} />}
                          <div className={`flex-none ${isBook ? 'flex flex-col items-center' : ''}`} style={{ width: cardWidth }}>
                            {renderCard(person, { isSpouse: cardIndex !== box.mainIndex })}
                            {carriesStem && (
                              <div className="flex-1" style={{ width: look.lineWidth, backgroundColor: look.lineColor }} />
                            )}
                          </div>
                        </Fragment>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <ConnectorBand boxes={row} width={layout.width} onToggle={onToggle} look={look} />
          </Fragment>
        ))}
      </div>
    );
  }
);

TreeChart.displayName = 'TreeChart';

export default TreeChart;
