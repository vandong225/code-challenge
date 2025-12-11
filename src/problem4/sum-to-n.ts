function sum_to_n_a(n: number): number {
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}

function sum_to_n_b(n: number): number {
  if (!n) {
    return 0;
  }
  return n + sum_to_n_b(n - 1);
}

function sum_to_n_c(n: number): number {
  return (n * (n + 1)) / 2;
}
