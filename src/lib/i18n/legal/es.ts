import type { LegalContent } from "./types";

/**
 * Spanish (Spain) legal content. Mirrors the shape of `legalEn`. Internal
 * links and mailto/external URLs are identical; only the visible text is
 * translated. Price examples use EUR to match the Spanish checkout currency.
 * Informal "tú" register, consistent with the UI. Spanish consumer-law
 * terminology follows the Real Decreto Legislativo 1/2007 (Ley General para
 * la Defensa de los Consumidores y Usuarios).
 */
export const legalEs: LegalContent = {
  ui: {
    home: "Inicio",
    lastUpdated: "Última actualización:",
    questions: "¿Tienes preguntas? Escribe a",
  },

  privacy: {
    metaTitle: "Política de privacidad — Facelineage",
    metaDescription:
      "Cómo Facelineage recoge, utiliza y protege tus datos personales, y los derechos que te reconoce el RGPD.",
    title: "Política de privacidad",
    lastUpdated: "25 de junio de 2026",
    blocks: [
      {
        kind: "p",
        text: "Esta Política de privacidad explica cómo recogemos, utilizamos y protegemos tus datos personales cuando usas facelineage.com y los servicios relacionados (el «Servicio»). Léela junto con nuestros [Términos del servicio](/terms) y nuestra [Política de cookies](/cookies).",
      },

      { kind: "h", text: "1. Quiénes somos (responsable del tratamiento)" },
      {
        kind: "p",
        text: "El responsable del tratamiento de tus datos personales es **Andromeda Entertainment, MB**, una pequeña sociedad constituida en Lituania, con código de empresa **308005148** y domicilio social en Žygio g. 5, Vilnius, Lituania («nosotros»). Puedes contactarnos para cualquier cuestión de privacidad en [support@facelineage.com](mailto:support@facelineage.com).",
      },

      { kind: "h", text: "2. Datos que recogemos" },
      {
        kind: "ul",
        items: [
          "**Selfies** que subes para el análisis, además de cualquier foto adicional (p. ej., fotos de tus padres) que envíes para extras opcionales.",
          "**Datos de rasgos faciales** que nuestra IA obtiene de tu foto para elaborar tu análisis de herencia.",
          "**Datos de la cuenta**: tu dirección de correo electrónico, utilizada para la autenticación y el envío de informes.",
          "**Respuestas al cuestionario** sobre el contexto de tu herencia que decidas compartir.",
          "**Metadatos de pago** (últimos 4 dígitos, marca de la tarjeta, país) facilitados por nuestro procesador de pagos. Nunca vemos ni almacenamos el número completo de la tarjeta.",
          "**Datos técnicos**: dirección IP, navegador, tipo de dispositivo y zona horaria, recogidos automáticamente con fines de seguridad y analítica.",
        ],
      },

      { kind: "h", text: "3. Datos sensibles y tu consentimiento explícito" },
      {
        kind: "p",
        text: "Analizar los rasgos de un rostro puede implicar **categorías especiales de datos personales** en el sentido del artículo 9 del RGPD. Tratamos tu foto y los datos de rasgos faciales derivados de ella **únicamente sobre la base de tu consentimiento explícito**, que otorgas al subir tu selfie para generar un informe.",
      },
      {
        kind: "note",
        text: "Usamos tus datos faciales exclusivamente para generar el análisis que solicitas. **No** los usamos para identificarte en otros servicios, crear un perfil biométrico, venderlos ni entrenar modelos de IA. Puedes retirar tu consentimiento en cualquier momento borrando tu foto o tu cuenta, o escribiéndonos; la retirada no afecta al tratamiento ya realizado.",
      },

      { kind: "h", text: "4. Para qué usamos tus datos y bases jurídicas" },
      {
        kind: "ul",
        items: [
          "Para generar tu informe de herencia personalizado y los extras: **consentimiento explícito** (art. 9.2.a) para los datos faciales; **ejecución del contrato** que tenemos contigo (art. 6.1.b) para el resto.",
          "Para procesar pagos y prevenir el fraude: **contrato** y nuestro **interés legítimo** en proteger el Servicio (art. 6.1.f).",
          "Para enviar emails transaccionales (enlaces de inicio de sesión, recibos, informes): **contrato**.",
          "Para mejorar de forma agregada la precisión y calidad del Servicio: **interés legítimo**; no usamos tu foto individual para ello.",
          "Para llevar la contabilidad y los registros fiscales, y atender requerimientos legales: **obligación legal** (art. 6.1.c).",
        ],
      },

      { kind: "h", text: "5. Tratamiento mediante IA" },
      {
        kind: "p",
        text: "Para elaborar tu análisis, tu foto y los datos relacionados se envían a proveedores de IA externos (**Anthropic** y **Google**) que actúan como nuestros encargados del tratamiento. Solo tratan los datos para devolvernos un resultado; no les autorizamos a usarlos para entrenar sus modelos. Este tratamiento está cubierto por el consentimiento explícito descrito en la sección 3.",
      },

      { kind: "h", text: "6. Comunicación de datos y destinatarios" },
      { kind: "p", text: "**No** vendemos tus datos personales. Solo los compartimos con proveedores de servicios que actúan siguiendo nuestras instrucciones:" },
      {
        kind: "ul",
        items: [
          "**Stripe**: procesamiento de pagos.",
          "**Supabase**: autenticación y base de datos/almacenamiento.",
          "**Anthropic** y **Google**: inferencia de IA.",
          "**Vercel**: alojamiento y distribución de contenidos.",
          "**Resend**: envío de emails transaccionales.",
          "Autoridades públicas, cuando la ley nos obligue a comunicarlos.",
        ],
      },

      { kind: "h", text: "7. Transferencias internacionales" },
      {
        kind: "p",
        text: "Algunos de nuestros proveedores tratan datos fuera del Espacio Económico Europeo (p. ej., en Estados Unidos). En esos casos, la transferencia está protegida por garantías adecuadas, como las **cláusulas contractuales tipo** de la Comisión Europea o una decisión de adecuación. Puedes solicitarnos una copia de dichas garantías por email.",
      },

      { kind: "h", text: "8. Cuánto tiempo conservamos tus datos" },
      {
        kind: "ul",
        items: [
          "**Selfies y fotos**: se borran automáticamente en un plazo de 30 días desde que se suben, o antes si las eliminas desde tu cuenta.",
          "**Cuenta e informes**: se conservan mientras tu cuenta esté activa; se eliminan en un plazo de 30 días desde la solicitud de eliminación de la cuenta.",
          "**Registros de pagos y contables**: se conservan durante el tiempo exigido por la normativa fiscal y contable lituana (por lo general, hasta 10 años).",
        ],
      },

      { kind: "h", text: "9. Tus derechos" },
      {
        kind: "p",
        text: "En virtud del RGPD tienes derecho de **acceso**, **rectificación**, **supresión** y **limitación** del tratamiento de tus datos, derecho a la **portabilidad** de los datos, derecho de **oposición** al tratamiento basado en el interés legítimo y derecho a **retirar tu consentimiento** en cualquier momento. Para ejercer cualquiera de ellos, escribe a [support@facelineage.com](mailto:support@facelineage.com) desde la dirección de tu cuenta. Respondemos en el plazo de un mes.",
      },
      {
        kind: "p",
        text: "También tienes derecho a presentar una reclamación ante una autoridad de control: en España, la **Agencia Española de Protección de Datos (AEPD)** ([aepd.es](https://www.aepd.es)); en Lituania, la **Inspección Estatal de Protección de Datos** ([vdai.lrv.lt](https://vdai.lrv.lt)); o la autoridad de tu país de residencia.",
      },

      { kind: "h", text: "10. Decisiones automatizadas" },
      {
        kind: "p",
        text: "Tu informe se genera de forma automática, pero no produce efectos jurídicos ni te afecta significativamente de modo similar en el sentido del artículo 22 del RGPD: es una impresión con fines de entretenimiento, no una decisión sobre tus derechos, tus finanzas o tu situación.",
      },

      { kind: "h", text: "11. Seguridad" },
      {
        kind: "p",
        text: "Utilizamos cifrado en tránsito (HTTPS), almacenamiento cifrado en reposo y controles de acceso a nivel de fila sobre los datos de los usuarios. Ningún sistema es completamente seguro, pero aplicamos medidas de seguridad estándar del sector y, cuando la ley lo exija, te notificaremos a ti y a la autoridad competente cualquier brecha de datos.",
      },

      { kind: "h", text: "12. Menores" },
      {
        kind: "p",
        text: "El Servicio no está dirigido a menores de 16 años y no recogemos conscientemente sus datos. Si crees que un menor nos ha facilitado información, contáctanos y la eliminaremos.",
      },

      { kind: "h", text: "13. Cambios" },
      {
        kind: "p",
        text: "Podemos actualizar esta política de vez en cuando. Modificaremos la fecha indicada arriba y, si los cambios son importantes, te avisaremos en la aplicación o por email.",
      },

      { kind: "h", text: "14. Contacto" },
      {
        kind: "p",
        text: "¿Tienes preguntas sobre esta política o sobre tus datos? Escribe a [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  terms: {
    metaTitle: "Términos del servicio — Facelineage",
    metaDescription: "Las condiciones que regulan el uso de Facelineage, incluidos tus derechos como consumidor en la UE.",
    title: "Términos del servicio",
    lastUpdated: "25 de junio de 2026",
    blocks: [
      {
        kind: "p",
        text: "Estos Términos regulan el uso de Facelineage (el «Servicio»), gestionado por **Andromeda Entertainment, MB**, código de empresa **308005148**, Lituania. Al usar el Servicio aceptas estos Términos. Si no estás de acuerdo, no utilices el Servicio.",
      },

      { kind: "h", text: "1. El Servicio" },
      {
        kind: "p",
        text: "Facelineage ofrece impresiones sobre herencia y ascendencia generadas por IA a partir de un selfie enviado por el usuario y de información de contexto opcional. Los informes tienen **fines exclusivamente de entretenimiento e inspiración** y no constituyen asesoramiento científico, médico, genealógico ni jurídico.",
      },

      { kind: "h", text: "2. Cuenta y requisitos" },
      {
        kind: "ul",
        items: [
          "Debes tener al menos 16 años para usar el Servicio.",
          "Debes facilitar una dirección de correo electrónico válida.",
          "Eres responsable de la actividad realizada en tu cuenta.",
        ],
      },

      { kind: "h", text: "3. Contenido de las fotos y derechos" },
      {
        kind: "p",
        text: "Al subir una foto, confirmas que tienes derecho a hacerlo: es una foto tuya o cuentas con el permiso expreso de la persona que aparece en ella (esto se aplica a la foto de un progenitor utilizada para el desglose mamá + papá). Nos concedes una licencia limitada para tratar la foto únicamente con el fin de prestar el Servicio. No reclamamos la propiedad de tus fotos.",
      },

      { kind: "h", text: "4. Suscripciones, precios y renovación automática" },
      {
        kind: "ul",
        items: [
          "La mayoría de los planes empiezan con un periodo introductorio de pago (por ejemplo, 2,49 € por 3 días) y después se **renuevan automáticamente** al precio normal (por ejemplo, 49 €/mes) hasta que canceles. Los precios exactos, el periodo introductorio y las condiciones de renovación se te muestran en el proceso de pago antes de pagar.",
          "Los cargos de renovación se realizan automáticamente con tu método de pago guardado. Te enviamos un recordatorio por email antes de cada renovación.",
          "Puedes cancelar en cualquier momento desde tu [página de cuenta](/account). La cancelación detiene los cargos futuros y surte efecto al final del periodo pagado en curso; mantienes el acceso hasta entonces.",
          "Las compras de extras (p. ej., Espejo de herencia, Futura pareja) son cargos únicos que se cobran de inmediato.",
        ],
      },

      { kind: "h", text: "5. Tu derecho de desistimiento (consumidores de la UE)" },
      {
        kind: "p",
        text: "Si eres consumidor en la UE, por lo general tienes derecho a desistir de un contrato celebrado a distancia en un plazo de **14 días naturales** sin necesidad de indicar el motivo (en España, conforme a la Ley General para la Defensa de los Consumidores y Usuarios). Como Facelineage es contenido digital y un servicio que se te presta de forma inmediata, se aplica lo siguiente:",
      },
      {
        kind: "note",
        text: "Al comprar e iniciar tu informe, **solicitas expresamente que comencemos la ejecución de inmediato, antes de que finalice el plazo de desistimiento**, y **reconoces que pierdes tu derecho de desistimiento de 14 días** una vez que el servicio se haya ejecutado completamente (es decir, cuando tu informe o extra se haya generado y entregado). En el caso de una suscripción, el derecho de desistimiento se aplica a la parte del servicio que aún no se haya ejecutado. Esto no afecta al reembolso voluntario independiente descrito en nuestra [Política de reembolsos](/refunds).",
      },

      { kind: "h", text: "6. Reembolsos" },
      {
        kind: "p",
        text: "Además de tus derechos legales, ofrecemos una garantía voluntaria de devolución del dinero. Consulta nuestra [Política de reembolsos](/refunds) para saber cómo solicitar un reembolso.",
      },

      { kind: "h", text: "7. Uso aceptable" },
      { kind: "p", text: "Te comprometes a no:" },
      {
        kind: "ul",
        items: [
          "Subir fotos de nadie sin su consentimiento (incluidos menores).",
          "Usar el Servicio para vigilancia, acoso o doxing.",
          "Aplicar ingeniería inversa, hacer scraping o abusar del Servicio de cualquier otra forma.",
          "Usar los resultados de Facelineage para tomar decisiones relevantes sobre otra persona (contratación, concesión de créditos, inmigración, etc.).",
        ],
      },

      { kind: "h", text: "8. Limitaciones de la IA" },
      {
        kind: "p",
        text: "Las representaciones de herencia y de antepasados son impresiones estadísticas generadas por IA a partir de una foto. **No son pruebas de ADN** y no pueden determinar la ascendencia biológica. Las referencias culturales son generales y pueden ser inexactas.",
      },

      { kind: "h", text: "9. Propiedad intelectual" },
      {
        kind: "p",
        text: "El nombre, el logotipo y la interfaz del Servicio Facelineage son de nuestra propiedad. Los informes que generamos para ti (textos, imágenes) puedes usarlos con fines personales y no comerciales; no puedes redistribuirlos como un producto de la competencia.",
      },

      { kind: "h", text: "10. Terminación" },
      {
        kind: "p",
        text: "Podemos suspender o cancelar las cuentas que incumplan estos Términos. Puedes eliminar tu cuenta en cualquier momento desde tu [página de cuenta](/account) o escribiéndonos.",
      },

      { kind: "h", text: "11. Exención de garantías" },
      {
        kind: "p",
        text: "El Servicio se presta «tal cual», sin garantías de ningún tipo, expresas o implícitas, en la medida en que lo permita la ley. **Nada de lo dispuesto en estos Términos limita los derechos que te correspondan como consumidor y que no puedan limitarse ni renunciarse conforme a la legislación aplicable.**",
      },

      { kind: "h", text: "12. Limitación de responsabilidad" },
      {
        kind: "p",
        text: "En la máxima medida permitida por la ley, nuestra responsabilidad total frente a ti por cualquier reclamación derivada del Servicio se limita al importe que nos hayas pagado en los 12 meses anteriores a la reclamación. Nada de lo dispuesto en estos Términos excluye la responsabilidad que no pueda excluirse por ley (incluida la derivada de fallecimiento, daños personales o fraude).",
      },

      { kind: "h", text: "13. Ley aplicable y resolución de conflictos" },
      {
        kind: "p",
        text: "Estos Términos se rigen por la legislación de **Lituania**, sin perjuicio de las **normas imperativas de protección de los consumidores de tu país de residencia**, que te siguen siendo aplicables. Los consumidores de la UE también pueden usar la plataforma de resolución de litigios en línea de la Comisión Europea en [ec.europa.eu/consumers/odr](https://ec.europa.eu/consumers/odr).",
      },

      { kind: "h", text: "14. Cambios" },
      {
        kind: "p",
        text: "Podemos actualizar estos Términos ocasionalmente. Los cambios importantes se anunciarán en la aplicación o por email antes de que entren en vigor.",
      },

      { kind: "h", text: "15. Contacto" },
      {
        kind: "p",
        text: "¿Tienes preguntas sobre estos Términos? Escribe a [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  cookies: {
    metaTitle: "Política de cookies — Facelineage",
    metaDescription: "Cómo utiliza Facelineage las cookies y tecnologías similares.",
    title: "Política de cookies",
    lastUpdated: "25 de junio de 2026",
    blocks: [
      {
        kind: "p",
        text: "Esta página explica qué cookies y tecnologías similares utiliza Facelineage y por qué. Léela junto con nuestra [Política de privacidad](/privacy).",
      },

      { kind: "h", text: "1. ¿Qué es una cookie?" },
      {
        kind: "p",
        text: "Una cookie es un pequeño archivo de texto que tu navegador guarda en tu dispositivo. Las tecnologías similares (almacenamiento local, almacenamiento de sesión) funcionan de forma parecida, pero se limitan a la sesión de tu navegador o al origen del sitio.",
      },

      { kind: "h", text: "2. Cookies que utilizamos" },
      { kind: "h3", text: "Estrictamente necesarias" },
      { kind: "p", text: "Imprescindibles para que el Servicio funcione. No requieren consentimiento y no se pueden desactivar." },
      {
        kind: "ul",
        items: [
          "**Autenticación**: las cookies de sesión de Supabase mantienen tu sesión iniciada.",
          "**Estado del proceso**: cookies de corta duración y sessionStorage registran en qué paso del cuestionario, del muro de pago o del proceso de pago te encuentras, para que no pierdas tu progreso al recargar la página.",
          "**Stripe**: Stripe instala cookies para detectar el fraude y permitir los pagos con Apple Pay / Google Pay / PayPal.",
        ],
      },
      { kind: "h3", text: "Analítica" },
      {
        kind: "p",
        text: "Métricas agregadas y respetuosas con la privacidad sobre el uso (páginas vistas, conversión del proceso). No utilizamos rastreadores publicitarios entre sitios. Cuando la ley lo exige, solo las instalamos con tu consentimiento.",
      },

      { kind: "h", text: "3. Terceros" },
      { kind: "p", text: "Los siguientes terceros pueden instalar cookies a través de nuestro Servicio:" },
      {
        kind: "ul",
        items: ["Stripe (pagos)", "Supabase (autenticación)", "Vercel (alojamiento / funciones edge)"],
      },

      { kind: "h", text: "4. Gestión de cookies" },
      {
        kind: "p",
        text: "Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Ten en cuenta que, si bloqueas las cookies estrictamente necesarias, no podrás iniciar sesión ni completar compras.",
      },

      { kind: "h", text: "5. Cambios" },
      {
        kind: "p",
        text: "Podemos actualizar esta Política de cookies de vez en cuando. La versión más reciente está siempre disponible en esta URL.",
      },

      { kind: "h", text: "6. Contacto" },
      {
        kind: "p",
        text: "¿Tienes preguntas? Escribe a [support@facelineage.com](mailto:support@facelineage.com).",
      },
    ],
  },

  refunds: {
    metaTitle: "Política de reembolsos — Facelineage",
    metaDescription: "Nuestra política de reembolsos y cancelaciones, y cómo se complementa con tus derechos legales.",
    title: "Política de reembolsos",
    lastUpdated: "25 de junio de 2026",
    blocks: [
      {
        kind: "p",
        text: "Queremos que estés contento con tu compra. Si tu informe no ha cumplido tus expectativas, te devolvemos el dinero: sin formularios ni preguntas.",
      },
      {
        kind: "note",
        text: "Esta garantía se ofrece **de forma voluntaria y adicional** a tus derechos legales como consumidor (incluido el derecho de desistimiento descrito en nuestros [Términos del servicio](/terms)). Nunca reduce esos derechos.",
      },

      { kind: "h", text: "1. Plazo de devolución" },
      {
        kind: "p",
        text: "Puedes solicitar el reembolso íntegro en un plazo de **30 días** desde tu compra inicial. Tramitamos los reembolsos en un plazo de 5 a 10 días hábiles al método de pago original.",
      },

      { kind: "h", text: "2. Cómo solicitar un reembolso" },
      {
        kind: "p",
        text: "Escribe a [support@facelineage.com](mailto:support@facelineage.com) desde la dirección de tu cuenta. Incluye:",
      },
      {
        kind: "ul",
        items: [
          "El email con el que te registraste.",
          "La fecha de tu compra.",
          "Los últimos 4 dígitos de la tarjeta utilizada.",
          "Una frase sobre lo que no te ha convencido.",
        ],
      },

      { kind: "h", text: "3. Suscripciones" },
      {
        kind: "ul",
        items: [
          "Tu pago introductorio (p. ej., 2,49 € por 3 días) cubre tu periodo introductorio. Cancela antes de que termine para evitar que se te cobre el precio recurrente.",
          "Puedes cancelar cuando quieras desde tu [página de cuenta](/account). La cancelación detiene los cargos futuros; el acceso continúa hasta el final del periodo en curso.",
          "Si te olvidas de cancelar y se te cobra una renovación que no has utilizado, contáctanos en un plazo de 7 días desde la renovación y te reembolsaremos el último cargo.",
        ],
      },

      { kind: "h", text: "4. Extras de pago único" },
      {
        kind: "p",
        text: "Los extras (desglose mamá + papá, Espejo de herencia, Futura pareja, A través de los tiempos, Libro de herencia) pueden reembolsarse en un plazo de 30 días desde la compra. Si ya hemos generado el contenido, el reembolso queda a nuestra discreción; normalmente lo concedemos igualmente a quienes compran por primera vez.",
      },

      { kind: "h", text: "5. Contracargos" },
      {
        kind: "p",
        text: "Contáctanos antes de iniciar un contracargo. Las reclamaciones a través de tu banco pueden tardar entre 60 y 90 días; si nos escribes directamente, casi siempre lo resolvemos en un día.",
      },

      { kind: "h", text: "6. Exclusiones" },
      {
        kind: "p",
        text: "Podemos denegar reembolsos cuando haya indicios de abuso, como cuentas con reembolsos repetidos, fotos subidas sin el consentimiento de la persona fotografiada o intentos de explotar el contenido con fines comerciales. Esto no afecta a tus derechos legales.",
      },

      { kind: "h", text: "7. Contacto" },
      {
        kind: "p",
        text: "Escribe a [support@facelineage.com](mailto:support@facelineage.com); normalmente respondemos en un día hábil.",
      },
    ],
  },

  contact: {
    metaTitle: "Contacto — Facelineage",
    metaDescription: "Ponte en contacto con el equipo de Facelineage.",
    title: "Contacto",
    lastUpdated: "25 de junio de 2026",
    blocks: [
      {
        kind: "p",
        text: "Somos un equipo pequeño y leemos todos los mensajes. La forma más rápida de contactarnos es por email: normalmente respondemos en un día hábil.",
      },

      { kind: "h", text: "Empresa" },
      {
        kind: "p",
        text: "Facelineage está gestionado por **Andromeda Entertainment, MB**, código de empresa **308005148**, Lituania. Domicilio social: Žygio g. 5, Vilnius, Lituania.",
      },

      { kind: "h", text: "Email" },
      {
        kind: "p",
        text: "[support@facelineage.com](mailto:support@facelineage.com)",
      },

      { kind: "h", text: "Qué incluir" },
      {
        kind: "ul",
        items: [
          "La dirección de email de tu cuenta, si tienes una.",
          "Una breve descripción de lo que necesitas.",
          "Capturas de pantalla, si algo no se ve bien en tu informe.",
        ],
      },

      { kind: "h", text: "Solicitudes habituales" },
      {
        kind: "ul",
        items: [
          "**Reembolsos y cancelaciones**: consulta nuestra [Política de reembolsos](/refunds) y luego escríbenos.",
          "**Eliminación de la cuenta o de fotos**: escríbenos desde la dirección registrada y lo tramitaremos en un plazo de 30 días.",
          "**Privacidad y solicitudes sobre tus datos**: consulta nuestra [Política de privacidad](/privacy) para conocer tus derechos y luego escríbenos.",
          "**Informes de errores e ideas**: siempre son bienvenidos. Mejoramos rápido gracias a los comentarios de usuarios reales.",
          "**Prensa y colaboraciones**: el mismo email; indica «prensa» o «colaboración» en el asunto.",
        ],
      },

      { kind: "h", text: "Horario de respuesta" },
      {
        kind: "p",
        text: "De lunes a viernes, de 9:00 a 18:00. Las respuestas en fines de semana y festivos pueden tardar más. Para problemas con pagos, escríbenos antes de abrir un contracargo: el contacto directo casi siempre lo resuelve más rápido.",
      },
    ],
  },
};
