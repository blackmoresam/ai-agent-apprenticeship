type Customer = {
  id: string;
  monthlyPlanGbp: number;
  refunds: string[];
};

type Payment = {
  id: string;
  customerId: string;
  amountGbp: number;
  status: "successful";
  billingPeriod: string; // YYYY-MM
};

const customer: Customer = {
  id: "CUST-001",
  monthlyPlanGbp: 15,
  refunds: [],
};

const payments: Payment[] = [
  { id: "PAY-001", customerId: customer.id, amountGbp: 15, status: "successful", billingPeriod: "2026-11" },
  { id: "PAY-002", customerId: customer.id, amountGbp: 15, status: "successful", billingPeriod: "2026-11" },
];

function hasPotentialDuplicatePayment(
  customer: Customer,
  payments: Payment[],
  targetBillingPeriod: string,
): boolean {
  const matchingPayments = payments.filter(
    (payment) =>
      payment.customerId === customer.id &&
      payment.status === "successful" &&
      payment.amountGbp === customer.monthlyPlanGbp &&
      payment.billingPeriod === targetBillingPeriod,
  );

  return matchingPayments.length > 1;
}

console.log("Customer:", customer);
console.log("Payments:", payments);

const scenarios: { name: string; payments: Payment[]; expected: boolean }[] = [
  { name: "A (£15 and £15)", payments, expected: true },
  { name: "B (£15 only)", payments: [payments[0]], expected: false },
  {
    name: "C (£15 and £20)",
    payments: [payments[0], { ...payments[1], amountGbp: 20 }],
    expected: false,
  },
  {
    name: "D (£15 in November and £15 in December)",
    payments: [payments[0], { ...payments[1], billingPeriod: "2026-12" }],
    expected: false,
  },
  {
    name: "E (three £15 payments in November)",
    payments: [
      ...payments,
      { id: "PAY-003", customerId: customer.id, amountGbp: 15, status: "successful", billingPeriod: "2026-11" },
    ],
    expected: true,
  },
];

const targetBillingPeriod = "2026-11";

for (const scenario of scenarios) {
  const result = hasPotentialDuplicatePayment(customer, scenario.payments, targetBillingPeriod);
  console.log(`${scenario.name} (checking ${targetBillingPeriod}):`, scenario.payments);
  console.log(`Potential duplicate: ${result}`);

  if (result !== scenario.expected) {
    throw new Error(`${scenario.name} produced an unexpected result`);
  }
}
