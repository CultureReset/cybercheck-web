import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api.js';
import endpoints from '../lib/endpoints.js';
import { discover } from '../lib/discover.js';
import { useAsync } from '../lib/useAsync.js';
import { SINGLE_BUSINESS_SLUG } from '../config.js';
import Hero from '../blocks/Hero.jsx';
import Block from '../blocks/Block.jsx';
import { Spinner, ErrorBox, Empty } from '../ui/index.jsx';

/**
 * A business's public page.
 *
 * The whole page is: fetch, discover, render. There is no per-industry
 * template and no list of sections. A restaurant, a charter boat, a dentist
 * and a storage yard all come through here, and each one gets exactly the
 * sections it has rows for.
 *
 * The slug comes from the URL on a directory deployment and from the
 * environment on a single-business deployment. Neither is compiled in.
 */
export default function PublicProfile() {
  const params = useParams();
  const slug = SINGLE_BUSINESS_SLUG || params.slug;

  const { data, error, loading, reload } = useAsync(
    () => api.get(endpoints.public.entity(slug), { auth: false }),
    [slug]
  );

  const { record, blocks } = useMemo(() => discover(data), [data]);

  if (loading) return <div className="wrap stack" style={{ paddingTop: 24 }}><Spinner rows={4} /></div>;
  if (error) {
    return (
      <div className="wrap" style={{ paddingTop: 24 }}>
        <ErrorBox error={error} onRetry={reload} />
      </div>
    );
  }
  if (!data) return <Empty title="No such business." />;

  return (
    <div className="wrap stack" style={{ paddingTop: 24 }}>
      <Hero record={record} />

      <div className="split">
        <div className="stack" style={{ gap: 34 }}>
          {blocks.length === 0
            ? <Empty title="This page has no content yet." hint="The owner has not added anything." />
            : blocks.map((block) => <Block key={block.key} block={block} />)}
        </div>

        <aside className="rail">
          <nav className="toc" aria-label="Sections">
            {blocks.map((b) => (
              <a key={b.key} href={`#s-${b.key}`}>{b.title}</a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
