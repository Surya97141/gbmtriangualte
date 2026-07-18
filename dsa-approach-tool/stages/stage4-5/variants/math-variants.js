// stages/stage4-5/variants/math-variants.js
// Mathematics approach variants
// Used by: stage4-5.js

const MathVariants = (() => {

  const VARIANTS = [
    {
      id          : 'math_sieve',
      label       : 'Sieve of Eratosthenes',
      tagline     : 'Precompute primality for many numbers up to a limit at once',
      complexity  : 'O(n log log n)',
      when        : [
        'Need to check primality for MANY numbers up to some limit',
        'A single number would just use trial division instead',
      ],
      template    : `vector<bool> isPrime(limit + 1, true);
isPrime[0] = isPrime[1] = false;
for (int i = 2; (long long)i*i <= limit; i++) {
  if (isPrime[i]) {
    for (int j = i*i; j <= limit; j += i) isPrime[j] = false;
  }
}`,
      checkQuestion: 'Do you need primality for many numbers, or just one or two?',
      watchOut    : [
        'Start the inner loop at i*i, not 2*i -- smaller primes already crossed off smaller multiples',
        'Watch for i*i overflowing int when limit is large -- cast to long long',
      ],
      examples    : [
        'Count primes below N',
        'Smallest prime factor precompute for fast factorization',
      ],
    },
    {
      id          : 'math_binary_exponentiation',
      label       : 'Binary Exponentiation',
      tagline     : 'Compute a^b mod m in O(log b) via repeated squaring',
      complexity  : 'O(log b)',
      when        : [
        'Need a^b (often mod m) where b can be very large',
      ],
      template    : `long long power(long long base, long long exp, long long mod) {
  long long result = 1;
  base %= mod;
  while (exp > 0) {
    if (exp & 1) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1;
  }
  return result;
}`,
      checkQuestion: 'Is the exponent large enough that linear multiplication would be too slow?',
      watchOut    : [
        'Take mod after EVERY multiplication, not just at the end -- otherwise intermediate values overflow',
        'This same doubling trick generalizes to matrix exponentiation for linear recurrences',
      ],
      examples    : [
        'a^b mod m for huge b',
        'Modular inverse via Fermat little theorem: a^(m-2) mod m',
      ],
    },
    {
      id          : 'math_modular_arithmetic',
      label       : 'Modular Arithmetic',
      tagline     : 'Keep numbers bounded by taking mod at every step; use modular inverse for division',
      complexity  : 'O(1) per operation, O(log mod) for inverse',
      when        : [
        'Problem explicitly asks for the answer mod 1e9+7 or similar',
        'Intermediate values would otherwise overflow',
      ],
      template    : `const long long MOD = 1e9 + 7;
long long modInverse(long long a) { return power(a, MOD - 2, MOD); }
long long modDivide(long long a, long long b) {
  return (a % MOD) * modInverse(b) % MOD;
}`,
      checkQuestion: 'Does the problem explicitly require a modulus, and does it involve division at any step?',
      watchOut    : [
        'Never divide directly under a modulus -- must multiply by the modular inverse instead',
        'Subtraction under mod can go negative -- always do ((a - b) % MOD + MOD) % MOD',
      ],
      examples    : [
        'Count paths / combinations mod 1e9+7',
        'Any DP whose values need to stay bounded mod a prime',
      ],
    },
    {
      id          : 'math_crt',
      label       : 'Chinese Remainder Theorem',
      tagline     : 'Merge multiple x-mod-m congruences into one combined congruence',
      complexity  : 'O(log) per merge',
      when        : [
        'Problem gives multiple "x mod m = r" style constraints to satisfy simultaneously',
      ],
      template    : `// Merge x=r1(mod m1), x=r2(mod m2) into x=r(mod lcm(m1,m2))
// via extended Euclidean algorithm -- works even when m1, m2
// are not coprime (generalized CRT), with a solvability check first.`,
      checkQuestion: 'Are there multiple simultaneous modular congruences to satisfy at once?',
      watchOut    : [
        'Moduli do not need to be coprime for the generalized version, but a compatibility check is required first',
        'Reduce the final answer modulo the combined LCM',
      ],
      examples    : [
        'Solve simultaneous modular congruences',
        'Scheduling problems with multiple periodic constraints',
      ],
    },
    {
      id          : 'math_combinatorics',
      label       : 'Combinatorics (nCr / nPr precompute)',
      tagline     : 'Precompute factorials once, answer combination queries in O(1)',
      complexity  : 'O(n) precompute, O(1) per query',
      when        : [
        'Need "count the number of ways to choose/arrange" repeatedly',
      ],
      template    : `vector<long long> fact(N+1), invFact(N+1);
fact[0] = 1;
for (int i = 1; i <= N; i++) fact[i] = fact[i-1]*i % MOD;
invFact[N] = power(fact[N], MOD-2, MOD);
for (int i = N-1; i >= 0; i--) invFact[i] = invFact[i+1]*(i+1) % MOD;
long long nCr(int n, int r) {
  if (r < 0 || r > n) return 0;
  return fact[n] * invFact[r] % MOD * invFact[n-r] % MOD;
}`,
      checkQuestion: 'Do you need many nCr/nPr queries, justifying a one-time precompute?',
      watchOut    : [
        'Forgetting the modular inverse for invFact -- cannot just divide under a modulus',
        'Precompute up to the actual maximum n needed, not an arbitrary guess',
      ],
      examples    : [
        'Count paths on a grid with obstacles',
        'Catalan-number-style counting problems',
      ],
    },
    {
      id          : 'math_matrix_expo',
      label       : 'Matrix Exponentiation',
      tagline     : 'Represent a linear recurrence as a matrix, then binary-exponentiate it',
      complexity  : 'O(k^3 log N)',
      when        : [
        'Need the Nth term of a linear recurrence (like Fibonacci) for astronomically large N',
      ],
      template    : `// F(n+1), F(n) = [F(1), F(0)] * [[1,1],[1,0]]^n
// Compute the transition matrix once, raise it to the Nth power
// using the same binary-exponentiation doubling trick as math_binary_exponentiation.`,
      checkQuestion: 'Is N too large for direct iteration (1e9, 1e18) but the recurrence itself is small and fixed?',
      watchOut    : [
        'If N is small (<= 1e6), plain iteration is simpler and just as fast -- do not over-engineer',
        'The transition matrix must be re-derived carefully for each different recurrence, never copy-pasted blindly',
      ],
      examples    : [
        'Nth Fibonacci number for huge N',
        'Counting paths in a graph after exactly N steps',
      ],
    },
  ];

  function getAll()       { return [...VARIANTS]; }
  function getById(id)    { return VARIANTS.find(v => v.id === id) ?? null; }

  function getRelevant(directions = []) {
    const isMathDirection = directions.some(d =>
      (d.family ?? '').includes('math') ||
      (d.id     ?? '').includes('math')
    );
    if (!isMathDirection) return [];
    return getAll();
  }

  return {
    getAll,
    getById,
    getRelevant,
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathVariants;
}
