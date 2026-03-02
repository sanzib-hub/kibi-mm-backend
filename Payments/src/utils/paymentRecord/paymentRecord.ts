import { db } from "../../database/kysely/databases";

interface PaymentRecordInput {
  affiliateId: number;
  eventId: number;
  organizationId: number;
  paymentId: string;
  amount: number; // in paise
}

export const recordEventPayment = async ({
  affiliateId,
  eventId,
  organizationId,
  paymentId,
  amount,
}: PaymentRecordInput) => {
  // try to fetch an existing response
  const existing = await db
    .selectFrom("affiliate_event_responses")
    .selectAll()
    .where("affiliate_id", "=", affiliateId)
    .where("event_id", "=", eventId)
    .executeTakeFirst();

  // If a record already exists and is marked PAID (or has a payment_id), skip update.
  if (existing) {
    const alreadyPaid = existing.payment_status === "PAID" || !!existing.payment_id;

    if (alreadyPaid) {
      // If the existing payment_id is the same as incoming, nothing to do.
      if (existing.payment_id === paymentId) {
        console.log(
          `Payment already recorded for Affiliate ${affiliateId} (Event ${eventId}). payment_id unchanged: ${paymentId}`
        );
        return;
      }

      // Otherwise, do not overwrite an existing paid record.
      console.warn(
        `Existing paid record found for Affiliate ${affiliateId} Event ${eventId}. Skipping overwrite. Existing payment_id=${existing.payment_id} incoming=${paymentId}`
      );
      return;
    }

    // If not already paid, update the record with Razorpay payment info
    await db
      .updateTable("affiliate_event_responses")
      .set({
        payment_id: paymentId,
        // store amount in paise or rupees consistent with your schema.
        // You previously used amount/100 — ensure your column expects rupees or paise.
        amount_paid: amount / 100,
        payment_status: "PAID",
        payment_time: new Date(),
        status: "submitted",
      })
      .where("affiliate_id", "=", affiliateId)
      .where("event_id", "=", eventId)
      .execute();

    console.log(
      `Payment recorded (updated) for Affiliate ${affiliateId} (Event ${eventId}, Org ${organizationId}) payment_id=${paymentId}`
    );
    return;
  }

  // No existing record — insert new
  await db
    .insertInto("affiliate_event_responses")
    .values({
      affiliate_id: affiliateId,
      event_id: eventId,
      form_id: null,
      response_data: {},
      status: "submitted",
      payment_id: paymentId,
      amount_paid: amount / 100,
      payment_status: "PAID",
      payment_time: new Date(),
    })
    .execute();

  console.log(
    `Payment recorded (inserted) for Affiliate ${affiliateId} (Event ${eventId}, Org ${organizationId}) payment_id=${paymentId}`
  );
};
