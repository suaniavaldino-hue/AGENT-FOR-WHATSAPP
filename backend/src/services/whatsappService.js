const META_API_VERSION = "v23.0";

function cleanUrl(url = "") {
  return String(url).trim().replace(/\/+$/, "");
}

async function sendViaEvolution(to, text) {
  const baseUrl = cleanUrl(process.env.EVOLUTION_API_URL);
  const instance = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!baseUrl || !instance || !apiKey) {
    throw new Error("Evolution API não configurada corretamente");
  }

  const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey
    },
    body: JSON.stringify({
      number: to,
      options: { delay: 1200, presence: "composing" },
      textMessage: { text }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Erro ao enviar mensagem pela Evolution API");
  }

  return { provider: "evolution", ...data };
}

async function sendViaMetaCloud(to, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error("Meta Cloud API não configurada corretamente");
  }

  const response = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Erro ao enviar mensagem no WhatsApp Cloud API");
  }

  return { provider: "meta", ...data };
}

export async function sendWhatsAppText(to, text) {
  const provider = (process.env.WHATSAPP_PROVIDER || "mock").toLowerCase();

  if (provider === "evolution") {
    return sendViaEvolution(to, text);
  }

  if (provider === "meta") {
    return sendViaMetaCloud(to, text);
  }

  if (process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && (process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE)) {
    return sendViaEvolution(to, text);
  }

  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return sendViaMetaCloud(to, text);
  }

  return { mocked: true, success: true, preview: { to, text } };
}
