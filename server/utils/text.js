// utils/text.js

// Makes text typed by a user safe to use inside a regular expression,
// so a search for "(" or "+977" looks for those characters instead of failing.
export const escapeRegex = (text) => String(text ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Case-insensitive "contains" filter for a MongoDB query
export const containsText = (text) => ({ $regex: escapeRegex(String(text).trim()), $options: 'i' });
