import { Suspense } from 'react';
import { usePath, Link } from './shared/router.jsx';
import { UnlockProvider } from './shared/unlock.jsx';
import Layout from './Layout.jsx';
import Home from './Home.jsx';
import { findTool } from './registry.js';

function NotFound() {
  return (
    <div className="py-16 text-center space-y-3">
      <h1 className="text-3xl font-extrabold text-slate-900">Page not found</h1>
      <p className="text-slate-600">That tool does not exist.</p>
      <Link to="/" className="inline-block font-bold text-[#f52e01] hover:underline">Back to all tools</Link>
    </div>
  );
}

export default function App() {
  const path = usePath();
  const match = path.match(/^\/tools\/([a-z0-9-]+)$/);
  const tool = match ? findTool(match[1]) : null;
  let body; let title = '';
  if (path === '/') body = <Home />;
  else if (tool) {
    const Tool = tool.Component;
    title = tool.title;
    body = (
      <>
        <Link to="/" className="inline-block text-sm font-bold text-slate-600 hover:text-slate-900">&larr; All tools</Link>
        <Suspense fallback={<div className="py-16 text-center text-slate-600">Loading...</div>}><Tool /></Suspense>
      </>
    );
  } else body = <NotFound />;
  return <UnlockProvider><Layout title={title}>{body}</Layout></UnlockProvider>;
}
