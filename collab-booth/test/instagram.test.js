// Exercises the Graph API flow against a local mock server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

const calls = [];
let polls = 0;
const mock = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const params = Object.fromEntries(new URLSearchParams(req.method === 'GET' ? url.search : body));
    calls.push({ method: req.method, path: url.pathname, params });
    const send = (code, json) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(json));
    };
    const p = url.pathname.replace('/v24.0/', '');
    if (p === 'IGUSER/media') {
      const collabs = params.collaborators ? JSON.parse(params.collaborators) : [];
      if (collabs.includes('private_person')) {
        return send(400, { error: { message: 'Invalid collaborator', code: 100 } });
      }
      return send(200, { id: 'CONTAINER1' });
    }
    if (p === 'CONTAINER1') return send(200, { status_code: polls++ < 1 ? 'IN_PROGRESS' : 'FINISHED' });
    if (p === 'IGUSER/media_publish') return send(200, { id: 'MEDIA1' });
    if (p === 'MEDIA1') return send(200, { permalink: 'https://www.instagram.com/p/abc/' });
    if (p === 'IGUSER/content_publishing_limit') return send(200, { data: [{ quota_usage: 97, config: { quota_total: 100 } }] });
    send(404, { error: { message: 'unknown ' + p } });
  });
});

let ig;
before(async () => {
  await new Promise((r) => mock.listen(0, r));
  process.env.GRAPH_API_HOST = `http://127.0.0.1:${mock.address().port}`;
  process.env.GRAPH_API_VERSION = 'v24.0';
  process.env.IG_USER_ID = 'IGUSER';
  process.env.IG_ACCESS_TOKEN = 'TOKEN';
  ig = await import('../server/instagram.js');
});
after(() => mock.close());

test('publishes with the guest as collaborator', async () => {
  calls.length = 0;
  polls = 0;
  const r = await ig.publishPhoto({ testMode: false, imageUrl: 'https://x/media/1.jpg', caption: 'hi @jane', handle: 'jane', photoTags: [] });
  assert.equal(r.permalink, 'https://www.instagram.com/p/abc/');
  assert.equal(r.collabFailed, false);
  const create = calls.find((c) => c.path.endsWith('/media'));
  assert.deepEqual(JSON.parse(create.params.collaborators), ['jane']);
  assert.equal(create.params.image_url, 'https://x/media/1.jpg');
  assert.ok(calls.some((c) => c.path.endsWith('/media_publish') && c.params.creation_id === 'CONTAINER1'));
});

test('falls back to publishing without collaborator when invite is rejected', async () => {
  calls.length = 0;
  polls = 0;
  const r = await ig.publishPhoto({ testMode: false, imageUrl: 'https://x/m.jpg', caption: 'c', handle: 'private_person', photoTags: [] });
  assert.equal(r.collabFailed, true);
  assert.equal(r.mediaId, 'MEDIA1');
  const creates = calls.filter((c) => c.path.endsWith('/media'));
  assert.equal(creates.length, 2);
  assert.equal(creates[1].params.collaborators, undefined);
});

test('reads the publishing limit', async () => {
  const l = await ig.publishingLimit(false, { fresh: true });
  assert.deepEqual(l, { ok: true, used: 97, total: 100, remaining: 3 });
});
