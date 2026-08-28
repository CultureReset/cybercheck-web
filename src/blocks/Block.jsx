import React from 'react';
import { rendererFor } from './registry.jsx';
import { shapeOf } from '../lib/shape.js';
import { titleFor } from '../lib/discover.js';

/**
 * Renders one discovered block: a heading, then whichever renderer the
 * block's shape resolves to.
 *
 * `actions` lets a surface put something in the heading — the owner
 * dashboard puts an Edit button there, the public profile puts nothing —
 * which is how both surfaces share one renderer set instead of each growing
 * its own copy.
 */
export default function Block({ block, actions = null, headed = true }) {
  const Renderer = rendererFor(block.shape);

  // A grouped block renders its children through this same component, so a
  // section of sections still gets shape detection all the way down.
  const renderChild = (rows, childKey) => {
    const { shape, profile, nested } = shapeOf(rows);
    const Child = rendererFor(shape);
    return (
      <Child
        block={{ key: childKey, title: titleFor(childKey), rows, shape, profile, nested: nested || null, count: rows.length }}
        renderChild={renderChild}
      />
    );
  };

  return (
    <section className="block" id={`s-${block.key}`}>
      {headed ? (
        <div className="block-head">
          <h2>{block.title}</h2>
          {actions}
          <span className="dim">{block.count}</span>
        </div>
      ) : null}
      <Renderer block={block} renderChild={renderChild} />
    </section>
  );
}
