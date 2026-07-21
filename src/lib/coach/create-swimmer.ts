import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { hasOneToOne, grantMonthlyTokenIfMissing } from "@/lib/entitlements";
import { serverFeatures } from "@/lib/flags";
import { getResend, emailFrom } from "@/lib/resend";
import { publicEnv } from "@/lib/env";
import type { ServiceType } from "@/lib/types";

export type CreateSwimmerResult = {
  error?: string;
  info?: string;
  tempPassword?: string;
  swimmerId?: string;
};

/**
 * Crea un nuovo nuotatore = crea l'utente auth (il trigger crea il profilo)
 * e ne completa i campi. Richiede la service_role key. Se Resend non è
 * configurato non manda l'invito e restituisce la password temporanea
 * ("modalità simulata"). Riusato da "Nuovo nuotatore" e "Converti lead".
 */
export async function createSwimmerAccount(input: {
  email: string;
  firstName: string;
  lastName: string;
  serviceType: ServiceType;
}): Promise<CreateSwimmerResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { error: "Serve almeno l'email." };

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Manca SUPABASE_SERVICE_ROLE_KEY: impossibile creare l'utente. Aggiungila in .env.local.",
    };
  }

  const tempPassword = "glide-" + Math.random().toString(36).slice(2, 10);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { first_name: input.firstName, last_name: input.lastName },
  });
  if (error) return { error: error.message };

  const swimmerId = data.user!.id;
  await admin
    .from("profiles")
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      service_type: input.serviceType,
      role: "swimmer",
    })
    .eq("id", swimmerId);

  // Onda 19: se creato già col servizio 1:1, gli spetta subito il token del
  // mese (la videoanalisi resta invece un evento separato a pagamento).
  if (hasOneToOne(input.serviceType)) {
    await grantMonthlyTokenIfMissing(admin, swimmerId);
  }

  if (!serverFeatures().resend) {
    return {
      info: "Nuotatore creato. Invito email in modalità simulata (manca RESEND_API_KEY).",
      tempPassword,
      swimmerId,
    };
  }

  const resend = getResend();
  const loginUrl = `${publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/login`;
  const { error: mailError } = (await resend!.emails.send({
    from: emailFrom(),
    to: email,
    subject: "Benvenuto in GLIDE — onda dopo onda",
    html: `
      <div style="font-family:Arial,sans-serif;color:#0B1220;line-height:1.5">
        <h2 style="color:#0E5EAB">Ciao ${input.firstName || "nuotatore"},</h2>
        <p>Il tuo coach ti ha aggiunto a <b>GLIDE</b>. Ecco i tuoi accessi:</p>
        <p>
          <b>Email:</b> ${email}<br/>
          <b>Password temporanea:</b> <code>${tempPassword}</code>
        </p>
        <p><a href="${loginUrl}" style="background:#0E5EAB;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Accedi a GLIDE</a></p>
        <p style="color:#5b6b7b;font-size:13px">Ti consigliamo di cambiare la password dopo il primo accesso.</p>
        <p style="color:#5b6b7b;font-size:13px">onda dopo onda 🌊</p>
      </div>`,
  })) ?? { error: null };

  if (mailError) {
    return {
      info: "Nuotatore creato, ma l'invio email è fallito. Passagli tu la password temporanea.",
      tempPassword,
      swimmerId,
    };
  }
  return {
    info: `Nuotatore creato e invitato via email a ${email}.`,
    swimmerId,
  };
}
