// src/utils/treeLayout.js
// Works out where every card of the family tree goes.
//
// A node is one couple unit: the main person plus spouse cards beside them.
// Each subtree gets its own horizontal slab, so cards can never overlap however
// large the tree grows, and every connector end point is known exactly:
//   stemX – where the line to the children leaves: the main person (the son or
//           daughter of the family), never the spouse or the space between them
//   dropX – where the line from the parents arrives: the same main person

const arrangeCouple = (node, cardWidth, linkWidth) => {
  const spouses = node.spouses || [];
  // With several spouses the main person stands between them.
  const cards = spouses.length >= 2 ? [spouses[0], node, ...spouses.slice(1)] : [node, ...spouses];
  const mainIndex = cards.indexOf(node);
  const mainCenter = mainIndex * (cardWidth + linkWidth) + cardWidth / 2;

  return {
    cards,
    mainIndex,
    width: cards.length * cardWidth + (cards.length - 1) * linkWidth,
    mainCenter,
    // Descent follows the family's own member, so the children's line starts under them
    stem: mainCenter,
  };
};

export const layoutTree = (roots = [], options = {}) => {
  const {
    cardWidth,
    linkWidth = 48,
    siblingGap = 24,
    rootGap = 64,
    isCollapsed = () => false,
  } = options;

  const measure = (node, level) => {
    const couple = arrangeCouple(node, cardWidth, linkWidth);
    const childNodes = node.children || [];
    const collapsed = childNodes.length > 0 && isCollapsed(node._id);
    const children = collapsed ? [] : childNodes.map((child) => measure(child, level + 1));

    const box = {
      node,
      level,
      ...couple,
      children,
      childCount: childNodes.length,
      collapsed,
      coupleLeft: 0,
      subtreeWidth: couple.width,
    };

    if (children.length === 0) return box;

    let cursor = 0;
    children.forEach((child) => {
      child.offset = cursor;
      cursor += child.subtreeWidth + siblingGap;
    });
    const childrenWidth = cursor - siblingGap;

    // Centre the couple over the points where its children's lines arrive.
    const dropOf = (child) => child.offset + child.coupleLeft + child.mainCenter;
    const stemX = (dropOf(children[0]) + dropOf(children[children.length - 1])) / 2;

    let coupleLeft = stemX - couple.stem;
    let shift = 0;
    if (coupleLeft < 0) {
      shift = -coupleLeft;
      coupleLeft = 0;
    }
    children.forEach((child) => {
      child.offset += shift;
    });

    box.coupleLeft = coupleLeft;
    box.subtreeWidth = Math.max(coupleLeft + couple.width, childrenWidth + shift);
    return box;
  };

  const rows = [];
  const place = (box, left) => {
    box.x = Math.round(left + box.coupleLeft);
    box.stemX = box.x + Math.round(box.stem);
    box.dropX = box.x + Math.round(box.mainCenter);
    (rows[box.level] ||= []).push(box);
    box.children.forEach((child) => place(child, left + child.offset));
  };

  let cursor = 0;
  roots.forEach((root) => {
    const box = measure(root, 0);
    place(box, cursor);
    cursor += box.subtreeWidth + rootGap;
  });

  return {
    width: Math.max(0, Math.ceil(cursor - rootGap)),
    rows,
  };
};

export const collectParentIds = (roots = []) => {
  const ids = [];
  const walk = (nodes) =>
    nodes.forEach((node) => {
      if (node.children?.length > 0) {
        ids.push(node._id);
        walk(node.children);
      }
    });
  walk(roots);
  return ids;
};
