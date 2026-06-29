// api/analyze.js
// Esta função roda no servidor da Vercel, NUNCA no navegador.
// A chave da API fica guardada em uma variável de ambiente (ANTHROPIC_API_KEY),
// então ela nunca aparece no código que o navegador do usuário recebe.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { tipo, imagem, pergunta } = req.body;

  if (!imagem) {
    return res.status(400).json({ erro: 'Imagem não enviada' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ erro: 'Chave de API não configurada no servidor' });
  }

  // Monta a instrução certa dependendo do tipo de ação
  let instrucao;
  if (tipo === 'perguntar' && pergunta) {
    instrucao = `Você é uma assistente de tecnologia assistiva para pessoas com deficiência visual.
Responda à pergunta do usuário sobre a imagem de forma curta, direta e falada (sem markdown, sem listas, apenas frases naturais para serem lidas em voz alta).
Pergunta do usuário: "${pergunta}"
Se a imagem não tiver informação suficiente para responder, diga isso claramente e sugira tirar outra foto mais próxima ou com mais luz.`;
  } else {
    instrucao = `Você é uma assistente de tecnologia assistiva para pessoas com deficiência visual.
Descreva o objeto principal da imagem de forma curta e útil (máximo 3 frases), como se estivesse falando em voz alta para alguém que não pode ver.
Inclua o nome do produto/objeto, e qualquer informação relevante visível (validade, instruções, dosagem, alertas de segurança) se houver texto na imagem.
Se a imagem estiver borrada, muito escura, ou não for possível identificar o objeto com confiança, diga isso claramente e peça para tirar outra foto, mais de perto e com mais luz.
Não use markdown, não use listas. Apenas frases naturais, como uma pessoa falaria.`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imagem
                }
              },
              {
                type: 'text',
                text: instrucao
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro da API Anthropic:', errText);
      return res.status(502).json({ erro: 'Erro ao consultar a IA' });
    }

    const data = await response.json();
    const textoResposta = data.content
      .filter(bloco => bloco.type === 'text')
      .map(bloco => bloco.text)
      .join(' ');

    return res.status(200).json({ resposta: textoResposta });
  } catch (err) {
    console.error('Erro inesperado:', err);
    return res.status(500).json({ erro: 'Erro inesperado no servidor' });
  }
}
