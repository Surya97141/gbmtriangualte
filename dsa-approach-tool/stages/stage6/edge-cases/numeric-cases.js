// stages/stage6/edge-cases/numeric-cases.js
// Edge cases specific to numeric computation problems
// Used by: stage6.js

const NumericCases = (() => {

  const CASES = [
    {
      id           : 'nc_zero',
      label        : 'Input value is 0',
      priority     : 'critical',
      whyItMatters : 'Division by zero, log(0), sqrt(0), n=0 for factorial — all undefined or crash.',
      checkQuestion: 'Does your solution handle n=0 or value=0 without mathematical errors?',
      commonFailure: 'Factorial(0): should return 1 not crash. Log(0): undefined. n/0: crash. GCD(0, x) = x by convention.',
      fix          : 'Add explicit if (n == 0) return [defined value] before any division, log, or recursive call.',
      testInput    : 'n=0, x=0',
      expected     : 'Factorial(0)=1, GCD(0,5)=5, no division by zero',
    },
    {
      id           : 'nc_one',
      label        : 'Input value is 1',
      priority     : 'high',
      whyItMatters : '1 is neither prime nor composite. Fibonacci(1)=1 but Fibonacci(0)=0. Many number theory results break at 1.',
      checkQuestion: 'Does your solution correctly handle n=1 for prime checks, Fibonacci, and factorial?',
      commonFailure: 'isPrime(1) returns true (incorrect — 1 is not prime). Fibonacci off-by-one at boundary.',
      fix          : 'Add explicit: if (n < 2) return false for prime check. Handle base cases n=0 and n=1 separately for Fibonacci.',
      testInput    : 'n=1',
      expected     : 'isPrime(1)=false, fib(1)=1, factorial(1)=1',
    },
    {
      id           : 'nc_negative',
      label        : 'Negative input value',
      priority     : 'high',
      whyItMatters : 'Negative modulo behavior differs by language. sqrt(-1) is undefined. Unsigned types wrap on negative input.',
      checkQuestion: 'Does your solution handle negative inputs without undefined behavior?',
      commonFailure: '-7 % 3 = -1 in C++ (not 2). Using unsigned int for negative input wraps to large positive. Negative array index.',
      fix          : 'For positive modulo: int mod = ((x % m) + m) % m. Always use signed types when negatives possible.',
      testInput    : 'x=-7, mod=3',
      expected     : 'Modulo = 2 (not -1) if non-negative modulo required',
    },
    {
      id           : 'nc_int_overflow',
      label        : 'Intermediate computation exceeds INT_MAX',
      priority     : 'critical',
      whyItMatters : 'INT_MAX = 2,147,483,647. Two values each ~10^5 multiplied = 10^10 which overflows int silently. The result wraps to a negative number.',
      checkQuestion: 'Can any intermediate multiplication or addition overflow a 32-bit integer?',
      commonFailure: 'int a=100000, b=100000; int c = a*b; → c = -727379968 (overflow). No compiler warning by default.',
      fix          : 'Cast before multiply: long long c = (long long)a * b. Enable -fsanitize=undefined to catch overflow.',
      testInput    : 'a=100000, b=100000',
      expected     : 'Product = 10^10 stored in long long',
    },
    {
      id           : 'nc_mod_arithmetic',
      label        : 'Answer requires modulo 10^9+7',
      priority     : 'high',
      whyItMatters : 'Applying mod only at the end overflows before mod is applied. (a+b)%MOD is safe but a*b%MOD is not if a and b are each close to MOD.',
      checkQuestion: 'Are all additions and multiplications taken mod before the result can overflow long long?',
      commonFailure: '(a * b) % MOD when a=b=10^9+6 → a*b ≈ 10^18 which is within long long, but (a+1)*(b+1) overflows.',
      fix          : 'Apply mod after every +: (a + b) % MOD. Apply mod after every *: (1LL * a * b) % MOD.',
      testInput    : 'Large DP with MOD=10^9+7',
      expected     : 'Final answer in [0, 10^9+6]',
    },
    {
      id           : 'nc_power_of_two',
      label        : 'Input is a power of 2',
      priority     : 'medium',
      whyItMatters : 'Power-of-2 check: n & (n-1) == 0 gives wrong answer for n=0. Bit manipulation tricks behave specially at powers of 2.',
      checkQuestion: 'Does your power-of-2 check handle n=0 correctly?',
      commonFailure: 'isPowerOf2(0): 0 & (-1) = 0 → returns true (incorrect — 0 is not a power of 2).',
      fix          : 'isPowerOf2(n) = n > 0 && (n & (n-1)) == 0.',
      testInput    : 'n=0, n=1, n=2, n=4, n=1024',
      expected     : '0→false, 1→true, 2→true, 3→false, 4→true',
    },
    {
      id           : 'nc_large_prime',
      label        : 'Input is or near 10^9+7 (common modulus)',
      priority     : 'medium',
      whyItMatters : '10^9+7 is prime, but if used both as modulus AND potential input value, modulo result is 0 (the element equals the modulus).',
      checkQuestion: 'Does your solution handle the case where input equals the modulus?',
      commonFailure: 'a % MOD when a == MOD → result = 0, which may or may not be the intended answer.',
      fix          : 'If input can equal MOD: apply mod before using as input to DP, not after.',
      testInput    : 'n = 10^9+7',
      expected     : '(10^9+7) % (10^9+7) = 0 — verify this is intended',
    },
    {
      id           : 'nc_floating_point',
      label        : 'Answer involves floating point comparison',
      priority     : 'high',
      whyItMatters : 'Floating point representation errors make direct equality comparison (==) unreliable. 0.1 + 0.2 ≠ 0.3 in floating point.',
      checkQuestion: 'Are all floating point comparisons using epsilon tolerance instead of ==?',
      commonFailure: 'if (a == b) when a and b are doubles → may be false due to floating point imprecision.',
      fix          : 'Use: if (abs(a - b) < 1e-9) instead of ==. Or use integer arithmetic by scaling: multiply all values by 10^6.',
      testInput    : 'a=0.1+0.2, b=0.3',
      expected     : 'a ≠ b exactly in floating point — use epsilon comparison',
    },
    {
      id           : 'nc_gcd_lcm_zero',
      label        : 'GCD or LCM with zero',
      priority     : 'medium',
      whyItMatters : 'GCD(0, n) = n by mathematical definition but some implementations return 0 or crash.',
      checkQuestion: 'Does your GCD implementation handle GCD(0, x) = x correctly?',
      commonFailure: '__gcd(0, 5) returns 5 in C++ STL (correct). Custom GCD: may infinite loop if not handling n=0 base case.',
      fix          : 'Euclidean GCD: gcd(0, b) = b. gcd(a, 0) = a. Base case must be: if (a==0) return b.',
      testInput    : 'gcd(0, 5), gcd(5, 0), lcm(0, 5)',
      expected     : 'gcd(0,5)=5, lcm(0,5)=0 by convention',
    },
  ];

  function getAll()         { return [...CASES]; }
  function getById(id)      { return CASES.find(c => c.id === id) ?? null; }
  function getCritical()    { return CASES.filter(c => c.priority === 'critical'); }
  function getByPriority(p) { return CASES.filter(c => c.priority === p); }

  return { getAll, getById, getCritical, getByPriority };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NumericCases;
}