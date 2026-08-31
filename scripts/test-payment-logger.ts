import { logPaymentEvent } from "../app/lib/paymentEventLogger";

async function test() {
  await logPaymentEvent(
    "test_payment_event",
    "test-payment-123",
    {
      event: "payment.succeeded",
      amount: "500.00",
      authorization: "THIS_MUST_NOT_APPEAR",
      password: "SECRET_PASSWORD",
    }
  );

  console.log("Test payment log written");
}

test();