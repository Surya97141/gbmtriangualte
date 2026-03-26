// stages/stage6/edge-cases/string-cases.js
// Edge cases specific to string inputs
// Used by: stage6.js

const StringCases = (() => {

  const CASES = [
    {
      id           : 'sc_empty',
      label        : 'Empty string ""',
      priority     : 'critical',
      whyItMatters : 'Accessing s[0] on empty string is undefined behavior in C++. s.length()-1 underflows to SIZE_MAX for unsigned types.',
      checkQuestion: 'Does your solution handle empty string input without crashing?',
      commonFailure: 's[0] access crash. s.length()-1 = SIZE_MAX when length=0 (unsigned underflow). substr on empty string.',
      fix          : 'Always check if (s.empty()) return [base_case] before processing.',
      testInput    : 's = ""',
      expected     : 'Problem-dependent base case, no crash',
    },
    {
      id           : 'sc_single_char',
      label        : 'Single character string',
      priority     : 'critical',
      whyItMatters : 'Palindrome checks, substring operations, and two-pointer expansion all have special behavior for length-1 strings.',
      checkQuestion: 'Does your solution return correct answer for a single character string?',
      commonFailure: 'Palindrome expansion: center ± 1 goes out of bounds. KMP failure function: only one character.',
      fix          : 'Single character is always a palindrome. LPS = 1. Most substring properties trivially hold.',
      testInput    : 's = "a"',
      expected     : 'LPS=1, palindrome=true, no substring operations crash',
    },
    {
      id           : 'sc_all_same_char',
      label        : 'All identical characters "aaaaaaa"',
      priority     : 'high',
      whyItMatters : 'KMP failure function computes max properly. Sliding window never shrinks. Z-algorithm trivially outputs n-1.',
      checkQuestion: 'Does your solution handle all-same character input without infinite loops?',
      commonFailure: 'Sliding window for longest substring with k distinct chars: window is always valid → never shrinks → answer = n (correct).',
      fix          : 'Trace through once manually. Usually correct but worth verifying.',
      testInput    : 's = "aaaaa"',
      expected     : 'No infinite loops. Correct answer (problem-dependent).',
    },
    {
      id           : 'sc_all_unique',
      label        : 'All characters distinct',
      priority     : 'high',
      whyItMatters : 'Algorithms relying on frequency maps behave differently when every character appears exactly once.',
      checkQuestion: 'Does your solution handle strings with no repeated characters?',
      commonFailure: 'Sliding window "longest without repeats": answer = n (entire string) — verify this case.',
      fix          : 'All-unique string: longest substring without repeat = n. Check frequency maps return 1 for every char.',
      testInput    : 's = "abcdefg"',
      expected     : 'Longest unique substring = 7',
    },
    {
      id           : 'sc_palindrome',
      label        : 'String is already a palindrome',
      priority     : 'high',
      whyItMatters : 'Even/odd length palindromes need different expansion logic. Full palindrome is the hardest case for minimum palindrome partition.',
      checkQuestion: 'Does your solution correctly identify and process palindromic strings?',
      commonFailure: 'Manacher off-by-one for even-length palindromes. Center expansion goes out of bounds.',
      fix          : 'Test both even-length ("abba") and odd-length ("aba") palindromes separately.',
      testInput    : 's = "racecar" (odd) and s = "abba" (even)',
      expected     : 'Both recognized as palindromes',
    },
    {
      id           : 'sc_two_chars',
      label        : 'Only two distinct characters',
      priority     : 'medium',
      whyItMatters : 'Minimal alphabet tests character-specific logic. Frequency arrays work differently. Toggle/flip operations may cycle.',
      checkQuestion: 'Does your solution work with a minimal 2-character alphabet?',
      commonFailure: 'Solutions hardcoded for 26-char alphabet fail on binary strings. Bit manipulation tricks may not apply.',
      fix          : 'Test "010101" and "000111" patterns explicitly.',
      testInput    : 's = "010101"',
      expected     : 'Problem-dependent but no hardcoded alphabet assumptions fail',
    },
    {
      id           : 'sc_max_length',
      label        : 'String at maximum length n = 10^5',
      priority     : 'critical',
      whyItMatters : 'O(n²) string algorithms TLE at n=10^5. String concatenation in loop using + operator is O(n²) total.',
      checkQuestion: 'Does your string algorithm finish in O(n log n) or O(n) at n=10^5?',
      commonFailure: 'result += char in loop: each += copies entire string → O(n²). Naive pattern match O(nm) where m=n.',
      fix          : 'Use string builder pattern: fill char array, construct string once. Use KMP/Z not naive match.',
      testInput    : 'n = 100000 random string',
      expected     : 'Completes in < 1 second',
    },
    {
      id           : 'sc_spaces_special',
      label        : 'String with spaces and special characters',
      priority     : 'medium',
      whyItMatters : 'Word count logic fails on leading/trailing spaces. isalpha() fails on digits and punctuation.',
      checkQuestion: 'Does your solution handle non-alphanumeric characters correctly?',
      commonFailure: 'Word split on "  hello  world  " → empty strings in word list. isalpha() on \'5\' returns false.',
      fix          : 'Trim input before word splitting. Check problem statement: are spaces valid characters?',
      testInput    : 's = "  hello  world  "',
      expected     : 'Word count = 2, not 4',
    },
    {
      id           : 'sc_unicode_case',
      label        : 'Mixed uppercase and lowercase',
      priority     : 'medium',
      whyItMatters : 'Case-sensitive vs case-insensitive comparison changes the answer. Forgetting tolower() causes wrong character frequency counts.',
      checkQuestion: 'Does your solution handle uppercase and lowercase per the problem statement?',
      commonFailure: '"A" and "a" treated as different characters when problem is case-insensitive.',
      fix          : 'If case-insensitive: apply tolower() to entire string before processing.',
      testInput    : 's = "AaBbCc"',
      expected     : 'Correct handling per case-sensitivity requirement',
    },
    {
      id           : 'sc_numeric_string',
      label        : 'String representing a number',
      priority     : 'medium',
      whyItMatters : 'Leading zeros, negative sign, and decimal point all need explicit handling in number-from-string problems.',
      checkQuestion: 'Does your solution handle "007", "-42", and "3.14" correctly?',
      commonFailure: 'Treating "007" as 7. Integer overflow when converting very large numeric string.',
      fix          : 'Handle sign, leading zeros, and overflow explicitly. Use long long for the result.',
      testInput    : 's = "007", s = "-2147483648"',
      expected     : '007 → 7, -2147483648 parsed without overflow',
    },
  ];

  function getAll()         { return [...CASES]; }
  function getById(id)      { return CASES.find(c => c.id === id) ?? null; }
  function getCritical()    { return CASES.filter(c => c.priority === 'critical'); }
  function getByPriority(p) { return CASES.filter(c => c.priority === p); }

  return { getAll, getById, getCritical, getByPriority };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StringCases;
}