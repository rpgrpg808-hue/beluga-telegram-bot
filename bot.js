require('dotenv').config();
const { Telegraf } = require('telegraf');
const Groq = require('groq-sdk');
const express = require('express');

const bot = new Telegraf(process.env.BOT_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Render'ın uyumaması için basit web sunucusu
const app = express();
app.get('/', (req, res) => res.send('Beluga AI Canlıda! 🐋'));
app.listen(process.env.PORT || 3000);

const userHistory = new Map();

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Samimi bir asistansın. 
En fazla 2-4 cümle yaz. Kullanıcıya 'kral' diye hitap et.`;

bot.start((ctx) => ctx.reply('Selam kral! Beluga Render üzerinde aktif. 🐋\n/foto yazarak reklamsız resim çizebilirsin!'));

// Fotoğraf Oluşturma Komutu (Reklamsız Yeni URL)
bot.command('foto', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!prompt) {
        return ctx.reply('Kral, ne çizelim? Örnek: /foto karlı dağlar ve mavi gökyüzü');
    }

    try {
        await ctx.sendChatAction('upload_photo');
        
        // REKLAMSIZ YENİ URL YAPISI
        const seed = Math.floor(Math.random() * 1000000);
        const photoUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}`;
        
        await ctx.replyWithPhoto(photoUrl, { 
            caption: `🎨 Sanat Eseri: "${prompt}"\n\n✨ Beluga AI Özel Üretim 🐋` 
        });
    } catch (error) {
        ctx.reply('Çizim motoru bir hata verdi kral, tekrar dene.');
    }
});

bot.command('reset', (ctx) => {
    userHistory.delete(ctx.from.id);
    ctx.reply('Hafıza sıfırlandı kral! 🐋');
});

// Sohbet Akışı
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    if (!userHistory.has(userId)) userHistory.set(userId, []);
    const history = userHistory.get(userId);

    try {
        await ctx.sendChatAction('typing');
        history.push({ role: "user", content: ctx.message.text });

        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.slice(-6)],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
        });

        let res = completion.choices[0].message.content.replace(/<(think|thought)>[\s\S]*?<\/\1>/gi, '').trim();
        history.push({ role: "assistant", content: res });
        
        if (history.length > 12) history.splice(0, 2);
        await ctx.reply(res);
    } catch (err) {
        ctx.reply('Kral bi takılma oldu, /reset yaz düzelir.');
    }
});

bot.launch().then(() => console.log("Beluga Online & Reklamsız Resim Modu Aktif! 🐋"));
