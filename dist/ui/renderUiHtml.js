export function renderUiHtml(config) {
    const serializedConfig = JSON.stringify(config);
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SMR Sender UI</title>
    <style>
      :root {
        --bg: #f7f3ea;
        --panel: #fffdfa;
        --ink: #1e1c18;
        --muted: #6c665c;
        --line: #d8cfbf;
        --accent: #1b6b57;
        --accent-soft: #d9efe8;
        --warn: #8e5b08;
        --warn-soft: #faedd2;
        --danger: #8d2e2e;
        --danger-soft: #f6dede;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(27, 107, 87, 0.08), transparent 32%),
          linear-gradient(180deg, #fbf8f1 0%, var(--bg) 100%);
      }

      .shell {
        max-width: 1440px;
        margin: 0 auto;
        padding: 24px;
      }

      .hero {
        display: grid;
        gap: 14px;
        margin-bottom: 20px;
      }

      .hero h1 {
        margin: 0;
        font-size: 2rem;
      }

      .hero p {
        margin: 0;
        color: var(--muted);
        max-width: 900px;
      }

      .grid {
        display: grid;
        grid-template-columns: minmax(360px, 520px) minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 18px;
        box-shadow: 0 18px 45px rgba(43, 34, 19, 0.07);
      }

      .panel h2, .panel h3 {
        margin: 0 0 10px;
      }

      .stack {
        display: grid;
        gap: 16px;
      }

      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: #fff;
        font-size: 0.92rem;
      }

      .chip.good {
        border-color: #9bcbbf;
        background: var(--accent-soft);
      }

      .chip.warn {
        border-color: #d6bb72;
        background: var(--warn-soft);
      }

      .chip.danger {
        border-color: #d0a0a0;
        background: var(--danger-soft);
      }

      textarea, input[type="text"] {
        width: 100%;
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 12px;
        font: 13px/1.5 "SFMono-Regular", "Menlo", monospace;
        background: #fff;
        color: var(--ink);
      }

      textarea {
        min-height: 320px;
        resize: vertical;
      }

      button {
        border: 0;
        border-radius: 12px;
        padding: 11px 15px;
        font: inherit;
        cursor: pointer;
        background: #ece3d3;
        color: var(--ink);
      }

      button.primary {
        background: var(--accent);
        color: #fff;
      }

      button.secondary {
        background: #efe6d8;
      }

      button.warn {
        background: #b77817;
        color: #fff;
      }

      button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .preset-list, .choice-list, .summary-list {
        display: grid;
        gap: 10px;
      }

      .preset-item, .choice-item, .summary-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 12px;
        background: #fff;
      }

      .choice-item strong,
      .preset-item strong {
        display: block;
        margin-bottom: 4px;
      }

      .muted {
        color: var(--muted);
      }

      .label {
        font-size: 0.84rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted);
      }

      pre {
        margin: 0;
        overflow: auto;
        padding: 12px;
        border-radius: 12px;
        background: #f5efe3;
        font: 12px/1.55 "SFMono-Regular", "Menlo", monospace;
      }

      .two-col {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .hidden {
        display: none;
      }

      .field-list {
        margin: 8px 0 0;
        padding-left: 18px;
      }

      .field-list li {
        margin-bottom: 4px;
      }

      @media (max-width: 1080px) {
        .grid { grid-template-columns: 1fr; }
        .two-col { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="hero">
        <h1>Sender Preview Console</h1>
        <p>
          Preview is enforced first for every material payload change. Numeric choices can patch the current request,
          but they never bypass preview.
        </p>
      </section>

      <div class="grid">
        <section class="stack">
          <div class="panel stack">
            <div>
              <h2>Runtime</h2>
              <div class="row" id="runtime-chips"></div>
            </div>
            <div>
              <div class="label">API Base URL</div>
              <div id="api-base" class="muted"></div>
            </div>
            <div>
              <div class="label">Health</div>
              <div id="health-status" class="muted">Checking...</div>
            </div>
          </div>

          <div class="panel stack">
            <div>
              <h2>Presets</h2>
              <p class="muted">Verified request shapes only. Loading a preset resets preview freshness.</p>
            </div>
            <div id="preset-list" class="preset-list"></div>
          </div>

          <div class="panel stack">
            <div class="row" style="justify-content: space-between; align-items: center;">
              <div>
                <h2>Working Request</h2>
                <p class="muted">Paste or edit the current request JSON. Any material change makes preview stale.</p>
              </div>
              <button id="save-local" class="secondary">Save Local</button>
            </div>
            <textarea id="request-editor" spellcheck="false"></textarea>
            <div class="row">
              <button id="preview-button" class="primary">Preview</button>
              <button id="execute-button" class="warn">Execute</button>
              <button id="reset-button" class="secondary">Reset Interaction</button>
            </div>
            <div id="editor-message" class="muted"></div>
          </div>
        </section>

        <section class="stack">
          <div class="panel stack">
            <div>
              <h2>Interaction</h2>
              <div class="row" id="state-chips"></div>
            </div>
            <div>
              <div class="label">Message</div>
              <div id="interaction-message"></div>
            </div>
            <div>
              <div class="label">Next Step</div>
              <div id="interaction-next-step" class="muted"></div>
            </div>
            <div id="choice-list" class="choice-list"></div>
            <div id="recheck-input-panel" class="hidden stack">
              <div class="label">Minimal Recheck Input</div>
              <input id="recheck-input" type="text" placeholder="Enter confirmed patient ID" />
              <div class="row">
                <button id="apply-recheck-button" class="primary">Patch And Preview</button>
                <button id="cancel-recheck-button" class="secondary">Cancel</button>
              </div>
            </div>
          </div>

          <div class="panel stack">
            <div>
              <h2>Readable Preview</h2>
              <p class="muted">Derived from current runtime truth plus representative fields from supported payload keys only.</p>
            </div>
            <div id="readable-preview" class="summary-list"></div>
          </div>

          <div class="panel stack">
            <h2>Raw JSON</h2>
            <div class="two-col">
              <div class="stack">
                <div class="label">Current Outgoing Request</div>
                <pre id="current-request-json"></pre>
              </div>
              <div class="stack">
                <div class="label">Latest Preview Request</div>
                <pre id="latest-preview-request-json"></pre>
              </div>
              <div class="stack">
                <div class="label">Latest Preview Response</div>
                <pre id="latest-preview-response-json"></pre>
              </div>
              <div class="stack">
                <div class="label">Latest Execute Response</div>
                <pre id="latest-execute-response-json"></pre>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <script>
      const CONFIG = ${serializedConfig};
      const STORAGE_KEYS = {
        workingRequest: 'smr.ui.workingRequest',
        recentRequests: 'smr.ui.recentRequests'
      };

      const state = {
        workingRequest: null,
        lastPreviewedRequest: null,
        latestPreviewRequest: null,
        latestPreviewResponse: null,
        latestExecuteResponse: null,
        parseError: '',
        presets: [],
        pendingRecheckChoice: false
      };

      const elements = {
        runtimeChips: document.getElementById('runtime-chips'),
        apiBase: document.getElementById('api-base'),
        healthStatus: document.getElementById('health-status'),
        presetList: document.getElementById('preset-list'),
        requestEditor: document.getElementById('request-editor'),
        previewButton: document.getElementById('preview-button'),
        executeButton: document.getElementById('execute-button'),
        resetButton: document.getElementById('reset-button'),
        saveLocal: document.getElementById('save-local'),
        editorMessage: document.getElementById('editor-message'),
        stateChips: document.getElementById('state-chips'),
        interactionMessage: document.getElementById('interaction-message'),
        interactionNextStep: document.getElementById('interaction-next-step'),
        choiceList: document.getElementById('choice-list'),
        readablePreview: document.getElementById('readable-preview'),
        recheckInputPanel: document.getElementById('recheck-input-panel'),
        recheckInput: document.getElementById('recheck-input'),
        applyRecheckButton: document.getElementById('apply-recheck-button'),
        cancelRecheckButton: document.getElementById('cancel-recheck-button'),
        currentRequestJson: document.getElementById('current-request-json'),
        latestPreviewRequestJson: document.getElementById('latest-preview-request-json'),
        latestPreviewResponseJson: document.getElementById('latest-preview-response-json'),
        latestExecuteResponseJson: document.getElementById('latest-execute-response-json')
      };

      boot().catch((error) => {
        elements.editorMessage.textContent = error instanceof Error ? error.message : String(error);
      });

      async function boot() {
        elements.apiBase.textContent = window.location.origin;
        wireEvents();
        await Promise.all([loadRuntimeInfo(), loadPresets(), loadInitialRequest()]);
        render();
      }

      function wireEvents() {
        elements.requestEditor.addEventListener('input', handleEditorInput);
        elements.previewButton.addEventListener('click', handlePreview);
        elements.executeButton.addEventListener('click', handleExecute);
        elements.resetButton.addEventListener('click', resetInteraction);
        elements.saveLocal.addEventListener('click', saveWorkingRequestToStorage);
        elements.applyRecheckButton.addEventListener('click', applyRecheckChoice);
        elements.cancelRecheckButton.addEventListener('click', () => {
          state.pendingRecheckChoice = false;
          elements.recheckInput.value = '';
          render();
        });
      }

      async function loadRuntimeInfo() {
        try {
          const info = await fetchJson(CONFIG.runtimeInfoPath, { method: 'GET' });
          const health = await fetchJson(CONFIG.healthPath, { method: 'GET' });
          renderRuntimeInfo(info, health);
        } catch (error) {
          elements.healthStatus.textContent = 'Unable to load runtime info.';
        }
      }

      async function loadPresets() {
        const response = await fetchJson(CONFIG.presetsPath, { method: 'GET' });
        state.presets = Array.isArray(response.presets) ? response.presets : [];
      }

      async function loadInitialRequest() {
        const saved = window.localStorage.getItem(STORAGE_KEYS.workingRequest);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            state.workingRequest = sanitizeWorkingRequest(parsed);
            elements.requestEditor.value = prettyJson(state.workingRequest);
            return;
          } catch {
          }
        }

        if (state.presets[0]) {
          loadPreset(state.presets[0].id);
        } else {
          elements.requestEditor.value = '';
        }
      }

      function renderRuntimeInfo(info, health) {
        const chips = [];
        chips.push(chip('Provider: ' + (info.defaultProviderMode || 'unknown'), 'good'));
        chips.push(chip('Proxy Auth: ' + (info.trustProxyAuth ? 'on' : 'off'), info.trustProxyAuth ? 'warn' : 'good'));
        chips.push(chip('Topology: Worker -> Node', 'good'));
        elements.runtimeChips.innerHTML = chips.join('');
        elements.healthStatus.textContent = health && health.ok ? 'Healthy' : 'Health check failed';
      }

      function handleEditorInput() {
        state.pendingRecheckChoice = false;

        if (!elements.requestEditor.value.trim()) {
          state.workingRequest = null;
          state.parseError = 'Request JSON is empty.';
          render();
          return;
        }

        try {
          state.workingRequest = sanitizeWorkingRequest(JSON.parse(elements.requestEditor.value));
          state.parseError = '';
        } catch (error) {
          state.parseError = error instanceof Error ? error.message : String(error);
        }

        render();
      }

      async function handlePreview() {
        if (!state.workingRequest || state.parseError) {
          renderMessage('Valid request JSON is required before preview.');
          return;
        }

        const previewRequest = sanitizeWorkingRequest(state.workingRequest);
        state.latestPreviewRequest = previewRequest;
        state.lastPreviewedRequest = previewRequest;
        state.latestPreviewResponse = await fetchJson(CONFIG.previewPath, {
          method: 'POST',
          body: JSON.stringify(previewRequest),
          headers: { 'content-type': 'application/json' }
        });
        state.latestExecuteResponse = null;
        state.pendingRecheckChoice = false;
        render();
      }

      async function handleExecute() {
        const gate = deriveExecutionGate();
        if (!gate.executeAllowed || !state.workingRequest) {
          renderMessage(gate.reason);
          return;
        }

        const executeRequest = buildExecuteRequest(state.workingRequest);
        state.latestExecuteResponse = await fetchJson(CONFIG.executePath, {
          method: 'POST',
          body: JSON.stringify(executeRequest),
          headers: { 'content-type': 'application/json' }
        });
        render();
      }

      function resetInteraction() {
        state.lastPreviewedRequest = null;
        state.latestPreviewRequest = null;
        state.latestPreviewResponse = null;
        state.latestExecuteResponse = null;
        state.pendingRecheckChoice = false;
        elements.recheckInput.value = '';
        render();
      }

      function saveWorkingRequestToStorage() {
        if (!state.workingRequest) {
          renderMessage('Nothing to save yet.');
          return;
        }

        window.localStorage.setItem(
          STORAGE_KEYS.workingRequest,
          JSON.stringify(sanitizeWorkingRequest(state.workingRequest))
        );
        renderMessage('Saved current request to local storage.');
      }

      function loadPreset(presetId) {
        const preset = state.presets.find((item) => item.id === presetId);
        if (!preset) {
          return;
        }

        state.workingRequest = sanitizeWorkingRequest(preset.request);
        elements.requestEditor.value = prettyJson(state.workingRequest);
        state.parseError = '';
        resetInteraction();
        renderMessage('Loaded preset: ' + preset.label);
      }

      function deriveExecutionGate() {
        if (!state.workingRequest || !state.latestPreviewResponse || !state.lastPreviewedRequest) {
          return {
            previewState: 'no preview yet',
            executeAllowed: false,
            reason: 'Preview is required before execution.'
          };
        }

        const previewCurrent =
          previewIdentity(state.workingRequest) === previewIdentity(state.lastPreviewedRequest);

        if (!previewCurrent) {
          return {
            previewState: 'preview stale due to payload change',
            executeAllowed: false,
            reason: 'Preview is stale because the payload changed.'
          };
        }

        switch (state.latestPreviewResponse.terminalStatus) {
          case 'preview_pending_confirmation':
            if (
              state.latestPreviewResponse.requiresConfirmation === true &&
              state.latestPreviewResponse.readiness === 'execution_ready'
            ) {
              return {
                previewState: 'execute allowed',
                executeAllowed: true,
                reason: 'Preview is current and execution is unlocked.'
              };
            }

            return {
              previewState: 'preview ready',
              executeAllowed: false,
              reason: 'Preview is current, but the runtime is not execution-ready.'
            };
          case 'correction_required':
            return {
              previewState: 'correction required',
              executeAllowed: false,
              reason: 'A correction step is required before execution.'
            };
          case 'recheck_required':
            return {
              previewState: 'recheck required',
              executeAllowed: false,
              reason: 'A recheck step is required before execution.'
            };
          case 'hard_stop':
          case 'blocked_before_write':
          case 'execution_failed':
            return {
              previewState: 'execute locked until preview',
              executeAllowed: false,
              reason: 'Execution is blocked for the current payload.'
            };
          case 'no_op':
            return {
              previewState: 'no-op',
              executeAllowed: false,
              reason: 'No meaningful write is available.'
            };
          case 'executed':
            return {
              previewState: 'executed',
              executeAllowed: false,
              reason: 'This payload has already been executed.'
            };
          default:
            return {
              previewState: 'preview ready',
              executeAllowed: false,
              reason: 'Preview is current, but execution is not available.'
            };
        }
      }

      function render() {
        const gate = deriveExecutionGate();
        renderPresets();
        renderState(gate);
        renderInteraction(gate);
        renderReadablePreview();
        renderRawJson();

        elements.previewButton.disabled = !state.workingRequest || !!state.parseError;
        elements.executeButton.disabled = !gate.executeAllowed;
        elements.editorMessage.textContent = state.parseError || gate.reason;
      }

      function renderPresets() {
        elements.presetList.innerHTML = state.presets.map((preset) => {
          return '<div class="preset-item">' +
            '<strong>' + escapeHtml(preset.label) + '</strong>' +
            '<div class="muted">' + escapeHtml(preset.description) + '</div>' +
            '<div class="row" style="margin-top:8px;"><button data-preset-id="' + escapeHtml(preset.id) + '">Load</button></div>' +
          '</div>';
        }).join('');

        elements.presetList.querySelectorAll('button[data-preset-id]').forEach((button) => {
          button.addEventListener('click', () => loadPreset(button.getAttribute('data-preset-id')));
        });
      }

      function renderState(gate) {
        const response = state.latestPreviewResponse || state.latestExecuteResponse;
        const chips = [];
        chips.push(chip('Preview State: ' + gate.previewState, gate.executeAllowed ? 'good' : 'warn'));
        chips.push(chip('Execute: ' + (gate.executeAllowed ? 'allowed' : 'locked'), gate.executeAllowed ? 'good' : 'danger'));

        if (response) {
          chips.push(chip('apiState: ' + response.apiState, 'good'));
          chips.push(chip('terminalStatus: ' + response.terminalStatus, response.success ? 'good' : 'danger'));
          chips.push(chip('didWrite: ' + String(response.didWrite), response.didWrite ? 'warn' : 'good'));
        }

        elements.stateChips.innerHTML = chips.join('');
      }

      function renderInteraction(gate) {
        const response = state.latestPreviewResponse || state.latestExecuteResponse;
        if (!response) {
          elements.interactionMessage.textContent = 'Load a preset or paste a request, then preview first.';
          elements.interactionNextStep.textContent = 'Preview is mandatory before any execution path.';
          elements.choiceList.innerHTML = '';
          elements.recheckInputPanel.classList.add('hidden');
          return;
        }

        elements.interactionMessage.textContent = response.message || '';
        elements.interactionNextStep.textContent = response.nextStepHint || gate.reason;

        const menu = buildMenu(response);
        elements.choiceList.innerHTML = menu.map((choice) => {
          return '<div class="choice-item">' +
            '<strong>' + choice.number + '. ' + escapeHtml(choice.label) + '</strong>' +
            '<div class="muted">' + escapeHtml(choice.note || '') + '</div>' +
            '<div class="row" style="margin-top:8px;"><button data-choice-number="' + choice.number + '">' + choice.number + '. Select</button></div>' +
          '</div>';
        }).join('');

        elements.choiceList.querySelectorAll('button[data-choice-number]').forEach((button) => {
          button.addEventListener('click', async () => {
            await handleChoiceSelection(Number(button.getAttribute('data-choice-number')));
          });
        });

        elements.recheckInputPanel.classList.toggle('hidden', !state.pendingRecheckChoice);
      }

      async function handleChoiceSelection(choiceNumber) {
        const response = state.latestPreviewResponse;
        if (!response || !state.workingRequest) {
          return;
        }

        if (response.terminalStatus === 'preview_pending_confirmation') {
          if (choiceNumber === 1) {
            await handleExecute();
            return;
          }

          if (choiceNumber === 2) {
            elements.requestEditor.focus();
            renderMessage('Revise the payload. Preview will be required again if anything changes.');
            return;
          }

          resetInteraction();
          return;
        }

        if (response.terminalStatus === 'correction_required') {
          const correctionType = response.resolution && response.resolution.correction && response.resolution.correction.correctionType;
          if (correctionType === 'same_date_conflict' && (choiceNumber === 1 || choiceNumber === 2)) {
            const nextRequest = sanitizeWorkingRequest(state.workingRequest);
            nextRequest.interactionInput = Object.assign({}, nextRequest.interactionInput, {
              correction: {
                doctorConfirmedCorrection: choiceNumber === 1
              }
            });
            state.workingRequest = nextRequest;
            elements.requestEditor.value = prettyJson(nextRequest);
            await handlePreview();
            return;
          }

          if (choiceNumber === 1) {
            renderMessage('This correction type is not auto-patchable yet. Edit the payload manually and preview again.');
            elements.requestEditor.focus();
            return;
          }

          resetInteraction();
          return;
        }

        if (response.terminalStatus === 'recheck_required') {
          if (choiceNumber === 1) {
            state.pendingRecheckChoice = true;
            render();
            return;
          }

          if (choiceNumber === 2) {
            elements.requestEditor.focus();
            renderMessage('Edit the payload manually, then preview again.');
            return;
          }

          resetInteraction();
          return;
        }

        if (choiceNumber === 1) {
          elements.requestEditor.focus();
          return;
        }

        resetInteraction();
      }

      async function applyRecheckChoice() {
        if (!state.workingRequest) {
          return;
        }

        const patientId = elements.recheckInput.value.trim();
        if (!patientId) {
          renderMessage('A confirmed patient ID is required.');
          return;
        }

        const nextRequest = sanitizeWorkingRequest(state.workingRequest);
        nextRequest.interactionInput = Object.assign({}, nextRequest.interactionInput, {
          recheck: {
            confirmedPatientId: patientId,
            existingPatientClaim: true
          }
        });

        state.workingRequest = nextRequest;
        state.pendingRecheckChoice = false;
        elements.requestEditor.value = prettyJson(nextRequest);
        await handlePreview();
      }

      function renderReadablePreview() {
        const response = state.latestPreviewResponse || state.latestExecuteResponse;
        if (!response || !response.readablePreview) {
          elements.readablePreview.innerHTML = '<div class="muted">Preview summary will appear here after the first preview.</div>';
          return;
        }

        const summary = response.readablePreview;
        const blocks = [
          summaryBlock(summary.patient_summary),
          summaryBlock(summary.visit_summary),
          summaryBlock(summary.case_summary),
          findingSummaryBlock(summary.findings),
          warningSummaryBlock(summary.warnings)
        ];

        elements.readablePreview.innerHTML = blocks.join('');
      }

      function summaryBlock(block) {
        return '<div class="summary-card">' +
          '<div class="label">' + escapeHtml(block.label) + '</div>' +
          '<strong>' + escapeHtml(block.value) + '</strong>' +
          renderFieldList(block.representative_fields) +
          renderDetails(block.details) +
        '</div>';
      }

      function findingSummaryBlock(findings) {
        const items = findings.map((finding) => {
          return '<div class="summary-card">' +
            '<div class="label">Finding ' + finding.no + ' · ' + escapeHtml(finding.branch_code) + ' · Tooth ' + escapeHtml(finding.tooth_number) + '</div>' +
            '<strong>' + escapeHtml(finding.value) + '</strong>' +
            renderFieldList(finding.representative_fields) +
          '</div>';
        }).join('');

        return items || '<div class="summary-card"><div class="muted">No visible finding summary is available for this payload.</div></div>';
      }

      function warningSummaryBlock(warnings) {
        if (!warnings || warnings.length === 0) {
          return '<div class="summary-card"><div class="label">Warnings</div><div class="muted">No warnings.</div></div>';
        }

        return '<div class="summary-card"><div class="label">Warnings</div><ul class="field-list">' +
          warnings.map((warning) => '<li>' + escapeHtml(warning) + '</li>').join('') +
        '</ul></div>';
      }

      function renderFieldList(fields) {
        if (!fields || fields.length === 0) {
          return '<div class="muted" style="margin-top:8px;">No representative fields exposed.</div>';
        }

        return '<ul class="field-list">' +
          fields.map((field) => '<li><strong>' + escapeHtml(field.field) + ':</strong> ' + escapeHtml(field.value) + '</li>').join('') +
        '</ul>';
      }

      function renderDetails(details) {
        if (!details || details.length === 0) {
          return '';
        }

        return '<ul class="field-list">' +
          details.map((detail) => '<li>' + escapeHtml(detail) + '</li>').join('') +
        '</ul>';
      }

      function renderRawJson() {
        elements.currentRequestJson.textContent = prettyJson(state.workingRequest);
        elements.latestPreviewRequestJson.textContent = prettyJson(state.latestPreviewRequest);
        elements.latestPreviewResponseJson.textContent = prettyJson(state.latestPreviewResponse);
        elements.latestExecuteResponseJson.textContent = prettyJson(state.latestExecuteResponse);
      }

      function buildMenu(response) {
        switch (response.terminalStatus) {
          case 'preview_pending_confirmation':
            return [
              {
                number: 1,
                label: 'Confirm and execute',
                note: 'This remains locked until the preview is current and execution-ready.'
              },
              {
                number: 2,
                label: 'Revise payload',
                note: 'Any edit invalidates the current preview.'
              },
              {
                number: 3,
                label: 'Cancel / reset interaction',
                note: 'Clears preview and execution state.'
              }
            ];
          case 'correction_required': {
            const correctionType = response.resolution && response.resolution.correction && response.resolution.correction.correctionType;
            if (correctionType === 'same_date_conflict') {
              return [
                {
                  number: 1,
                  label: 'Use the existing same-date visit',
                  note: 'Patches doctorConfirmedCorrection=true, then previews again.'
                },
                {
                  number: 2,
                  label: 'Keep the new-visit stance',
                  note: 'Patches doctorConfirmedCorrection=false, then previews again.'
                },
                {
                  number: 3,
                  label: 'Cancel / reset interaction',
                  note: 'Stops here without faking a write path.'
                }
              ];
            }

            return [
              {
                number: 1,
                label: 'Manual payload revision required',
                note: 'Automatic correction patching is not implemented for this correction type.'
              },
              {
                number: 2,
                label: 'Cancel / reset interaction',
                note: 'Stops here without a fake next step.'
              }
            ];
          }
          case 'recheck_required':
            return [
              {
                number: 1,
                label: 'Enter confirmed patient ID',
                note: 'Patches interactionInput.recheck.confirmedPatientId, then previews again.'
              },
              {
                number: 2,
                label: 'Revise payload manually',
                note: 'Manual edits still require preview again.'
              },
              {
                number: 3,
                label: 'Cancel / reset interaction',
                note: 'Stops here without execution.'
              }
            ];
          case 'hard_stop':
          case 'blocked_before_write':
          case 'execution_failed':
            return [
              {
                number: 1,
                label: 'Edit payload manually',
                note: 'There is no safe auto-continuation path.'
              },
              {
                number: 2,
                label: 'Reset interaction',
                note: 'Clears the current preview state.'
              }
            ];
          case 'no_op':
          case 'executed':
          default:
            return [
              {
                number: 1,
                label: 'Edit payload manually',
                note: 'Use this to start a new interaction.'
              },
              {
                number: 2,
                label: 'Reset interaction',
                note: 'Clears the current preview state.'
              }
            ];
        }
      }

      function sanitizeWorkingRequest(request) {
        const cloned = deepClone(request);
        if (cloned && cloned.interactionInput && cloned.interactionInput.confirmation) {
          cloned.interactionInput = Object.assign({}, cloned.interactionInput, {
            confirmation: { confirmed: false }
          });
        }
        return cloned;
      }

      function buildExecuteRequest(request) {
        const executeRequest = sanitizeWorkingRequest(request);
        executeRequest.interactionInput = Object.assign({}, executeRequest.interactionInput, {
          confirmation: { confirmed: true }
        });
        return executeRequest;
      }

      function previewIdentity(request) {
        return JSON.stringify(sortDeep(sanitizeWorkingRequest(request)));
      }

      function sortDeep(value) {
        if (Array.isArray(value)) {
          return value.map(sortDeep);
        }

        if (value && typeof value === 'object') {
          return Object.keys(value).sort().reduce((acc, key) => {
            acc[key] = sortDeep(value[key]);
            return acc;
          }, {});
        }

        return value;
      }

      function deepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }

      async function fetchJson(url, options) {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok) {
          throw new Error((data && data.error && data.error.message) || 'Request failed.');
        }
        return data;
      }

      function renderMessage(message) {
        elements.editorMessage.textContent = message;
      }

      function chip(text, tone) {
        return '<span class="chip ' + tone + '">' + escapeHtml(text) + '</span>';
      }

      function prettyJson(value) {
        return value ? JSON.stringify(value, null, 2) : '{}';
      }

      function escapeHtml(value) {
        return String(value || '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }
    <\/script>
  </body>
</html>`;
}
