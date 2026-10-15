// Minimal SemVer helpers for release tooling: parse, compare, and match the range forms
// this marketplace uses (exact, ^, ~, >=, <, *). Pre-releases only match an exact range.

export function parse(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(v).trim());
  return m ? { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? null } : null;
}

export function compare(a, b) {
  const x = parse(a);
  const y = parse(b);
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] - y[k];
  if (x.pre === y.pre) return 0;
  if (x.pre === null) return 1;
  if (y.pre === null) return -1;
  return x.pre < y.pre ? -1 : 1;
}

function padded(range) {
  const parts = range.split('.');
  while (parts.length < 3) parts.push('0');
  return parts.join('.');
}

function one(version, cmp) {
  const c = cmp.trim();
  if (c === '' || c === '*' || c === 'x') return true;
  const op = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(c);
  const base = padded(op[2]);
  const b = parse(base);
  const v = parse(version);
  if (!b || !v) return false;
  switch (op[1]) {
    case '^':
      if (compare(version, base) < 0) return false;
      if (b.major > 0) return v.major === b.major;
      if (b.minor > 0) return v.major === 0 && v.minor === b.minor;
      return v.major === 0 && v.minor === 0 && v.patch === b.patch;
    case '~':
      return compare(version, base) >= 0 && v.major === b.major && v.minor === b.minor;
    case '>=':
      return compare(version, base) >= 0;
    case '>':
      return compare(version, base) > 0;
    case '<=':
      return compare(version, base) <= 0;
    case '<':
      return compare(version, base) < 0;
    default:
      return compare(version, base) === 0;
  }
}

/** True when `version` satisfies every space-separated comparator in `range`. */
export function satisfies(version, range = '*') {
  const v = parse(version);
  if (!v) return false;
  if (v.pre && !String(range).includes('-')) return false;
  return String(range).split(/\s+/).filter(Boolean).every((c) => one(version, c)) || range.trim() === '';
}

/** Highest version in `versions` that satisfies `range`, or null. */
export function maxSatisfying(versions, range) {
  return versions.filter((v) => satisfies(v, range)).sort(compare).pop() ?? null;
}
