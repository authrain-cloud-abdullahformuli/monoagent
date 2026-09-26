const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'monoagent.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
const slice = (start, end) => html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start)));

async function testModelFetch() {
  let request;
  const context = {
    fetchWithRetry: async (url, options, retry) => {
      request = { url, options, retry };
      return { ok: true, json: async () => ({ data: [{ id: 'other' }, { id: 'gpt-new' }, { id: 'gpt-new' }] }) };
    },
    buildProviderApiUrl: (path, provider) => provider.endpoint + path,
    getProviderAuthHeaders: () => ({ Authorization: 'Bearer secret' }),
    Set,
  };
  vm.createContext(context);
  vm.runInContext(slice('async function requestProviderModelList', 'async function fetchModelList'), context);
  const models = await context.requestProviderModelList(
    { type: 'openai_compat', endpoint: 'https://models.test' },
    { retries: 2, filterOpenAiChat: true },
  );
  assert.deepEqual(Array.from(models), ['gpt-new']);
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.retry.retries, 2);

  const elements = {
    setStatus: { textContent: '' },
    setProvider: { value: 'openai_compat' },
    setEndpoint: { value: 'https://models.test' },
    setApiKey: { value: 'secret' },
    setAvailableModels: { innerHTML: '' },
  };
  const pending = [];
  const raceContext = {
    document: { getElementById: id => elements[id] },
    requestProviderModelList: () => new Promise(resolve => pending.push(resolve)),
    getCurrentSelectedModels: () => [],
    isAbortError: error => error?.name === 'AbortError',
    esc: value => value,
    AbortController, Set,
  };
  vm.createContext(raceContext);
  vm.runInContext('let _settingsModelFetchSeq = 0; let _settingsModelFetchController = null;\n'
    + slice('async function fetchModelsIntoSettings', 'function getCurrentSelectedModels'), raceContext);
  const stale = raceContext.fetchModelsIntoSettings();
  const fresh = raceContext.fetchModelsIntoSettings();
  pending[1](['fresh-model']);
  await fresh;
  pending[0](['stale-model']);
  await stale;
  assert.match(elements.setAvailableModels.innerHTML, /fresh-model/);
  assert.doesNotMatch(elements.setAvailableModels.innerHTML, /stale-model/);
}

async function testServiceWorkerBoundary() {
  const listeners = {};
  const context = {
    self: {
      location: new URL('https://app.test/sw.js'),
      registration: { navigationPreload: null },
      clients: { claim: async () => {} },
      skipWaiting() {},
      addEventListener(name, handler) { listeners[name] = handler; },
    },
    caches: { open: async () => ({ match: async () => new Response('cached'), put: async () => {} }), keys: async () => [] },
    fetch: async () => new Response('network'),
    URL, Set, Response,
  };
  vm.runInNewContext(sw, context);
  const dispatch = (request) => {
    let response;
    listeners.fetch({ request, respondWith(value) { response = value; } });
    return response;
  };
  assert.equal(dispatch(new Request('https://api.test/v1/models')), undefined);
  assert.equal(dispatch(new Request('https://app.test/logo.svg', { headers: { Authorization: 'Bearer x' } })), undefined);
  assert.ok(dispatch(new Request('https://app.test/logo.svg')));
  assert.ok(dispatch(new Request('https://cdn.bootcdn.net/ajax/libs/marked/11.1.1/marked.min.js')));
}

