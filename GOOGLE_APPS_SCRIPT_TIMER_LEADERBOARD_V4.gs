/**
 * Dhai Adventure Birthday Wish Wall
 * Timer leaderboard backend — Version 4
 *
 * This version writes the timer fields directly to columns G and H,
 * accepts several parameter names, and reads the saved row back before
 * reporting success.
 */

const SHEET_NAME = 'Birthday Wishes';
const BACKEND_SCHEMA_VERSION = 4;
const REQUIRE_APPROVAL = false;
const MAX_PUBLIC_WISHES = 100;
const MAX_STORED_WISHES = 5000;

const HEADERS = [
  'id',
  'name',
  'title',
  'message',
  'created_at',
  'approved',
  'completion_ms',
  'completion_time'
];

/**
 * Run once after pasting this script.
 * Existing rows are preserved.
 */
function setupBirthdaySheet() {
  const sheet = getOrCreateSheet_();

  // Force the expected schema into A1:H1 without deleting existing rows.
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);

  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#f7d7e5')
    .setFontColor('#4f3d52');

  sheet.setColumnWidth(1, 235);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 230);
  sheet.setColumnWidth(4, 520);
  sheet.setColumnWidth(5, 190);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 130);
  sheet.setColumnWidth(8, 130);

  sheet.getRange('D:D').setWrap(true);
  sheet.getRange('G:G').setNumberFormat('0');
  sheet.getRange('H:H').setNumberFormat('@');

  SpreadsheetApp.flush();

  return {
    ok: true,
    schema_version: BACKEND_SCHEMA_VERSION,
    sheet_name: sheet.getName(),
    headers: sheet.getRange(1, 1, 1, HEADERS.length).getDisplayValues()[0]
  };
}

/**
 * Run manually to confirm that columns A:H are correct.
 */
