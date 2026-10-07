/**
 * Shared validation logic for student contributions in GitHub Dev Days.
 * Zero dependencies, plain Node 20+.
 */

const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
// Unicode letters and marks (accents, matras, viramas), spaces, dots, hyphens only (1-30 chars)
const NAME_CHARS_REGEX = /^[\p{L}\p{M}\s.-]{1,30}$/u;
const CONTAINS_LETTER_REGEX = /\p{L}/u;

/**
 * Validates the contributor filename.
 * @param {string} filename - e.g. "contributors/aarav-sharma.txt" or "aarav-sharma.txt"
 * @param {string|null} expectedUsername - PR author's username to match against
 * @param {object} options - { allowExample: boolean }
 */
function validateFilename(filename, expectedUsername = null, options = {}) {
  const { allowExample = false } = options;
  const errors = [];

  if (typeof filename !== 'string' || !filename.trim()) {
    return { valid: false, errors: ['Filename must be a non-empty string.'] };
  }

  // Normalize slashes
  const normalized = filename.replace(/\\/g, '/');

  // Check for path traversal or invalid characters
  if (normalized.includes('..') || normalized.startsWith('/') || normalized.includes('//')) {
    errors.push('Path traversal or absolute paths are not allowed.');
    return { valid: false, errors };
  }

  const parts = normalized.split('/');
  let basename = '';
  if (parts.length === 1) {
    basename = parts[0];
  } else if (parts.length === 2 && parts[0] === 'contributors') {
    basename = parts[1];
  } else {
    errors.push('File must be directly inside the "contributors/" folder (e.g., contributors/your-username.txt).');
    return { valid: false, errors };
  }

  if (!basename.endsWith('.txt')) {
    errors.push('File must have a .txt extension.');
    return { valid: false, errors };
  }

  const username = basename.slice(0, -4);

  if (!username) {
    errors.push('Username in filename cannot be empty.');
    return { valid: false, errors };
  }

  // Check if example file
  if (!allowExample && username.toLowerCase().startsWith('example')) {
    errors.push('Cannot submit a file starting with "example". Please use your real GitHub username.');
  }

  if (!GITHUB_USERNAME_REGEX.test(username)) {
    errors.push('Filename must match a valid GitHub username (letters, digits, single hyphens, no spaces, 1-39 chars).');
  }

  if (expectedUsername) {
    if (username.toLowerCase() !== expectedUsername.toLowerCase()) {
      errors.push(`Filename "${basename}" does not match your GitHub username "${expectedUsername}".`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    username: username.toLowerCase(),
    originalUsername: username
  };
}

/**
 * Validates the student's display name inside the .txt file.
 * @param {string} content - Raw content of the .txt file
 */
function validateDisplayName(content) {
  const errors = [];

  if (typeof content !== 'string') {
    return { valid: false, errors: ['Content must be a string.'] };
  }

  // Split into lines (ignoring trailing whitespace/empty lines)
  const rawLines = content.split(/\r?\n/);
  const nonEmptyLines = rawLines.filter(line => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return { valid: false, errors: ['File is empty. Please enter your display name on one line.'] };
  }

  if (nonEmptyLines.length > 1) {
    errors.push('File must contain exactly ONE line with your display name.');
  }

  const firstLine = nonEmptyLines[0].trim();

  if (firstLine.length === 0) {
    errors.push('Display name cannot be empty.');
  } else if (firstLine.length > 30) {
    errors.push(`Display name is too long (${firstLine.length} chars). Maximum allowed is 30 characters.`);
  }

  // Explicitly disallow HTML tags and dangerous characters
  if (/[<>&"'/\\;{}[\]()=]/.test(firstLine)) {
    errors.push('Display name cannot contain HTML tags, quotes, or code symbols.');
  }

  if (!NAME_CHARS_REGEX.test(firstLine)) {
    errors.push('Display name can only contain letters, spaces, dots, and hyphens (Unicode letters allowed).');
  }

  if (!CONTAINS_LETTER_REGEX.test(firstLine)) {
    errors.push('Display name must contain at least one letter.');
  }

  return {
    valid: errors.length === 0,
    errors,
    name: firstLine
  };
}

/**
 * Validates both filename and content.
 */
function validateFile(filename, content, expectedUsername = null, options = {}) {
  const fileRes = validateFilename(filename, expectedUsername, options);
  const nameRes = validateDisplayName(content);
  const allErrors = [...fileRes.errors, ...nameRes.errors];

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    username: fileRes.username || null,
    name: nameRes.name || null
  };
}

module.exports = {
  validateFilename,
  validateDisplayName,
  validateFile,
  GITHUB_USERNAME_REGEX,
  NAME_CHARS_REGEX
};