function testReasoningToolHistoryWithoutReasoningContent() {
  const context = {
    PROVIDER: 'openai_compat',
    API_MODEL: 'deepseek-reasoner',
    shouldKeepReasoningForModel: () => true,
    buildOpenAIUserContent: () => '',
    applyThinkingToRequestBody: body => body,
  };
  vm.createContext(context);
  vm.runInContext(slice('function assembleRequestBodyFromParts', 'function estimateContextPartTokens'), context);
  const body = context.assembleRequestBodyFromParts({
    systemPrompt: '',
    openaiTools: [],
    projectedMessages: [
      { role: 'user', content: 'build it' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'call_1', name: 'Bash', input: { command: 'python3 build.py' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call_1', content: 'WROTE output.html' }] },
    ],
  });
  assert.equal(body.messages[2].role, 'assistant');
  assert.equal(body.messages[2].tool_calls[0].id, 'call_1');
  assert.equal(body.messages[3].role, 'tool');
  assert.equal(body.messages[3].content, 'WROTE output.html');
}

async function testConcurrentToolUi() {
  const classes = new Set();
  const card = {
    dataset: { tool: 'Odd"] tool' },
    classList: {
      add: value => classes.add(value),
      remove: value => classes.delete(value),
      contains: value => classes.has(value),
    },
    _flashTimer: null,
  };
  let nextTimer = 0;
  const timers = new Map();
  const context = {
    currentRunContext: { convId: 'background' },
    visibleConvId: 'visible',
    isRunVisible: run => run?.convId === context.visibleConvId,
    document: { querySelectorAll: () => [card] },
    setTimeout: fn => { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
  };
  vm.createContext(context);
  vm.runInContext(slice('function flashTool', '// MESSAGE CONSTRUCTION'), context);

  context.flashTool(card.dataset.tool, context.currentRunContext);
  assert.equal(card.classList.contains('active'), false);
  assert.equal(timers.size, 0);

  const visibleRun = { convId: 'visible' };
  context.flashTool(card.dataset.tool, visibleRun);
  const firstTimer = card._flashTimer;
  context.flashTool(card.dataset.tool, visibleRun);
  assert.equal(card.classList.contains('active'), true);
  assert.equal(timers.has(firstTimer), false);
  timers.get(card._flashTimer)();
  assert.equal(card.classList.contains('active'), false);

  const toolUi = slice('function renderToolsGrid()', '// TOOL IMPLEMENTATIONS');
  const grid = { _html: '', writes: 0, set innerHTML(value) { this._html = value; this.writes++; }, get innerHTML() { return this._html; } };
  Object.assign(context, {
    allToolsAnthropic: [{ name: 'Read', description: 'read' }],
    disabledTools: new Set(),
    isToolVisibleInUi: () => true,
    document: { getElementById: () => grid },
    esc: value => value,
    iconHtml: value => value,
  });
  vm.runInContext(toolUi, context);
  context.currentRunContext = { convId: 'background' };
  context.renderToolsGrid();
  assert.equal(grid.writes, 0);
  context.currentRunContext = visibleRun;
  context.renderToolsGrid();
  assert.equal(grid.writes, 1);
  assert.match(grid.innerHTML, /toggleToolEnabled\(this\.dataset\.tool\)/);

  const switchBody = slice('async function switchConversation', 'async function deleteConversation');
  assert.match(switchBody, /renderPlanButton\(\);\s*renderRalphButton\(\);\s*rebuildToolDefs\(\);/);
  const executeBody = slice('async function executeTool', 'async function toolSkillManager');
  assert.ok(executeBody.indexOf('rebuildToolDefs(activeEntryId, { skipRender: true })') < executeBody.indexOf('flashTool(name, run)'));
  const planBody = slice('async function toolExitPlanMode', 'async function wsTestSearch');
  assert.ok(planBody.indexOf('const run = currentRunContext') < planBody.indexOf('await showPlanApprovalModal'));
  assert.ok(planBody.indexOf('activateConversationRun(run)') > planBody.indexOf('await showPlanApprovalModal'));
  assert.match(slice('function showHitlModal', 'function _closeHitlModal'), /if \(_hitlModalResolver\) return Promise\.resolve/);
}

async function testDaytonaReconcile() {
  const remoteWrap = slice('async function _remoteWrap', 'function _parseBoxLine');
  assert.ok(remoteWrap.indexOf('if (before.incomplete)') < remoteWrap.indexOf('syncVfsToRemote'));
  const listFiles = slice('async listFiles(', '// /process/execute uses timeout');
  assert.match(listFiles, /VFS_LIST_COMPLETE/);
  assert.doesNotMatch(listFiles, /\}\s*\|\s*head/);
  for (const [start, end] of [['async function toolReadRemote', 'async function toolWriteRemote'], ['async function toolEditRemote', 'async function toolRead(input)']]) {
    const body = slice(start, end);
    assert.ok(body.indexOf('_reconcileBeforeRemoteFileTool') < body.indexOf('_pushVfsToSandboxIfDirty'));
  }
  let tick = 10;
  const file = (content, modified = ++tick) => ({ type: 'file', content, modified });
  const rootWith = (path, content, modified) => {
    const root = { type: 'dir', children: {} };
    write(path, content, true, root, modified);
    return root;
  };
  const resolve = (path, root = context.vfs) => {
    if (path === '/') return root;
    let node = root;
    for (const part of path.slice(1).split('/')) node = node?.children?.[part];
    return node || null;
  };
  const write = (path, content, _skip, root = context.vfs, modified = ++tick) => {
    const parts = path.slice(1).split('/');
    const name = parts.pop();
    let node = root;
    for (const part of parts) node = node.children[part] ||= { type: 'dir', children: {} };
    node.children[name] = file(content, modified);
    return { ok: true };
  };
  const remove = (path, _skip, root = context.vfs) => {
    const parts = path.slice(1).split('/');
    const name = parts.pop();
    let node = root;
    for (const part of parts) node = node?.children?.[part];
    if (!node?.children?.[name]) return { error: 'not found' };
    delete node.children[name];
    return { ok: true };
  };
  const walk = (_base, callback, root = context.vfs) => {
    const visit = (node, path) => node.type === 'file'
      ? callback(path, node)
      : Object.entries(node.children || {}).forEach(([name, child]) => visit(child, path + '/' + name));
    visit(root, '');
  };
  let listed = [], remoteText = '', listingIncomplete = false, remoteReads = 0, remoteMutations = 0;
  const context = {
    window: { _daytonaSessions: {} },
    visibleConvId: 'other',
    document: { getElementById: () => null },
    vfs: rootWith('/other.txt', 'untouched', 1),
    vfsResolve: resolve,
    vfsWrite: write,
    vfsDelete: remove,
    vfsWalk: walk,
    vfsGetBinary: async () => null,
    vfsWriteBinary: async () => { throw new Error('unexpected binary'); },
    normPath: path => path,
    _unrefVfsSubtree() {},
    _looksLikeText: () => true,
    _shouldSkipSyncPath: () => false,
    _isDaytonaOutputsPath: path => path === '/outputs' || path.startsWith('/outputs/'),
    daytonaClient: {
      listFiles: async () => ({ files: listed, incomplete: listingIncomplete, queryTruncated: false }),
      readFile: async () => { remoteReads++; return new TextEncoder().encode(remoteText); },
      execShell: async () => { remoteMutations++; return { exitCode: 0 }; },
    },
    DAYTONA_WORKSPACE: '/home/daytona',
    DAYTONA_SYNC_MAX_FILES: 2000,
    DAYTONA_SYNC_MAX_BYTES: 100 * 1024 * 1024,
    TextEncoder, TextDecoder, Date, Map, Set,
  };
  vm.createContext(context);
  vm.runInContext(slice('function _daytonaAncestorPaths', 'function _daytonaHeaders'), context);
  vm.runInContext(slice('function _vfsFingerprint', 'function _looksLikeText'), context);

  const session = (localFp, remoteMtime) => ({
    syncedIn: new Map(localFp == null ? [] : [['/src/a.txt', localFp]]),
    syncedOut: new Map(remoteMtime == null ? [] : [['/home/daytona/src/a.txt', remoteMtime]]),
  });
  let owner = rootWith('/src/a.txt', 'old', 1);
  context.window._daytonaSessions.c = session('t:3:1', 1);
  listed = [{ path: '/home/daytona/src/a.txt', size: 6, mtime: 2 }];
  remoteText = 'remote';
  await context.syncVfsFromRemote('c', owner);
  assert.equal(resolve('/src/a.txt', owner).content, 'remote');
  assert.equal(resolve('/other.txt', context.vfs).content, 'untouched');

  owner = rootWith('/src/a.txt', 'local-edit', 3);
  context.window._daytonaSessions.c = session('t:3:1', 1);
  const conflict = await context.syncVfsFromRemote('c', owner);
  assert.equal(resolve('/src/a.txt', owner).content, 'remote');
  assert.equal(resolve(conflict.conflicts[0].localCopy, owner).content, 'local-edit');

  owner = rootWith('/src/a.txt', 'local-edit', 3);
  context.window._daytonaSessions.c = session('t:3:1', 1);
  listed = [];
  const deletion = await context.syncVfsFromRemote('c', owner);
  assert.equal(resolve('/src/a.txt', owner), null);
  assert.equal(resolve(deletion.conflicts[0].localCopy, owner).content, 'local-edit');

  owner = rootWith('/src/a.txt', 'must-survive', 1);
  const incompleteSession = context.window._daytonaSessions.c = session('t:12:1', 1);
  listingIncomplete = true;
  listed = [{ path: '/home/daytona/src/a.txt', size: 6, mtime: 2 }];
  const readsBeforeIncomplete = remoteReads;
  const mutationsBeforeIncomplete = remoteMutations;
  const incomplete = await context.syncVfsFromRemote('c', owner);
  assert.equal(incomplete.incomplete, true);
  assert.equal(resolve('/src/a.txt', owner).content, 'must-survive');
  assert.equal(incompleteSession.syncedIn.has('/src/a.txt'), true);
  assert.equal(remoteReads, readsBeforeIncomplete);
  assert.equal(remoteMutations, mutationsBeforeIncomplete);

  owner = rootWith('/outputs/collision/keep.txt', 'keep', 4);
  context.window._daytonaSessions.c = session(null, null);
  listed = [{ path: '/home/daytona/outputs/collision', size: 11, mtime: 2 }];
  const mutationsBeforeIncompleteConflict = remoteMutations;
  const incompleteConflict = await context.syncVfsFromRemote('c', owner);
  assert.equal(incompleteConflict.incomplete, true);
  assert.equal(resolve('/outputs/collision/keep.txt', owner).content, 'keep');
  assert.equal(remoteMutations, mutationsBeforeIncompleteConflict);
  listingIncomplete = false;

  owner = rootWith('/outputs/a', 'old', 1);
  context.window._daytonaSessions.c = {
    syncedIn: new Map([['/outputs/a', 't:3:1']]),
    syncedOut: new Map([['/home/daytona/outputs/a', 1]]),
  };
  listed = [{ path: '/home/daytona/outputs/a/b.txt', size: 5, mtime: 2 }];
  remoteText = 'child';
  const cleanTypeFlip = await context.syncVfsFromRemote('c', owner);
  assert.equal(resolve('/outputs/a', owner).type, 'dir');
  assert.equal(resolve('/outputs/a/b.txt', owner).content, 'child');
  assert.ok(cleanTypeFlip.deletedPaths.includes('/outputs/a'));
  assert.ok(cleanTypeFlip.changedPaths.includes('/outputs/a/b.txt'));

  owner = rootWith('/outputs/a', 'local-edit', 3);
  context.window._daytonaSessions.c = {
    syncedIn: new Map([['/outputs/a', 't:3:1']]),
    syncedOut: new Map([['/home/daytona/outputs/a', 1]]),
  };
  const dirtyTypeFlip = await context.syncVfsFromRemote('c', owner);
  const localCopy = dirtyTypeFlip.conflicts.find(item => item.path === '/outputs/a').localCopy;
  assert.equal(resolve('/outputs/a/b.txt', owner).content, 'child');
  assert.equal(resolve(localCopy, owner).content, 'local-edit');
  assert.ok(dirtyTypeFlip.deletedPaths.includes('/outputs/a'));
  assert.ok(dirtyTypeFlip.changedPaths.includes(localCopy));

  owner = rootWith('/outputs/collision/keep.txt', 'keep', 4);
  context.window._daytonaSessions.c = session(null, null);
  listed = [{ path: '/home/daytona/outputs/collision', size: 11, mtime: 2 }];
  remoteText = 'remote-file';
  const typeConflict = await context.syncVfsFromRemote('c', owner);
  assert.equal(resolve('/outputs/collision', owner).type, 'dir');
  assert.equal(resolve('/outputs/collision/keep.txt', owner).content, 'keep');
  assert.equal(resolve(typeConflict.conflicts[0].remoteCopy, owner).content, 'remote-file');

  owner = rootWith('/src/dir/keep.txt', 'keep', 4);
  const ancestorSession = context.window._daytonaSessions.c = {
    syncedIn: new Map([['/src/dir/keep.txt', 't:4:4']]),
    syncedOut: new Map([['/home/daytona/src/dir/keep.txt', 1]]),
  };
  listed = [{ path: '/home/daytona/src/dir', size: 11, mtime: 2 }];
  const ancestorConflict = await context.syncVfsFromRemote('c', owner);
  assert.equal(resolve('/src/dir/keep.txt', owner).content, 'keep');
  assert.equal(resolve(ancestorConflict.conflicts[0].remoteCopy, owner).content, 'remote-file');
  assert.equal(ancestorSession.syncedIn.has('/src/dir/keep.txt'), false);

  owner = rootWith('/src/a.txt/keep.txt', 'keep', 4);
  const directorySession = context.window._daytonaSessions.c = {
    syncedIn: new Map([['/src/a.txt', 't:3:1'], ['/src/a.txt/keep.txt', 't:4:4']]),
    syncedOut: new Map([['/home/daytona/src/a.txt', 1], ['/home/daytona/src/a.txt/keep.txt', 1]]),
  };
  listed = [];
  await context.syncVfsFromRemote('c', owner);
  assert.equal(resolve('/src/a.txt/keep.txt', owner).content, 'keep');
  assert.equal(directorySession.syncedIn.has('/src/a.txt/keep.txt'), false);

  owner = { type: 'dir', children: {} };
  context.window._daytonaSessions.c = session(null, null);
  listed = [
    { path: '/home/daytona/tmp/hidden.txt', size: 1, mtime: 1 },
    { path: '/home/daytona/outputs/new.txt', size: 1, mtime: 1 },
  ];
  remoteText = 'x';
  await context.syncVfsFromRemote('c', owner);
  assert.equal(resolve('/tmp/hidden.txt', owner), null);
  assert.equal(resolve('/outputs/new.txt', owner).content, 'x');
}

Promise.all([testModelFetch(), testServiceWorkerBoundary(), testDaytonaReconcile(), testReasoningToolHistoryWithoutReasoningContent(), testConcurrentToolUi()])
  .then(() => console.log('regressions: ok'))
  .catch((error) => { console.error(error); process.exitCode = 1; });