function testTimerLeaderboardBackend() {
  const sheet = getOrCreateSheet_();
  const headers = sheet
    .getRange(1, 1, 1, HEADERS.length)
    .getDisplayValues()[0];

  const result = {
    ok: headers.join('|') === HEADERS.join('|'),
    schema_version: BACKEND_SCHEMA_VERSION,
    sheet_name: sheet.getName(),
    headers: headers,
    expected_headers: HEADERS
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}

function doGet(e) {
  try {
    const params = Object.assign({}, (e && e.parameter) || {});
    const action = String(params.action || 'list').toLowerCase();

    if (action === 'health') {
      return output_({
        ok: true,
        service: 'Dhai Birthday Wish Wall',
        leaderboard: true,
        schema_version: BACKEND_SCHEMA_VERSION
      }, params.prefix);
    }

    /**
     * Diagnostic only; this does not write a row.
     *
     * Example:
     * /exec?action=validate_timer&completion_ms=123456&completion_time=02:03
     */
    if (action === 'validate_timer') {
      const timer = parseTimer_(params);

      return output_({
        ok: timer.completion_ms > 0,
        leaderboard: true,
        schema_version: BACKEND_SCHEMA_VERSION,
        received: {
          completion_ms: params.completion_ms || '',
          completionMs: params.completionMs || '',
          elapsed_ms: params.elapsed_ms || '',
          completion_time: params.completion_time || '',
          completionTime: params.completionTime || ''
        },
        parsed: timer
      }, params.prefix);
    }

    if (action === 'add') {
      const wish = addWish_(params);

      return output_({
        ok: true,
        leaderboard: true,
        schema_version: BACKEND_SCHEMA_VERSION,
        wish: wish,
        pendingApproval: REQUIRE_APPROVAL
      }, params.prefix);
    }

    if (action !== 'list') {
      return output_({
        ok: false,
        leaderboard: true,
        schema_version: BACKEND_SCHEMA_VERSION,
        error: 'Unsupported action.'
      }, params.prefix);
    }

    const requestedLimit = Number(params.limit || 50);
    const limit = Math.max(1, Math.min(requestedLimit, MAX_PUBLIC_WISHES));

    return output_({
      ok: true,
      leaderboard: true,
      schema_version: BACKEND_SCHEMA_VERSION,
      wishes: listWishes_(limit)
    }, params.prefix);

  } catch (error) {
    return output_({
      ok: false,
      leaderboard: true,
      schema_version: BACKEND_SCHEMA_VERSION,
      error: String((error && error.message) || error)
    }, e && e.parameter && e.parameter.prefix);
  }
}

function doPost(e) {
  try {
    const params = parseRequest_(e);
    const action = String(params.action || 'add').toLowerCase();

    if (String(params.website || '').trim()) {
      return output_({
        ok: false,
        leaderboard: true,
        schema_version: BACKEND_SCHEMA_VERSION,
        error: 'Spam check failed.'
      });
    }

    if (action !== 'add') {
      return output_({
        ok: false,
        leaderboard: true,
        schema_version: BACKEND_SCHEMA_VERSION,
        error: 'Unsupported action.'
      });
    }

    const wish = addWish_(params);

    return output_({
      ok: true,
      leaderboard: true,
      schema_version: BACKEND_SCHEMA_VERSION,
      wish: wish,
      pendingApproval: REQUIRE_APPROVAL
    });

  } catch (error) {
    return output_({
      ok: false,
      leaderboard: true,
      schema_version: BACKEND_SCHEMA_VERSION,
      error: String((error && error.message) || error)
    });
  }
}

function addWish_(params) {
  const id = cleanId_(params.id) || Utilities.getUuid();
  const name = cleanCell_(params.name, 40);
  const title = cleanCell_(params.title, 55);
  const message = cleanCell_(params.message, 280);

  if (message.length < 3) {
    throw new Error('The birthday message is too short.');
  }

  const timer = parseTimer_(params);

  if (timer.completion_ms < 1) {
    throw new Error(
      'Timer data was not received. completion_ms=' +
      String(
        params.completion_ms ||
        params.completionMs ||
        params.elapsed_ms ||
        ''
      )
    );
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const sheet = getOrCreateSheet_();
    ensureHeaderSchema_(sheet);

    const existing = findWishById_(sheet, id);

    if (existing) {
      return existing;
    }

    const createdAt =
      cleanCell_(params.created_at, 40) ||
      new Date().toISOString();

    const approved = !REQUIRE_APPROVAL;
    const nextRow = Math.max(2, sheet.getLastRow() + 1);

    const rowValues = [
      id,
      spreadsheetSafe_(name),
      spreadsheetSafe_(title),
      spreadsheetSafe_(message),
      createdAt,
      approved,
      timer.completion_ms,
      timer.completion_time
    ];

    // Write explicitly to A:H instead of relying on appendRow().
    sheet
      .getRange(nextRow, 1, 1, HEADERS.length)
      .setValues([rowValues]);

    sheet.getRange(nextRow, 7).setNumberFormat('0');
    sheet.getRange(nextRow, 8).setNumberFormat('@');

    SpreadsheetApp.flush();

    const savedRow = readWishRow_(sheet, nextRow);

    if (!savedRow) {
      throw new Error('The new Google Sheets row could not be read back.');
    }

    if (
      savedRow.completion_ms < 1 ||
      !savedRow.completion_time
    ) {
      throw new Error(
        'Google Sheets wrote the wish but did not retain the timer fields. ' +
        'Check that completion_ms is column G and completion_time is column H.'
      );
    }

    trimOldRows_(sheet);
    return savedRow;

  } finally {
    lock.releaseLock();
  }
}

function parseTimer_(params) {
  const rawMs =
    params.completion_ms != null && params.completion_ms !== ''
      ? params.completion_ms
      : params.completionMs != null && params.completionMs !== ''
        ? params.completionMs
        : params.elapsed_ms;

  let completionMs = cleanCompletionMs_(rawMs);

  const rawTime =
    params.completion_time != null && params.completion_time !== ''
      ? params.completion_time
      : params.completionTime;

  let completionTime = cleanCell_(rawTime, 20);

  // Fallback: convert a time string such as 06:25 to milliseconds.
  if (!completionMs && completionTime) {
    completionMs = parseFormattedTimeToMs_(completionTime);
  }

  if (completionMs && !completionTime) {
    completionTime = formatCompletionTime_(completionMs);
  }

  return {
    completion_ms: completionMs,
    completion_time: completionTime
  };
}

function listWishes_(limit) {
  const sheet = getOrCreateSheet_();
  ensureHeaderSchema_(sheet);

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const rows = sheet
    .getRange(2, 1, lastRow - 1, HEADERS.length)
    .getValues();

  const wishes = [];

  rows.forEach(function(row) {
    const approved = String(row[5]).toLowerCase();
    const isApproved =
      approved === 'true' ||
      approved === 'yes' ||
      approved === '1';

    if (!isApproved) {
      return;
    }

    const message = cleanCell_(row[3], 280);

    if (!message) {
      return;
    }

    const completionMs = cleanCompletionMs_(row[6]);

    wishes.push({
      id: cleanId_(row[0]) || Utilities.getUuid(),
      name: cleanCell_(row[1], 40),
      title: cleanCell_(row[2], 55),
      message: message,
      created_at:
        row[4] instanceof Date
          ? row[4].toISOString()
          : cleanCell_(row[4], 40) || new Date().toISOString(),
      completion_ms: completionMs,
      completion_time:
        cleanCell_(row[7], 20) ||
        formatCompletionTime_(completionMs)
    });
  });

  wishes.sort(function(a, b) {
    const aTime = a.completion_ms > 0
      ? a.completion_ms
      : Number.MAX_SAFE_INTEGER;

    const bTime = b.completion_ms > 0
      ? b.completion_ms
      : Number.MAX_SAFE_INTEGER;

    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return new Date(a.created_at).getTime() -
      new Date(b.created_at).getTime();
  });

  return wishes.slice(0, limit);
}

function findWishById_(sheet, id) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getDisplayValues();

  for (let i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]) === id) {
      return readWishRow_(sheet, i + 2);
    }
  }

  return null;
}

