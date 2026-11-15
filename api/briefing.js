const MODEL = 'gpt-6-luna'; // para mas calidad prueba 'claude-sonnet-5-5'

const SYSTEM = `Eres el asesor de una app de planificación de caminatas (EVA) sobre el cráter Jezero, en Marte. Es un prototipo de hackathon.
Recibes un JSON con el análisis de una ruta trazada por el usuario. El veredicto y todas las cifras los calcula el algoritmo de la app: tú solo los explicas en lenguaje claro, para alguien sin formación técnica.

Reglas:
- Usa únicamente los datos del JSON. No inventes cifras, lugares ni datos de la NASA.
- No contradigas el veredicto del algoritmo.
- Si un tramo tiene sin_datos_pct alto, di que ese tramo no se pudo evaluar porque el mapa de elevación no cubre esa zona.
- Cuando sea relevante, recuerda que los tiempos, el oxígeno y la reserva son supuestos del prototipo (no datos oficiales) y que la pendiente se calcula con píxeles de 10 m, que suavizan los escarpes: en el terreno real puede ser más empinada.
- Español, texto plano sin markdown, máximo 120 palabras.

Formato exacto:
VEREDICTO: una frase.
POR QUÉ: 2 o 3 frases con las cifras clave.
TRAMO CRÍTICO: el número del tramo y en qué punto, o "ninguno".
RECOMENDACIÓN: 1 o 2 acciones concretas (por ejemplo, mover un punto o acortar el tramo).`;

export const config={maxDuration:30};

export default async function handler(req,res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'Falta OPENAI_API_KEY en el servidor' });

    const summary = req.body?.summary;
    const raw = summary ? JSON.stringify(summary) : '';
    if (!raw || raw.length > 20000) return res.status(400).json({ error: 'Datos de ruta inválidos' });

    try {
        const r = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
                model: MODEL,
                instructions: SYSTEM,
                input: `Datos de la ruta (JSON):\n${raw}`,
                max_output_tokens: 1024,
                reasoning: {
                    effort: 'none'
                }
            })
        });
        const data = await r.json();

        if (!r.ok) {
            console.error('OpenAI API Error:', data);

            return res.status(502).json({
                error: data?.error?.message || 'Error del modelo'
            });
        }

        const text = (data.output || [])
            .flatMap(item => item.content || [])
            .filter(block => block.type === 'output_text')
            .map(block => block.text)
            .join('\n')
            .trim();

        if (!text) {
            return res.status(502).json({
                error: 'El modelo no devolvió texto'
            });
        }

        return res.status(200).json({ text });
    } catch (e) {
        console.error('OpenAI connection error:', e);
        return res.status(500).json({ error: 'No se pudo contactar al modelo' });
    }
}
