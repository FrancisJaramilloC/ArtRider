const KUSHKI_BASE_URL = "https://api-uat.kushkipagos.com";

function privateMerchantId() {
  const value = process.env.KUSHKI_PRIVATE_MERCHANT_ID;
  if (!value) throw new Error("Missing Kushki Private Key");
  return value;
}

export async function chargeKushkiToken(input: {
  token: string;
  amountCents: number;
  email: string;
  firstName?: string;
  lastName?: string;
}) {
  const response = await fetch(`${KUSHKI_BASE_URL}/card/v1/charges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Private-Merchant-Id": privateMerchantId(),
    },
    body: JSON.stringify({
      token: input.token,
      fullResponse: "v2",
      amount: {
        subtotalIva: 0,
        subtotalIva0: input.amountCents / 100,
        ice: 0,
        iva: 0,
        currency: "USD",
      },
      contactDetails: {
        documentType: "CC",
        documentNumber: "1700000000",
        email: input.email,
        firstName: input.firstName || "Cliente",
        lastName: input.lastName || "ArtRider",
      },
    }),
  });

  const data = await response.json();
  const approved = Boolean(
    response.ok &&
    data.ticketNumber &&
    data.details?.transactionStatus === "APPROVAL",
  );

  return {
    approved,
    ticketNumber: approved ? String(data.ticketNumber) : null,
    error: approved
      ? null
      : data.message || data.details?.responseText || "El pago fue rechazado por el banco",
    raw: data,
  };
}

export async function refundKushkiCharge(ticketNumber: string, amountCents?: number) {
  const body = amountCents === undefined
    ? { fullResponse: true }
    : {
        fullResponse: true,
        amount: {
          subtotalIva: 0,
          subtotalIva0: amountCents / 100,
          ice: 0,
          iva: 0,
          currency: "USD",
        },
      };

  const response = await fetch(
    `${KUSHKI_BASE_URL}/v1/charges/${encodeURIComponent(ticketNumber)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Private-Merchant-Id": privateMerchantId(),
      },
      body: JSON.stringify(body),
    },
  );
  const data = await response.json();
  return {
    ok: response.ok && data.isSuccessful !== false,
    data,
  };
}