function readWishRow_(sheet, rowNumber) {
  const row = sheet
    .getRange(rowNumber, 1, 1, HEADERS.length)
    .getValues()[0];

  const completionMs = cleanCompletionMs_(row[6]);

  return {
    id: cleanId_(row[0]),
    name: cleanCell_(row[1], 40),
    title: cleanCell_(row[2], 55),
    message: cleanCell_(row[3], 280),
    created_at:
      row[4] instanceof Date
        ? row[4].toISOString()
        : cleanCell_(row[4], 40) || new Date().toISOString(),
    completion_ms: completionMs,
    completion_time:
      cleanCell_(row[7], 20) ||
      formatCompletionTime_(completionMs)
  };
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaderSchema_(sheet);
  return sheet;
}

function ensureHeaderSchema_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
}

function trimOldRows_(sheet) {
  const dataRows = Math.max(0, sheet.getLastRow() - 1);
  const extra = dataRows - MAX_STORED_WISHES;

  if (extra > 0) {
    sheet.deleteRows(2, extra);
  }
}

function parseRequest_(e) {
  const params = Object.assign({}, (e && e.parameter) || {});
  const raw = e && e.postData && e.postData.contents;
  const type = String(
    (e && e.postData && e.postData.type) || ''
  ).toLowerCase();

  if (raw && type.indexOf('application/json') !== -1) {
    try {
      const json = JSON.parse(raw);

      Object.keys(json || {}).forEach(function(key) {
        params[key] = json[key];
      });

    } catch (error) {
      throw new Error('Invalid JSON request.');
    }
  }

  return params;
}

function cleanCell_(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanId_(value) {
  return String(value == null ? '' : value)
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 80);
}

function cleanCompletionMs_(value) {
  const normalized = String(
    value == null ? '' : value
  )
    .replace(/,/g, '')
    .trim();

  const number = Math.round(Number(normalized) || 0);

  // Up to seven days to avoid rejecting a resumed game.
  if (number < 1 || number > 604800000) {
    return 0;
  }

  return number;
}

function parseFormattedTimeToMs_(value) {
  const parts = String(value || '')
    .trim()
    .split(':')
    .map(function(item) {
      return Number(item);
    });

  if (
    parts.some(function(item) {
      return !Number.isFinite(item) || item < 0;
    })
  ) {
    return 0;
  }

  let seconds = 0;

  if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    seconds =
      parts[0] * 3600 +
      parts[1] * 60 +
      parts[2];
  } else {
    return 0;
  }

  return cleanCompletionMs_(seconds * 1000);
}

function formatCompletionTime_(milliseconds) {
  const ms = cleanCompletionMs_(milliseconds);

  if (!ms) {
    return '';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(':');
  }

  return [
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
}

function spreadsheetSafe_(value) {
  return /^[=+\-@]/.test(value)
    ? "'" + value
    : value;
}

function output_(payload, prefix) {
  const json = JSON.stringify(payload);
  const callback = String(prefix || '');

  if (/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
