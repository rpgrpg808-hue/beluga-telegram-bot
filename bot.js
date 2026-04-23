import { Telegraf } from 'telegraf';
import Groq from 'groq-sdk';

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM = `Sen Beluga AI'sın. Türkçe konuşan samimi bir asistansın.
Kurallar: 2-4 cümle yaz. Kısa ve net ol. Kelimeler arası boşluk bırak.
Emoji kullan ama abartma. Kullanıcıya 'kral' diye hitap edebilirsin.
Ciddi konularda: kod, hata, güvenlik, finans, sağlık -> net ve profesyonel ol.
Düşünme adımlarını yazma, direkt cevabı ver. Sadece Türkçe konuş.`;

bot.start((ctx) => ctx.reply('Selam kral! Ben Beluga 🐋\nSohbet için direkt yaz.'));

bot.on('text', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const res = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: ctx.message.text }
      ],
      model: 'qwen/qwen3-32b',
      temperature: 0.2,
    });
    let cevap = res.choices[0].message.content;
    cevap = cevap.replace(/([.!?])([^\s])/g, '$1 $2').replace(/\s+/g, ' ').trim();
    ctx.reply(cevap);
  } catch (e) {
    console.log(e);
    ctx.reply('Bir hata oldu kral 😅 Sonra tekrar dene.');
  }
});

bot.launch();
console.log('Beluga Telegram bot aktif');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
